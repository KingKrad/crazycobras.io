// Device save backup: every device's progress (cash, cars, passport, stats) is saved in the browser, and a
// copy is kept here under a random device ID in a cookie (no account, no personal data). If the browser
// loses its copy (iPhone Safari wipes a site's storage after 7 days without a visit), the game gets it back.
//   GET  /api/vroomillion/device-save            -> { save } or { save: null }
//   POST /api/vroomillion/device-save { save }   -> { ok: true }
import { json, ensureSchema, readForm, siteOrigin, clientIp, underLimit } from "./accounts.js";

const COOKIE = "vroom_device";
const MAX_BYTES = 120000; // a full save with every prompt seen is well under this
const YEAR = 400 * 24 * 3600; // browsers keep cookies at most 400 days; every save renews it

const readId = (request) => {
  const m = (request.headers.get("cookie") || "").match(new RegExp(`(?:^|;\\s*)${COOKIE}=([a-f0-9]{32})(?:;|$)`));
  return m ? m[1] : null;
};
const newId = () => [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, "0")).join("");
const cookieFor = (id) => `${COOKIE}=${id}; Path=/api/vroomillion/device-save; HttpOnly; Secure; SameSite=Lax; Max-Age=${YEAR}`;

async function ensureTable(db) {
  await ensureSchema(db);
  await db.prepare("CREATE TABLE IF NOT EXISTS device_saves (id TEXT PRIMARY KEY, data TEXT NOT NULL, updated INTEGER NOT NULL)").run();
}

// a save is an object with a car list; anything else isn't stored
export const validSave = (s) => !!s && typeof s === "object" && !Array.isArray(s) && Array.isArray(s.owned) && s.owned.every((c) => typeof c === "string");

export async function handleDeviceSave(request, env) {
  if (!env.DB) return json({ save: null }, 503);
  if (!siteOrigin(request, env).ok && request.method === "POST") return json({ error: "Bad request." }, 403);
  if (!(await underLimit(env, "device-ip", clientIp(request, env), 30, 60))) return json({ error: "Slow down." }, 429);
  await ensureTable(env.DB);
  const id = readId(request);
  if (request.method === "GET") {
    const row = id ? await env.DB.prepare("SELECT data FROM device_saves WHERE id = ?").bind(id).first() : null;
    let save = null;
    try { save = row ? JSON.parse(row.data) : null; } catch { save = null; }
    const out = json({ save });
    out.headers.set("Cache-Control", "no-store");
    return out;
  }
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const body = await readForm(request, MAX_BYTES);
  if (!validSave(body.save)) return json({ error: "Bad request." }, 400);
  const data = JSON.stringify(body.save);
  if (data.length > MAX_BYTES) return json({ error: "Too big." }, 413);
  const deviceId = id || newId();
  await env.DB.prepare("INSERT INTO device_saves (id, data, updated) VALUES (?, ?, ?) ON CONFLICT (id) DO UPDATE SET data = excluded.data, updated = excluded.updated")
    .bind(deviceId, data, Date.now()).run();
  return json({ ok: true }, 200, { "set-cookie": cookieFor(deviceId) });
}
