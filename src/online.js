// ONLINE 1V1: race a friend, each on your own device. The host (logged in, with Unlimited) creates a
// room and shares its code or link; the friend joins with just a name, no account. Both games get the
// same seven prompts, start together, and swap each round's result through here.
//   POST /api/vroomillion/online { action, ... }
//     create { deck, name, car, power, nitro, prompts, crazy?, equalCars? }  -> { code, token, seat: 0 }      host only
//     join   { code, name, car, power, nitro }           -> { token, seat: 1, ... }
//     state  { code, token }                             -> the room, results so far and server time
//     start  { code, token }                             -> host starts the race (both seats filled)
//     answer { code, token, round, tier, answer, nitro } -> this player's result for a round
//   With the new prompt system the host creates with no prompts; the friend joins with their history
//   of prompt families (seen), the host's state shows it (guestSeen), and the host sends the seven
//   prompts with start, picked fresh for both players.
//     rematch { code, token }                            -> the friend asks the host for a rematch
//   A rematch is a new room: the host sends create with { from, fromToken } (the finished room), and
//   that room's state then names the new code (next), so the friend's game joins it.
// Tokens are random per player and only their hashes are stored; rooms expire after two hours.
import { json, currentUser, ensureSchema, readForm, siteOrigin, clientIp, underLimit, isAdmin } from "./accounts.js";

const ROOM_TTL = 2 * 3600 * 1000;
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no I, L, O, 0, 1
const DECKS = new Set(["classic", "car", "hard"]);
const START_DELAY = 5000; // ms between START and GO, so both phones count down together
const ROUNDS = 7;

const rand = (n) => [...crypto.getRandomValues(new Uint8Array(n))];
const newCode = () => rand(6).map((b) => CODE_CHARS[b % CODE_CHARS.length]).join("");
const newToken = () => rand(16).map((b) => b.toString(16).padStart(2, "0")).join("");
async function sha(text) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const clean = (v, max) => (typeof v === "string" ? v.replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "");
const name = (v) => clean(v, 16) || "RACER";
const num = (v, lo, hi, d) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);

