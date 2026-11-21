// The admin screen's API. Only accounts listed in the ADMIN_EMAILS secret can use it.
// Also POST /race-start, which counts races for the stats.
import { json, currentUser, ensureSchema, readForm, siteOrigin, clientIp, underLimit, isAdmin, normalizeEmail } from "./accounts.js";
import { ensureDailySchema, utcDay, cleanNickname } from "./daily.js";
import { ensureStatsSchema } from "./stats.js";

const KINDS = new Set(["solo-classic", "solo-car", "solo-hard", "versus"]);
const day = (ms = Date.now()) => new Date(ms).toISOString().slice(0, 10); // UTC
const DAY_MS = 86400000;
const PRICE = 5; // dollars, one-time Unlimited
const lastDays = (n) => [...Array(n)].map((_, i) => day(Date.now() - i * DAY_MS)).reverse(); // oldest first

// POST /api/vroomillion/race-start { kind } -> counts one race of that kind today. No personal data.
export async function handleRaceStart(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  if (!env.DB) return json({ ok: false }, 503);
  if (!siteOrigin(request, env).ok) return json({ error: "Bad request." }, 403);
  if (!(await underLimit(env, "race-ip", clientIp(request, env), 30, 60))) return json({ ok: false }, 429);
  const body = await readForm(request, 200);
  const kind = String(body.kind || "");
  if (!KINDS.has(kind)) return json({ error: "Bad request." }, 400);
  await ensureSchema(env.DB);
  await env.DB.prepare("INSERT INTO race_counts (day, kind, n) VALUES (?, ?, 1) ON CONFLICT (day, kind) DO UPDATE SET n = n + 1")
    .bind(day(), kind).run();
  return json({ ok: true });
}

// Every admin request: POST, from the site, logged in as an admin.
async function adminGuard(request, env) {
  if (request.method !== "POST") return { stop: json({ error: "Method not allowed." }, 405) };
  if (!env.DB) return { stop: json({ error: "Accounts aren't set up yet." }, 503) };
  if (!siteOrigin(request, env).ok) return { stop: json({ error: "Bad request." }, 403) };
  const user = await currentUser(request, env);
  if (!user || !isAdmin(user, env)) return { stop: json({ error: "Not found" }, 404) };
  return { user };
}

const playerView = (u, env) => ({
  email: u.email,
  unlimited: u.unlimited === 1,
  paid: !!u.paid_session,
  paidAt: u.paid_at || null,
  admin: isAdmin(u, env),
  createdAt: u.created_at,
  lastSeen: u.last_seen || null,
  nickname: u.nickname || null,
  streak: Number(u.streak) || 0,
  races: Number(u.unl_races) || 0,
  freeResetAt: u.free_reset_at || 0,
});

// counts per UTC day from a list of timestamps
const perDay = (stamps, days) => {
  const m = Object.fromEntries(days.map((d) => [d, 0]));
  for (const t of stamps) { const d = day(t); if (d in m) m[d]++; }
  return days.map((d) => ({ day: d, n: m[d] }));
};

