import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";

const realFetch = globalThis.fetch;
let turnstileOk = true;
test.before(() => {
  globalThis.fetch = async () => Response.json({ success: turnstileOk });
});
test.after(() => { globalThis.fetch = realFetch; });
test.beforeEach(() => { turnstileOk = true; });

const makeEnv = (o = {}) => ({
  TURNSTILE_SECRET: "x",
  TURNSTILE_SITE_KEY: "k",
  GEN_LIMITER: { limit: async () => ({ success: true }) },
  AI: { run: async (model) => model.includes("flux")
    ? { image: "AAAA" }
    : { response: { summary: "s", palette: ["#FFFFFF"], items: [] } } },
  ...o,
});

function genRequest() {
  const form = new FormData();
  form.append("payload", JSON.stringify({ roomType: "Bedroom", lengthFt: 12, widthFt: 14, heightFt: 8, budgetUSD: 3000, styles: ["modern"], prompt: "cozy" }));
  form.append("turnstile", "tok");
  return new Request("https://x.test/api/generate", { method: "POST", body: form, headers: { "content-length": "1000" } });
}

test("GET /api/options", async () => {
  const res = await worker.fetch(new Request("https://x.test/api/options"), makeEnv());
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.styles.length, 12);
  assert.equal(body.turnstileSiteKey, "k");
});
test("happy path", async () => {
  const res = await worker.fetch(genRequest(), makeEnv());
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.image.startsWith("data:image/png;base64,"));
});
test("rate limited -> 429", async () => {
  const res = await worker.fetch(genRequest(), makeEnv({ GEN_LIMITER: { limit: async () => ({ success: false }) } }));
  assert.equal(res.status, 429);
});
test("missing secret -> 503", async () => {
  const res = await worker.fetch(genRequest(), makeEnv({ TURNSTILE_SECRET: undefined }));
  assert.equal(res.status, 503);
});
test("turnstile fail -> 403", async () => {
  turnstileOk = false;
  const res = await worker.fetch(genRequest(), makeEnv());
  assert.equal(res.status, 403);
});
test("missing content-length -> 413", async () => {
  const form = new FormData(); form.append("turnstile", "t");
  const res = await worker.fetch(new Request("https://x.test/api/generate", { method: "POST", body: form }), makeEnv());
  assert.equal(res.status, 413);
});
test("AI quota error -> 429", async () => {
  const env = makeEnv({ AI: { run: async (m) => { if (m.includes("flux")) throw new Error("4006: daily free allocation exceeded"); return { response: {} }; } } });
  const res = await worker.fetch(genRequest(), env);
  assert.equal(res.status, 429);
  assert.ok((await res.json()).error.includes("free design limit"));
});
test("other AI error -> 502", async () => {
  const env = makeEnv({ AI: { run: async () => { throw new Error("boom"); } } });
  assert.equal((await worker.fetch(genRequest(), env)).status, 502);
});
test("unknown api path -> 404, wrong method -> 405", async () => {
  assert.equal((await worker.fetch(new Request("https://x.test/api/nope"), makeEnv())).status, 404);
  assert.equal((await worker.fetch(new Request("https://x.test/api/generate"), makeEnv())).status, 405);
});
