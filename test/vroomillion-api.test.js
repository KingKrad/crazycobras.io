import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import worker from "../src/index.js";
import { resetSchemaFlagForTests, hashPassword } from "../src/accounts.js";

// A tiny stand-in for Cloudflare D1, backed by a real in-memory SQLite database.
function fakeD1() {
  const sql = new DatabaseSync(":memory:");
  const stmt = (q, args = []) => ({
    bind: (...a) => stmt(q, a),
    first: async () => sql.prepare(q).get(...args) ?? null,
    run: async () => { sql.prepare(q).run(...args); return { success: true }; },
    all: async () => ({ results: sql.prepare(q).all(...args) }),
    exec: () => sql.prepare(q).run(...args),
  });
  return { prepare: (q) => stmt(q), batch: async (list) => list.map((s) => s.exec()), sql };
}

const realFetch = globalThis.fetch;
let stripeReply;
let stripeCalls;
test.before(() => {
  globalThis.fetch = async (url, init = {}) => {
    stripeCalls.push({ url: String(url), init });
    const reply = typeof stripeReply === "function" ? stripeReply(String(url), init) : stripeReply;
    return Response.json(reply.body, { status: reply.status ?? 200 });
  };
});
test.after(() => { globalThis.fetch = realFetch; });

let db;
test.beforeEach(() => {
  db = fakeD1();
  resetSchemaFlagForTests();
  stripeReply = { body: {} };
  stripeCalls = [];
});

const ok = { limit: async () => ({ success: true }) };
const env = (o = {}) => ({ STRIPE_SECRET_KEY: "sk_test_x", DB: db, PAY_LIMITER: ok, AUTH_LIMITER: ok, PBKDF2_ITERATIONS: "10000", ...o });
const BASE = "https://game.test/api/vroomillion/";
const post = (path, body, headers = {}) => new Request(BASE + path, {
  method: "POST", body: body == null ? undefined : JSON.stringify(body),
  headers: { origin: "https://game.test", "content-type": "application/json", ...headers },
});
const get = (path, headers = {}) => new Request(BASE + path, { headers });
const cookieOf = (res) => (res.headers.get("set-cookie") || "").split(";")[0];
const ID = "cs_test_a1B2c3D4e5F6g7H8";
const paidSession = (userId) => ({ id: ID, payment_status: "paid", amount_total: 500, metadata: { product: "vroomillion_unlimited", user_id: userId } });

async function signup(email = "racer@example.com", password = "hunter2hunter2") {
  const res = await worker.fetch(post("signup", { email, password }), env());
  return { res, cookie: cookieOf(res), body: await res.clone().json() };
}
const userId = (email = "racer@example.com") => db.sql.prepare("SELECT id FROM users WHERE email = ?").get(email).id;

// ---------- accounts ----------

test("sign up creates an account, a session cookie and a hashed password", async () => {
  const { res, cookie, body } = await signup("  Racer@Example.com ");
  assert.equal(res.status, 201);
  assert.equal(body.email, "racer@example.com");
  assert.equal(body.unlimited, true, "the free first day");
  assert.ok(body.trialEndsAt > Date.now() + 23 * 3600000);
  assert.match(body.recoveryCode, /^[A-Z2-9]{5}(-[A-Z2-9]{5}){3}$/);
  assert.ok(!JSON.stringify(db.sql.prepare("SELECT * FROM users").get()).includes(body.recoveryCode), "only a hash of the code is stored");
  const setCookie = res.headers.get("set-cookie");
  for (const flag of ["HttpOnly", "Secure", "SameSite=Lax", "Path=/api/vroomillion"]) assert.ok(setCookie.includes(flag), flag);
  const row = db.sql.prepare("SELECT * FROM users").get();
  assert.notEqual(row.pw_hash, "hunter2hunter2");
  assert.equal(row.pw_iter, 10000);
  assert.ok(!JSON.stringify(db.sql.prepare("SELECT * FROM sessions").all()).includes(cookie.split("=")[1]), "only a hash of the token is stored");

  const me = await worker.fetch(get("me", { cookie }), env());
  { const j = await me.json(); assert.deepEqual({ email: j.email, unlimited: j.unlimited, freeResetAt: j.freeResetAt, streak: j.streak }, { email: "racer@example.com", unlimited: true, freeResetAt: 0, streak: 0 }); assert.match(j.nickname, /^RACER [A-Z0-9]{4}$/); }
});

test("sign up rejects bad emails, short passwords and duplicate accounts", async () => {
  const bad = async (body) => (await worker.fetch(post("signup", body), env())).status;
  assert.equal(await bad({ email: "nope", password: "longenough" }), 400);
  assert.equal(await bad({ email: "a@b.co", password: "short" }), 400);
  assert.equal(await bad({ email: "a@b.co", password: "x".repeat(129) }), 400);
  assert.equal(await bad({}), 400);
  await signup();
  assert.equal(await bad({ email: "RACER@example.com", password: "anotherpass" }), 409);
});

test("log in works with the right password and gives one answer for any wrong one", async () => {
  await signup();
  const good = await worker.fetch(post("login", { email: "racer@example.com", password: "hunter2hunter2" }), env());
  assert.equal(good.status, 200);
  assert.ok(cookieOf(good).startsWith("vr_session="));
  const wrongPw = await worker.fetch(post("login", { email: "racer@example.com", password: "wrongwrong" }), env());
  const noUser = await worker.fetch(post("login", { email: "ghost@example.com", password: "wrongwrong" }), env());
  assert.equal(wrongPw.status, 401);
  assert.equal(noUser.status, 401);
  assert.deepEqual(await wrongPw.json(), await noUser.json());
});

test("log out ends the session", async () => {
  const { cookie } = await signup();
  const out = await worker.fetch(post("logout", null, { cookie }), env());
  assert.ok(out.headers.get("set-cookie").includes("Max-Age=0"));
  assert.equal((await worker.fetch(get("me", { cookie }), env())).status, 401);
});

test("forged, expired or missing sessions are not logged in", async () => {
  const { cookie } = await signup();
  assert.equal((await worker.fetch(get("me"), env())).status, 401);
  assert.equal((await worker.fetch(get("me", { cookie: "vr_session=forged" }), env())).status, 401);
  db.sql.prepare("UPDATE sessions SET expires_at = 1").run();
  assert.equal((await worker.fetch(get("me", { cookie }), env())).status, 401);
});

test("account endpoints refuse other sites, rate-limited callers and a missing database", async () => {
  const body = { email: "racer@example.com", password: "hunter2hunter2" };
  assert.equal((await worker.fetch(post("signup", body, { origin: "https://evil.test" }), env())).status, 403);
  assert.equal((await worker.fetch(post("login", body), env({ AUTH_LIMITER: { limit: async () => ({ success: false }) } }))).status, 429);
  assert.equal((await worker.fetch(post("signup", body), env({ DB: undefined }))).status, 503);
  assert.equal((await worker.fetch(get("signup"), env())).status, 405);
});

test("older password hashes are upgraded on log in", async () => {
  await signup();
  db.sql.prepare("UPDATE users SET pw_iter = 10000").run();
  const before = db.sql.prepare("SELECT pw_hash FROM users").get().pw_hash;
  const res = await worker.fetch(post("login", { email: "racer@example.com", password: "hunter2hunter2" }), env({ PBKDF2_ITERATIONS: "20000" }));
  assert.equal(res.status, 200);
  const row = db.sql.prepare("SELECT pw_hash, pw_iter FROM users").get();
  assert.equal(row.pw_iter, 20000);
  assert.notEqual(row.pw_hash, before);
  assert.equal((await worker.fetch(post("login", { email: "racer@example.com", password: "hunter2hunter2" }), env({ PBKDF2_ITERATIONS: "20000" }))).status, 200);
});

