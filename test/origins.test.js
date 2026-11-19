import { test } from "node:test";
import assert from "node:assert/strict";
import { siteOrigin, readForm } from "../src/accounts.js";

const req = (origin) => new Request("https://game.workers.dev/api/vroomillion/login", { method: "POST", headers: origin ? { origin } : {} });

test("same-origin and no-Origin requests pass", () => {
  assert.deepEqual(siteOrigin(req(), {}), { ok: true, origin: "https://game.workers.dev" });
  assert.equal(siteOrigin(req("https://game.workers.dev"), {}).ok, true);
});

test("other sites are refused unless listed in ALLOWED_ORIGINS", () => {
  assert.equal(siteOrigin(req("https://evil.example"), {}).ok, false);
  const env = { ALLOWED_ORIGINS: "https://vroom.vercel.app, https://crazycobras.io" };
  assert.deepEqual(siteOrigin(req("https://vroom.vercel.app"), env), { ok: true, origin: "https://vroom.vercel.app" });
  assert.equal(siteOrigin(req("https://evil.example"), env).ok, false);
});

test("readForm ignores bodies over the limit, whatever Content-Length says", async () => {
  const big = new Request("https://x/", { method: "POST", body: JSON.stringify({ a: "x".repeat(5000) }) });
  assert.deepEqual(await readForm(big), {});
  const ok = new Request("https://x/", { method: "POST", body: '{"email":"a@b.co"}' });
  assert.deepEqual(await readForm(ok), { email: "a@b.co" });
});
