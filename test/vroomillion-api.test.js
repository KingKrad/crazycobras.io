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
  assert.deepEqual(body, { email: "racer@example.com", unlimited: false });
  const setCookie = res.headers.get("set-cookie");
  for (const flag of ["HttpOnly", "Secure", "SameSite=Lax", "Path=/api/vroomillion"]) assert.ok(setCookie.includes(flag), flag);
  const row = db.sql.prepare("SELECT * FROM users").get();
  assert.notEqual(row.pw_hash, "hunter2hunter2");
  assert.equal(row.pw_iter, 10000);
  assert.ok(!JSON.stringify(db.sql.prepare("SELECT * FROM sessions").all()).includes(cookie.split("=")[1]), "only a hash of the token is stored");

  const me = await worker.fetch(get("me", { cookie }), env());
  assert.deepEqual(await me.json(), { email: "racer@example.com", unlimited: false });
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
  const res = await worker.fetch(post("checkout"), env());
  assert.equal(res.status, 401);
  assert.equal(stripeCalls.length, 0);
});

test("checkout without a Stripe key fails closed", async () => {
  const { cookie } = await signup();
  assert.equal((await worker.fetch(post("checkout", null, { cookie }), env({ STRIPE_SECRET_KEY: undefined }))).status, 503);
});

test("checkout creates a $5 session tied to the account", async () => {
  const { cookie } = await signup();
  stripeReply = { body: { id: ID, url: "https://checkout.stripe.com/c/pay/" + ID } };
  const res = await worker.fetch(post("checkout", null, { cookie }), env());
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
  assert.equal((await worker.fetch(post("checkout", null, { cookie, origin: "https://evil.test" }), env())).status, 403);
  assert.equal((await worker.fetch(post("checkout", null, { cookie }), env({ PAY_LIMITER: { limit: async () => ({ success: false }) } }))).status, 429);
  stripeReply = { body: { url: "https://evil.test/pay" } };
  assert.equal((await worker.fetch(post("checkout", null, { cookie }), env())).status, 502);
  db.sql.prepare("UPDATE users SET unlimited = 1").run();
  assert.equal((await worker.fetch(post("checkout", null, { cookie }), env())).status, 409);
});

test("a paid checkout upgrades the account that bought it", async () => {
  const { cookie } = await signup();
  stripeReply = { body: paidSession(userId()) };
  const res = await worker.fetch(get("verify?session_id=" + ID), env());
  assert.deepEqual(await res.json(), { paid: true, email: "racer@example.com" });
  assert.equal(stripeCalls.at(-1).url, "https://api.stripe.com/v1/checkout/sessions/" + ID);
  const me = await worker.fetch(get("me", { cookie }), env());
  assert.deepEqual(await me.json(), { email: "racer@example.com", unlimited: true });
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
  assert.deepEqual(await me.json(), { email: "racer@example.com", unlimited: true });
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
