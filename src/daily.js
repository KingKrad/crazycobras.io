// Daily races: scores, the leaderboard and streaks. Everyone gets the same two daily races each UTC day.
//   POST /api/vroomillion/daily { race: 1 | 2, metres, tiers: [7 tiers] } -> { rank, streak }
//     a logged-in player's score; the first one sent for each race counts
//   GET  /api/vroomillion/daily-board?race=1 -> { day, race, top: [{ name, metres }], me: { rank, metres } | null }
//   POST /api/vroomillion/nickname { nickname } -> { nickname }   the name shown on the leaderboard
import { json, currentUser, ensureSchema, readForm, siteOrigin, clientIp, underLimit } from "./accounts.js";

export const utcDay = (ms = Date.now()) => new Date(ms).toISOString().slice(0, 10);
const prevDay = (day) => utcDay(Date.parse(day + "T00:00:00Z") - 86400000);
// the most any race can score: 7 rounds of 1,000 m in the best tuned car (x7.1), all on nitro
export const MAX_METRES = 80000;
const BOARD = 10;

// Leaderboard names never show an email: a chosen nickname, or "RACER" plus a few letters of the account id.
export const defaultName = (id) => "RACER " + String(id).replace(/[^a-z0-9]/gi, "").slice(0, 4).toUpperCase();
const NICK_RE = /^[A-Za-z0-9 _.-]{3,16}$/;
const BAD_WORDS = /(fuck|shit|cunt|nigg|fag|bitch|whore|slut|rape|nazi|hitler|porn|dick|cock|pussy|admin|moderator|vroomillion)/i;
export const cleanNickname = (raw) => {
  const n = String(raw ?? "").trim().replace(/\s+/g, " ");
  return NICK_RE.test(n) && !BAD_WORDS.test(n.replace(/[^a-z]/gi, "")) ? n : null;
};

export async function ensureDailySchema(db) {
  await ensureSchema(db);
  await db.prepare(`CREATE TABLE IF NOT EXISTS daily_scores (
    day TEXT NOT NULL, race INTEGER NOT NULL, user_id TEXT NOT NULL, metres INTEGER NOT NULL, at INTEGER NOT NULL,
    PRIMARY KEY (day, race, user_id))`).run();
  for (const col of ["nickname TEXT", "streak INTEGER", "streak_day TEXT"]) {
    try { await db.prepare(`ALTER TABLE users ADD COLUMN ${col}`).run(); } catch { /* already there */ }
  }
}

export async function handleDailyScore(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  if (!env.DB) return json({ error: "Accounts aren't set up yet." }, 503);
  if (!siteOrigin(request, env).ok) return json({ error: "Bad request." }, 403);
  if (!(await underLimit(env, "daily-ip", clientIp(request, env), 20, 60))) return json({ error: "Slow down." }, 429);
  const user = await currentUser(request, env);
  if (!user) return json({ error: "Not logged in." }, 401);
  const body = await readForm(request, 500);
  const race = body.race === 1 || body.race === 2 ? body.race : 0;
  const metres = Number.isInteger(body.metres) ? body.metres : -1;
  const tiers = Array.isArray(body.tiers) ? body.tiers : [];
  const tiersOk = tiers.length === 7 && tiers.every((t) => Number.isInteger(t) && t >= 0 && t <= 5);
  // a race can't go further than its answers allow: 1,000 m a round, times the best car, on nitro
  const most = tiersOk ? tiers.reduce((m, t) => m + [0, 120, 280, 480, 720, 1000][t], 0) * 7.1 * 1.5 : 0;
  if (!race || metres < 0 || metres > MAX_METRES || !tiersOk || metres > most + 1) return json({ error: "Bad request." }, 400);
  await ensureDailySchema(env.DB);
  const day = utcDay();
  await env.DB.prepare("INSERT OR IGNORE INTO daily_scores (day, race, user_id, metres, at) VALUES (?, ?, ?, ?, ?)")
    .bind(day, race, user.id, metres, Date.now()).run();
  // streak: days in a row with a daily race
  const fresh = await env.DB.prepare("SELECT streak, streak_day FROM users WHERE id = ?").bind(user.id).first();
  let streak = Number(fresh?.streak) || 0;
  if (fresh?.streak_day !== day) {
    streak = fresh?.streak_day === prevDay(day) ? streak + 1 : 1;
    await env.DB.prepare("UPDATE users SET streak = ?, streak_day = ? WHERE id = ?").bind(streak, day, user.id).run();
  }
  const mine = await env.DB.prepare("SELECT metres FROM daily_scores WHERE day = ? AND race = ? AND user_id = ?").bind(day, race, user.id).first();
  const better = await env.DB.prepare("SELECT COUNT(*) AS n FROM daily_scores WHERE day = ? AND race = ? AND metres > ?").bind(day, race, mine.metres).first();
  return json({ rank: better.n + 1, metres: mine.metres, streak, day });
}

