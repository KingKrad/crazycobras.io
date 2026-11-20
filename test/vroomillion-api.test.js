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
  assert.equal(body.unlimited, false);
  assert.match(body.recoveryCode, /^[A-Z2-9]{5}(-[A-Z2-9]{5}){3}$/);
  assert.ok(!JSON.stringify(db.sql.prepare("SELECT * FROM users").get()).includes(body.recoveryCode), "only a hash of the code is stored");
  const setCookie = res.headers.get("set-cookie");
  for (const flag of ["HttpOnly", "Secure", "SameSite=Lax", "Path=/api/vroomillion"]) assert.ok(setCookie.includes(flag), flag);
  const row = db.sql.prepare("SELECT * FROM users").get();
  assert.notEqual(row.pw_hash, "hunter2hunter2");
  assert.equal(row.pw_iter, 10000);
  assert.ok(!JSON.stringify(db.sql.prepare("SELECT * FROM sessions").all()).includes(cookie.split("=")[1]), "only a hash of the token is stored");

  const me = await worker.fetch(get("me", { cookie }), env());
  assert.deepEqual(await me.json(), { email: "racer@example.com", unlimited: false, freeResetAt: 0 });
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
  assert.deepEqual(await me.json(), { email: "racer@example.com", unlimited: true, freeResetAt: 0 });
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
  assert.deepEqual(await me.json(), { email: "racer@example.com", unlimited: true, freeResetAt: 0 });
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
  assert.equal(stats.races.length, 7);
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