test("hashing is deterministic for the same salt and different for another", async () => {
  const s1 = new Uint8Array(16);
  const s2 = new Uint8Array(16).fill(1);
  assert.equal(await hashPassword("pw", s1, 10000), await hashPassword("pw", s1, 10000));
  assert.notEqual(await hashPassword("pw", s1, 10000), await hashPassword("pw", s2, 10000));
});

// ---------- buying Unlimited ----------

test("checkout needs an account", async () => {
  const res = await worker.fetch(post("checkout", { acceptNoRefunds: true }), env());
  assert.equal(res.status, 401);
  assert.equal(stripeCalls.length, 0);
});

test("checkout without a Stripe key fails closed", async () => {
  const { cookie } = await signup();
  assert.equal((await worker.fetch(post("checkout", { acceptNoRefunds: true }, { cookie }), env({ STRIPE_SECRET_KEY: undefined }))).status, 503);
});

test("checkout creates a $5 session tied to the account", async () => {
  const { cookie } = await signup();
  stripeReply = { body: { id: ID, url: "https://checkout.stripe.com/c/pay/" + ID } };
  const res = await worker.fetch(post("checkout", { acceptNoRefunds: true }, { cookie }), env());
  assert.equal(res.status, 200);
  assert.equal((await res.json()).url, "https://checkout.stripe.com/c/pay/" + ID);
  const call = stripeCalls[0];
  assert.equal(call.url, "https://api.stripe.com/v1/checkout/sessions");
  assert.equal(call.init.headers.authorization, "Bearer sk_test_x");
  const form = new URLSearchParams(call.init.body);
  assert.equal(form.get("line_items[0][price_data][unit_amount]"), "500");
  assert.equal(form.get("line_items[0][price_data][currency]"), "usd");
  assert.equal(form.get("customer_email"), "racer@example.com");
  assert.equal(form.get("metadata[user_id]"), userId());
  assert.equal(form.get("client_reference_id"), userId());
  assert.equal(form.get("success_url"), "https://game.test/vroomillion/unlocked.html?session_id={CHECKOUT_SESSION_ID}");
  assert.equal(db.sql.prepare("SELECT pending_session FROM users").get().pending_session, ID);
});

test("checkout refuses other sites, rate limits, non-Stripe URLs and accounts that already paid", async () => {
  const { cookie } = await signup();
  assert.equal((await worker.fetch(post("checkout", { acceptNoRefunds: true }, { cookie, origin: "https://evil.test" }), env())).status, 403);
  assert.equal((await worker.fetch(post("checkout", { acceptNoRefunds: true }, { cookie }), env({ PAY_LIMITER: { limit: async () => ({ success: false }) } }))).status, 429);
  stripeReply = { body: { url: "https://evil.test/pay" } };
  assert.equal((await worker.fetch(post("checkout", { acceptNoRefunds: true }, { cookie }), env())).status, 502);
  db.sql.prepare("UPDATE users SET unlimited = 1").run();
  assert.equal((await worker.fetch(post("checkout", { acceptNoRefunds: true }, { cookie }), env())).status, 409);
});

test("a paid checkout upgrades the account that bought it", async () => {
  const { cookie } = await signup();
  stripeReply = { body: paidSession(userId()) };
  const res = await worker.fetch(get("verify?session_id=" + ID), env());
  assert.deepEqual(await res.json(), { paid: true }, "the receipt link doesn't reveal the email");
  assert.equal(stripeCalls.at(-1).url, "https://api.stripe.com/v1/checkout/sessions/" + ID);
  const me = await worker.fetch(get("me", { cookie }), env());
  { const j = await me.json(); assert.deepEqual({ email: j.email, unlimited: j.unlimited, freeResetAt: j.freeResetAt, streak: j.streak }, { email: "racer@example.com", unlimited: true, freeResetAt: 0, streak: 0 }); assert.match(j.nickname, /^RACER [A-Z0-9]{4}$/); }
});

test("unpaid, wrong-price or other-product sessions don't upgrade anyone", async () => {
  await signup();
  const paid = paidSession(userId());
  for (const body of [{ ...paid, payment_status: "unpaid" }, { ...paid, amount_total: 100 }, { ...paid, metadata: { ...paid.metadata, product: "x" } }]) {
    stripeReply = { body };
    assert.deepEqual(await (await worker.fetch(get("verify?session_id=" + ID), env())).json(), { paid: false });
  }
  assert.equal(db.sql.prepare("SELECT unlimited FROM users").get().unlimited, 0);
});

test("verify rejects malformed receipts without calling Stripe, and reports unknown ones", async () => {
  for (const bad of ["", "abc", "cs_test_../../charges", "pi_123456789012345"]) {
    assert.equal((await worker.fetch(get("verify?session_id=" + encodeURIComponent(bad)), env())).status, 400, bad);
  }
  assert.equal(stripeCalls.length, 0);
  stripeReply = { status: 404, body: { error: { message: "No such checkout.session" } } };
  assert.equal((await worker.fetch(get("verify?session_id=" + ID), env())).status, 404);
});

test("closing the tab after paying still unlocks on the next visit", async () => {
  const { cookie } = await signup();
  db.sql.prepare("UPDATE users SET pending_session = ?").run(ID);
  stripeReply = { body: paidSession(userId()) };
  const me = await worker.fetch(get("me", { cookie }), env());
  { const j = await me.json(); assert.deepEqual({ email: j.email, unlimited: j.unlimited, freeResetAt: j.freeResetAt, streak: j.streak }, { email: "racer@example.com", unlimited: true, freeResetAt: 0, streak: 0 }); assert.match(j.nickname, /^RACER [A-Z0-9]{4}$/); }
  const row = db.sql.prepare("SELECT unlimited, pending_session, paid_session FROM users").get();
  assert.deepEqual({ ...row }, { unlimited: 1, pending_session: null, paid_session: ID });
});

test("an abandoned checkout stops being checked once Stripe expires it", async () => {
  const { cookie } = await signup();
  db.sql.prepare("UPDATE users SET pending_session = ?").run(ID);
  stripeReply = { body: { id: ID, status: "expired", payment_status: "unpaid", metadata: { product: "vroomillion_unlimited", user_id: userId() } } };
  await worker.fetch(get("me", { cookie }), env());
  assert.equal(db.sql.prepare("SELECT pending_session FROM users").get().pending_session, null);
  const calls = stripeCalls.length;
  await worker.fetch(get("me", { cookie }), env());
  assert.equal(stripeCalls.length, calls, "no more Stripe calls");
});

test("deleting an account needs the password and removes everything", async () => {
  const { cookie } = await signup();
  assert.equal((await worker.fetch(post("delete-account", { password: "hunter2hunter2" }), env())).status, 401, "needs a session");
  assert.equal((await worker.fetch(post("delete-account", { password: "wrongwrong" }, { cookie }), env())).status, 401);
  const res = await worker.fetch(post("delete-account", { password: "hunter2hunter2" }, { cookie }), env());
  assert.equal(res.status, 200);
  assert.equal(db.sql.prepare("SELECT COUNT(*) AS n FROM users").get().n, 0);
  assert.equal(db.sql.prepare("SELECT COUNT(*) AS n FROM sessions").get().n, 0);
  assert.equal((await worker.fetch(get("me", { cookie }), env())).status, 401);
});

// ---------- password recovery ----------

