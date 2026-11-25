// Vercel front end -> Cloudflare Worker. Vercel serves the game's files; accounts, payments and the
// live answer check run on the Worker (WORKER_URL). vercel.json sends /api/vroomillion/<route> here.
// The Worker sees Vercel's servers as the caller, so the player's IP goes in x-client-ip, with
// PROXY_SECRET to prove the header came from here (src/accounts.js clientIp).
export const config = { runtime: "edge" };

const PASS_UP = ["accept", "content-type", "cookie", "origin"];
// Vercel stops a function that hasn't answered in 25s (players saw that as a disconnect): give up first
// and say so in JSON the game can read.
const TIMEOUT_MS = 20000;
// a dropped connection to the Worker is retried once, except where doing it twice could matter
const NO_RETRY = new Set(["signup", "checkout", "car-checkout", "mode-checkout", "delete-account", "reset-password", "recovery-code"]);
const fail = (status, error) => new Response(JSON.stringify({ error }), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const PASS_DOWN = ["cache-control", "content-type", "x-content-type-options", "location"];

export default async function handler(req) {
  const url = new URL(req.url);
  const route = url.searchParams.get("route") || "";
  if (!/^[a-z-]{1,40}$/.test(route) || !process.env.WORKER_URL) {
    return new Response('{"error":"Not found"}', { status: 404, headers: { "content-type": "application/json" } });
  }
  url.searchParams.delete("route");
  const target = new URL(`/api/vroomillion/${route}${url.search}`, process.env.WORKER_URL);

  const headers = new Headers();
  for (const k of PASS_UP) {
    const v = req.headers.get(k);
    if (v) headers.set(k, v);
  }
  const ip = req.headers.get("x-real-ip") || (req.headers.get("x-forwarded-for") || "").split(",")[0];
  if (ip) headers.set("x-client-ip", ip.trim());
  if (process.env.PROXY_SECRET) headers.set("x-proxy-secret", process.env.PROXY_SECRET);

  const hasBody = !["GET", "HEAD"].includes(req.method);
  const body = hasBody ? await req.arrayBuffer() : undefined;
  const t0 = Date.now();
  const ask = () => fetch(target, {
    method: req.method,
    headers,
    body,
    redirect: "manual",
    signal: AbortSignal.timeout(Math.max(1000, TIMEOUT_MS - (Date.now() - t0))),
  });
  let res;
  try {
    res = await ask();
  } catch (e) {
    const timedOut = e?.name === "TimeoutError" || e?.name === "AbortError";
    // "Network connection lost": try again once, if there's time left
    if (timedOut || NO_RETRY.has(route) || Date.now() - t0 > TIMEOUT_MS - 3000) {
      return fail(timedOut ? 504 : 502, timedOut ? "The server took too long. Try again." : "Connection hiccup. Try again.");
    }
    await new Promise((r) => setTimeout(r, 250));
    try { res = await ask(); } catch (e2) {
      const t = e2?.name === "TimeoutError" || e2?.name === "AbortError";
      return fail(t ? 504 : 502, t ? "The server took too long. Try again." : "Connection hiccup. Try again.");
    }
  }

  const out = new Headers();
  for (const k of PASS_DOWN) {
    const v = res.headers.get(k);
    if (v) out.set(k, v);
  }
  for (const c of res.headers.getSetCookie?.() ?? []) out.append("set-cookie", c);
  return new Response(res.body, { status: res.status, headers: out });
}