const columnsChecked = new WeakSet();
export async function ensureOnlineSchema(db) {
  await ensureSchema(db);
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS online_rooms (
      code TEXT PRIMARY KEY, created INTEGER NOT NULL, deck TEXT NOT NULL, prompts TEXT NOT NULL, status TEXT NOT NULL,
      host_hash TEXT NOT NULL, host_name TEXT NOT NULL, host_car TEXT, host_power REAL, host_nitro INTEGER,
      guest_hash TEXT, guest_name TEXT, guest_car TEXT, guest_power REAL, guest_nitro INTEGER, start_at INTEGER)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS online_results (
      code TEXT NOT NULL, seat INTEGER NOT NULL, round INTEGER NOT NULL, tier INTEGER NOT NULL, answer TEXT,
      nitro INTEGER NOT NULL DEFAULT 0, at INTEGER NOT NULL, PRIMARY KEY (code, seat, round))`),
  ]);
  // added with rematches; harmless if they're already there (checked once per worker)
  if (columnsChecked.has(db)) return;
  columnsChecked.add(db);
  for (const col of ["next_code TEXT", "rematch_ask INTEGER NOT NULL DEFAULT 0", "guest_seen TEXT", "crazy INTEGER NOT NULL DEFAULT 0", "equal_cars INTEGER NOT NULL DEFAULT 0"]) {
    try { await db.prepare(`ALTER TABLE online_rooms ADD COLUMN ${col}`).run(); } catch {}
  }
}

// which seat a token belongs to in a room (or -1)
async function seatOf(room, token) {
  if (typeof token !== "string" || !/^[a-f0-9]{32}$/.test(token)) return -1;
  const h = await sha(token);
  return h === room.host_hash ? 0 : h === room.guest_hash ? 1 : -1;
}

const MAX_SEEN = 5000;
const seenIn = (v) => (Array.isArray(v) ? v : []).filter((k) => typeof k === "string" && k.length <= 80).slice(-MAX_SEEN);
function view(room, results, seat) {
  return {
    ...(seat === 0 && room.guest_seen ? { guestSeen: JSON.parse(room.guest_seen) } : {}),
    code: room.code, deck: room.deck, crazy: !!room.crazy, equalCars: !!room.equal_cars, status: room.status, startAt: room.start_at || null, now: Date.now(), seat,
    prompts: JSON.parse(room.prompts),
    players: [
      { name: room.host_name, car: room.host_car, power: room.host_power, nitro: room.host_nitro, joined: true },
      { name: room.guest_name || null, car: room.guest_car || null, power: room.guest_power || null, nitro: room.guest_nitro || 0, joined: !!room.guest_hash },
    ],
    next: room.next_code || null, rematchAsk: !!room.rematch_ask,
    results: results.map((r) => ({ seat: r.seat, round: r.round, tier: r.tier, answer: r.answer, nitro: !!r.nitro })),
  };
}

export async function handleOnline(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  if (!env.DB) return json({ error: "Online races aren't set up yet." }, 503);
  if (!siteOrigin(request, env).ok) return json({ error: "Bad request." }, 403);
  // polling while waiting for a friend is about one request a second per player
  if (!(await underLimit(env, "online-ip", clientIp(request, env), 120, 60))) return json({ error: "Slow down." }, 429);
  const body = await readForm(request, 200000); // a friend's history of prompt families comes with join
  const action = String(body.action || "");
  await ensureOnlineSchema(env.DB);
  const db = env.DB;
  const now = Date.now();

  if (action === "create") {
    const user = await currentUser(request, env);
    if (!user) return json({ error: "Log in to create an online race." }, 401);
    if (user.unlimited !== 1 && !isAdmin(user, env)) return json({ error: "Creating online races is part of Unlimited. Your friend can join free.", unlimited: false }, 402);
    if (!(await underLimit(env, "online-create", user.id, 20, 3600))) return json({ error: "That's a lot of races — try again later." }, 429);
    const deck = DECKS.has(body.deck) ? body.deck : "classic";
    const prompts = (Array.isArray(body.prompts) ? body.prompts : []).slice(0, ROUNDS).map((p) => clean(p, 120)).filter(Boolean);
    if (prompts.length !== ROUNDS && prompts.length !== 0) return json({ error: "Bad request." }, 400);
    // tidy rooms older than two hours, and their results
    await db.batch([
      db.prepare("DELETE FROM online_rooms WHERE created < ?").bind(now - ROOM_TTL),
      db.prepare("DELETE FROM online_results WHERE code NOT IN (SELECT code FROM online_rooms)"),
    ]);
    // a rematch: only the host of the finished room can make one, once
    let from = null;
    if (body.from) {
      from = await db.prepare("SELECT * FROM online_rooms WHERE code = ? AND created > ?").bind(clean(body.from, 6).toUpperCase(), now - ROOM_TTL).first();
      if (!from || (await seatOf(from, body.fromToken)) !== 0) return json({ error: "That race has ended. Make a new one." }, 404);
      if (from.next_code) return json({ error: "You already made a rematch for that race." }, 409);
    }
    let code = newCode();
    for (let i = 0; i < 5 && (await db.prepare("SELECT 1 FROM online_rooms WHERE code = ?").bind(code).first()); i++) code = newCode();
    const token = newToken();
    await db.prepare(`INSERT INTO online_rooms (code, created, deck, prompts, status, host_hash, host_name, host_car, host_power, host_nitro)
      VALUES (?, ?, ?, ?, 'waiting', ?, ?, ?, ?, ?)`)
      .bind(code, now, deck, JSON.stringify(prompts), await sha(token), name(body.name), clean(body.car, 40), num(body.power, 1, 12, 1), Math.round(num(body.nitro, 0, 12, 0))).run();
    // the host's race rules: CRAZY MODE (obvious answers score most) and "cars don't matter" (both x1, 2 nitro)
    if (body.crazy || body.equalCars) await db.prepare("UPDATE online_rooms SET crazy = ?, equal_cars = ? WHERE code = ?").bind(body.crazy ? 1 : 0, body.equalCars ? 1 : 0, code).run();
    if (from) await db.prepare("UPDATE online_rooms SET next_code = ? WHERE code = ? AND next_code IS NULL").bind(code, from.code).run();
    return json({ code, token, seat: 0 });
  }

  const code = clean(body.code, 6).toUpperCase();
  const room = code ? await db.prepare("SELECT * FROM online_rooms WHERE code = ? AND created > ?").bind(code, now - ROOM_TTL).first() : null;
  if (!room) return json({ error: "No race with that code. Check it, or ask your friend for a new one." }, 404);

  if (action === "join") {
    if (room.guest_hash) {
      // rejoining with the token you already have is fine (e.g. a page refresh)
      const seat = await seatOf(room, body.token);
      if (seat === 1) return json({ token: body.token, seat: 1 });
      return json({ error: "Someone already joined that race." }, 409);
    }
    const token = newToken();
    await db.prepare("UPDATE online_rooms SET guest_hash = ?, guest_name = ?, guest_car = ?, guest_power = ?, guest_nitro = ?, guest_seen = ? WHERE code = ? AND guest_hash IS NULL")
      .bind(await sha(token), name(body.name), clean(body.car, 40), num(body.power, 1, 12, 1), Math.round(num(body.nitro, 0, 12, 0)), JSON.stringify(seenIn(body.seen)), code).run();
    const now2 = await db.prepare("SELECT guest_hash FROM online_rooms WHERE code = ?").bind(code).first();
    if (now2.guest_hash !== (await sha(token))) return json({ error: "Someone already joined that race." }, 409);
    return json({ token, seat: 1 });
  }

  const seat = await seatOf(room, body.token);
  if (seat < 0) return json({ error: "You're not in that race." }, 403);

  if (action === "state") {
    const results = (await db.prepare("SELECT * FROM online_results WHERE code = ? ORDER BY round").bind(code).all()).results || [];
    return json(view(room, results, seat));
  }
  if (action === "start") {
    if (seat !== 0) return json({ error: "Only the player who made the race can start it." }, 403);
    if (!room.guest_hash) return json({ error: "Your friend hasn't joined yet." }, 409);
    if (room.status === "waiting") {
      // a room made without prompts gets them now, picked by the host's game for both players
      let prompts = JSON.parse(room.prompts);
      if (!prompts.length) {
        prompts = (Array.isArray(body.prompts) ? body.prompts : []).slice(0, ROUNDS).map((p) => clean(p, 120)).filter(Boolean);
        if (prompts.length !== ROUNDS) return json({ error: "Bad request." }, 400);
      }
      await db.prepare("UPDATE online_rooms SET status = 'racing', start_at = ?, prompts = ? WHERE code = ?").bind(now + START_DELAY, JSON.stringify(prompts), code).run();
    }
    const fresh = await db.prepare("SELECT * FROM online_rooms WHERE code = ?").bind(code).first();
    return json(view(fresh, [], seat));
  }
  if (action === "answer") {
    const round = Number.isInteger(body.round) && body.round >= 0 && body.round < ROUNDS ? body.round : -1;
    const tier = Number.isInteger(body.tier) && body.tier >= 0 && body.tier <= 5 ? body.tier : -1;
    if (round < 0 || tier < 0 || room.status !== "racing") return json({ error: "Bad request." }, 400);
    await db.prepare("INSERT OR IGNORE INTO online_results (code, seat, round, tier, answer, nitro, at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(code, seat, round, tier, clean(body.answer, 40), body.nitro ? 1 : 0, now).run();
    return json({ ok: true });
  }
  if (action === "rematch") {
    if (seat === 1 && !room.rematch_ask) await db.prepare("UPDATE online_rooms SET rematch_ask = 1 WHERE code = ?").bind(code).run();
    return json({ ok: true, next: room.next_code || null });
  }
  return json({ error: "Unknown action." }, 400);
}
