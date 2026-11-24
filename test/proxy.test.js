import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import handler from "../api/proxy.js";

const realFetch = globalThis.fetch;
let calls;
beforeEach(() => {
  calls = [];
  process.env.WORKER_URL = "https://worker.example";
});
afterEach(() => { globalThis.fetch = realFetch; });

const req = (route, init = {}) => new Request(`https://vroomillion.com/api/proxy?route=${route}`, init);
const ok = () => new Response('{"ok":true}', { headers: { "content-type": "application/json" } });
const lost = () => { throw new TypeError("Network connection lost."); };

test("a dropped connection on a read is tried once more", async () => {
  globalThis.fetch = async (url) => { calls.push(String(url)); return calls.length === 1 ? lost() : ok(); };
  const res = await handler(req("me"));
  assert.equal(res.status, 200);
  assert.equal(calls.length, 2);
  assert.equal(calls[0], "https://worker.example/api/vroomillion/me");
});

test("the answer check is retried too, with the same body", async () => {
  const bodies = [];
  globalThis.fetch = async (url, init) => { bodies.push(new TextDecoder().decode(init.body)); return bodies.length === 1 ? lost() : ok(); };
  const res = await handler(req("check", { method: "POST", body: '{"answer":"mayochup"}' }));
  assert.equal(res.status, 200);
  assert.deepEqual(bodies, ['{"answer":"mayochup"}', '{"answer":"mayochup"}']);
});

test("payments, sign-ups and saves are never sent twice", async () => {
  for (const route of ["checkout", "signup", "progress", "online"]) {
    calls = [];
    globalThis.fetch = async (url) => { calls.push(url); return lost(); };
    const res = await handler(req(route, { method: "POST", body: "{}" }));
    assert.equal(calls.length, 1, route);
    assert.equal(res.status, 502);
    assert.match(res.headers.get("content-type"), /json/);
    assert.match((await res.json()).error, /Couldn't reach the server/);
  }
});

test("a Worker that is down twice gets a readable JSON error, not a crash", async () => {
  globalThis.fetch = async () => lost();
  const res = await handler(req("me"));
  assert.equal(res.status, 502);
  assert.match(res.headers.get("content-type"), /json/);
});

test("a Worker that hangs is cut off before Vercel's 25 s limit", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  globalThis.fetch = (url, init) => new Promise((_, reject) => init.signal.addEventListener("abort", () => reject(init.signal.reason)));
  const pending = handler(req("check", { method: "POST", body: "{}" }));
  await new Promise((r) => setImmediate(r));
  t.mock.timers.tick(20000);
  const res = await pending;
  assert.equal(res.status, 504);
  assert.match((await res.json()).error, /took too long/);
});

test("Worker answers and cookies pass through unchanged", async () => {
  globalThis.fetch = async () => {
    const h = new Headers({ "content-type": "application/json", "x-secret": "no" });
    h.append("set-cookie", "a=1; Path=/");
    h.append("set-cookie", "b=2; Path=/");
    return new Response('{"x":1}', { status: 201, headers: h });
  };
  const res = await handler(req("login", { method: "POST", body: "{}" }));
  assert.equal(res.status, 201);
  assert.equal(res.headers.get("x-secret"), null);
  assert.deepEqual(res.headers.getSetCookie(), ["a=1; Path=/", "b=2; Path=/"]);
  assert.deepEqual(await res.json(), { x: 1 });
});

test("unknown routes are still refused", async () => {
  globalThis.fetch = async () => { throw new Error("should not be called"); };
  assert.equal((await handler(req("../admin"))).status, 404);
});
