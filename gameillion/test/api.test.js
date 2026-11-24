import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleApi } from '../src/app.js';
import { hmacSha256Hex, verifyStripeSignature, sha256Hex } from '../src/crypto.js';
import { LESSONS, UNITS } from '../src/content/lessons.js';
import { FREE_LESSON_COUNT } from '../public/js/rules.js';

const ORIGIN = 'https://game.test';

function fakeRepo() {
  const s = { tokens: new Map(), users: [], sessions: new Map(), progress: new Map(), purchases: new Map(), showcase: [] };
  return {
    s,
    async createLoginToken(hash, email, exp) { s.tokens.set(hash, { email, exp }); },
    async consumeLoginToken(hash, now) { const t = s.tokens.get(hash); s.tokens.delete(hash); return t && t.exp >= now ? t.email : null; },
    async upsertUser(email) { let u = s.users.find((x) => x.email === email); if (!u) { u = { id: s.users.length + 1, email }; s.users.push(u); } return u; },
    async createSession(hash, userId, exp) { s.sessions.set(hash, { userId, exp }); },
    async getSessionUser(hash, now) {
      const x = s.sessions.get(hash); if (!x || x.exp <= now) return null;
      const u = s.users.find((y) => y.id === x.userId);
      return { ...u, paid: [...s.purchases.values()].some((p) => p.email === u.email) };
    },
    async deleteSession(hash) { s.sessions.delete(hash); },
    async getProgress(id) { return s.progress.get(id) || null; },
    async saveProgress(id, d) { s.progress.set(id, d); },
    async recordPurchase(p) { if (!s.purchases.has(p.stripeSessionId)) s.purchases.set(p.stripeSessionId, { ...p, claimed: false }); },
    async claimPurchase(id) { const p = s.purchases.get(id); if (!p || p.claimed) return false; p.claimed = true; return true; },
    async listShowcase(status) { return s.showcase.filter((g) => g.status === status); },
    async countPending(uid) { return s.showcase.filter((g) => g.user_id === uid && g.status === 'pending').length; },
    async addShowcase(uid, e) { s.showcase.push({ id: s.showcase.length + 1, user_id: uid, status: 'pending', ...e }); },
    async setShowcaseStatus(id, status) { const g = s.showcase.find((x) => x.id === id); if (!g) return false; g.status = status; return true; },
  };
}

function setup(overrides = {}) {
  const repo = fakeRepo();
  const sent = [];
  const deps = {
    repo,
    now: () => 1_800_000_000_000,
    sendEmail: async (m) => { sent.push(m); return true; },
    stripe: null,
    ...overrides,
  };
  const env = { ADMIN_EMAILS: 'boss@example.com', STRIPE_WEBHOOK_SECRET: 'whsec_test' };
  let cookie = '';
  async function call(method, path, body, headers = {}) {
    const init = { method, headers: { ...headers } };
    if (cookie) init.headers.cookie = cookie;
    if (body !== undefined) {
      init.body = typeof body === 'string' ? body : JSON.stringify(body);
      init.headers['content-type'] ??= 'application/json';
    }
    const res = await handleApi(new Request(ORIGIN + path, init), env, deps);
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    return { status: res.status, body: await res.json() };
  }
  async function signIn(email) {
    await call('POST', '/api/auth/request', { email });
    const token = sent.at(-1).text.match(/token=([0-9a-f]{64})/)[1];
    return call('POST', '/api/auth/verify', { token });
  }
  return { repo, deps, env, call, signIn, sent };
}

test('content: 12 lessons in 4 units, numbered in order, valid steps', () => {
  assert.equal(LESSONS.length, 12);
  assert.equal(UNITS.length, 4);
  LESSONS.forEach((l, i) => {
    assert.equal(l.n, i + 1);
    assert.ok(UNITS.some((u) => u.id === l.unit));
    assert.ok(l.steps.length >= 2);
    for (const st of l.steps) {
      assert.ok(['read', 'case', 'tweak', 'quiz', 'prompt', 'code', 'publish'].includes(st.type), st.type);
      if (st.type === 'quiz') assert.ok(st.answer >= 0 && st.answer < st.options.length);
      if (st.type === 'tweak') assert.ok(st.control.key && st.goal.key === st.control.key);
    }
  });
  assert.ok(LESSONS.slice(0, FREE_LESSON_COUNT).every((l) => l.unit === 1));
});

