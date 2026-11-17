// VROOMILLION Unlimited: a one-time $5 Stripe Checkout payment.
// The secret key lives only in the Cloudflare dashboard as STRIPE_SECRET_KEY.

const PRODUCT = "vroomillion_unlimited";
const PRICE_CENTS = 500;
const SESSION_ID = /^cs_(test|live)_[A-Za-z0-9]{10,200}$/;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

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

// POST /api/vroomillion/checkout -> { url } to send the player to Stripe.
export async function handleCheckout(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  if (!env.STRIPE_SECRET_KEY) return json({ error: "Payments aren't set up yet." }, 503);

  const origin = new URL(request.url).origin;
  const from = request.headers.get("origin");
  if (from && from !== origin) return json({ error: "Bad request." }, 403);

  if (env.PAY_LIMITER) {
    const ip = request.headers.get("cf-connecting-ip") || "unknown";
    const { success } = await env.PAY_LIMITER.limit({ key: ip });
    if (!success) return json({ error: "Too many tries — wait a minute and try again." }, 429);
  }

  const form = new URLSearchParams({
    mode: "payment",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(PRICE_CENTS),
    "line_items[0][price_data][product_data][name]": "VROOMILLION Unlimited",
    "line_items[0][price_data][product_data][description]": "Unlimited races every day, on this browser.",
    "metadata[product]": PRODUCT,
    success_url: `${origin}/vroomillion/unlocked.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/vroomillion/`,
  });
  const res = await stripe(env, "checkout/sessions", { method: "POST", body: form.toString() });
  if (!res.ok || typeof res.body.url !== "string" || !res.body.url.startsWith("https://checkout.stripe.com/")) {
    console.error("stripe checkout failed:", res.status, res.body?.error?.message);
    return json({ error: "Couldn't start checkout. Try again later." }, 502);
  }
  return json({ url: res.body.url });
}

// GET /api/vroomillion/verify?session_id=cs_... -> { paid: true|false }
export async function handleVerify(request, env) {
  if (request.method !== "GET") return json({ error: "Method not allowed." }, 405);
  if (!env.STRIPE_SECRET_KEY) return json({ error: "Payments aren't set up yet." }, 503);
  const id = new URL(request.url).searchParams.get("session_id") || "";
  if (!SESSION_ID.test(id)) return json({ paid: false, error: "Invalid receipt." }, 400);

  const res = await stripe(env, "checkout/sessions/" + id, { method: "GET" });
  if (res.status === 404) return json({ paid: false, error: "Receipt not found." }, 404);
  if (!res.ok) {
    console.error("stripe verify failed:", res.status, res.body?.error?.message);
    return json({ paid: false, error: "Couldn't check the payment. Try again later." }, 502);
  }
  const s = res.body;
  const paid = s.payment_status === "paid" && s.metadata?.product === PRODUCT && s.amount_total === PRICE_CENTS;
  return json({ paid });
}
