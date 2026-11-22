// A logged-in player's game progress (cash, cars, upgrades, passport, stats), kept on their account so it
// follows them to every device and survives a browser losing its storage. The game merges it with the
// device's own save (see mergeProgress in public/vroomillion/js/logic.js) and sends the result back.
//   GET  /api/vroomillion/progress          -> { save } (null before the first upload)
//   POST /api/vroomillion/progress { save } -> { ok: true }
import { json, currentUser, readForm, siteOrigin, clientIp, underLimit } from "./accounts.js";
import { validSave } from "./device.js";

const MAX_BYTES = 60000; // a save without the prompt history is a few KB

export async function handleProgress(request, env) {
  if (!env.DB) return json({ error: "Accounts aren't set up yet." }, 503);
  if (request.method === "POST" && !siteOrigin(request, env).ok) return json({ error: "Bad request." }, 403);
  if (!(await underLimit(env, "progress-ip", clientIp(request, env), 40, 60))) return json({ error: "Slow down." }, 429);
  const user = await currentUser(request, env);
  if (!user) return json({ error: "Not logged in." }, 401);
  if (request.method === "GET") {
    let save = null;
    try { save = user.progress ? JSON.parse(user.progress) : null; } catch { save = null; }
    const out = json({ save });
    out.headers.set("Cache-Control", "no-store");
    return out;
  }
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const body = await readForm(request, MAX_BYTES);
  if (!validSave(body.save)) return json({ error: "Bad request." }, 400);
  const { seen, acctSeen, seenMergedFor, progressOwner, unlimited, receipt, ...save } = body.save; // history lives in seen_prompts
  const data = JSON.stringify(save);
  if (data.length > MAX_BYTES) return json({ error: "Too big." }, 413);
  await env.DB.prepare("UPDATE users SET progress = ? WHERE id = ?").bind(data, user.id).run();
  return json({ ok: true });
}