test("a recovery code resets the password, signs out other devices and is replaced", async () => {
  const { cookie: oldCookie, body } = await signup();
  const code = body.recoveryCode.toLowerCase().replace(/-/g, " "); // typed sloppily
  const res = await worker.fetch(post("reset-password", { email: "racer@example.com", code, password: "brandnewpass" }), env());
  assert.equal(res.status, 200);
  const out = await res.json();
  assert.equal(out.email, "racer@example.com");
  assert.notEqual(out.recoveryCode, body.recoveryCode, "a fresh code is issued");
  assert.equal((await worker.fetch(get("me", { cookie: oldCookie }), env())).status, 401, "old sessions are ended");
  assert.equal((await worker.fetch(post("login", { email: "racer@example.com", password: "hunter2hunter2" }), env())).status, 401);
  assert.equal((await worker.fetch(post("login", { email: "racer@example.com", password: "brandnewpass" }), env())).status, 200);
  const reuse = await worker.fetch(post("reset-password", { email: "racer@example.com", code: body.recoveryCode, password: "anotherpass1" }), env());
  assert.equal(reuse.status, 401, "the old code no longer works");
});

test("wrong codes, unknown emails and weak new passwords are refused", async () => {
  await signup();
  const tryReset = async (b) => (await worker.fetch(post("reset-password", b), env())).status;
  assert.equal(await tryReset({ email: "racer@example.com", code: "AAAAA-AAAAA-AAAAA-AAAAA", password: "brandnewpass" }), 401);
  assert.equal(await tryReset({ email: "ghost@example.com", code: "AAAAA-AAAAA-AAAAA-AAAAA", password: "brandnewpass" }), 401);
  assert.equal(await tryReset({ email: "racer@example.com", code: "", password: "brandnewpass" }), 401);
  assert.equal(await tryReset({ email: "racer@example.com", code: "AAAAA", password: "short" }), 400);
  assert.equal((await worker.fetch(post("reset-password", { email: "racer@example.com", code: "x", password: "brandnewpass" }), env({ AUTH_LIMITER: { limit: async () => ({ success: false }) } }))).status, 429);
});

test("a logged-in player can make a new recovery code with their password", async () => {
  const { cookie, body } = await signup();
  assert.equal((await worker.fetch(post("recovery-code", { password: "hunter2hunter2" }), env())).status, 401, "needs a session");
  assert.equal((await worker.fetch(post("recovery-code", { password: "wrongwrong" }, { cookie }), env())).status, 401);
  const res = await worker.fetch(post("recovery-code", { password: "hunter2hunter2" }, { cookie }), env());
  const { recoveryCode } = await res.json();
  assert.notEqual(recoveryCode, body.recoveryCode);
  assert.equal((await worker.fetch(post("reset-password", { email: "racer@example.com", code: body.recoveryCode, password: "brandnewpass" }), env())).status, 401);
  assert.equal((await worker.fetch(post("reset-password", { email: "racer@example.com", code: recoveryCode, password: "brandnewpass" }), env())).status, 200);
});

// ---------- not spamming Stripe ----------

test("/me checks a pending payment with Stripe at most once a minute", async () => {
  const { cookie } = await signup();
  db.sql.prepare("UPDATE users SET pending_session = ?").run(ID);
  stripeReply = { body: { id: ID, status: "open", payment_status: "unpaid", metadata: { product: "vroomillion_unlimited", user_id: userId() } } };
  for (let i = 0; i < 5; i++) await worker.fetch(get("me", { cookie }), env());
  assert.equal(stripeCalls.length, 1);
  db.sql.prepare("UPDATE users SET pending_checked_at = ?").run(Date.now() - 61000);
  await worker.fetch(get("me", { cookie }), env());
  assert.equal(stripeCalls.length, 2);
});

test("/verify is rate limited", async () => {
  const res = await worker.fetch(get("verify?session_id=" + ID), env({ PAY_LIMITER: { limit: async () => ({ success: false }) } }));
  assert.equal(res.status, 429);
  assert.equal(stripeCalls.length, 0);
});

test("a database from before recovery codes gets the new columns", async () => {
  db.sql.exec(`CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, pw_hash TEXT NOT NULL, pw_salt TEXT NOT NULL,
    pw_iter INTEGER NOT NULL, unlimited INTEGER NOT NULL DEFAULT 0, pending_session TEXT, paid_session TEXT, created_at INTEGER NOT NULL)`);
  const { res, body } = await signup();
  assert.equal(res.status, 201);
  assert.ok(body.recoveryCode);
  const cols = db.sql.prepare("PRAGMA table_info(users)").all().map((c) => c.name);
  assert.ok(cols.includes("recovery_hash") && cols.includes("pending_checked_at"));
});

test("checkout requires ticking the no-refunds box and records when it was ticked", async () => {
  const { cookie } = await signup();
  for (const body of [null, {}, { acceptNoRefunds: "yes" }, { acceptNoRefunds: false }]) {
    const res = await worker.fetch(post("checkout", body, { cookie }), env());
    assert.equal(res.status, 400, JSON.stringify(body));
  }
  assert.equal(stripeCalls.length, 0);
  stripeReply = { body: { id: ID, url: "https://checkout.stripe.com/c/pay/" + ID } };
  const before = Date.now();
  assert.equal((await worker.fetch(post("checkout", { acceptNoRefunds: true }, { cookie }), env())).status, 200);
  const at = Date.parse(new URLSearchParams(stripeCalls[0].init.body).get("metadata[no_refund_accepted_at]"));
  assert.ok(at >= before - 1000 && at <= Date.now() + 1000);
});

// ---------- live answer check ----------
import { handleCheck, checkQuery, cleanAnswer } from "../src/check.js";

const wd = (rows) => async (_url, init) => {
  wd.last = decodeURIComponent(String(init.body).slice(6));
  return new Response(JSON.stringify({ results: { bindings: rows.map(([l, n]) => ({ l: { value: l }, n: { value: String(n) } })) } }), { status: 200 });
};
const ask = (body, fetchImpl) => handleCheck(new Request("https://x/api/vroomillion/check", { method: "POST", body: JSON.stringify(body) }), {}, fetchImpl);

test("live check accepts a real thing of the right kind (mayochup is a condiment)", async () => {
  const res = await ask({ prompt: "Name a sauce or condiment", answer: "Mayochup" }, wd([["mayochup", 0]]));
  const j = await res.json();
  assert.equal(j.found, true);
  assert.equal(j.label, "mayochup");
  assert.equal(j.n, 0);
  assert.ok(Array.isArray(j.tiers));
  assert.ok(wd.last.includes('mwapi:search "Mayochup"'), "searches Wikidata for the answer");
  assert.ok(wd.last.includes("FILTER EXISTS"), "and checks it's the right kind of thing");
});

test("live check says no when nothing of that kind is found, and for unknown prompts or junk", async () => {
  assert.equal((await (await ask({ prompt: "Name a sauce or condiment", answer: "banana" }, wd([]))).json()).found, false);
  let called = false;
  const spy = async () => { called = true; return new Response("{}"); };
  assert.equal((await (await ask({ prompt: "Name a made-up thing", answer: "mayochup" }, spy)).json()).found, false);
  assert.equal((await (await ask({ prompt: "Name a sauce or condiment", answer: "ab" }, spy)).json()).found, false);
  assert.equal(called, false, "no lookup for unknown prompts or too-short answers");
  assert.equal((await (await ask({ prompt: "Name a toy", answer: "dildo" }, spy)).json()).found, false, "blocked words never count");
});

test("live check escapes the answer safely inside the query", () => {
  const q = checkQuery("?i wdt:P31 wd:Q1.", cleanAnswer('mayo" } ; DROP <x> # \\'));
  assert.ok(!q.includes('mayo" }'), "a quote can't end the search string");
  assert.equal(cleanAnswer("  Mayo<script>chup  "), "Mayo script chup");
});

test("a failed lookup doesn't count as a no forever", async () => {
  const res = await ask({ prompt: "Name a sauce or condiment", answer: "mayochup" }, async () => new Response("down", { status: 503 }));
  assert.equal(res.status, 502);
});