// POST /api/vroomillion/admin { action, ... }
//   stats | overview                  money, players, activity, races (last 14 days)
//   players { q?, offset? }           newest players first, or search by email / nickname
//   lookup { email }                  one player
//   set-unlimited { email, unlimited } | reset-free { email } | delete-player { email, confirm: email }
//   daily { day? }                    both daily races: players, average and top distance, every score
//   remove-score { day, race, email } | reset-nickname { email }
//   prompts                           most played, most stalled, best answers per prompt
//   prompt { prompt }                 one prompt's tiers and most common answers
//   reports { status? } | resolve-report { id, status }
//   get-settings | set-announcement { text }
export async function handleAdmin(request, env) {
  const { stop } = await adminGuard(request, env);
  if (stop) return stop;
  const body = await readForm(request, 2000);
  const action = String(body.action || "");
  await ensureSchema(env.DB);
  await ensureDailySchema(env.DB);
  await ensureStatsSchema(env.DB);
  const db = env.DB;
  const one = (q, ...args) => db.prepare(q).bind(...args).first();
  const all = async (q, ...args) => (await db.prepare(q).bind(...args).all()).results || [];
  const now = Date.now();

  if (action === "stats" || action === "overview") {
    const days = lastDays(14);
    const since = Date.parse(days[0] + "T00:00:00Z");
    const [users, unlimited, paid, newToday, activeToday, activeWeek] = await Promise.all([
      one("SELECT COUNT(*) AS n FROM users"),
      one("SELECT COUNT(*) AS n FROM users WHERE unlimited = 1"),
      one("SELECT COUNT(*) AS n FROM users WHERE paid_session IS NOT NULL"),
      one("SELECT COUNT(*) AS n FROM users WHERE created_at > ?", now - DAY_MS),
      one("SELECT COUNT(*) AS n FROM users WHERE last_seen > ?", now - DAY_MS),
      one("SELECT COUNT(*) AS n FROM users WHERE last_seen > ?", now - 7 * DAY_MS),
    ]);
    let devicesToday = { n: 0 }, devicesWeek = { n: 0 }, devicesAll = { n: 0 };
    try {
      [devicesToday, devicesWeek, devicesAll] = await Promise.all([
        one("SELECT COUNT(*) AS n FROM device_saves WHERE updated > ?", now - DAY_MS),
        one("SELECT COUNT(*) AS n FROM device_saves WHERE updated > ?", now - 7 * DAY_MS),
        one("SELECT COUNT(*) AS n FROM device_saves"),
      ]);
    } catch { /* no device saves yet */ }
    const signups = (await all("SELECT created_at FROM users WHERE created_at >= ?", since)).map((r) => r.created_at);
    const sales = (await all("SELECT paid_at FROM users WHERE paid_at >= ?", since)).map((r) => r.paid_at);
    const salesToday = (await one("SELECT COUNT(*) AS n FROM users WHERE paid_at >= ?", Date.parse(day() + "T00:00:00Z"))).n;
    const salesWeek = (await one("SELECT COUNT(*) AS n FROM users WHERE paid_at > ?", now - 7 * DAY_MS)).n;
    const rows = await all("SELECT day, kind, n FROM race_counts WHERE day >= ?", days[0]);
    const races = days.map((d) => {
      const byKind = Object.fromEntries([...KINDS].map((k) => [k, 0]));
      for (const r of rows) if (r.day === d) byKind[r.kind] = r.n;
      return { day: d, ...byKind, total: Object.values(byKind).reduce((a, b) => a + b, 0) };
    });
    return json({
      users: users.n, unlimited: unlimited.n, paid: paid.n, newToday: newToday.n,
      money: { price: PRICE, today: salesToday * PRICE, week: salesWeek * PRICE, allTime: paid.n * PRICE, sales: paid.n, perDay: perDay(sales, days).map((x) => ({ day: x.day, n: x.n * PRICE })) },
      activity: { accountsToday: activeToday.n, accountsWeek: activeWeek.n, devicesToday: devicesToday.n, devicesWeek: devicesWeek.n, devicesAll: devicesAll.n },
      signups: perDay(signups, days),
      races: [...races].reverse(), // newest first, as before
    });
  }

  if (action === "players") {
    const q = String(body.q || "").trim().toLowerCase().slice(0, 100);
    const offset = Math.max(0, Math.min(100000, Number(body.offset) || 0));
    const where = q ? "WHERE LOWER(email) LIKE ? OR LOWER(COALESCE(nickname, '')) LIKE ?" : "";
    const args = q ? [`%${q}%`, `%${q}%`] : [];
    const list = await all(`SELECT * FROM users ${where} ORDER BY created_at DESC LIMIT 25 OFFSET ?`, ...args, offset);
    const total = await one(`SELECT COUNT(*) AS n FROM users ${where}`, ...args);
    return json({ players: list.map((u) => playerView(u, env)), total: total.n, offset });
  }

  if (action === "daily") {
    const d = /^\d{4}-\d{2}-\d{2}$/.test(String(body.day || "")) ? body.day : utcDay();
    const races = [];
    for (const race of [1, 2]) {
      const s = await one("SELECT COUNT(*) AS n, AVG(metres) AS avg, MAX(metres) AS top FROM daily_scores WHERE day = ? AND race = ?", d, race);
      const scores = await all(`SELECT d.metres, d.at, u.email, u.nickname, u.id FROM daily_scores d JOIN users u ON u.id = d.user_id
        WHERE d.day = ? AND d.race = ? ORDER BY d.metres DESC LIMIT 100`, d, race);
      races.push({ race, players: s.n, avg: Math.round(s.avg || 0), top: s.top || 0,
        scores: scores.map((r) => ({ metres: r.metres, at: r.at, email: r.email, nickname: r.nickname || "RACER " + String(r.id).replace(/[^a-z0-9]/gi, "").slice(0, 4).toUpperCase() })) });
    }
    const history = await all("SELECT day, race, COUNT(*) AS n FROM daily_scores WHERE day >= ? GROUP BY day, race", lastDays(14)[0]);
    const streaks = await all(`SELECT streak, COUNT(*) AS n FROM users WHERE streak_day IN (?, ?) AND streak > 0 GROUP BY streak ORDER BY streak`, utcDay(), utcDay(now - DAY_MS));
    return json({ day: d, races, history, streaks });
  }

  if (action === "prompts") {
    const played = await all("SELECT * FROM prompt_stats ORDER BY plays DESC LIMIT 30");
    const stalled = await all("SELECT *, CAST(stalls AS REAL) / plays AS rate FROM prompt_stats WHERE plays >= 5 ORDER BY rate DESC LIMIT 20");
    const totals = await one("SELECT COUNT(*) AS prompts, COALESCE(SUM(plays), 0) AS plays, COALESCE(SUM(stalls), 0) AS stalls, COALESCE(SUM(t5), 0) AS vrooms FROM prompt_stats");
    return json({ totals, played, stalled });
  }

  if (action === "prompt") {
    const prompt = String(body.prompt || "").slice(0, 120);
    const stats = await one("SELECT * FROM prompt_stats WHERE prompt = ?", prompt);
    const answers = await all("SELECT answer, tier, n FROM answer_stats WHERE prompt = ? ORDER BY n DESC LIMIT 40", prompt);
    return json({ prompt, stats: stats || null, answers });
  }

  if (action === "reports") {
    const status = ["open", "fixed", "dismissed"].includes(body.status) ? body.status : "open";
    const list = await all("SELECT id, at, prompt, answer, tier, reason, note, status FROM reports WHERE status = ? ORDER BY at DESC LIMIT 100", status);
    const counts = await all("SELECT status, COUNT(*) AS n FROM reports GROUP BY status");
    return json({ reports: list, counts: Object.fromEntries(counts.map((c) => [c.status, c.n])) });
  }
  if (action === "resolve-report") {
    const id = Number(body.id);
    const status = ["open", "fixed", "dismissed"].includes(body.status) ? body.status : "";
    if (!Number.isInteger(id) || !status) return json({ error: "Bad request." }, 400);
    await db.prepare("UPDATE reports SET status = ? WHERE id = ?").bind(status, id).run();
    return json({ ok: true });
  }

  if (action === "get-settings") {
    const row = await one("SELECT value FROM settings WHERE key = 'announcement'");
    return json({ announcement: row?.value || "" });
  }
  if (action === "set-announcement") {
    const text = String(body.text ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, 140);
    if (text) await db.prepare("INSERT INTO settings (key, value) VALUES ('announcement', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value").bind(text).run();
    else await db.prepare("DELETE FROM settings WHERE key = 'announcement'").run();
    return json({ announcement: text });
  }

  // ---- one player, by email ----
  const email = normalizeEmail(body.email);
  if (!email) return json({ error: "Enter a valid email address." }, 400);
  const find = () => db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
  const player = await find();
  if (!player) return json({ error: "No account with that email." }, 404);

  if (action === "lookup") return json(playerView(player, env));
  if (action === "set-unlimited") {
    if (typeof body.unlimited !== "boolean") return json({ error: "Bad request." }, 400);
    await db.prepare("UPDATE users SET unlimited = ? WHERE id = ?").bind(body.unlimited ? 1 : 0, player.id).run();
    return json(playerView(await find(), env));
  }
  if (action === "reset-free") {
    await db.prepare("UPDATE users SET free_reset_at = ? WHERE id = ?").bind(Date.now(), player.id).run();
    return json(playerView(await find(), env));
  }
  if (action === "reset-nickname") {
    await db.prepare("UPDATE users SET nickname = NULL WHERE id = ?").bind(player.id).run();
    return json(playerView(await find(), env));
  }
  if (action === "remove-score") {
    const race = body.race === 1 || body.race === 2 ? body.race : 0;
    const d = /^\d{4}-\d{2}-\d{2}$/.test(String(body.day || "")) ? body.day : "";
    if (!race || !d) return json({ error: "Bad request." }, 400);
    await db.prepare("DELETE FROM daily_scores WHERE day = ? AND race = ? AND user_id = ?").bind(d, race, player.id).run();
    return json({ ok: true });
  }
  if (action === "delete-player") {
    // typed the email again to confirm; admins can't be deleted here
    if (normalizeEmail(body.confirm) !== email) return json({ error: "Type the email again to confirm." }, 400);
    if (isAdmin(player, env)) return json({ error: "Admin accounts can't be deleted here." }, 400);
    await db.batch([
      db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(player.id),
      db.prepare("DELETE FROM daily_scores WHERE user_id = ?").bind(player.id),
      db.prepare("UPDATE reports SET user_id = NULL WHERE user_id = ?").bind(player.id),
      db.prepare("DELETE FROM users WHERE id = ?").bind(player.id),
    ]);
    return json({ ok: true, deleted: email });
  }
  return json({ error: "Unknown action." }, 400);
}
