// POST /api/vroomillion/seen { add?: [prompt], remove?: [prompt] } -> { seen: [prompt] }
// The prompts a logged-in player has already raced, kept on their account so no prompt repeats on any
// of their devices. Players without an account keep this list on their device only. Sending neither
// add nor remove just reads the list.
import { json, currentUser, readForm, siteOrigin, clientIp, underLimit } from "./accounts.js";

export const MAX_SEEN = 6000; // more than every prompt in every mode
const MAX_PER_CALL = 3000;
const MAX_LEN = 120;

const prompts = (v) => (Array.isArray(v) ? v : [])
  .slice(0, MAX_PER_CALL)
  .filter((p) => typeof p === "string" && p.length > 0 && p.length <= MAX_LEN);

export function parseSeen(text) {
  try {
    const list = JSON.parse(text || "[]");
    return Array.isArray(list) ? list.filter((p) => typeof p === "string") : [];
  } catch {
    return [];
  }
}

export function mergeSeen(list, add, remove) {
  const out = new Set(list);
  for (const p of remove) out.delete(p);
  for (const p of add) out.add(p);
  return [...out].slice(-MAX_SEEN); // over the cap, the oldest go first
}

export async function handleSeen(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  if (!env.DB) return json({ error: "Accounts aren't set up yet." }, 503);
  if (!siteOrigin(request, env).ok) return json({ error: "Bad request." }, 403);
  if (!(await underLimit(env, "seen-ip", clientIp(request, env), 60, 60))) return json({ error: "Slow down." }, 429);
  const user = await currentUser(request, env);
  if (!user) return json({ error: "Not logged in." }, 401);
  const body = await readForm(request, 400000);
  const add = prompts(body.add);
  const remove = prompts(body.remove);
  const before = parseSeen(user.seen_prompts);
  if (!add.length && !remove.length) return json({ seen: before });
  const seen = mergeSeen(before, add, remove);
  await env.DB.prepare("UPDATE users SET seen_prompts = ? WHERE id = ?").bind(JSON.stringify(seen), user.id).run();
  return json({ seen });
}
