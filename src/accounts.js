import { oauthProviders } from "./oauth.js";
import { parseCars } from "./premium.js";
// VROOMILLION accounts: email + password, stored in the D1 database bound as DB.
// Passwords are hashed with PBKDF2-SHA256 and a random salt per user; sessions are
// random tokens kept in an HttpOnly cookie, and only their SHA-256 hash is stored.

const COOKIE = "vr_session";
const SESSION_DAYS = 30;
// The Workers free plan allows about 10 ms of CPU per request, and 100k rounds
// takes ~18 ms, so the default is 50k. Raise PBKDF2_ITERATIONS on a paid plan;
// older hashes are upgraded the next time that person logs in.
const DEFAULT_ITERATIONS = 50000;
const MAX_ITERATIONS = 100000; // the most Workers' PBKDF2 accepts

const enc = new TextEncoder();
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", ...headers },
  });
}

export const iterationsFor = (env) => {
  const n = Number(env.PBKDF2_ITERATIONS);
  return Number.isInteger(n) && n >= 10000 ? Math.min(n, MAX_ITERATIONS) : DEFAULT_ITERATIONS;
};

export async function hashPassword(password, salt, iterations) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return b64(bits);
}

// Compare without stopping at the first difference.
function sameString(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function sha256(text) {
  return b64(await crypto.subtle.digest("SHA-256", enc.encode(text)));
}

export function normalizeEmail(raw) {
  const email = String(raw || "").trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : null;
}

export function checkPassword(raw) {
  const pw = typeof raw === "string" ? raw : "";
  // 10+ characters: the free plan limits how slow the password hash can be, so passwords carry more of the load
  if (pw.length < 10) return "Use at least 10 characters for your password.";
  if (pw.length > 128) return "That password is too long (128 characters max).";
  return null;
}

let schemaReady = false;
export async function ensureSchema(db) {
  if (schemaReady) return;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      pw_hash TEXT NOT NULL,
      pw_salt TEXT NOT NULL,
      pw_iter INTEGER NOT NULL,
      unlimited INTEGER NOT NULL DEFAULT 0,
      pending_session TEXT,
      pending_checked_at INTEGER,
      paid_session TEXT,
      recovery_hash TEXT,
      created_at INTEGER NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS sessions_user ON sessions (user_id)"),
    // attempt counters for rate limits; keys are hashed, rows last a few minutes
    db.prepare(`CREATE TABLE IF NOT EXISTS rate_counts (
      bucket TEXT NOT NULL,
      key TEXT NOT NULL,
      win INTEGER NOT NULL,
      count INTEGER NOT NULL,
      PRIMARY KEY (bucket, key, win)
    )`),
    // races started per day and kind, for the admin stats: counts only, nothing about who
    db.prepare(`CREATE TABLE IF NOT EXISTS race_counts (
      day TEXT NOT NULL,
      kind TEXT NOT NULL,
      n INTEGER NOT NULL,
      PRIMARY KEY (day, kind)
    )`),
  ]);
  // Columns added after the first release; ignore "duplicate column" on databases that have them.
  for (const col of ["pending_checked_at INTEGER", "recovery_hash TEXT", "free_reset_at INTEGER", "seen_prompts TEXT", "unl_races INTEGER", "paid_at INTEGER", "last_seen INTEGER", "progress TEXT", "google_sub TEXT", "apple_sub TEXT", "gifts TEXT", "cars TEXT", "pending_car_session TEXT", "car_checked_at INTEGER", "modes TEXT", "pending_mode_session TEXT", "mode_checked_at INTEGER"]) {
    try { await db.prepare(`ALTER TABLE users ADD COLUMN ${col}`).run(); } catch { /* already there */ }
  }
  for (const col of ["google_sub", "apple_sub", "created_at", "last_seen"]) await db.prepare(`CREATE INDEX IF NOT EXISTS users_${col} ON users (${col})`).run();
  schemaReady = true;
}
export const resetSchemaFlagForTests = () => { schemaReady = false; };

function readCookie(request) {
  const header = request.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === COOKIE) return v.join("=");
  }
  return null;
}

