import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";

const realFetch = globalThis.fetch;
let stripeReply;
let lastCall;
test.before(() => {
  globalThis.fetch = async (url, init = {}) => {
    lastCall = { url: String(url), init };
    return Response.json(stripeReply.body, { status: stripeReply.status ?? 200 });
  };
});
test.after(() => { globalThis.fetch = realFetch; });
test.beforeEach(() => { stripeReply = { body: {} }; lastCall = null; });

const env = (o = {}) => ({ STRIPE_SECRET_KEY: "sk_test_x", PAY_LIMITER: { limit: async () => ({ success: true }) }, ...o });
const checkout = (headers = { origin: "https://game.test" }) =>
  new Request("https://game.test/api/vroomillion/checkout", { method: "POST", headers });
const verify = (id) => new Request("https://game.test/api/vroomillion/verify?session_id=" + id);
const ID = "cs_test_a1B2c3D4e5F6g7H8";

test("checkout without a Stripe key fails closed", async () => {
  const res = await worker.fetch(checkout(), env({ STRIPE_SECRET_KEY: undefined }));
  assert.equal(res.status, 503);
  assert.equal(lastCall, null);
});

test("checkout creates a $5 session that returns to this site", async () => {
  stripeReply = { body: { url: "https://checkout.stripe.com/c/pay/cs_test_123" } };
  const res = await worker.fetch(checkout(), env());
  assert.equal(res.status, 200);
  assert.equal((await res.json()).url, "https://checkout.stripe.com/c/pay/cs_test_123");
  assert.equal(lastCall.url, "https://api.stripe.com/v1/checkout/sessions");
  assert.equal(lastCall.init.headers.authorization, "Bearer sk_test_x");
  const form = new URLSearchParams(lastCall.init.body);
  assert.equal(form.get("line_items[0][price_data][unit_amount]"), "500");
  assert.equal(form.get("line_items[0][price_data][currency]"), "usd");
  assert.equal(form.get("mode"), "payment");
  assert.equal(form.get("success_url"), "https://game.test/vroomillion/unlocked.html?session_id={CHECKOUT_SESSION_ID}");
  assert.equal(form.get("metadata[product]"), "vroomillion_unlimited");
});

test("checkout rejects other sites, GET requests and rate-limited callers", async () => {
  assert.equal((await worker.fetch(checkout({ origin: "https://evil.test" }), env())).status, 403);
  assert.equal((await worker.fetch(new Request("https://game.test/api/vroomillion/checkout"), env())).status, 405);
  assert.equal((await worker.fetch(checkout(), env({ PAY_LIMITER: { limit: async () => ({ success: false }) } }))).status, 429);
});

test("checkout refuses a non-Stripe redirect URL", async () => {
  stripeReply = { body: { url: "https://evil.test/pay" } };
  assert.equal((await worker.fetch(checkout(), env())).status, 502);
});

test("verify says paid only for a paid $5 Vroomillion session", async () => {
  const paid = { payment_status: "paid", amount_total: 500, metadata: { product: "vroomillion_unlimited" } };
  stripeReply = { body: paid };
  let res = await worker.fetch(verify(ID), env());
  assert.deepEqual(await res.json(), { paid: true });
  assert.equal(lastCall.url, "https://api.stripe.com/v1/checkout/sessions/" + ID);

  for (const body of [
    { ...paid, payment_status: "unpaid" },
    { ...paid, amount_total: 100 },
    { ...paid, metadata: { product: "something_else" } },
  ]) {
    stripeReply = { body };
    res = await worker.fetch(verify(ID), env());
    assert.deepEqual(await res.json(), { paid: false });
  }
});

test("verify rejects malformed receipts without calling Stripe", async () => {
  for (const bad of ["", "abc", "cs_test_../../charges", "pi_123456789012345"]) {
    const res = await worker.fetch(verify(encodeURIComponent(bad)), env());
    assert.equal(res.status, 400, bad);
  }
  assert.equal(lastCall, null);
});

test("verify reports unknown receipts and fails closed without a key", async () => {
  stripeReply = { status: 404, body: { error: { message: "No such checkout.session" } } };
  assert.equal((await worker.fetch(verify(ID), env())).status, 404);
  assert.equal((await worker.fetch(verify(ID), env({ STRIPE_SECRET_KEY: undefined }))).status, 503);
});