test('magic-link sign-in: one use only, sets session cookie', async () => {
  const t = setup();
  const r1 = await t.call('POST', '/api/auth/request', { email: '  Kid@Example.com ' });
  assert.equal(r1.status, 200);
  assert.equal(t.sent[0].to, 'kid@example.com');
  const token = t.sent[0].text.match(/token=([0-9a-f]{64})/)[1];
  const r2 = await t.call('POST', '/api/auth/verify', { token });
  assert.equal(r2.status, 200);
  assert.equal((await t.call('GET', '/api/me')).body.email, 'kid@example.com');
  const r3 = await t.call('POST', '/api/auth/verify', { token });
  assert.equal(r3.status, 400);
  await t.call('POST', '/api/auth/logout');
  assert.equal((await t.call('GET', '/api/me')).body.signedIn, false);
});

test('sign-in rejects bad email, non-JSON, cross-site; fails closed without email service', async () => {
  const t = setup();
  assert.equal((await t.call('POST', '/api/auth/request', { email: 'nope' })).status, 400);
  assert.equal((await t.call('POST', '/api/auth/request', 'email=a@b.co', { 'content-type': 'application/x-www-form-urlencoded' })).status, 400);
  assert.equal((await t.call('POST', '/api/auth/request', { email: 'a@b.co' }, { origin: 'https://evil.test' })).status, 403);
  const t2 = setup({ sendEmail: null });
  assert.equal((await t2.call('POST', '/api/auth/request', { email: 'a@b.co' })).status, 503);
});

test('free lessons are open, paid lessons need a purchase', async () => {
  const t = setup();
  assert.equal((await t.call('GET', '/api/lessons')).body.lessons.length, 12);
  assert.equal((await t.call('GET', '/api/lessons/1')).status, 200);
  assert.equal((await t.call('GET', '/api/lessons/4')).status, 402);
  assert.equal((await t.call('GET', '/api/lessons/99')).status, 404);
  await t.signIn('buyer@example.com');
  assert.equal((await t.call('GET', '/api/lessons/4')).status, 402);
  await t.repo.recordPurchase({ stripeSessionId: 'cs_test_1234567890', email: 'buyer@example.com', amount: 1900, currency: 'usd' });
  assert.equal((await t.call('GET', '/api/lessons/4')).status, 200);
  assert.equal((await t.call('GET', '/api/me')).body.paid, true);
});

test('progress sync merges and never loses lessons', async () => {
  const t = setup();
  assert.equal((await t.call('GET', '/api/progress')).status, 401);
  await t.signIn('p@example.com');
  await t.call('PUT', '/api/progress', { progress: { completed: { 1: { xp: 70, at: '2026-11-20' } } } });
  const r = await t.call('PUT', '/api/progress', { progress: { completed: { 2: { xp: 50, at: '2026-11-21' } } } });
  assert.deepEqual(Object.keys(r.body.progress.completed).sort(), ['1', '2']);
  const big = await t.call('PUT', '/api/progress', { progress: { junk: 'x'.repeat(30000) } });
  assert.equal(big.status, 400);
});

async function signedWebhook(t, event, secret = 'whsec_test') {
  const body = JSON.stringify(event);
  const ts = Math.floor(t.deps.now() / 1000);
  const sig = await hmacSha256Hex(secret, `${ts}.${body}`);
  return t.call('POST', '/api/stripe/webhook', body, { 'stripe-signature': `t=${ts},v1=${sig}`, 'content-type': 'application/json' });
}

test('stripe webhook: verified events record purchases, forged ones are rejected', async () => {
  const t = setup();
  const event = { type: 'checkout.session.completed', data: { object: { id: 'cs_test_abcdefghij', payment_status: 'paid', amount_total: 1900, currency: 'usd', customer_details: { email: 'Buyer@Example.com' } } } };
  assert.equal((await signedWebhook(t, event, 'wrong_secret')).status, 400);
  assert.equal(t.repo.s.purchases.size, 0);
  assert.equal((await signedWebhook(t, event)).status, 200);
  assert.equal(t.repo.s.purchases.get('cs_test_abcdefghij').email, 'buyer@example.com');
  await signedWebhook(t, event); // duplicate delivery is harmless
  assert.equal(t.repo.s.purchases.size, 1);
  const unpaid = { type: 'checkout.session.completed', data: { object: { id: 'cs_test_unpaid12345', payment_status: 'unpaid', customer_details: { email: 'x@example.com' } } } };
  await signedWebhook(t, unpaid);
  assert.equal(t.repo.s.purchases.size, 1);
});

