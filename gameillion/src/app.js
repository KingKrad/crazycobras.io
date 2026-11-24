// HTTP API. Everything external (database, clock, email, Stripe) comes in through `deps`,
// so the whole API can be tested without a network or a real database.

import {
  PRICE_CENTS, CURRENCY, MAX_PROGRESS_BYTES, isEmail, normalizeEmail, cleanProgress, mergeProgress,
  validateShowcaseEntry, isFreeLesson,
} from '../public/js/rules.js';
import { LESSONS, outline } from './content/lessons.js';
import { randomToken, sha256Hex, verifyStripeSignature } from './crypto.js';

const SESSION_DAYS = 60;
const LOGIN_TOKEN_MINUTES = 20;
const COOKIE = 'gi_session';

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
const err = (status, message) => json({ error: message }, status);

function readCookie(request, name) {
  const raw = request.headers.get('cookie') || '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}

function sessionCookie(value, maxAgeSec) {
  return `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSec}`;
}

async function readJson(request, maxBytes = 30000) {
  const type = request.headers.get('content-type') || '';
  if (!type.includes('application/json')) return { error: 'Expected JSON.' };
  const text = await request.text();
  if (text.length > maxBytes) return { error: 'Request too large.' };
  try { return { value: JSON.parse(text) }; } catch { return { error: 'Invalid JSON.' }; }
}

/** State-changing requests must come from our own pages (simple CSRF guard). */
function sameOrigin(request) {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}

async function limited(limiter, key) {
  if (!limiter) return false;
  try {
    const { success } = await limiter.limit({ key });
    return !success;
  } catch {
    return false;
  }
}

function adminEmails(env) {
  return String(env.ADMIN_EMAILS || '').split(',').map(normalizeEmail).filter(Boolean);
}

export async function startSession(deps, userId) {
  const token = randomToken();
  const now = deps.now();
  await deps.repo.createSession(await sha256Hex(token), userId, now + SESSION_DAYS * 86400000);
  return sessionCookie(token, SESSION_DAYS * 86400);
}

export async function handleApi(request, env, deps) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const ip = request.headers.get('cf-connecting-ip') || 'local';
  const now = deps.now();

  if (method !== 'GET' && method !== 'HEAD' && !sameOrigin(request)) return err(403, 'Cross-site request blocked.');

  const token = readCookie(request, COOKIE);
  const tokenHash = token && /^[0-9a-f]{64}$/.test(token) ? await sha256Hex(token) : null;
  const user = tokenHash ? await deps.repo.getSessionUser(tokenHash, now) : null;
  const isAdmin = !!user && adminEmails(env).includes(user.email);

  // ---- Account ----
  if (path === '/api/me' && method === 'GET') {
    if (!user) return json({ signedIn: false, paid: false });
    return json({ signedIn: true, email: user.email, paid: user.paid, admin: isAdmin });
  }

  if (path === '/api/auth/request' && method === 'POST') {
    if (await limited(env.AUTH_LIMITER, ip)) return err(429, 'Too many sign-in emails. Wait a minute and try again.');
    const body = await readJson(request);
    if (body.error) return err(400, body.error);
    const email = normalizeEmail(body.value?.email);
    if (!isEmail(email)) return err(400, 'Enter a valid email address.');
    if (await limited(env.EMAIL_LIMITER, email)) return err(429, 'Too many sign-in emails. Wait a minute and try again.');
    const loginToken = randomToken();
    await deps.repo.createLoginToken(await sha256Hex(loginToken), email, now + LOGIN_TOKEN_MINUTES * 60000);
    const link = `${url.origin}/signin.html?token=${loginToken}`;
    if (env.DEV_SHOW_LINKS === '1') return json({ sent: true, devLink: link });
    if (!deps.sendEmail) return err(503, 'Sign-in email isn’t set up yet. Please try again later.');
    const ok = await deps.sendEmail({
      to: email,
      subject: 'Your Gameillion sign-in link',
      text: `Tap to sign in to Gameillion:\n\n${link}\n\nThis link works once and expires in ${LOGIN_TOKEN_MINUTES} minutes. If you didn't ask for it, ignore this email.`,
    });
    if (!ok) return err(502, 'We couldn’t send the email. Please try again.');
    return json({ sent: true });
  }

  if (path === '/api/auth/verify' && method === 'POST') {
    if (await limited(env.AUTH_LIMITER, ip)) return err(429, 'Too many attempts. Wait a minute.');
    const body = await readJson(request);
    if (body.error) return err(400, body.error);
    const t = String(body.value?.token || '');
    if (!/^[0-9a-f]{64}$/.test(t)) return err(400, 'That sign-in link is broken.');
    const email = await deps.repo.consumeLoginToken(await sha256Hex(t), now);
    if (!email) return err(400, 'That sign-in link has expired or was already used. Request a new one.');
    const u = await deps.repo.upsertUser(email, now);
    const cookie = await startSession(deps, u.id);
    return json({ signedIn: true, email }, 200, { 'set-cookie': cookie });
  }

  if (path === '/api/auth/logout' && method === 'POST') {
    if (tokenHash) await deps.repo.deleteSession(tokenHash);
    return json({ signedIn: false }, 200, { 'set-cookie': sessionCookie('', 0) });
  }

  // ---- Progress sync ----
  if (path === '/api/progress') {
    if (!user) return err(401, 'Sign in to sync progress.');
    if (method === 'GET') return json({ progress: cleanProgress(await deps.repo.getProgress(user.id)) });
    if (method === 'PUT') {
      const body = await readJson(request, MAX_PROGRESS_BYTES);
      if (body.error) return err(400, body.error);
      const merged = mergeProgress(body.value?.progress, await deps.repo.getProgress(user.id));
      await deps.repo.saveProgress(user.id, merged, now);
      return json({ progress: merged });
    }
  }

  // ---- Lessons ----
  if (path === '/api/lessons' && method === 'GET') return json({ lessons: outline() });
  const lm = path.match(/^\/api\/lessons\/(\d{1,2})$/);
  if (lm && method === 'GET') {
    const n = Number(lm[1]);
    const lesson = LESSONS.find((l) => l.n === n);
    if (!lesson) return err(404, 'No such lesson.');
    if (!isFreeLesson(n) && !user?.paid) return err(402, 'This lesson is part of the full course.');
    return json({ lesson, total: LESSONS.length });
  }

  // ---- Payments ----
  if (path === '/api/checkout' && method === 'POST') {
    if (!deps.stripe) return err(503, 'Payments aren’t switched on yet. Check back soon!');
    if (await limited(env.CHECKOUT_LIMITER, ip)) return err(429, 'Too many tries. Wait a minute.');
    if (user?.paid) return err(409, 'You already own the full course.');
    const params = {
      mode: 'payment',
      'line_items[0][quantity]': '1',
      'line_items[0][price_data][currency]': CURRENCY,
      'line_items[0][price_data][unit_amount]': String(PRICE_CENTS),
      'line_items[0][price_data][product_data][name]': 'Gameillion — full course (lifetime)',
      success_url: `${url.origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${url.origin}/unlock.html?cancelled=1`,
    };
    if (user) params.customer_email = user.email;
    const res = await deps.stripe('POST', '/v1/checkout/sessions', params);
    if (!res || !res.url) return err(502, 'Couldn’t start checkout. Please try again.');
    return json({ url: res.url });
  }

  // After paying, the buyer lands on success.html with the Checkout Session id.
  // We confirm it with Stripe, record the purchase, and sign them in once.
  if (path === '/api/checkout/claim' && method === 'POST') {
    if (!deps.stripe) return err(503, 'Payments aren’t switched on yet.');
    const body = await readJson(request);
    if (body.error) return err(400, body.error);
    const sid = String(body.value?.sessionId || '');
    if (!/^cs_[A-Za-z0-9_]{10,200}$/.test(sid)) return err(400, 'Unknown checkout.');
    const s = await deps.stripe('GET', `/v1/checkout/sessions/${sid}`);
    if (!s || s.payment_status !== 'paid') return json({ paid: false });
    const email = normalizeEmail(s.customer_details?.email || s.customer_email);
    if (!isEmail(email)) return err(400, 'Checkout has no email.');
    await deps.repo.recordPurchase({ stripeSessionId: sid, email, amount: s.amount_total, currency: s.currency, now });
    const ageMs = now - (s.created || 0) * 1000;
    if (user?.email === email) return json({ paid: true, email, signedIn: true });
    if (ageMs < 2 * 3600000 && (await deps.repo.claimPurchase(sid))) {
      const u = await deps.repo.upsertUser(email, now);
      return json({ paid: true, email, signedIn: true }, 200, { 'set-cookie': await startSession(deps, u.id) });
    }
    return json({ paid: true, email, signedIn: false });
  }

  if (path === '/api/stripe/webhook' && method === 'POST') {
    const body = await request.text();
    const ok = await verifyStripeSignature({
      header: request.headers.get('stripe-signature'),
      body,
      secret: env.STRIPE_WEBHOOK_SECRET,
      nowSec: Math.floor(now / 1000),
    });
    if (!ok) return err(400, 'Bad signature.');
    let event;
    try { event = JSON.parse(body); } catch { return err(400, 'Bad JSON.'); }
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const s = event.data?.object || {};
      const email = normalizeEmail(s.customer_details?.email || s.customer_email);
      if (s.payment_status === 'paid' && isEmail(email) && typeof s.id === 'string') {
        await deps.repo.recordPurchase({ stripeSessionId: s.id, email, amount: s.amount_total || 0, currency: s.currency || CURRENCY, now });
      }
    }
    return json({ received: true });
  }

  // ---- Showcase ----
  if (path === '/api/showcase' && method === 'GET') {
    const rows = await deps.repo.listShowcase('approved');
    return json({ games: rows.map(({ id, title, blurb, url: u }) => ({ id, title, blurb, url: u })) });
  }
  if (path === '/api/showcase' && method === 'POST') {
    if (!user) return err(401, 'Sign in to submit your game.');
    if (!user.paid) return err(402, 'Showcase submissions are part of the full course.');
    if (await limited(env.EMAIL_LIMITER, 'show:' + user.id)) return err(429, 'Slow down a little.');
    const body = await readJson(request);
    if (body.error) return err(400, body.error);
    const v = validateShowcaseEntry(body.value);
    if (!v.ok) return err(400, v.error);
    if ((await deps.repo.countPending(user.id)) >= 3) return err(429, 'You have 3 games waiting for review already.');
    await deps.repo.addShowcase(user.id, v.value, now);
    return json({ submitted: true });
  }

  // ---- Admin ----
  if (path.startsWith('/api/admin/')) {
    if (!isAdmin) return err(403, 'Admins only.');
    if (path === '/api/admin/showcase' && method === 'GET') {
      const status = url.searchParams.get('status') || 'pending';
      if (!['pending', 'approved', 'rejected'].includes(status)) return err(400, 'Bad status.');
      return json({ games: await deps.repo.listShowcase(status, 200) });
    }
    const am = path.match(/^\/api\/admin\/showcase\/(\d+)$/);
    if (am && method === 'POST') {
      const body = await readJson(request);
      if (body.error) return err(400, body.error);
      const status = body.value?.status;
      if (!['approved', 'rejected', 'pending'].includes(status)) return err(400, 'Bad status.');
      const changed = await deps.repo.setShowcaseStatus(Number(am[1]), status);
      return changed ? json({ ok: true }) : err(404, 'Not found.');
    }
  }

  return err(404, 'Not found.');
}
