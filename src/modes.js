// Themed GAME MODES (WORLD TOUR, and more to come): $5 each, one-time, kept on the account (users.modes).
// Same Stripe Checkout flow as the premium cars (src/premium.js). Admins play every mode free.
//   POST /api/vroomillion/mode-checkout { mode, acceptNoRefunds } -> { url }
//   GET  /api/vroomillion/mode-verify?session_id=cs_...        -> { paid, mode }
import { json, currentUser, ensureSchema, readForm, siteOrigin, clientIp, underLimit, parseModes, isAdmin } from "./accounts.js";
import { stripe } from "./premium.js";

export const GAME_MODES = [
  { id: "geo", name: "WORLD TOUR", cents: 500 },
  { id: "film", name: "BOX OFFICE", cents: 500 },
  { id: "music", name: "ON TOUR", cents: 500 },
  { id: "sport", name: "STADIUM RUN", cents: 500 },
];
const PRODUCT = "vroomillion_mode";
const SESSION_ID = /^cs_(test|live)_[A-Za-z0-9]{10,200}$/;

// a paid session for one of our modes, at that mode's price
const paidMode = (s) => {
  if (s.payment_status !== "paid" || s.metadata?.product !== PRODUCT) return null;
  const m = GAME_MODES.find((p) => p.id === s.metadata?.mode_id);
  return m && s.amount_total === m.cents ? m : null;
};

export async function giveMode(env, userId, modeId, sessionId = null) {
  const row = await env.DB.prepare("SELECT modes FROM users WHERE id = ?").bind(userId).first();
  if (!row) return false;
  const modes = new Set(parseModes(row.modes));
  modes.add(modeId);
  await env.DB.prepare("UPDATE users SET modes = ?, pending_mode_session = CASE WHEN pending_mode_session = ? THEN NULL ELSE pending_mode_session END WHERE id = ?")
    .bind(JSON.stringify([...modes]), sessionId, userId).run();
  return true;
}

// Paid but closed the tab before coming back? /me checks the last mode checkout (at most once a minute).
export async function checkPendingMode(env, user) {
  const now = Date.now();
  if (!user.pending_mode_session || !env.STRIPE_SECRET_KEY || user.mode_checked_at > now - 60000) return;
  await env.DB.prepare("UPDATE users SET mode_checked_at = ? WHERE id = ?").bind(now, user.id).run();
  const res = await stripe(env, "checkout/sessions/" + user.pending_mode_session, { method: "GET" });
  const m = res.ok ? paidMode(res.body) : null;
  if (m && res.body.metadata?.user_id === user.id) {
    await giveMode(env, user.id, m.id, user.pending_mode_session);
    user.modes = JSON.stringify([...new Set([...parseModes(user.modes), m.id])]);
  } else if (res.ok && res.body.status === "expired") {
    await env.DB.prepare("UPDATE users SET pending_mode_session = NULL WHERE id = ?").bind(user.id).run();
  }
}

export async function handleModeCheckout(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  if (!env.STRIPE_SECRET_KEY || !env.DB) return json({ error: "Payments aren't set up yet." }, 503);
  const site = siteOrigin(request, env);
  if (!site.ok) return json({ error: "Bad request." }, 403);
  const ip = clientIp(request, env);
  if ((env.PAY_LIMITER && !(await env.PAY_LIMITER.limit({ key: ip })).success) || !(await underLimit(env, "pay-ip", ip, 5, 60))) {
    return json({ error: "Too many tries — wait a minute and try again." }, 429);
  }
  const user = await currentUser(request, env);
  if (!user) return json({ error: "Create an account or log in first." }, 401);
  const body = await readForm(request);
  const m = GAME_MODES.find((p) => p.id === body.mode);
  if (!m) return json({ error: "Unknown game mode." }, 400);
  if (isAdmin(user, env) || parseModes(user.modes).includes(m.id)) return json({ error: "You already have this mode." }, 409);
  if (body.acceptNoRefunds !== true) return json({ error: "Tick the box to confirm you understand the mode is non-refundable." }, 400);

  const form = new URLSearchParams({
    mode: "payment",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(m.cents),
    "line_items[0][price_data][product_data][name]": `VROOMILLION game mode: ${m.name}`,
    "line_items[0][price_data][product_data][description]": "A themed game mode, yours forever on your account.",
    customer_email: user.email,
    client_reference_id: user.id,
    "metadata[product]": PRODUCT,
    "metadata[mode_id]": m.id,
    "metadata[user_id]": user.id,
    "metadata[no_refund_accepted_at]": new Date().toISOString(),
    success_url: `${site.origin}/vroomillion/?mode_session={CHECKOUT_SESSION_ID}`,
    cancel_url: `${site.origin}/vroomillion/`,
  });
  const res = await stripe(env, "checkout/sessions", { method: "POST", body: form.toString() });
  if (!res.ok || typeof res.body.url !== "string" || !res.body.url.startsWith("https://checkout.stripe.com/")) {
    console.error("stripe mode checkout failed:", res.status, res.body?.error?.message);
    return json({ error: "Couldn't start checkout. Try again later." }, 502);
  }
  if (typeof res.body.id === "string" && SESSION_ID.test(res.body.id)) {
    await env.DB.prepare("UPDATE users SET pending_mode_session = ? WHERE id = ?").bind(res.body.id, user.id).run();
  }
  return json({ url: res.body.url });
}

export async function handleModeVerify(request, env) {
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
  if (!res.ok) return json({ paid: false, error: "Couldn't check the payment. Try again later." }, 502);
  const m = paidMode(res.body);
  if (!m) return json({ paid: false });
  await ensureSchema(env.DB);
  if (!(await giveMode(env, res.body.metadata.user_id || "", m.id, id))) return json({ paid: false, error: "That payment isn't linked to an account. Contact us with your receipt." }, 404);
  return json({ paid: true, mode: m.id });
}