test('stripe signature: old timestamps rejected', async () => {
  const body = '{}';
  const sig = await hmacSha256Hex('s', `100.${body}`);
  assert.equal(await verifyStripeSignature({ header: `t=100,v1=${sig}`, body, secret: 's', nowSec: 100 }), true);
  assert.equal(await verifyStripeSignature({ header: `t=100,v1=${sig}`, body, secret: 's', nowSec: 1000 }), false);
  assert.equal(await verifyStripeSignature({ header: null, body, secret: 's', nowSec: 100 }), false);
});

test('checkout: starts a $19 session; claim signs the buyer in exactly once', async () => {
  const calls = [];
  const stripe = async (method, path, params) => {
    calls.push({ method, path, params });
    if (method === 'POST') return { url: 'https://checkout.stripe.test/x' };
    return { payment_status: 'paid', customer_details: { email: 'new@example.com' }, amount_total: 1900, currency: 'usd', created: 1_800_000_000 - 60 };
  };
  const t = setup({ stripe });
  const r = await t.call('POST', '/api/checkout', {});
  assert.equal(r.body.url, 'https://checkout.stripe.test/x');
  assert.equal(calls[0].params['line_items[0][price_data][unit_amount]'], '1900');
  assert.equal((await t.call('POST', '/api/checkout/claim', { sessionId: 'bad' })).status, 400);
  const c1 = await t.call('POST', '/api/checkout/claim', { sessionId: 'cs_test_claim12345' });
  assert.deepEqual([c1.body.paid, c1.body.signedIn], [true, true]);
  assert.equal((await t.call('GET', '/api/me')).body.paid, true);
  // A leaked link can't be reused to sign in as the buyer.
  await t.call('POST', '/api/auth/logout');
  const c2 = await t.call('POST', '/api/checkout/claim', { sessionId: 'cs_test_claim12345' });
  assert.equal(c2.body.signedIn, false);
  // Checkout without Stripe configured fails closed.
  assert.equal((await setup().call('POST', '/api/checkout', {})).status, 503);
});

test('showcase: paid submit, admin approves, public sees it', async () => {
  const t = setup();
  assert.equal((await t.call('POST', '/api/showcase', { title: 'Moonillion', url: 'https://moon.example' })).status, 401);
  await t.signIn('maker@example.com');
  assert.equal((await t.call('POST', '/api/showcase', { title: 'Moonillion', url: 'https://moon.example' })).status, 402);
  await t.repo.recordPurchase({ stripeSessionId: 'cs_x', email: 'maker@example.com' });
  assert.equal((await t.call('POST', '/api/showcase', { title: 'Moonillion', url: 'javascript:alert(1)' })).status, 400);
  assert.equal((await t.call('POST', '/api/showcase', { title: 'Moonillion', url: 'https://moon.example', blurb: 'Guess the moon' })).status, 200);
  assert.equal((await t.call('GET', '/api/showcase')).body.games.length, 0);
  assert.equal((await t.call('GET', '/api/admin/showcase')).status, 403);
  await t.signIn('boss@example.com');
  const pending = await t.call('GET', '/api/admin/showcase?status=pending');
  assert.equal(pending.body.games.length, 1);
  assert.equal((await t.call('POST', `/api/admin/showcase/${pending.body.games[0].id}`, { status: 'approved' })).status, 200);
  const pub = await t.call('GET', '/api/showcase');
  assert.deepEqual(pub.body.games.map((g) => g.title), ['Moonillion']);
  assert.equal(pub.body.games[0].email, undefined, 'never leak emails publicly');
});

test('session token hashing is stable', async () => {
  assert.equal((await sha256Hex('abc')).length, 64);
});

test('rate limits return 429 per IP and per email', async () => {
  const t = setup();
  const counts = {};
  const limiter = (max) => ({ async limit({ key }) { counts[key] = (counts[key] || 0) + 1; return { success: counts[key] <= max }; } });
  t.env.AUTH_LIMITER = limiter(100);
  t.env.EMAIL_LIMITER = limiter(2);
  assert.equal((await t.call('POST', '/api/auth/request', { email: 'a@example.com' })).status, 200);
  assert.equal((await t.call('POST', '/api/auth/request', { email: 'a@example.com' })).status, 200);
  assert.equal((await t.call('POST', '/api/auth/request', { email: 'a@example.com' })).status, 429);
  assert.equal((await t.call('POST', '/api/auth/request', { email: 'b@example.com' })).status, 200, 'other emails unaffected');
});
