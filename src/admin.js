// The admin screen's API. Only accounts listed in the ADMIN_EMAILS secret can use it.
// Also POST /race-start, which counts races for the stats.
import { json, currentUser, ensureSchema, readForm, siteOrigin, clientIp, underLimit, isAdmin, normalizeEmail, GIFT_CARS, parseGifts, parseModes, GAME_MODE_IDS, inTrial, TRIAL_MS, TRIAL_OFFER_ENDS } from "./accounts.js";
import { ensureDailySchema, utcDay, cleanNickname } from "./daily.js";
import { parseCars } from "./premium.js";
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

const adminEmails = (env) => String(env?.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
const playerView = (u, env) => {
  const admin = isAdmin(u, env), trial = !admin && inTrial(u, Date.now(), env);
  return {
    email: u.email,
    unlimited: u.unlimited === 1,
    paid: !!u.paid_session,
    paidAt: u.paid_at || null,
    admin,
    trialEndsAt: trial ? Number(u.created_at) + TRIAL_MS : null,
    status: admin ? "admin" : u.paid_session ? "paid" : u.unlimited === 1 ? "unlimited" : trial ? "trial" : "free",
    signIn: [(u.has_pw ?? u.pw_hash) ? "password" : null, u.google_sub ? "google" : null, u.apple_sub ? "apple" : null].filter(Boolean).join("+") || "password",
    createdAt: u.created_at,
    lastSeen: u.last_seen || null,
    nickname: u.nickname || null,
    // a streak only counts while it's alive (played today or yesterday)
    streak: [utcDay(), utcDay(Date.now() - DAY_MS)].includes(u.streak_day) ? Number(u.streak) || 0 : 0,
    races: Number(u.unl_races) || 0,
    freeResetAt: u.free_reset_at || 0,
    gifts: parseGifts(u.gifts),
    cars: parseCars(u.cars),
    modes: parseModes(u.modes),
  };
};

// the player list: columns it needs (not progress or seen prompts, which are big), filters and sorts
const LIST_COLS = "id, email, (pw_hash <> '') AS has_pw, google_sub, apple_sub, unlimited, paid_session, paid_at, created_at, last_seen, nickname, streak, streak_day, unl_races, free_reset_at, gifts, cars, modes";
const PAGE_SIZES = [25, 50, 100, 200];
const PLAYER_SORTS = {
  new: "created_at DESC",
  old: "created_at ASC",
  seen: "COALESCE(last_seen, 0) DESC",
  races: "COALESCE(unl_races, 0) DESC",
  streak: "CASE WHEN streak_day IN (strftime('%Y-%m-%d', 'now'), strftime('%Y-%m-%d', 'now', '-1 day')) THEN COALESCE(streak, 0) ELSE 0 END DESC",
  paid: "COALESCE(paid_at, 0) DESC",
  email: "email ASC",
};
// each returns [sql, ...args]; "" = no condition
const inList = (l) => l.length ? `email IN (${l.map(() => "?").join(",")})` : "0";
const PLAYER_FILTERS = {
  all: () => [""],
  active: (now) => ["last_seen > ?", now - DAY_MS],
  week: (now) => ["last_seen > ?", now - 7 * DAY_MS],
  new: (now) => ["created_at > ?", now - DAY_MS],
  trial: (now, admins, env) => [`unlimited <> 1 AND created_at > ? AND created_at < ?${admins.length ? ` AND NOT ${inList(admins)}` : ""}`, now - TRIAL_MS, Date.parse(env?.TRIAL_OFFER_ENDS || TRIAL_OFFER_ENDS), ...admins],
  paid: () => ["paid_session IS NOT NULL"],
  unlimited: () => ["unlimited = 1"],
  premium: () => ["cars IS NOT NULL AND cars NOT IN ('', '[]')"],
  gifted: () => ["gifts IS NOT NULL AND gifts NOT IN ('', '[]')"],
  sso: () => ["(google_sub IS NOT NULL OR apple_sub IS NOT NULL)"],
  dormant: (now) => ["COALESCE(last_seen, created_at) < ?", now - 14 * DAY_MS],
  admin: (now, admins) => [inList(admins), ...admins],
};

// counts per UTC day from a list of timestamps
const perDay = (stamps, days) => {
  const m = Object.fromEntries(days.map((d) => [d, 0]));
  for (const t of stamps) { const d = day(t); if (d in m) m[d]++; }
  return days.map((d) => ({ day: d, n: m[d] }));
};

// POST /api/vroomillion/admin { action, ... }
//   stats | overview                  money, players, activity, races (last 14 days)
//   players { q?, filter?, sort?, limit?, offset? }  a page of players, with counts per filter
//   players-csv { q?, filter?, sort? } the same list as a CSV file (up to 10,000 rows)
//   lookup { email }                  one player
//   set-unlimited { email, unlimited } | gift-car { email, car, give } | gift-mode { email, mode, give } | reset-free { email } | delete-player { email, confirm: email }
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

  if (action === "players" || action === "players-csv") {
    // filter + sort + page, built for thousands of players; the list never loads the big progress columns
    const q = String(body.q || "").trim().toLowerCase().slice(0, 100);
    const csv = action === "players-csv";
    const limit = csv ? 10000 : PAGE_SIZES.includes(Number(body.limit)) ? Number(body.limit) : 50;
    const offset = csv ? 0 : Math.max(0, Math.min(1000000, Number(body.offset) || 0));
    const filter = PLAYER_FILTERS[body.filter] ? body.filter : "all";
    const sort = PLAYER_SORTS[body.sort] ? body.sort : "new";
    const admins = adminEmails(env);
    const cond = (f) => PLAYER_FILTERS[f](now, admins, env);
    const parts = [], args = [];
    if (q) { parts.push("(LOWER(email) LIKE ? OR LOWER(COALESCE(nickname, '')) LIKE ?)"); args.push(`%${q}%`, `%${q}%`); }
    const [fw, ...fa] = cond(filter);
    if (fw) { parts.push(fw); args.push(...fa); }
    const where = parts.length ? "WHERE " + parts.join(" AND ") : "";
    const list = await all(`SELECT ${LIST_COLS} FROM users ${where} ORDER BY ${PLAYER_SORTS[sort]}, id LIMIT ? OFFSET ?`, ...args, limit, offset);
    const players = list.map((u) => playerView(u, env));
    if (csv) {
      const cols = ["email", "nickname", "status", "races", "streak", "gifts", "premiumCars", "signIn", "joined", "lastSeen", "paidAt"];
      const cell = (v) => { const t = String(v ?? ""); return /[",\n]/.test(t) || /^[=+\-@]/.test(t) ? `"${t.replace(/^([=+\-@])/, "'$1").replace(/"/g, '""')}"` : t; };
      const iso = (t) => (t ? new Date(t).toISOString() : "");
      const lines = players.map((p) => [p.email, p.nickname, p.status, p.races, p.streak, p.gifts.join(" "), p.cars.join(" "), p.signIn, iso(p.createdAt), iso(p.lastSeen), iso(p.paidAt)].map(cell).join(","));
      return new Response([cols.join(","), ...lines].join("\n") + "\n", { headers: { "content-type": "text/csv; charset=utf-8", "cache-control": "no-store", "content-disposition": `attachment; filename="vroomillion-players-${day()}.csv"` } });
    }
    const total = await one(`SELECT COUNT(*) AS n FROM users ${where}`, ...args);
    // how many players each filter would show (with the same search), for the filter chips
    const counts = {};
    await Promise.all(Object.keys(PLAYER_FILTERS).map(async (f) => {
      const [w, ...a] = cond(f);
      const ps = [...(q ? ["(LOWER(email) LIKE ? OR LOWER(COALESCE(nickname, '')) LIKE ?)"] : []), ...(w ? [w] : [])];
      counts[f] = (await one(`SELECT COUNT(*) AS n FROM users ${ps.length ? "WHERE " + ps.join(" AND ") : ""}`, ...(q ? [`%${q}%`, `%${q}%`] : []), ...a)).n;
    }));
    return json({ players, total: total.n, offset, limit, filter, sort, counts });
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
  if (action === "gift-car") {
    // give or take back a gift-only car; it appears in their garage next time they open the game logged in
    if (!GIFT_CARS.includes(body.car) || typeof body.give !== "boolean") return json({ error: "Bad request." }, 400);
    const now = new Set(parseGifts(player.gifts));
    if (body.give) now.add(body.car); else now.delete(body.car);
    await db.prepare("UPDATE users SET gifts = ? WHERE id = ?").bind(JSON.stringify([...now]), player.id).run();
    return json(playerView(await find(), env));
  }
  if (action === "gift-mode") {
    // give or take back a themed game mode (WORLD TOUR...), as if they'd bought it
    if (!GAME_MODE_IDS.includes(body.mode) || typeof body.give !== "boolean") return json({ error: "Bad request." }, 400);
    const now = new Set(parseModes(player.modes));
    if (body.give) now.add(body.mode); else now.delete(body.mode);
    await db.prepare("UPDATE users SET modes = ? WHERE id = ?").bind(JSON.stringify([...now]), player.id).run();
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