export async function handleDailyBoard(request, env) {
  if (request.method !== "GET") return json({ error: "Method not allowed." }, 405);
  if (!env.DB) return json({ day: utcDay(), race: 1, top: [], me: null });
  if (!(await underLimit(env, "board-ip", clientIp(request, env), 60, 60))) return json({ error: "Slow down." }, 429);
  const url = new URL(request.url);
  const race = url.searchParams.get("race") === "2" ? 2 : 1;
  await ensureDailySchema(env.DB);
  const day = utcDay();
  const rows = (await env.DB.prepare(`SELECT d.metres, d.user_id, u.nickname FROM daily_scores d JOIN users u ON u.id = d.user_id
    WHERE d.day = ? AND d.race = ? ORDER BY d.metres DESC, d.at ASC LIMIT ?`).bind(day, race, BOARD).all()).results || [];
  const top = rows.map((r) => ({ name: r.nickname || defaultName(r.user_id), metres: r.metres }));
  let me = null;
  const user = await currentUser(request, env);
  if (user) {
    const mine = await env.DB.prepare("SELECT metres FROM daily_scores WHERE day = ? AND race = ? AND user_id = ?").bind(day, race, user.id).first();
    if (mine) {
      const better = await env.DB.prepare("SELECT COUNT(*) AS n FROM daily_scores WHERE day = ? AND race = ? AND metres > ?").bind(day, race, mine.metres).first();
      me = { rank: better.n + 1, metres: mine.metres, name: user.nickname || defaultName(user.id) };
    }
  }
  const total = await env.DB.prepare("SELECT COUNT(*) AS n FROM daily_scores WHERE day = ? AND race = ?").bind(day, race).first();
  const out = json({ day, race, top, me, players: total.n });
  out.headers.set("Cache-Control", "no-store");
  return out;
}

export async function handleNickname(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  if (!env.DB) return json({ error: "Accounts aren't set up yet." }, 503);
  if (!siteOrigin(request, env).ok) return json({ error: "Bad request." }, 403);
  if (!(await underLimit(env, "nick-ip", clientIp(request, env), 10, 60))) return json({ error: "Slow down." }, 429);
  const user = await currentUser(request, env);
  if (!user) return json({ error: "Not logged in." }, 401);
  const body = await readForm(request, 300);
  const nickname = cleanNickname(body.nickname);
  if (!nickname) return json({ error: "3–16 letters, numbers, spaces, dots, dashes or underscores, and nothing rude." }, 400);
  await ensureDailySchema(env.DB);
  const taken = await env.DB.prepare("SELECT 1 FROM users WHERE LOWER(nickname) = LOWER(?) AND id != ?").bind(nickname, user.id).first();
  if (taken) return json({ error: "Someone already has that name." }, 409);
  await env.DB.prepare("UPDATE users SET nickname = ? WHERE id = ?").bind(nickname, user.id).run();
  return json({ nickname });
}