test("live check retries once when Wikidata times out, and exact checks search wider", async () => {
  let calls = 0;
  const flaky = async (url, init) => {
    calls++;
    if (calls === 1) throw new Error("timeout");
    return wd([["stag beetle", 40]])(url, init);
  };
  const j = await (await ask({ prompt: "Name an insect", answer: "stag beetle" }, flaky)).json();
  assert.equal(calls, 2);
  assert.equal(j.found, true);
  assert.ok(checkQuery("?i wdt:P31 wd:Q1.", "firefly", true).includes('mwapi:limit "20"'));
  assert.ok(checkQuery("?i wdt:P31 wd:Q1.", "firefly").includes('mwapi:limit "7"'));
});

// ---------- admin ----------
const adminEnv = () => env({ ADMIN_EMAILS: "Boss@Example.com, other@example.com" });

test("admins always have Unlimited, and only they can use the admin API", async () => {
  const boss = await signup("boss@example.com");
  const player = await signup("racer@example.com");
  const me = await (await worker.fetch(get("me", { cookie: boss.cookie }), adminEnv())).json();
  assert.equal(me.unlimited, true);
  assert.equal(me.admin, true);
  const asPlayer = await worker.fetch(post("admin", { action: "stats" }, { cookie: player.cookie }), adminEnv());
  assert.equal(asPlayer.status, 404, "players can't see the admin API");
  const loggedOut = await worker.fetch(post("admin", { action: "stats" }), adminEnv());
  assert.equal(loggedOut.status, 404);
  const fromElsewhere = await worker.fetch(post("admin", { action: "stats" }, { cookie: boss.cookie, origin: "https://evil.example" }), adminEnv());
  assert.equal(fromElsewhere.status, 403);
  const checkout = await worker.fetch(post("checkout", { acceptNoRefunds: true }, { cookie: boss.cookie }), adminEnv());
  assert.equal(checkout.status, 409, "admins don't need to buy");
});

test("admins grant and remove Unlimited, give free races back, and see stats", async () => {
  const boss = await signup("boss@example.com");
  await signup("racer@example.com");
  const call = async (body) => worker.fetch(post("admin", body, { cookie: boss.cookie }), adminEnv());
  assert.equal((await (await call({ action: "lookup", email: "racer@example.com" })).json()).unlimited, false);
  assert.equal((await (await call({ action: "set-unlimited", email: "racer@example.com", unlimited: true })).json()).unlimited, true);
  assert.equal(db.sql.prepare("SELECT unlimited FROM users WHERE email = 'racer@example.com'").get().unlimited, 1);
  assert.equal((await (await call({ action: "set-unlimited", email: "racer@example.com", unlimited: false })).json()).unlimited, false);
  const reset = await (await call({ action: "reset-free", email: "racer@example.com" })).json();
  assert.ok(reset.freeResetAt > 0);
  assert.equal((await call({ action: "lookup", email: "nobody@example.com" })).status, 404);

  for (const kind of ["solo-classic", "solo-classic", "versus"]) await worker.fetch(post("race-start", { kind }), adminEnv());
  assert.equal((await worker.fetch(post("race-start", { kind: "bogus" }), adminEnv())).status, 400);
  const stats = await (await call({ action: "stats" })).json();
  assert.equal(stats.users, 2);
  assert.equal(stats.races[0]["solo-classic"], 2);
  assert.equal(stats.races[0].versus, 1);
  assert.equal(stats.races[0].total, 3);
  assert.equal(stats.races.length, 14);
});

// ---------- seen prompts ----------

test("seen prompts are kept on the account and follow it to other devices", async () => {
  const { cookie } = await signup();
  const seen = async (body, c = cookie) => { const r = await worker.fetch(post("seen", body, { cookie: c }), env()); return { status: r.status, body: await r.json() }; };
  assert.deepEqual((await seen({})).body.seen, [], "nothing seen yet");
  assert.deepEqual((await seen({ add: ["Name a fruit", "Name a dog breed"] })).body.seen, ["Name a fruit", "Name a dog breed"]);
  assert.deepEqual((await seen({ add: ["Name a fruit", "Name a pet"] })).body.seen, ["Name a fruit", "Name a dog breed", "Name a pet"], "no duplicates");
  // another device: log in again and read the same list
  const login = await worker.fetch(post("login", { email: "racer@example.com", password: "hunter2hunter2" }), env());
  assert.deepEqual((await seen({}, cookieOf(login))).body.seen, ["Name a fruit", "Name a dog breed", "Name a pet"]);
  assert.deepEqual((await seen({ remove: ["Name a dog breed"] })).body.seen, ["Name a fruit", "Name a pet"], "start over removes");
  // junk is ignored, not stored
  assert.deepEqual((await seen({ add: [42, "", "x".repeat(500), { a: 1 }] })).body.seen, ["Name a fruit", "Name a pet"]);
});

test("seen prompts need an account and a request from the site", async () => {
  const { cookie } = await signup();
  assert.equal((await worker.fetch(post("seen", { add: ["Name a fruit"] }), env())).status, 401, "no account: the device keeps its own list");
  assert.equal((await worker.fetch(post("seen", { add: ["Name a fruit"] }, { cookie, origin: "https://evil.test" }), env())).status, 403);
  assert.equal((await worker.fetch(get("seen", { cookie }), env())).status, 405);
  const other = await signup("other@example.com");
  await worker.fetch(post("seen", { add: ["Name a fruit"] }, { cookie }), env());
  const r = await worker.fetch(post("seen", {}, { cookie: other.cookie }), env());
  assert.deepEqual((await r.json()).seen, [], "each account has its own list");
});

test("Unlimited race numbers are counted on the account", async () => {
  const { cookie } = await signup();
  const call = async (body) => (await (await worker.fetch(post("seen", body, { cookie }), env())).json()).races;
  assert.equal(await call({}), 0);
  assert.equal(await call({ race: true }), 1);
  assert.equal(await call({ race: true, add: ["Name a fruit"] }), 2);
  assert.equal(await call({ racesAtLeast: 10 }), 10, "a device that already ran 10 races carries its count up");
  assert.equal(await call({ racesAtLeast: 3 }), 10, "never goes down");
  assert.equal(await call({ race: "yes" }), 10, "junk is ignored");
});

// ---------- daily races ----------

test("daily scores make a leaderboard of nicknames (never emails), one score per race, and a streak", async () => {
  const a = await signup("a@example.com"), b = await signup("b@example.com");
  const send = (c, body) => worker.fetch(post("daily", body, { cookie: c }), env());
  const tiers = [5, 5, 4, 4, 3, 3, 2];
  let r = await send(a.cookie, { race: 1, metres: 9000, tiers });
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json().then((j) => [j.rank, j.streak]), [1, 1]);
  assert.equal((await (await send(a.cookie, { race: 1, metres: 20000, tiers })).json()).metres, 9000, "the first score counts");
  r = await send(b.cookie, { race: 1, metres: 12000, tiers });
  assert.equal((await r.json()).rank, 1, "b beats a");
  assert.equal((await worker.fetch(post("nickname", { nickname: "Speedy Gonzo" }, { cookie: b.cookie }), env())).status, 200);
  assert.equal((await worker.fetch(post("nickname", { nickname: "speedy gonzo" }, { cookie: a.cookie }), env())).status, 409, "names are unique");
  assert.equal((await worker.fetch(post("nickname", { nickname: "x" }, { cookie: a.cookie }), env())).status, 400);
  assert.equal((await worker.fetch(post("nickname", { nickname: "big shit" }, { cookie: a.cookie }), env())).status, 400, "nothing rude");
  const board = await (await worker.fetch(get("daily-board?race=1", { cookie: a.cookie }), env())).json();
  assert.equal(board.players, 2);
  assert.deepEqual(board.top.map((t) => [t.name, t.metres]), [["Speedy Gonzo", 12000], [board.top[1].name, 9000]]);
  assert.match(board.top[1].name, /^RACER /);
  assert.ok(!JSON.stringify(board).includes("@"), "no emails on the board");
  assert.deepEqual([board.me.rank, board.me.metres], [2, 9000]);
  assert.equal((await (await worker.fetch(get("daily-board?race=2"), env())).json()).top.length, 0);
});

