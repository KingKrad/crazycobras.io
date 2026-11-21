// Anonymous game statistics and player reports, for the admin screen.
//   POST /api/vroomillion/round-stats { rounds: [{ prompt, answer, tier }] }  after each race
//     counts plays, stalls and tiers per prompt, and how often each accepted answer is given.
//     Nothing about who played; answers are only counted when they were accepted (on a list), so
//     no free text a player typed is ever stored.
//   POST /api/vroomillion/report { prompt, answer, tier, reason, note }  "report this answer"
import { json, ensureSchema, readForm, siteOrigin, clientIp, underLimit, currentUser } from "./accounts.js";

export const REPORT_REASONS = ["too-common", "too-rare", "should-count", "should-not-count", "other"];

export async function ensureStatsSchema(db) {
  await ensureSchema(db);
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS prompt_stats (
      prompt TEXT PRIMARY KEY, plays INTEGER NOT NULL DEFAULT 0, stalls INTEGER NOT NULL DEFAULT 0,
      t1 INTEGER NOT NULL DEFAULT 0, t2 INTEGER NOT NULL DEFAULT 0, t3 INTEGER NOT NULL DEFAULT 0,
      t4 INTEGER NOT NULL DEFAULT 0, t5 INTEGER NOT NULL DEFAULT 0, updated INTEGER NOT NULL DEFAULT 0)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS answer_stats (
      prompt TEXT NOT NULL, answer TEXT NOT NULL, tier INTEGER NOT NULL, n INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (prompt, answer))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, prompt TEXT NOT NULL, answer TEXT NOT NULL,
      tier INTEGER NOT NULL, reason TEXT NOT NULL, note TEXT, status TEXT NOT NULL DEFAULT 'open', user_id TEXT)`),
    db.prepare("CREATE INDEX IF NOT EXISTS reports_status ON reports (status, at)"),
    db.prepare("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)"),
  ]);
}

const text = (v, max) => (typeof v === "string" ? v.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max) : "");

export async function handleRoundStats(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  if (!env.DB) return json({ ok: false }, 503);
  if (!siteOrigin(request, env).ok) return json({ error: "Bad request." }, 403);
  if (!(await underLimit(env, "stats-ip", clientIp(request, env), 20, 60))) return json({ ok: false }, 429);
  const body = await readForm(request, 6000);
  const rounds = (Array.isArray(body.rounds) ? body.rounds : []).slice(0, 7)
    .map((r) => ({ prompt: text(r?.prompt, 120), answer: text(r?.answer, 40).toLowerCase(), tier: Number.isInteger(r?.tier) && r.tier >= 0 && r.tier <= 5 ? r.tier : -1 }))
    .filter((r) => r.prompt && r.tier >= 0);
  if (!rounds.length) return json({ error: "Bad request." }, 400);
  await ensureStatsSchema(env.DB);
  const now = Date.now();
  const writes = [];
  for (const r of rounds) {
    const col = r.tier === 0 ? "stalls" : "t" + r.tier;
    writes.push(env.DB.prepare(`INSERT INTO prompt_stats (prompt, plays, ${col}, updated) VALUES (?, 1, 1, ?)
      ON CONFLICT (prompt) DO UPDATE SET plays = plays + 1, ${col} = ${col} + 1, updated = excluded.updated`).bind(r.prompt, now));
    if (r.tier > 0 && r.answer) {
      writes.push(env.DB.prepare(`INSERT INTO answer_stats (prompt, answer, tier, n) VALUES (?, ?, ?, 1)
        ON CONFLICT (prompt, answer) DO UPDATE SET n = n + 1, tier = excluded.tier`).bind(r.prompt, r.answer, r.tier));
    }
  }
  await env.DB.batch(writes);
  return json({ ok: true });
}

export async function handleReport(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  if (!env.DB) return json({ error: "Reports aren't set up yet." }, 503);
  if (!siteOrigin(request, env).ok) return json({ error: "Bad request." }, 403);
  if (!(await underLimit(env, "report-ip", clientIp(request, env), 10, 600))) return json({ error: "That's a lot of reports — try again in a few minutes." }, 429);
  const body = await readForm(request, 1500);
  const prompt = text(body.prompt, 120);
  const answer = text(body.answer, 40);
  const reason = REPORT_REASONS.includes(body.reason) ? body.reason : "";
  const tier = Number.isInteger(body.tier) && body.tier >= 0 && body.tier <= 5 ? body.tier : -1;
  if (!prompt || !reason || tier < 0) return json({ error: "Bad request." }, 400);
  await ensureStatsSchema(env.DB);
  const user = await currentUser(request, env).catch(() => null);
  await env.DB.prepare("INSERT INTO reports (at, prompt, answer, tier, reason, note, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(Date.now(), prompt, answer, tier, reason, text(body.note, 200) || null, user?.id || null).run();
  return json({ ok: true });
}

// the title-screen announcement (set on the admin screen), for /config
export async function announcement(env) {
  if (!env.DB) return null;
  try {
    await ensureStatsSchema(env.DB);
    const row = await env.DB.prepare("SELECT value FROM settings WHERE key = 'announcement'").first();
    return row?.value || null;
  } catch { return null; }
}
