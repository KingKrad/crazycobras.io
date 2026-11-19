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

import { passesBotCheck, handleConfig } from "../src/accounts.js";

test("bot check is off without keys, and asks Turnstile when on", async () => {
  const r = new Request("https://x/", { method: "POST", headers: { "cf-connecting-ip": "1.2.3.4" } });
  assert.equal(await passesBotCheck(r, {}, undefined), true);
  const env = { TURNSTILE_SECRET_KEY: "s3cret", TURNSTILE_SITE_KEY: "site" };
  assert.equal(await passesBotCheck(r, env, ""), false);
  let sent;
  const ok = async (url, init) => { sent = init.body.toString(); return new Response('{"success":true}'); };
  assert.equal(await passesBotCheck(r, env, "tok", ok), true);
  assert.match(sent, /secret=s3cret&response=tok&remoteip=1\.2\.3\.4/);
  assert.equal(await passesBotCheck(r, env, "tok", async () => new Response('{"success":false}')), false);
  assert.equal(await passesBotCheck(r, env, "tok", async () => { throw new Error("down"); }), false);
});

test("config only hands out the site key when the check is fully set up", async () => {
  const get = new Request("https://x/api/vroomillion/config");
  assert.equal((await handleConfig(get, { TURNSTILE_SITE_KEY: "site" }).json()).turnstileSiteKey, null);
  assert.equal((await handleConfig(get, { TURNSTILE_SITE_KEY: "site", TURNSTILE_SECRET_KEY: "s" }).json()).turnstileSiteKey, "site");
});

import { clientIp } from "../src/accounts.js";

test("x-client-ip is trusted only with the right proxy secret", () => {
  const r = (h) => new Request("https://x/", { headers: { "cf-connecting-ip": "9.9.9.9", ...h } });
  const env = { PROXY_SECRET: "abc123" };
  assert.equal(clientIp(r({ "x-client-ip": "1.1.1.1" }), env), "9.9.9.9");
  assert.equal(clientIp(r({ "x-client-ip": "1.1.1.1", "x-proxy-secret": "wrong!" }), env), "9.9.9.9");
  assert.equal(clientIp(r({ "x-client-ip": "1.1.1.1", "x-proxy-secret": "abc123" }), env), "1.1.1.1");
  assert.equal(clientIp(r({ "x-client-ip": "1.1.1.1", "x-proxy-secret": "abc123" }), {}), "9.9.9.9");
});