test("daily scores refuse impossible distances, guests and other sites", async () => {
  const { cookie } = await signup();
  const send = (body, h = {}) => worker.fetch(post("daily", body, { cookie, ...h }), env());
  assert.equal((await send({ race: 1, metres: 999999, tiers: [5, 5, 5, 5, 5, 5, 5] })).status, 400);
  assert.equal((await send({ race: 1, metres: 20000, tiers: [1, 1, 1, 1, 1, 1, 1] })).status, 400, "too far for those answers");
  assert.equal((await send({ race: 3, metres: 100, tiers: [1, 1, 1, 1, 1, 1, 1] })).status, 400);
  assert.equal((await send({ race: 1, metres: 100, tiers: [1, 1] })).status, 400);
  assert.equal((await worker.fetch(post("daily", { race: 1, metres: 100, tiers: [1, 1, 1, 1, 1, 1, 1] }), env())).status, 401);
  assert.equal((await send({ race: 1, metres: 100, tiers: [1, 1, 1, 1, 1, 1, 1] }, { origin: "https://evil.test" })).status, 403);
});

// ---------- device save backup ----------

test("device progress is backed up under an anonymous cookie and comes back", async () => {
  const save = { cash: 12345, owned: ["rustbucket", "wrangler"], car: "wrangler", passport: { beach: 3100 } };
  let r = await worker.fetch(get("device-save"), env());
  assert.deepEqual(await r.json(), { save: null }, "nothing saved yet");
  r = await worker.fetch(post("device-save", { save }), env());
  assert.equal(r.status, 200);
  const cookie = cookieOf(r);
  assert.match(cookie, /^vroom_device=[a-f0-9]{32}$/);
  assert.match(r.headers.get("set-cookie"), /HttpOnly; Secure; SameSite=Lax; Max-Age=34560000/);
  r = await worker.fetch(get("device-save", { cookie }), env());
  assert.deepEqual((await r.json()).save, save, "the same device gets its progress back");
  r = await worker.fetch(post("device-save", { save: { ...save, cash: 99 } }, { cookie }), env());
  assert.equal(cookieOf(r), cookie, "same device, same ID");
  assert.equal((await (await worker.fetch(get("device-save", { cookie }), env())).json()).save.cash, 99);
  assert.deepEqual(await (await worker.fetch(get("device-save", { cookie: "vroom_device=" + "0".repeat(32) }), env())).json(), { save: null }, "another device's ID finds nothing");
});

test("device saves refuse junk, huge saves and other sites", async () => {
  assert.equal((await worker.fetch(post("device-save", { save: { cash: 5 } }), env())).status, 400, "not a save");
  assert.equal((await worker.fetch(post("device-save", { save: [1, 2] }), env())).status, 400);
  assert.equal((await worker.fetch(post("device-save", { save: { owned: ["x"], pad: "x".repeat(130000) } }), env())).status, 400, "too big is dropped");
  assert.equal((await worker.fetch(post("device-save", { save: { owned: ["x"] } }, { origin: "https://evil.test" }), env())).status, 403);
});

test("account progress: only for logged-in players, stored without the prompt history", async () => {
  assert.equal((await worker.fetch(get("progress"), env())).status, 401);
  const { cookie } = await signup("saver@example.com");
  assert.equal((await (await worker.fetch(get("progress", { cookie }), env())).json()).save, null);
  const save = { cash: 500, owned: ["rustbucket", "minivan"], races: 4, passport: { town: 900 }, seen: ["a"], acctSeen: { list: ["b"] } };
  assert.equal((await worker.fetch(post("progress", { save }, { cookie }), env())).status, 200);
  const back = (await (await worker.fetch(get("progress", { cookie }), env())).json()).save;
  assert.deepEqual(back, { cash: 500, owned: ["rustbucket", "minivan"], races: 4, passport: { town: 900 } });
  assert.equal((await worker.fetch(post("progress", { save: { cash: 1 } }, { cookie }), env())).status, 400);
  assert.equal((await worker.fetch(post("progress", { save }, { cookie, origin: "https://evil.test" }), env())).status, 403);
});

// ---------- the bigger admin screen ----------

test("round stats count plays, stalls, tiers and accepted answers, never free text", async () => {
  const send = (rounds) => worker.fetch(post("round-stats", { rounds }), env());
  assert.equal((await send([{ prompt: "Name a fruit", answer: "Apple", tier: 1 }, { prompt: "Name a fruit", answer: "my phone number 555", tier: 0 }, { prompt: "Name a fruit", answer: "Durian", tier: 3 }])).status, 200);
  const s = db.sql.prepare("SELECT * FROM prompt_stats WHERE prompt = 'Name a fruit'").get();
  assert.deepEqual([s.plays, s.stalls, s.t1, s.t3], [3, 1, 1, 1]);
  const answers = db.sql.prepare("SELECT answer FROM answer_stats ORDER BY answer").all().map((r) => r.answer);
  assert.deepEqual(answers, ["apple", "durian"], "a stalled (unaccepted) answer is never stored");
  assert.equal((await send([])).status, 400);
  assert.equal((await worker.fetch(post("round-stats", { rounds: [{ prompt: "x", tier: 1 }] }, { origin: "https://evil.test" }), env())).status, 403);
});

test("players can report an answer, and admins work through the reports", async () => {
  assert.equal((await worker.fetch(post("report", { prompt: "Name a fruit", answer: "durian", tier: 4, reason: "too-rare", note: "everyone knows durian" }), env())).status, 200);
  assert.equal((await worker.fetch(post("report", { prompt: "Name a fruit", answer: "x", tier: 1, reason: "made-up" }), env())).status, 400);
  const boss = await signup("boss@example.com");
  const call = async (body) => (await worker.fetch(post("admin", body, { cookie: boss.cookie }), adminEnv())).json();
  const open = await call({ action: "reports" });
  assert.equal(open.reports.length, 1);
  assert.equal(open.reports[0].note, "everyone knows durian");
  await call({ action: "resolve-report", id: open.reports[0].id, status: "fixed" });
  assert.equal((await call({ action: "reports" })).reports.length, 0);
  assert.equal((await call({ action: "reports", status: "fixed" })).reports.length, 1);
});

