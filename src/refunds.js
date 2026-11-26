// Refunds and chargebacks take back what was bought. Every 30 minutes (the Worker's cron trigger) this asks
// Stripe for refunds and disputes since the last look, finds the Checkout Session each one belongs to, and
// removes exactly that purchase from the account: Unlimited, a premium car or a game mode. Anything an admin
// gave stays. A partial refund only counts once it covers the whole price.
// Uses the same STRIPE_SECRET_KEY as checkout: no webhook to set up.
import { ensureSchema } from "./accounts.js";

const OVERLAP_S = 900; // look back a little further each time, so nothing falls between two runs
const FIRST_LOOK_S = 14 * 86400; // the first run looks back two weeks

async function stripeGet(env, path) {
  const res = await fetch("https://api.stripe.com/v1/" + path, { headers: { authorization: "Bearer " + env.STRIPE_SECRET_KEY } });
  return { ok: res.ok, body: await res.json().catch(() => ({})) };
}
// every page of a Stripe list
async function listAll(env, path) {
  const out = [];
  let after = null;
  for (let page = 0; page < 20; page++) {
    const res = await stripeGet(env, path + (after ? `&starting_after=${after}` : ""));
    if (!res.ok || !Array.isArray(res.body.data)) break;
    out.push(...res.body.data);
    if (!res.body.has_more || !res.body.data.length) break;
    after = res.body.data[res.body.data.length - 1].id;
  }
  return out;
}

async function ensureTables(db) {
  await ensureSchema(db);
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT)"),
    db.prepare("CREATE TABLE IF NOT EXISTS revoked (payment_intent TEXT PRIMARY KEY, reason TEXT, product TEXT, user_id TEXT, at INTEGER NOT NULL)"),
  ]);
}

const listFrom = (text) => { try { const l = JSON.parse(text || "[]"); return Array.isArray(l) ? l : []; } catch { return []; } };

// take back the purchase a payment was for; true if something changed
export async function revokePayment(env, paymentIntent, reason) {
  const db = env.DB;
  if (await db.prepare("SELECT 1 FROM revoked WHERE payment_intent = ?").bind(paymentIntent).first()) return false;
  const res = await stripeGet(env, `checkout/sessions?payment_intent=${encodeURIComponent(paymentIntent)}&limit=1`);
  const s = res.ok ? res.body.data?.[0] : null;
  const m = s?.metadata || {};
  if (!s || !m.user_id || !m.product) return false; // not one of our checkouts
  if (reason === "refund") { // a partial refund: they keep it, until the refunds add up to the whole price
    const pi = await stripeGet(env, `payment_intents/${encodeURIComponent(paymentIntent)}?expand[]=latest_charge`);
    const refunded = Number(pi.body?.latest_charge?.amount_refunded) || 0;
    if (!pi.ok || refunded < (s.amount_total || 0)) return false;
  }
  const user = await db.prepare("SELECT id, unlimited, paid_session, cars, modes FROM users WHERE id = ?").bind(m.user_id).first();
  if (user) {
    if (m.product === "vroomillion_unlimited" && user.paid_session === s.id) {
      await db.prepare("UPDATE users SET unlimited = 0 WHERE id = ?").bind(user.id).run();
    } else if (m.product === "vroomillion_car" && m.car_id) {
      await db.prepare("UPDATE users SET cars = ? WHERE id = ?").bind(JSON.stringify(listFrom(user.cars).filter((c) => c !== m.car_id)), user.id).run();
    } else if (m.product === "vroomillion_mode" && m.mode_id) {
      await db.prepare("UPDATE users SET modes = ? WHERE id = ?").bind(JSON.stringify(listFrom(user.modes).filter((c) => c !== m.mode_id)), user.id).run();
    }
  }
  await db.prepare("INSERT OR IGNORE INTO revoked (payment_intent, reason, product, user_id, at) VALUES (?, ?, ?, ?, ?)")
    .bind(paymentIntent, reason, m.product, m.user_id, Date.now()).run();
  return true;
}

export async function sweepRefunds(env) {
  if (!env.STRIPE_SECRET_KEY || !env.DB) return { checked: 0, revoked: 0 };
  await ensureTables(env.DB);
  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare("SELECT v FROM meta WHERE k = 'refund_sweep_since'").first();
  const since = Math.max(0, (Number(row?.v) || now - FIRST_LOOK_S) - OVERLAP_S);
  const refunds = await listAll(env, `refunds?limit=100&created[gte]=${since}`);
  const disputes = await listAll(env, `disputes?limit=100&created[gte]=${since}`);
  let revoked = 0;
  const refunded = new Set(refunds.filter((r) => r.payment_intent && r.status === "succeeded").map((r) => r.payment_intent));
  for (const pi of refunded) if (await revokePayment(env, pi, "refund")) revoked++;
  for (const d of disputes) if (d.payment_intent && (await revokePayment(env, d.payment_intent, "dispute"))) revoked++;
  await env.DB.prepare("INSERT INTO meta (k, v) VALUES ('refund_sweep_since', ?) ON CONFLICT (k) DO UPDATE SET v = excluded.v").bind(String(now)).run();
  if (revoked) console.log("refunds: took back", revoked, "purchase(s)");
  return { checked: refunded.size + disputes.length, revoked };
}

// a purchase taken back (refund or chargeback): its receipt can't unlock anything again
export async function wasRevoked(env, paymentIntent) {
  if (!paymentIntent || !env.DB) return false;
  try { return !!(await env.DB.prepare("SELECT 1 FROM revoked WHERE payment_intent = ?").bind(String(paymentIntent)).first()); }
  catch { return false; } // no table yet: nothing has been taken back
}
