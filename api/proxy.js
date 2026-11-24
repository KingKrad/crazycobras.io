// Vercel front end -> Cloudflare Worker. Vercel serves the game's files; accounts, payments and the
// live answer check run on the Worker (WORKER_URL). vercel.json sends /api/vroomillion/<route> here.
// The Worker sees Vercel's servers as the caller, so the player's IP goes in x-client-ip, with
// PROXY_SECRET to prove the header came from here (src/accounts.js clientIp).
export const config = { runtime: "edge" };

const PASS_UP = ["accept", "content-type", "cookie", "origin"];
const PASS_DOWN = ["cache-control", "content-type", "x-content-type-options", "location"];

// Vercel stops a function that hasn't answered in 25 s, with a bare error page the game can't read.
// Give up on the Worker a little before that and answer with JSON the game can show.
export const UPSTREAM_TIMEOUT_MS = 20000;
// A dropped connection to the Worker is tried once more, but only where doing it twice is harmless:
// reads, and the answer check (it only looks things up). Never sign-ups, payments or saves.
const RETRY_POST = new Set(["check"]);
const RETRY_DELAY_MS = 300;

const jsonError = (status, error) =>
  new Response(JSON.stringify({ error }), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export default async function handler(req) {
  const url = new URL(req.url);
  const route = url.searchParams.get("route") || "";
  if (!/^[a-z-]{1,40}$/.test(route) || !process.env.WORKER_URL) {
    return jsonError(404, "Not found");
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
  const canRetry = !hasBody || RETRY_POST.has(route);

  // One deadline for the whole call, retry included. Also stop waiting if the player has gone
  // (the game gave up, or the phone paused the page), so nothing is left hanging.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new Error("timeout")), UPSTREAM_TIMEOUT_MS);
  const playerGone = () => ctrl.abort(new Error("client closed"));
  req.signal?.addEventListener?.("abort", playerGone, { once: true });

  const call = () => fetch(target, { method: req.method, headers, body, redirect: "manual", signal: ctrl.signal });
  let res;
  try {
    try {
      res = await call();
    } catch (err) {
      if (!canRetry || ctrl.signal.aborted) throw err;
      console.warn(`proxy: ${req.method} ${route} lost the connection to the Worker, trying once more:`, String(err?.message ?? err));
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      res = await call();
    }
  } catch (err) {
    const why = String(ctrl.signal.reason?.message ?? err?.message ?? err);
    if (why === "client closed") return jsonError(499, "Request cancelled.");
    console.warn(`proxy: ${req.method} ${route} failed:`, why);
    return why === "timeout"
      ? jsonError(504, "The server took too long. Try again.")
      : jsonError(502, "Couldn't reach the server. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
    req.signal?.removeEventListener?.("abort", playerGone);
  }

  const out = new Headers();
  for (const k of PASS_DOWN) {
    const v = res.headers.get(k);
    if (v) out.set(k, v);
  }
  for (const c of res.headers.getSetCookie?.() ?? []) out.append("set-cookie", c);
  return new Response(res.body, { status: res.status, headers: out });
}