test("admin overview, player list, daily moderation, announcement and deleting a player", async () => {
  const boss = await signup("boss@example.com");
  const racer = await signup("racer@example.com");
  const call = async (body) => (await worker.fetch(post("admin", body, { cookie: boss.cookie }), adminEnv())).json();
  db.sql.prepare("UPDATE users SET paid_session = 'cs_x', paid_at = ?, unlimited = 1 WHERE email = 'racer@example.com'").run(Date.now());
  const o = await call({ action: "overview" });
  assert.equal(o.money.allTime, 5);
  assert.equal(o.money.today, 5);
  assert.equal(o.signups.length, 14);
  assert.equal(o.signups.at(-1).n, 2, "two sign-ups today");
  const list = await call({ action: "players" });
  assert.equal(list.total, 2);
  assert.equal((await call({ action: "players", q: "racer" })).players[0].email, "racer@example.com");
  // leaderboard moderation
  await worker.fetch(post("daily", { race: 1, metres: 5000, tiers: [3, 3, 3, 3, 3, 3, 3] }, { cookie: racer.cookie }), env());
  await worker.fetch(post("nickname", { nickname: "Sneaky Pete" }, { cookie: racer.cookie }), env());
  let daily = await call({ action: "daily" });
  assert.equal(daily.races[0].players, 1);
  assert.equal(daily.races[0].scores[0].nickname, "Sneaky Pete");
  await call({ action: "reset-nickname", email: "racer@example.com" });
  await call({ action: "remove-score", email: "racer@example.com", race: 1, day: daily.day });
  daily = await call({ action: "daily" });
  assert.equal(daily.races[0].players, 0);
  assert.equal(db.sql.prepare("SELECT nickname FROM users WHERE email = 'racer@example.com'").get().nickname, null);
  // announcement shows in /config for everyone
  await call({ action: "set-announcement", text: "New prompts this weekend!" });
  assert.equal((await (await worker.fetch(get("config"), env())).json()).announcement, "New prompts this weekend!");
  await call({ action: "set-announcement", text: "" });
  assert.equal((await (await worker.fetch(get("config"), env())).json()).announcement, null);
  // deleting needs the email typed again, and never an admin
  assert.ok((await call({ action: "delete-player", email: "racer@example.com", confirm: "nope@example.com" })).error);
  assert.ok((await call({ action: "delete-player", email: "boss@example.com", confirm: "boss@example.com" })).error);
  assert.equal((await call({ action: "delete-player", email: "racer@example.com", confirm: "racer@example.com" })).deleted, "racer@example.com");
  assert.equal(db.sql.prepare("SELECT COUNT(*) AS n FROM users WHERE email = 'racer@example.com'").get().n, 0);
  // and none of it for a normal player
  assert.equal((await worker.fetch(post("admin", { action: "overview" }, { cookie: (await signup("x@example.com")).cookie }), adminEnv())).status, 404);
});

// ---------- online 1v1 ----------

test("online 1v1: an Unlimited host makes a room, a friend joins without an account, they swap results", async () => {
  const prompts = ["Name a fruit", "Name a dog breed", "Name a country", "Name a colour", "Name a sport", "Name a car brand", "Name a bird"];
  const on = (body, h = {}) => worker.fetch(post("online", body, h), env());
  const host = await signup("host@example.com");
  db.sql.prepare("UPDATE users SET created_at = 0 WHERE email = 'host@example.com'").run(); // past the free first day
  // needs Unlimited to create
  let r = await on({ action: "create", deck: "classic", name: "Hosty", prompts }, { cookie: host.cookie });
  assert.equal(r.status, 402);
  db.sql.prepare("UPDATE users SET unlimited = 1 WHERE email = 'host@example.com'").run();
  assert.equal((await on({ action: "create", prompts })).status, 401, "no account, no room");
  r = await on({ action: "create", deck: "car", name: "Hosty", car: "chiron", power: 4.1, nitro: 4, prompts }, { cookie: host.cookie });
  const room = await r.json();
  assert.match(room.code, /^[A-HJ-NP-Z2-9]{6}$/);
  // the friend: no cookie at all
  const g = await (await on({ action: "join", code: room.code.toLowerCase(), name: "Pal", car: "rustbucket", power: 1, nitro: 0 })).json();
  assert.equal(g.seat, 1);
  assert.equal((await on({ action: "join", code: room.code, name: "Third" })).status, 409, "two players only");
  let st = await (await on({ action: "state", code: room.code, token: g.token })).json();
  assert.deepEqual(st.prompts, prompts);
  assert.equal(st.deck, "car");
  assert.deepEqual(st.players.map((p) => p.name), ["Hosty", "Pal"]);
  assert.equal((await on({ action: "start", code: room.code, token: g.token })).status, 403, "only the host starts");
  st = await (await on({ action: "start", code: room.code, token: room.token })).json();
  assert.equal(st.status, "racing");
  assert.ok(st.startAt > st.now);
  await on({ action: "answer", code: room.code, token: room.token, round: 0, tier: 4, answer: "durian", nitro: true });
  await on({ action: "answer", code: room.code, token: g.token, round: 0, tier: 1, answer: "apple" });
  await on({ action: "answer", code: room.code, token: g.token, round: 0, tier: 5, answer: "changed my mind" });
  st = await (await on({ action: "state", code: room.code, token: g.token })).json();
  assert.deepEqual(st.results.map((x) => [x.seat, x.tier, x.answer, x.nitro]), [[0, 4, "durian", true], [1, 1, "apple", false]], "first answer per round counts");
  assert.equal((await on({ action: "state", code: room.code, token: "0".repeat(32) })).status, 403);
  assert.equal((await on({ action: "state", code: "ZZZZZZ", token: g.token })).status, 404);
  // rematch: the friend asks, the host makes the new room, the friend's game finds it in the old one
  assert.equal((await (await on({ action: "rematch", code: room.code, token: g.token })).json()).next, null);
  st = await (await on({ action: "state", code: room.code, token: room.token })).json();
  assert.equal(st.rematchAsk, true);
  assert.equal((await on({ action: "create", prompts, from: room.code, fromToken: g.token }, { cookie: host.cookie })).status, 404, "only the host makes the rematch");
  const again = await (await on({ action: "create", deck: "car", name: "Hosty", prompts, from: room.code, fromToken: room.token }, { cookie: host.cookie })).json();
  assert.notEqual(again.code, room.code);
  assert.equal((await on({ action: "create", prompts, from: room.code, fromToken: room.token }, { cookie: host.cookie })).status, 409, "one rematch per race");
  st = await (await on({ action: "state", code: room.code, token: g.token })).json();
  assert.equal(st.next, again.code);
  assert.equal((await on({ action: "join", code: st.next, name: "Pal" })).status, 200);
});

test("online 1v1 rules: CRAZY MODE and EQUAL CARS are set by the host and seen by both", async () => {
  const on = (body, h = {}) => worker.fetch(post("online", body, h), env());
  const host = await signup("host3@example.com");
  db.sql.prepare("UPDATE users SET unlimited = 1 WHERE email = 'host3@example.com'").run();
  const plain = await (await on({ action: "create", deck: "classic", name: "H", prompts: [] }, { cookie: host.cookie })).json();
  let st = await (await on({ action: "state", code: plain.code, token: plain.token })).json();
  assert.equal(st.crazy, false);
  assert.equal(st.equalCars, false);
  const room = await (await on({ action: "create", deck: "classic", name: "H", prompts: [], crazy: true, equalCars: true }, { cookie: host.cookie })).json();
  const g = await (await on({ action: "join", code: room.code, name: "G" })).json();
  st = await (await on({ action: "state", code: room.code, token: g.token })).json();
  assert.equal(st.crazy, true);
  assert.equal(st.equalCars, true);
});

test("online 1v1, new prompt system: no prompts at create, the friend's history goes to the host, prompts come with start", async () => {
  const on = (body, h = {}) => worker.fetch(post("online", body, h), env());
  const host = await signup("host2@example.com");
  db.sql.prepare("UPDATE users SET unlimited = 1 WHERE email = 'host2@example.com'").run();
  const room = await (await on({ action: "create", deck: "classic", name: "H", prompts: [] }, { cookie: host.cookie })).json();
  const g = await (await on({ action: "join", code: room.code, name: "G", seen: ["F:fruit/fruit", "F:dog/dog"] })).json();
  let st = await (await on({ action: "state", code: room.code, token: room.token })).json();
  assert.deepEqual(st.guestSeen, ["F:fruit/fruit", "F:dog/dog"]);
  assert.equal((await (await on({ action: "state", code: room.code, token: g.token })).json()).guestSeen, undefined, "only the host sees it");
  assert.equal((await on({ action: "start", code: room.code, token: room.token })).status, 400, "start needs the prompts");
  const prompts = ["a", "b", "c", "d", "e", "f", "g"].map((x) => "Name " + x);
  st = await (await on({ action: "start", code: room.code, token: room.token, prompts })).json();
  assert.deepEqual(st.prompts, prompts);
  assert.equal(st.status, "racing");
});

