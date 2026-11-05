import test from "node:test";
import assert from "node:assert/strict";
import { validatePayload, checkJpeg } from "../src/validate.js";

const good = () => ({
  roomType: "Bedroom", lengthFt: 12, widthFt: 14, heightFt: 8,
  budgetUSD: 3000, styles: ["modern"], prompt: "cozy",
});

test("valid payload passes", () => {
  const r = validatePayload(good(), false);
  assert.equal(r.ok, true);
  assert.equal(r.value.lengthFt, 12);
});
test("lengthFt 2 fails", () => assert.equal(validatePayload({ ...good(), lengthFt: 2 }).ok, false));
test("4 styles fails", () =>
  assert.equal(validatePayload({ ...good(), styles: ["modern", "boho", "coastal", "japandi"] }).ok, false));
test("unknown style fails", () => assert.equal(validatePayload({ ...good(), styles: ["nope"] }).ok, false));
test("0 styles needs inspo", () => {
  assert.equal(validatePayload({ ...good(), styles: [] }, false).ok, false);
  assert.equal(validatePayload({ ...good(), styles: [] }, true).ok, true);
});
test("501-char prompt fails", () => assert.equal(validatePayload({ ...good(), prompt: "a".repeat(501) }).ok, false));
test("blocklist is whole-word", () => {
  // Known false positive: innocent uses like "a naked wall" (bare wall) are rejected too.
  assert.equal(validatePayload({ ...good(), prompt: "a naked wall" }).ok, false);
  assert.equal(validatePayload({ ...good(), prompt: "a gunmetal lamp" }).ok, true);
});
test("control chars become spaces", () => {
  assert.equal(validatePayload({ ...good(), prompt: "a\u0000b" }).value.prompt, "a b");
});

test("checkJpeg", async () => {
  assert.equal(await checkJpeg(new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0x00])])), true);
  assert.equal(await checkJpeg(new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])])), false);
  const big = new Uint8Array(200_001); big.set([0xff, 0xd8, 0xff]);
  assert.equal(await checkJpeg(new Blob([big])), false);
});
