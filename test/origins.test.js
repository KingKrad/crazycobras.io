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
  assert.equal((await (await handleConfig(get, { TURNSTILE_SITE_KEY: "site" })).json()).turnstileSiteKey, null);
  assert.equal((await (await handleConfig(get, { TURNSTILE_SITE_KEY: "site", TURNSTILE_SECRET_KEY: "s" })).json()).turnstileSiteKey, "site");
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

import { checkPassword } from "../src/accounts.js";

test("passwords need 10 to 128 characters", () => {
  assert.match(checkPassword("123456789"), /at least 10/);
  assert.equal(checkPassword("1234567890"), null);
  assert.match(checkPassword("x".repeat(129)), /too long/);
});

import { DatabaseSync } from "node:sqlite";
import { underLimit, resetSchemaFlagForTests } from "../src/accounts.js";

function memDb() {
  const sql = new DatabaseSync(":memory:");
  const stmt = (q, args = []) => ({
    bind: (...a) => stmt(q, a),
    first: async () => sql.prepare(q).get(...args) ?? null,
    run: async () => { sql.prepare(q).run(...args); return { success: true }; },
    exec: () => sql.prepare(q).run(...args),
  });
  return { prepare: (q) => stmt(q), batch: async (list) => list.map((s) => s.exec()), sql };
}

test("exact limits: the 11th try in a minute is refused, per key, and keys are hashed", async () => {
  resetSchemaFlagForTests();
  const env = { DB: memDb() };
  for (let i = 0; i < 10; i++) assert.equal(await underLimit(env, "auth-ip", "203.0.113.5", 10, 60), true);
  assert.equal(await underLimit(env, "auth-ip", "203.0.113.5", 10, 60), false);
  assert.equal(await underLimit(env, "auth-ip", "203.0.113.6", 10, 60), true, "another IP has its own count");
  assert.equal(await underLimit(env, "auth-ip", "unknown", 10, 60), true, "no IP: not counted");
  const stored = JSON.stringify(env.DB.sql.prepare("SELECT * FROM rate_counts").all());
  assert.ok(!stored.includes("203.0.113"), "IPs are stored only as hashes");
  resetSchemaFlagForTests();
});