// ---------- the AI judge (catalog prompts; Workers AI is faked here) ----------
const fakeAI = (verdict) => ({ calls: 0, async run(model, input) { this.calls++; this.last = { model, input }; if (verdict instanceof Error) throw verdict; return { response: verdict }; } });
const askJudge = (body, env) => handleCheck(new Request("https://x/api/vroomillion/check", { method: "POST", body: JSON.stringify(body) }), env, async () => { throw new Error("no wikidata here"); });

test("AI judge: a hand-written catalog prompt accepts a fitting answer that isn't on the list, tier from how common it is", async () => {
  const AI = fakeAI({ valid: true, canonical: "a lime popsicle", commonness: "uncommon" });
  const j = await (await askJudge({ prompt: "Name something green", answer: "Lime popsicle" }, { AI })).json();
  assert.deepEqual([j.found, j.label, j.tier], [true, "a lime popsicle", 3]);
  assert.match(AI.last.model, /^@cf\//);
  assert.equal(AI.last.input.response_format.type, "json_schema");
  assert.match(AI.last.input.messages[1].content, /Name something green/);
  // a JSON string reply works too
  const AI2 = fakeAI(JSON.stringify({ valid: true, canonical: "grass", commonness: "very common" }));
  assert.equal((await (await askJudge({ prompt: "Name something green", answer: "grass" }, { AI: AI2 })).json()).tier, 1);
});

test("AI judge: says no to answers it rejects and on errors, and is off without the binding or for prompts outside the catalog", async () => {
  assert.equal((await (await askJudge({ prompt: "Name something green", answer: "stuff" }, { AI: fakeAI({ valid: false, canonical: "stuff", commonness: "rare" }) })).json()).found, false);
  assert.equal((await (await askJudge({ prompt: "Name something green", answer: "grass" }, { AI: fakeAI(new Error("quota")) })).status), 504);
  assert.equal((await (await askJudge({ prompt: "Name something green", answer: "grass" }, {})).json()).found, false);
  const AI = fakeAI({ valid: true, canonical: "grass", commonness: "common" });
  assert.equal((await (await askJudge({ prompt: "Name a made-up thing", answer: "grass" }, { AI })).json()).found, false);
  assert.equal(AI.calls, 0);
});

test("AI judge: a daily cap keeps it inside the free allowance", async () => {
  const { JUDGE_DAILY_CAP } = await import("../src/judge.js");
  const AI = fakeAI({ valid: true, canonical: "grass", commonness: "common" });
  const env = { AI, DB: db };
  for (let i = 0; i < JUDGE_DAILY_CAP; i++) await (await askJudge({ prompt: "Name something green", answer: "grass" + "x".repeat(i % 5) + i }, env)).json();
  const j = await (await askJudge({ prompt: "Name something green", answer: "one more leaf" }, env)).json();
  assert.equal(j.found, false);
  assert.equal(AI.calls, JUDGE_DAILY_CAP);
});

// ---------- Continue with Google / Apple ----------
const b64u = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const idToken = (claims) => `${b64u({ alg: "RS256" })}.${b64u(claims)}.sig`;
const GOOGLE = { GOOGLE_CLIENT_ID: "gid.apps", GOOGLE_CLIENT_SECRET: "gsecret", SITE_URL: "https://game.test" };
async function startSignIn(p, e) {
  const res = await worker.fetch(get("oauth-" + p), e);
  assert.equal(res.status, 302);
  const loc = new URL(res.headers.get("location"));
  const [, state, nonce] = res.headers.get("set-cookie").match(/vroom_oauth=([a-f0-9]+)\.([a-f0-9]+)/);
  assert.equal(loc.searchParams.get("state"), state);
  assert.equal(loc.searchParams.get("nonce"), nonce);
  return { loc, state, nonce, cookie: `vroom_oauth=${state}.${nonce}` };
}

test("sign in with Google: makes a password-less account, logs in, and links an existing email", async () => {
  assert.deepEqual((await (await worker.fetch(get("config"), env())).json()).signIn, { google: false, apple: false });
  assert.equal((await (await worker.fetch(get("config"), env(GOOGLE))).json()).signIn.google, true);
  const s = await startSignIn("google", env(GOOGLE));
  assert.equal(s.loc.origin, "https://accounts.google.com");
  assert.equal(s.loc.searchParams.get("redirect_uri"), "https://game.test/api/vroomillion/oauth-google-cb");
  const claims = { iss: "https://accounts.google.com", aud: "gid.apps", sub: "g-123", email: "New@Example.com", email_verified: true, nonce: s.nonce, exp: Date.now() / 1000 + 600 };
  stripeReply = (url, init) => {
    assert.equal(url, "https://oauth2.googleapis.com/token");
    assert.match(String(init.body), /client_secret=gsecret/);
    return { body: { id_token: idToken(claims) } };
  };
  const cb = await worker.fetch(get(`oauth-google-cb?code=abc&state=${s.state}`, { cookie: s.cookie }), env(GOOGLE));
  assert.equal(cb.status, 303);
  assert.equal(cb.headers.get("location"), "https://game.test/vroomillion/#signed-in");
  const session = cb.headers.getSetCookie().find((c) => c.startsWith("vr_session="))?.split(";")[0];
  assert.ok(session, "logged in");
  const me = await (await worker.fetch(get("me", { cookie: session }), env(GOOGLE))).json();
  assert.equal(me.email, "new@example.com");
  assert.equal(me.hasPassword, false);
  // no password to log in with, no recovery code; delete needs DELETE typed
  assert.equal((await worker.fetch(post("login", { email: "new@example.com", password: "whateverwhatever" }), env(GOOGLE))).status, 401);
  assert.equal((await worker.fetch(post("delete-account", { confirm: "nope" }, { cookie: session }), env(GOOGLE))).status, 401);

  // an existing password account with the same verified email is the same player
  await signup("racer@example.com");
  const s2 = await startSignIn("google", env(GOOGLE));
  stripeReply = { body: { id_token: idToken({ ...claims, sub: "g-456", email: "racer@example.com", nonce: s2.nonce }) } };
  const cb2 = await worker.fetch(get(`oauth-google-cb?code=abc&state=${s2.state}`, { cookie: s2.cookie }), env(GOOGLE));
  assert.equal(cb2.headers.get("location"), "https://game.test/vroomillion/#signed-in");
  assert.equal(db.sql.prepare("SELECT google_sub FROM users WHERE email = 'racer@example.com'").get().google_sub, "g-456");
  assert.equal(db.sql.prepare("SELECT COUNT(*) n FROM users").get().n, 2);
  assert.equal((await worker.fetch(post("delete-account", { confirm: "delete" }, { cookie: session }), env(GOOGLE))).status, 200);
});

test("Google sign-in refuses a wrong state, a token for another app, an unverified email or a replayed nonce", async () => {
  const s = await startSignIn("google", env(GOOGLE));
  const good = { iss: "https://accounts.google.com", aud: "gid.apps", sub: "g-1", email: "a@example.com", email_verified: true, nonce: s.nonce, exp: Date.now() / 1000 + 600 };
  const tryWith = async (claims, state = s.state, cookie = s.cookie) => {
    stripeReply = { body: { id_token: idToken(claims) } };
    const r = await worker.fetch(get(`oauth-google-cb?code=abc&state=${state}`, { cookie }), env(GOOGLE));
    return r.headers.get("location");
  };
  assert.match(await tryWith(good, "0000"), /signin-error/);
  assert.match(await tryWith(good, s.state, ""), /signin-error/);
  assert.match(await tryWith({ ...good, aud: "someone-else" }), /signin-error/);
  assert.match(await tryWith({ ...good, nonce: "abcd" }), /signin-error/);
  assert.match(await tryWith({ ...good, email_verified: false }), /verified/);
  assert.match(await tryWith({ ...good, exp: 1 }), /signin-error/);
  assert.equal(db.sql.prepare("SELECT name FROM sqlite_master WHERE name = 'users'").get() && db.sql.prepare("SELECT COUNT(*) n FROM users").get().n || 0, 0);
  // switched off without its settings
  assert.match((await worker.fetch(get("oauth-google"), env())).headers.get("location"), /signin-error/);
});

test("sign in with Apple: signed client secret, form_post callback", async () => {
  const { privateKey } = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign"]);
  const pem = `-----BEGIN PRIVATE KEY-----\n${Buffer.from(await crypto.subtle.exportKey("pkcs8", privateKey)).toString("base64")}\n-----END PRIVATE KEY-----`;
  const APPLE = { APPLE_CLIENT_ID: "com.vroom.web", APPLE_TEAM_ID: "TEAM123", APPLE_KEY_ID: "KEY123", APPLE_PRIVATE_KEY: pem, SITE_URL: "https://game.test" };
  const s = await startSignIn("apple", env(APPLE));
  assert.equal(s.loc.searchParams.get("response_mode"), "form_post");
  let secret;
  stripeReply = (url, init) => {
    secret = new URLSearchParams(String(init.body)).get("client_secret");
    return { body: { id_token: idToken({ iss: "https://appleid.apple.com", aud: "com.vroom.web", sub: "a-1", email: "x@privaterelay.appleid.com", email_verified: "true", nonce: s.nonce, exp: Date.now() / 1000 + 600 }) } };
  };
  const cb = await worker.fetch(new Request(BASE + "oauth-apple-cb", {
    method: "POST", body: `code=abc&state=${s.state}`,
    headers: { origin: "https://appleid.apple.com", "content-type": "application/x-www-form-urlencoded", cookie: s.cookie },
  }), env(APPLE));
  assert.equal(cb.headers.get("location"), "https://game.test/vroomillion/#signed-in");
  const [head, body] = secret.split(".").slice(0, 2).map((p) => JSON.parse(Buffer.from(p, "base64url").toString()));
  assert.deepEqual([head.alg, head.kid, body.iss, body.sub, body.aud], ["ES256", "KEY123", "TEAM123", "com.vroom.web", "https://appleid.apple.com"]);
  assert.equal(db.sql.prepare("SELECT apple_sub FROM users").get().apple_sub, "a-1");
});

test("admins can gift DEAN'S MAZZY, and take it back; nobody else can", async () => {
  const boss = await signup("boss@example.com");
  const { cookie } = await signup("dean@example.com");
  const call = async (body, c = boss.cookie, e = adminEnv()) => worker.fetch(post("admin", body, { cookie: c }), e);
  assert.equal((await call({ action: "gift-car", email: "dean@example.com", car: "mazzy", give: true }, cookie)).status, 404, "not for players");
  assert.equal((await call({ action: "gift-car", email: "dean@example.com", car: "golden", give: true })).status, 400, "only gift-only cars");
  const out = await (await call({ action: "gift-car", email: "dean@example.com", car: "mazzy", give: true })).json();
  assert.deepEqual(out.gifts, ["mazzy"]);
  assert.deepEqual((await (await worker.fetch(get("me", { cookie }), adminEnv())).json()).gifts, ["mazzy"]);
  await call({ action: "gift-car", email: "dean@example.com", car: "mazzy", give: false });
  assert.deepEqual((await (await worker.fetch(get("me", { cookie }), adminEnv())).json()).gifts, []);
});

// ---------- premium cars ----------
test("premium cars: only today's car, right price, kept on the account once Stripe says it's paid", async () => {
  const { premiumOn, PREMIUM_CARS } = await import("../src/premium.js");
  const today = premiumOn();
  const other = PREMIUM_CARS.find((c) => c.id !== today.id && c.id !== premiumOn(Date.now() - 86400000).id);
  assert.equal((await worker.fetch(post("car-checkout", { car: today.id, acceptNoRefunds: true }), env())).status, 401, "needs an account");
  const { cookie } = await signup("buyer@example.com");
  assert.equal((await worker.fetch(post("car-checkout", { car: other.id, acceptNoRefunds: true }, { cookie }), env())).status, 400, "not in the dealership today");
  assert.equal((await worker.fetch(post("car-checkout", { car: today.id }, { cookie }), env())).status, 400, "must accept no refunds");
  stripeReply = { body: { id: "cs_test_car1234567890", url: "https://checkout.stripe.com/c/pay/x" } };
  const r = await worker.fetch(post("car-checkout", { car: today.id, acceptNoRefunds: true }, { cookie }), env());
  assert.equal(r.status, 200);
  const sent = new URLSearchParams(String(stripeCalls.at(-1).init.body));
  assert.equal(sent.get("line_items[0][price_data][unit_amount]"), String(today.cents));
  assert.ok(today.cents <= 500, "never more than $5");
  assert.equal(sent.get("metadata[car_id]"), today.id);
  const uid = userId("buyer@example.com");
  // a forged or underpaid session gives nothing
  stripeReply = { body: { payment_status: "paid", amount_total: 1, metadata: { product: "vroomillion_car", car_id: today.id, user_id: uid } } };
  assert.equal((await (await worker.fetch(get("car-verify?session_id=cs_test_car1234567890"), env())).json()).paid, false);
  stripeReply = { body: { payment_status: "paid", amount_total: today.cents, metadata: { product: "vroomillion_car", car_id: today.id, user_id: uid } } };
  const v = await (await worker.fetch(get("car-verify?session_id=cs_test_car1234567890"), env())).json();
  assert.deepEqual(v, { paid: true, car: today.id });
  assert.deepEqual((await (await worker.fetch(get("me", { cookie }), env())).json()).cars, [today.id]);
  assert.equal((await worker.fetch(post("car-checkout", { car: today.id, acceptNoRefunds: true }, { cookie }), env())).status, 409, "already owned");
});

test("premium cars: the server's list, prices and daily rotation match the game's", async () => {
  const { PREMIUM_CARS, premiumOn } = await import("../src/premium.js");
  const { PREMIUM, premiumFor } = await import("../public/vroomillion/js/cars.js");
  assert.deepEqual(PREMIUM_CARS.map((c) => [c.id, c.name, c.cents]), PREMIUM.map((c) => [c.id, c.name, c.premium]));
  for (const day of ["2026-11-22", "2026-11-23", "2027-03-01"]) assert.equal(premiumOn(Date.parse(day + "T12:00:00Z")).id, premiumFor(day).id, day);
});

test("new accounts get Unlimited free for their first 24 hours, checked on the server", async () => {
  const { cookie } = await signup("fresh@example.com");
  let me = await (await worker.fetch(get("me", { cookie }), env())).json();
  assert.equal(me.unlimited, true);
  assert.ok(me.trialEndsAt > Date.now());
  // they can still buy Unlimited to keep it
  stripeReply = { body: { id: "cs_test_trial1234567890", url: "https://checkout.stripe.com/c/pay/x" } };
  assert.equal((await worker.fetch(post("checkout", { acceptNoRefunds: true }, { cookie }), env())).status, 200);
  // a day and a bit later it's over
  db.sql.prepare("UPDATE users SET created_at = ? WHERE email = 'fresh@example.com'").run(Date.now() - 25 * 3600000);
  me = await (await worker.fetch(get("me", { cookie }), env())).json();
  assert.equal(me.unlimited, false);
  assert.equal(me.trialEndsAt, null);
  // a paid account never shows a trial
  db.sql.prepare("UPDATE users SET unlimited = 1, created_at = ? WHERE email = 'fresh@example.com'").run(Date.now());
  me = await (await worker.fetch(get("me", { cookie }), env())).json();
  assert.equal(me.unlimited, true);
  assert.equal(me.trialEndsAt, null);
});
