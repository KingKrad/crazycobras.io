// VROOMILLION Unlimited: a one-time $5 Stripe Checkout payment, tied to an account.
// The Stripe key lives only in the Cloudflare dashboard as STRIPE_SECRET_KEY.
import { json, currentUser, publicUser, ensureSchema, readForm, siteOrigin, clientIp, underLimit, isAdmin } from "./accounts.js";

const PRODUCT = "vroomillion_unlimited";
const PRICE_CENTS = 500;
const SESSION_ID = /^cs_(test|live)_[A-Za-z0-9]{10,200}$/;

async function stripe(env, path, init = {}) {
  const res = await fetch("https://api.stripe.com/v1/" + path, {
    ...init,
    headers: {
      authorization: "Bearer " + env.STRIPE_SECRET_KEY,
      "content-type": "application/x-www-form-urlencoded",
      ...(init.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

const isPaid = (s) => s.payment_status === "paid" && s.metadata?.product === PRODUCT && s.amount_total === PRICE_CENTS;

async function markPaid(env, userId, sessionId) {
  await env.DB.prepare("UPDATE users SET unlimited = 1, paid_session = ?, pending_session = NULL WHERE id = ?")
    .bind(sessionId, userId).run();
}

// GET /api/vroomillion/me -> { email, unlimited } for the logged-in player, or 401.
export async function handleMe(request, env) {
  if (request.method !== "GET") return json({ error: "Method not allowed." }, 405);
  if (!env.DB) return json({ error: "Accounts aren't set up yet." }, 503);
  const user = await currentUser(request, env);
  if (!user) return json({ error: "Not logged in." }, 401);
  // Paid but closed the tab before coming back? Check the last checkout again,
  // at most once a minute per account so this can't be used to spam Stripe.
  const now = Date.now();
  if (user.unlimited !== 1 && user.pending_session && env.STRIPE_SECRET_KEY && !(user.pending_checked_at > now - 60000)) {
    await env.DB.prepare("UPDATE users SET pending_checked_at = ? WHERE id = ?").bind(now, user.id).run();
    const res = await stripe(env, "checkout/sessions/" + user.pending_session, { method: "GET" });
    if (res.ok && isPaid(res.body) && res.body.metadata?.user_id === user.id) {
      await markPaid(env, user.id, user.pending_session);
      user.unlimited = 1;
    } else if (res.ok && res.body.status === "expired") {
      await env.DB.prepare("UPDATE users SET pending_session = NULL WHERE id = ?").bind(user.id).run();
    }
  }
  return json(publicUser(user, env));
}

// POST /api/vroomillion/checkout -> { url } to send the logged-in player to Stripe.
export async function handleCheckout(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  if (!env.STRIPE_SECRET_KEY || !env.DB) return json({ error: "Payments aren't set up yet." }, 503);

  const site = siteOrigin(request, env);
  if (!site.ok) return json({ error: "Bad request." }, 403);
  const origin = site.origin; // Stripe sends the buyer back to the site they paid from

  const ip = clientIp(request, env);
  if ((env.PAY_LIMITER && !(await env.PAY_LIMITER.limit({ key: ip })).success) || !(await underLimit(env, "pay-ip", ip, 5, 60))) {
    return json({ error: "Too many tries — wait a minute and try again." }, 429);
  }

  const user = await currentUser(request, env);
  if (!user) return json({ error: "Create an account or log in first." }, 401);
  if (user.unlimited === 1 || isAdmin(user, env)) return json({ error: "This account already has Unlimited." }, 409);

  // All sales are final: the buyer must tick that they understand before paying.
  const body = await readForm(request);
  if (!body || body.acceptNoRefunds !== true) {
    return json({ error: "Tick the box to confirm you understand Unlimited is non-refundable." }, 400);
  }

  const form = new URLSearchParams({
    mode: "payment",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(PRICE_CENTS),
    "line_items[0][price_data][product_data][name]": "VROOMILLION Unlimited",
    "line_items[0][price_data][product_data][description]": "Unlimited races every day on your VROOMILLION account.",
    customer_email: user.email,
    client_reference_id: user.id,
    "metadata[product]": PRODUCT,
    "metadata[user_id]": user.id,
    // when the buyer agreed that Unlimited starts right away and is non-refundable
    "metadata[no_refund_accepted_at]": new Date().toISOString(),
    success_url: `${origin}/vroomillion/unlocked.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/vroomillion/`,
  });
  const res = await stripe(env, "checkout/sessions", { method: "POST", body: form.toString() });
  if (!res.ok || typeof res.body.url !== "string" || !res.body.url.startsWith("https://checkout.stripe.com/")) {
    console.error("stripe checkout failed:", res.status, res.body?.error?.message);
    return json({ error: "Couldn't start checkout. Try again later." }, 502);
  }
  if (typeof res.body.id === "string" && SESSION_ID.test(res.body.id)) {
    await env.DB.prepare("UPDATE users SET pending_session = ? WHERE id = ?").bind(res.body.id, user.id).run();
  }
  return json({ url: res.body.url });
}

// GET /api/vroomillion/verify?session_id=cs_... -> { paid, email }
// Confirms with Stripe and upgrades the account that started the checkout.
export async function handleVerify(request, env) {
  if (request.method !== "GET") return json({ error: "Method not allowed." }, 405);
  if (!env.STRIPE_SECRET_KEY || !env.DB) return json({ error: "Payments aren't set up yet." }, 503);
  const id = new URL(request.url).searchParams.get("session_id") || "";
  if (!SESSION_ID.test(id)) return json({ paid: false, error: "Invalid receipt." }, 400);
  const ip = clientIp(request, env);
  if ((env.PAY_LIMITER && !(await env.PAY_LIMITER.limit({ key: ip })).success) || !(await underLimit(env, "verify-ip", ip, 10, 60))) {
    return json({ paid: false, error: "Too many tries — wait a minute and reload." }, 429);
  }

  const res = await stripe(env, "checkout/sessions/" + id, { method: "GET" });
  if (res.status === 404) return json({ paid: false, error: "Receipt not found." }, 404);
  if (!res.ok) {
    console.error("stripe verify failed:", res.status, res.body?.error?.message);
    return json({ paid: false, error: "Couldn't check the payment. Try again later." }, 502);
  }
  if (!isPaid(res.body)) return json({ paid: false });

  await ensureSchema(env.DB);
  const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(res.body.metadata.user_id || "").first();
  if (!user) return json({ paid: false, error: "That payment isn't linked to an account. Contact us with your receipt." }, 404);
  if (user.unlimited !== 1) await markPaid(env, user.id, id);
  return json({ paid: true });
}
