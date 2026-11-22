// PREMIUM cars: one a day in the game's dealership, bought for real money through Stripe Checkout and
// kept on the account (users.cars). The list and prices match PREMIUM in public/vroomillion/js/cars.js
// (a test checks), and so does the daily rotation.
//   POST /api/vroomillion/car-checkout { car, acceptNoRefunds } -> { url }
//   GET  /api/vroomillion/car-verify?session_id=cs_...        -> { paid, car }
import { json, currentUser, ensureSchema, readForm, siteOrigin, clientIp, underLimit } from "./accounts.js";

export const PREMIUM_CARS = [
  { id: "disco", name: "DISCO DEVILLE", cents: 199 },
  { id: "neon", name: "NEON NIGHTRIDER", cents: 299 },
  { id: "ghost", name: "PHANTOM GHOST", cents: 299 },
  { id: "goldgoose", name: "GOLDEN GOOSE", cents: 399 },
  { id: "lava", name: "LAVA RUNNER", cents: 399 },
  { id: "laser", name: "LASER LIGHTNING", cents: 399 },
  { id: "comet", name: "THE COMET", cents: 499 },
];
const PRODUCT = "vroomillion_car";
const SESSION_ID = /^cs_(test|live)_[A-Za-z0-9]{10,200}$/;
const dayNum = (ms) => Math.floor((ms - Date.parse("2026-01-01T00:00:00Z")) / 86400000);
export const premiumOn = (ms = Date.now()) => PREMIUM_CARS[((dayNum(ms) % PREMIUM_CARS.length) + PREMIUM_CARS.length) % PREMIUM_CARS.length];

export function parseCars(text) {
  try { const l = JSON.parse(text || "[]"); return Array.isArray(l) ? l.filter((c) => PREMIUM_CARS.some((p) => p.id === c)) : []; } catch { return []; }
}

async function stripe(env, path, init = {}) {
  const res = await fetch("https://api.stripe.com/v1/" + path, {
    ...init,
    headers: { authorization: "Bearer " + env.STRIPE_SECRET_KEY, "content-type": "application/x-www-form-urlencoded", ...(init.headers || {}) },
  });
  return { ok: res.ok, status: res.status, body: await res.json().catch(() => ({})) };
}

// a paid session for one of our cars, at that car's price
const paidCar = (s) => {
  if (s.payment_status !== "paid" || s.metadata?.product !== PRODUCT) return null;
  const car = PREMIUM_CARS.find((p) => p.id === s.metadata?.car_id);
  return car && s.amount_total === car.cents ? car : null;
};

export async function giveCar(env, userId, carId, sessionId) {
  const row = await env.DB.prepare("SELECT cars, pending_car_session FROM users WHERE id = ?").bind(userId).first();
  if (!row) return false;
  const cars = new Set(parseCars(row.cars));
  cars.add(carId);
  await env.DB.prepare("UPDATE users SET cars = ?, pending_car_session = CASE WHEN pending_car_session = ? THEN NULL ELSE pending_car_session END WHERE id = ?")
    .bind(JSON.stringify([...cars]), sessionId, userId).run();
  return true;
}

// Paid but closed the tab before coming back? /me checks the last car checkout (at most once a minute).
export async function checkPendingCar(env, user) {
  const now = Date.now();
  if (!user.pending_car_session || !env.STRIPE_SECRET_KEY || user.car_checked_at > now - 60000) return;
  await env.DB.prepare("UPDATE users SET car_checked_at = ? WHERE id = ?").bind(now, user.id).run();
  const res = await stripe(env, "checkout/sessions/" + user.pending_car_session, { method: "GET" });
  const car = res.ok ? paidCar(res.body) : null;
  if (car && res.body.metadata?.user_id === user.id) {
    await giveCar(env, user.id, car.id, user.pending_car_session);
    user.cars = JSON.stringify([...new Set([...parseCars(user.cars), car.id])]);
  } else if (res.ok && res.body.status === "expired") {
    await env.DB.prepare("UPDATE users SET pending_car_session = NULL WHERE id = ?").bind(user.id).run();
  }
}

export async function handleCarCheckout(request, env) {
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
  // only today's car (or yesterday's, for anyone whose day hasn't turned over yet)
  const car = [premiumOn(), premiumOn(Date.now() - 86400000)].find((p) => p.id === body.car);
  if (!car) return json({ error: "That car isn't in the dealership today." }, 400);
  if (parseCars(user.cars).includes(car.id)) return json({ error: "You already own this car." }, 409);
  if (body.acceptNoRefunds !== true) return json({ error: "Tick the box to confirm you understand the car is non-refundable." }, 400);

  const form = new URLSearchParams({
    mode: "payment",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(car.cents),
    "line_items[0][price_data][product_data][name]": `VROOMILLION car: ${car.name}`,
    "line_items[0][price_data][product_data][description]": "A premium car for your VROOMILLION garage, kept on your account.",
    customer_email: user.email,
    client_reference_id: user.id,
    "metadata[product]": PRODUCT,
    "metadata[car_id]": car.id,
    "metadata[user_id]": user.id,
    "metadata[no_refund_accepted_at]": new Date().toISOString(),
    success_url: `${site.origin}/vroomillion/?car_session={CHECKOUT_SESSION_ID}`,
    cancel_url: `${site.origin}/vroomillion/`,
  });
  const res = await stripe(env, "checkout/sessions", { method: "POST", body: form.toString() });
  if (!res.ok || typeof res.body.url !== "string" || !res.body.url.startsWith("https://checkout.stripe.com/")) {
    console.error("stripe car checkout failed:", res.status, res.body?.error?.message);
    return json({ error: "Couldn't start checkout. Try again later." }, 502);
  }
  if (typeof res.body.id === "string" && SESSION_ID.test(res.body.id)) {
    await env.DB.prepare("UPDATE users SET pending_car_session = ? WHERE id = ?").bind(res.body.id, user.id).run();
  }
  return json({ url: res.body.url });
}

export async function handleCarVerify(request, env) {
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
  const car = paidCar(res.body);
  if (!car) return json({ paid: false });
  await ensureSchema(env.DB);
  if (!(await giveCar(env, res.body.metadata.user_id || "", car.id, id))) return json({ paid: false, error: "That payment isn't linked to an account. Contact us with your receipt." }, 404);
  return json({ paid: true, car: car.id });
}
