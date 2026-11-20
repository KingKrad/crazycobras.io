// The admin screen's API: stats, and managing one player by email. Only accounts listed in the
// ADMIN_EMAILS secret can use it. Also POST /race-start, which counts races for the stats.
import { json, currentUser, ensureSchema, readForm, siteOrigin, clientIp, underLimit, isAdmin, normalizeEmail } from "./accounts.js";

const KINDS = new Set(["solo-classic", "solo-car", "solo-hard", "versus"]);
const day = (ms = Date.now()) => new Date(ms).toISOString().slice(0, 10); // UTC

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
  admin: isAdmin(u, env),
  createdAt: u.created_at,
  freeResetAt: u.free_reset_at || 0,
});

// POST /api/vroomillion/admin { action, email?, unlimited? }
//   stats                      -> accounts, Unlimited and paid counts, races for the last 7 days
//   lookup { email }           -> that player
//   set-unlimited { email, unlimited: true | false }
//   reset-free { email }       -> gives the player today's free races back (on devices where they're logged in)
export async function handleAdmin(request, env) {
  const { stop } = await adminGuard(request, env);
  if (stop) return stop;
  const body = await readForm(request, 500);
  const action = String(body.action || "");
  await ensureSchema(env.DB);

  if (action === "stats") {
    const one = (q, ...args) => env.DB.prepare(q).bind(...args).first();
    const since = Date.now() - 86400000;
    const [users, unlimited, paid, newToday] = await Promise.all([
      one("SELECT COUNT(*) AS n FROM users"),
      one("SELECT COUNT(*) AS n FROM users WHERE unlimited = 1"),
      one("SELECT COUNT(*) AS n FROM users WHERE paid_session IS NOT NULL"),
      one("SELECT COUNT(*) AS n FROM users WHERE created_at > ?", since),
    ]);
    const days = [...Array(7)].map((_, i) => day(Date.now() - i * 86400000));
    const rows = (await env.DB.prepare(`SELECT day, kind, n FROM race_counts WHERE day >= ?`).bind(days[6]).all()).results || [];
    const races = days.map((d) => {
      const byKind = Object.fromEntries([...KINDS].map((k) => [k, 0]));
      for (const r of rows) if (r.day === d) byKind[r.kind] = r.n;
      return { day: d, ...byKind, total: Object.values(byKind).reduce((a, b) => a + b, 0) };
    });
    return json({ users: users.n, unlimited: unlimited.n, paid: paid.n, newToday: newToday.n, races });
  }

  const email = normalizeEmail(body.email);
  if (!email) return json({ error: "Enter a valid email address." }, 400);
  const find = () => env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
  const player = await find();
  if (!player) return json({ error: "No account with that email." }, 404);

  if (action === "lookup") return json(playerView(player, env));
  if (action === "set-unlimited") {
    if (typeof body.unlimited !== "boolean") return json({ error: "Bad request." }, 400);
    await env.DB.prepare("UPDATE users SET unlimited = ? WHERE id = ?").bind(body.unlimited ? 1 : 0, player.id).run();
    return json(playerView(await find(), env));
  }
  if (action === "reset-free") {
    await env.DB.prepare("UPDATE users SET free_reset_at = ? WHERE id = ?").bind(Date.now(), player.id).run();
    return json(playerView(await find(), env));
  }
  return json({ error: "Unknown action." }, 400);
}