const cookie = (value, maxAge) =>
  `${COOKIE}=${value}; Path=/api/vroomillion; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

export async function startSession(env, userId) {
  const token = b64(crypto.getRandomValues(new Uint8Array(32))).replace(/[+/=]/g, (c) => ({ "+": "-", "/": "_", "=": "" }[c]));
  const expires = Date.now() + SESSION_DAYS * 86400000;
  await env.DB.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(await sha256(token), userId, expires).run();
  // tidy up this person's expired sessions
  await env.DB.prepare("DELETE FROM sessions WHERE user_id = ? AND expires_at < ?").bind(userId, Date.now()).run();
  return cookie(token, SESSION_DAYS * 86400);
}

// The logged-in user for this request, or null.
export async function currentUser(request, env) {
  const token = readCookie(request);
  if (!token || token.length > 100) return null;
  await ensureSchema(env.DB);
  const row = await env.DB.prepare(
    "SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?",
  ).bind(await sha256(token), Date.now()).first();
  return row || null;
}

// Admins are the emails listed in the ADMIN_EMAILS secret (comma separated). They always have
// Unlimited and can use the admin screen (src/admin.js).
// LAUNCH OFFER: accounts made before TRIAL_OFFER_ENDS get Unlimited free for their first 24 hours
// (from created_at, on the server). Accounts made after that don't. The variable TRIAL_OFFER_ENDS
// (an ISO date) can move the end without a code change.
export const TRIAL_MS = 24 * 3600 * 1000;
export const TRIAL_OFFER_ENDS = "2026-11-26T00:00:00Z";
export const trialOfferOpen = (env, now = Date.now()) => now < Date.parse(env?.TRIAL_OFFER_ENDS || TRIAL_OFFER_ENDS);
export const inTrial = (u, now = Date.now(), env = null) => !!u && u.unlimited !== 1 && Number(u.created_at) > now - TRIAL_MS
  && Number(u.created_at) < Date.parse(env?.TRIAL_OFFER_ENDS || TRIAL_OFFER_ENDS);
// Unlimited right now: paid, admin, or still in the free first day
export const hasUnlimited = (u, env) => !!u && (u.unlimited === 1 || isAdmin(u, env) || inTrial(u, Date.now(), env));
// Sign-up doesn't prove someone owns an email, so an address on the list isn't enough on its own: the account
// must have existed before ADMINS_PROVEN_BEFORE (accounts already in use when admins were set up), or its
// owner must have proven the email by signing in with Google or Apple. A stranger who signs up with a listed
// address that had no account yet doesn't become an admin.
export const ADMINS_PROVEN_BEFORE = "2026-11-26T18:00:00Z";
export const isAdmin = (u, env) => !!u && String(env?.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean).includes(u.email)
  && (!!(u.google_sub || u.apple_sub) || Number(u.created_at) < Date.parse(env?.ADMINS_PROVEN_BEFORE || ADMINS_PROVEN_BEFORE));

// freeResetAt: when an admin last gave this player their free races back (the game resets its count)
// cars only an admin can give (public/vroomillion/js/cars.js GIFT_CARS), kept on the account as a JSON list
// themed game modes ($5 each, one-time; src/modes.js), kept on the account as a JSON list
export const GAME_MODE_IDS = ["geo", "film", "music", "sport"];
export function parseModes(text) {
  try { const l = JSON.parse(text || "[]"); return Array.isArray(l) ? l.filter((m) => GAME_MODE_IDS.includes(m)) : []; } catch { return []; }
}
export const GIFT_CARS = ["mazzy", "tessy", "hondeezy", "nico", "zig", "audi5k"];
export function parseGifts(text) {
  try { const l = JSON.parse(text || "[]"); return Array.isArray(l) ? l.filter((c) => GIFT_CARS.includes(c)) : []; } catch { return []; }
}
export const publicUser = (u, env) => ({
  email: u.email,
  unlimited: hasUnlimited(u, env),
  // the free first day: when it ends (null once it's over, or for paid and admin accounts)
  trialEndsAt: !isAdmin(u, env) && inTrial(u, Date.now(), env) ? Number(u.created_at) + TRIAL_MS : null,
  ...(isAdmin(u, env) ? { admin: true } : {}),
  hasPassword: !!u.pw_hash, // false: signs in with Google or Apple
  gifts: parseGifts(u.gifts), // cars an admin gave this account
  cars: parseCars(u.cars), // premium cars bought on this account
  modes: parseModes(u.modes), // themed game modes bought on this account (admins get every one)
  trials: (() => { try { const l = JSON.parse(u.trials || "[]"); return Array.isArray(l) ? l.filter((m) => GAME_MODE_IDS.includes(m)) : []; } catch { return []; } })(), // free trial races used
  freeResetAt: u.free_reset_at || 0,
  // leaderboard name (never the email) and daily-race streak, counted only while it's still alive
  nickname: u.nickname || "RACER " + String(u.id || "").replace(/[^a-z0-9]/gi, "").slice(0, 4).toUpperCase(),
  streak: [today(), today(-1)].includes(u.streak_day) ? Number(u.streak) || 0 : 0,
  streakDay: u.streak_day || null,
});
const today = (offsetDays = 0) => new Date(Date.now() + offsetDays * 86400000).toISOString().slice(0, 10);

// Recovery codes: 20 random characters from an alphabet without look-alikes (~100 bits),
// shown once, stored only as a SHA-256 hash. They let a player reset a forgotten password.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function newRecoveryCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  const chars = [...bytes].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
  return chars.match(/.{5}/g).join("-");
}
const normalizeCode = (raw) => String(raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 40);
const hashCode = (code) => sha256("vroomillion-recovery:" + normalizeCode(code));

// The player's IP, for rate limits and the bot check. Requests that come through the Vercel front end
// arrive from Vercel's servers, so its proxy (api/[...path].js) passes the player's IP in x-client-ip,
// along with x-proxy-secret. That header is trusted only when the secret matches PROXY_SECRET.
export function clientIp(request, env) {
  const secret = env.PROXY_SECRET;
  const given = request.headers.get("x-proxy-secret");
  if (secret && given && sameString(given, secret)) {
    const ip = (request.headers.get("x-client-ip") || "").trim();
    if (ip && ip.length <= 64) return ip;
  }
  return request.headers.get("cf-connecting-ip") || "unknown";
}

// Exact rate limits, counted in D1. Cloudflare's rate-limit bindings are approximate and let bursts
// through (counts sync in the background), so password guessing and payment checks are also counted
// here. Keys are SHA-256 hashes (an IP or an email is never stored), and old windows are deleted.
export async function underLimit(env, bucket, rawKey, limit, periodSec) {
  if (!env.DB || !rawKey || rawKey === "unknown") return true;
  await ensureSchema(env.DB);
  const win = Math.floor(Date.now() / 1000 / periodSec);
  const key = await sha256(bucket + ":" + rawKey);
  const row = await env.DB.prepare(
    "INSERT INTO rate_counts (bucket, key, win, count) VALUES (?, ?, ?, 1) " +
    "ON CONFLICT (bucket, key, win) DO UPDATE SET count = count + 1 RETURNING count",
  ).bind(bucket, key, win).first();
  if (Math.random() < 0.05) {
    await env.DB.prepare("DELETE FROM rate_counts WHERE bucket = ? AND win < ?").bind(bucket, win - 1).run();
  }
  return !row || row.count <= limit;
}

// The site's own origin, plus any front ends listed in ALLOWED_ORIGINS (for example the Vercel
// deployment that proxies /api/* here). Browsers send Origin on POSTs; a request from any other
// site is refused.
export function siteOrigin(request, env) {
  const own = new URL(request.url).origin;
  const from = request.headers.get("origin");
  if (!from || from === own) return { ok: true, origin: own };
  const allowed = String(env.ALLOWED_ORIGINS || "").split(",").map((o) => o.trim()).filter(Boolean);
  return allowed.includes(from) ? { ok: true, origin: from } : { ok: false, origin: own };
}

// Shared checks for the sign-up / log-in forms.
async function guard(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  if (!env.DB) return json({ error: "Accounts aren't set up yet." }, 503);
  if (!siteOrigin(request, env).ok) return json({ error: "Bad request." }, 403);
  const tooMany = json({ error: "Too many tries — wait a minute and try again." }, 429);
  const ip = clientIp(request, env);
  if (env.AUTH_LIMITER && !(await env.AUTH_LIMITER.limit({ key: ip })).success) return tooMany;
  if (!(await underLimit(env, "auth-ip", ip, 10, 60))) return tooMany;
  const len = Number(request.headers.get("content-length") || 0);
  if (len > 4000) return json({ error: "Bad request." }, 413);
  return null;
}

// Reads a small JSON body. The size is checked on the text itself, not on the Content-Length header,
// which a client can leave out or get wrong.
export async function readForm(request, maxBytes = 2000) {
  try {
    const text = await request.text();
    if (text.length > maxBytes) return {};
    const body = JSON.parse(text);
    return body && typeof body === "object" ? body : {};
  } catch {
    return {};
  }
}

// Cloudflare Turnstile bot check on sign-up. It's on when the TURNSTILE_SECRET_KEY (or TURNSTILE_SECRET)
// Worker secret and the TURNSTILE_SITE_KEY variable are set; without them sign-up works as before.
const TURNSTILE_VERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const turnstileSecret = (env) => env.TURNSTILE_SECRET_KEY || env.TURNSTILE_SECRET || "";
export async function passesBotCheck(request, env, token, fetchImpl = fetch) {
  if (!turnstileSecret(env)) return true;
  if (typeof token !== "string" || !token || token.length > 2048) return false;
  const form = new URLSearchParams({ secret: turnstileSecret(env), response: token });
  const ip = clientIp(request, env);
  if (ip !== "unknown") form.set("remoteip", ip);
  try {
    const res = await fetchImpl(TURNSTILE_VERIFY, { method: "POST", body: form, signal: AbortSignal.timeout(5000) });
    const out = await res.json();
    return out.success === true;
  } catch {
    return false;
  }
}

// GET /api/vroomillion/config -> settings the page needs before it can show the sign-up form.
export async function handleConfig(request, env) {
  if (request.method !== "GET") return json({ error: "Method not allowed." }, 405);
  const { announcement } = await import("./stats.js");
  return json({
    turnstileSiteKey: turnstileSecret(env) && env.TURNSTILE_SITE_KEY ? String(env.TURNSTILE_SITE_KEY) : null,
    signIn: oauthProviders(env), // which "Continue with..." buttons to show
    trialOffer: trialOfferOpen(env), // the launch offer (24 hours of Unlimited for new accounts) is on
    announcement: await announcement(env), // the title-screen message set on the admin screen
  });
}

export async function handleSignup(request, env) {
  const stop = await guard(request, env);
  if (stop) return stop;
  const body = await readForm(request, 4000);
  if (!(await passesBotCheck(request, env, body.turnstile))) {
    return json({ error: "The robot check didn't go through. Try it again." }, 400);
  }
  const email = normalizeEmail(body.email);
  if (!email) return json({ error: "Enter a valid email address." }, 400);
  const problem = checkPassword(body.password);
  if (problem) return json({ error: problem }, 400);

  await ensureSchema(env.DB);
  const exists = await env.DB.prepare("SELECT 1 FROM users WHERE email = ?").bind(email).first();
  // Kept vague on purpose, so the form doesn't confirm who has an account.
  const taken = () => json({ error: "Couldn't create an account with that email. If it's yours, log in or reset your password." }, 409);
  if (exists) return taken();

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = iterationsFor(env);
  const id = crypto.randomUUID();
  const recoveryCode = newRecoveryCode();
  try {
    await env.DB.prepare(
      "INSERT INTO users (id, email, pw_hash, pw_salt, pw_iter, recovery_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).bind(id, email, await hashPassword(body.password, salt, iterations), b64(salt), iterations, await hashCode(recoveryCode), Date.now()).run();
  } catch {
    return taken();
  }
  const trial = trialOfferOpen(env);
  return json({ email, unlimited: trial, trialEndsAt: trial ? Date.now() + TRIAL_MS : null, recoveryCode }, 201, { "set-cookie": await startSession(env, id) });
}

export async function handleLogin(request, env) {
  const stop = await guard(request, env);
  if (stop) return stop;
  const body = await readForm(request);
  const email = normalizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password.slice(0, 128) : "";
  const wrong = json({ error: "Wrong email or password." }, 401);
  if (!email || !password) return wrong;
  // per account too, so guesses spread over many IPs still run out
  if (!(await underLimit(env, "login-email", email, 20, 600))) return json({ error: "Too many tries for this account — wait 10 minutes." }, 429);

  await ensureSchema(env.DB);
  const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
  if (!user) {
    // spend the same time as a real check so response timing doesn't reveal which emails exist
    await hashPassword(password, new Uint8Array(16), iterationsFor(env));
    return wrong;
  }
  if (!user.pw_hash) return json({ error: "This account signs in with Google or Apple. Use that button above." }, 401);
  const hash = await hashPassword(password, unb64(user.pw_salt), user.pw_iter);
  if (!sameString(hash, user.pw_hash)) return wrong;

  // upgrade older, weaker hashes
  const want = iterationsFor(env);
  if (user.pw_iter < want) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    await env.DB.prepare("UPDATE users SET pw_hash = ?, pw_salt = ?, pw_iter = ? WHERE id = ?")
      .bind(await hashPassword(password, salt, want), b64(salt), want, user.id).run();
  }
  return json(publicUser(user, env), 200, { "set-cookie": await startSession(env, user.id) });
}

export async function handleLogout(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  if (!siteOrigin(request, env).ok) return json({ error: "Bad request." }, 403); // another site can't log a player out
  const token = readCookie(request);
  if (env.DB && token && token.length <= 100) {
    await ensureSchema(env.DB);
    await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
  }
  return json({ ok: true }, 200, { "set-cookie": cookie("", 0) });
}

// POST /api/vroomillion/delete-account { password } -> removes the account and its sessions.
export async function handleDeleteAccount(request, env) {
  const stop = await guard(request, env);
  if (stop) return stop;
  const user = await currentUser(request, env);
  if (!user) return json({ error: "Log in first." }, 401);
  const body = await readForm(request);
  const password = typeof body.password === "string" ? body.password.slice(0, 128) : "";
  if (!user.pw_hash) {
    // a Google or Apple account has no password: typing DELETE confirms instead
    if (String(body.confirm || "").trim().toUpperCase() !== "DELETE") return json({ error: "Type DELETE to confirm." }, 401);
  } else if (!sameString(await hashPassword(password, unb64(user.pw_salt), user.pw_iter), user.pw_hash)) return json({ error: "Wrong password." }, 401);
  // their leaderboard scores go too (the table exists once a daily score has been sent)
  try { await env.DB.prepare("DELETE FROM daily_scores WHERE user_id = ?").bind(user.id).run(); } catch { /* no scores table yet */ }
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(user.id),
    env.DB.prepare("DELETE FROM users WHERE id = ?").bind(user.id),
  ]);
  return json({ ok: true }, 200, { "set-cookie": cookie("", 0) });
}

// POST /api/vroomillion/reset-password { email, code, password }
// Sets a new password using the recovery code, signs out every device, and issues a new code.
export async function handleResetPassword(request, env) {
  const stop = await guard(request, env);
  if (stop) return stop;
  const body = await readForm(request);
  const email = normalizeEmail(body.email);
  const problem = checkPassword(body.password);
  if (problem) return json({ error: problem }, 400);
  const wrong = json({ error: "That email and recovery code don't match." }, 401);
  if (!email || !normalizeCode(body.code)) return wrong;
  if (!(await underLimit(env, "reset-email", email, 10, 600))) return json({ error: "Too many tries for this account — wait 10 minutes." }, 429);

  await ensureSchema(env.DB);
  const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
  const given = await hashCode(body.code);
  if (!user || !user.recovery_hash || !sameString(given, user.recovery_hash)) return wrong;

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = iterationsFor(env);
  const recoveryCode = newRecoveryCode();
  await env.DB.batch([
    env.DB.prepare("UPDATE users SET pw_hash = ?, pw_salt = ?, pw_iter = ?, recovery_hash = ? WHERE id = ?")
      .bind(await hashPassword(body.password, salt, iterations), b64(salt), iterations, await hashCode(recoveryCode), user.id),
    env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(user.id),
  ]);
  return json({ ...publicUser(user, env), recoveryCode }, 200, { "set-cookie": await startSession(env, user.id) });
}

// POST /api/vroomillion/recovery-code { password } -> a new recovery code (the old one stops working).
export async function handleNewRecoveryCode(request, env) {
  const stop = await guard(request, env);
  if (stop) return stop;
  const user = await currentUser(request, env);
  if (!user) return json({ error: "Log in first." }, 401);
  const body = await readForm(request);
  const password = typeof body.password === "string" ? body.password.slice(0, 128) : "";
  if (!user.pw_hash) return json({ error: "This account signs in with Google or Apple, so it doesn't need a code." }, 400);
  const hash = await hashPassword(password, unb64(user.pw_salt), user.pw_iter);
  if (!sameString(hash, user.pw_hash)) return json({ error: "Wrong password." }, 401);
  const recoveryCode = newRecoveryCode();
  await env.DB.prepare("UPDATE users SET recovery_hash = ? WHERE id = ?").bind(await hashCode(recoveryCode), user.id).run();
  return json({ recoveryCode });
}
