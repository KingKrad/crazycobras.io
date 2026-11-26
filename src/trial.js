// The free trial race in each themed mode, remembered on the server so clearing the browser's storage
// doesn't give another one: on the account when logged in, and in a long-lived cookie either way.
//   GET  /api/vroomillion/trial          -> { used: [mode ids] }
//   POST /api/vroomillion/trial { mode } -> { used }   (a free race in that mode has started)
import { json, currentUser, ensureSchema, readForm, siteOrigin, clientIp, underLimit, GAME_MODE_IDS } from "./accounts.js";

const COOKIE = "vroom_trials";
const YEAR = 400 * 24 * 3600;
const fromCookie = (request) => {
  const m = (request.headers.get("cookie") || "").match(new RegExp(`(?:^|;\\s*)${COOKIE}=([a-z,]{0,80})(?:;|$)`));
  return m ? m[1].split(",").filter((x) => GAME_MODE_IDS.includes(x)) : [];
};
const fromAccount = (u) => { try { const l = JSON.parse(u?.trials || "[]"); return Array.isArray(l) ? l.filter((x) => GAME_MODE_IDS.includes(x)) : []; } catch { return []; } };
const cookieFor = (list) => `${COOKIE}=${list.join(",")}; Path=/api/vroomillion/trial; HttpOnly; Secure; SameSite=Lax; Max-Age=${YEAR}`;

export async function handleTrial(request, env) {
  if (!env.DB) return json({ used: [] });
  if (request.method === "POST" && !siteOrigin(request, env).ok) return json({ error: "Bad request." }, 403);
  if (!(await underLimit(env, "trial-ip", clientIp(request, env), 30, 60))) return json({ error: "Slow down." }, 429);
  await ensureSchema(env.DB);
  try { await env.DB.prepare("ALTER TABLE users ADD COLUMN trials TEXT").run(); } catch { /* already there */ }
  const user = await currentUser(request, env);
  let used = [...new Set([...fromCookie(request), ...fromAccount(user)])];
  if (request.method === "GET") return json({ used }, 200, { "set-cookie": cookieFor(used) });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const body = await readForm(request);
  if (!GAME_MODE_IDS.includes(body.mode)) return json({ error: "Bad request." }, 400);
  used = [...new Set([...used, body.mode])];
  if (user) await env.DB.prepare("UPDATE users SET trials = ? WHERE id = ?").bind(JSON.stringify(used), user.id).run();
  return json({ used }, 200, { "set-cookie": cookieFor(used) });
}
