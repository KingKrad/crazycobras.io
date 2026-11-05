import test from "node:test";
import assert from "node:assert/strict";
import { buildImagePrompt, shapeList } from "../src/ai.js";

const v = { roomType: "Bedroom", lengthFt: 12, widthFt: 14, heightFt: 8, budgetUSD: 3000, styles: ["modern", "boho"], prompt: "cozy" };

test("room redesign clause only with hasRoom", () => {
  assert.ok(buildImagePrompt(v, { hasRoom: true }).includes("Redesign the room shown in image 1"));
  assert.ok(!buildImagePrompt(v, { hasRoom: false }).includes("Redesign the room shown in image 1"));
});
test("inspo image index", () => {
  assert.ok(buildImagePrompt(v, { hasRoom: true, hasInspo: true }).includes("image 2"));
  assert.ok(buildImagePrompt(v, { hasInspo: true }).endsWith("mood of image 1."));
});
test("prompt contents", () => {
  const p = buildImagePrompt(v, {});
  assert.ok(p.includes("a bedroom, about 12 by 14 feet with 8 foot ceilings, Modern and Bohemian style. cozy."));
});

const tier = (q, p) => ({ searchQuery: q, priceUSD: p });
const item = (o = {}) => ({ name: "Desk", category: "furniture", why: "w", budget: tier("oak desk", 100), recommended: tier("walnut desk", 400), ...o });

test("shapeList sanitizes", () => {
  const r = shapeList({ response: { summary: "s", palette: ["red", "#FFFFFF"], items: [item(), item({ category: "weapons" }), item({ recommended: tier("x", 999999) })] } });
  assert.deepEqual(r.palette, ["#FFFFFF"]);
  assert.equal(r.items.length, 2);
  assert.equal(r.items[1].recommended.priceUSD, 50000);
  assert.equal(r.totals.budget, 200);
  assert.equal(r.items[0].budget.retailer, "IKEA");
});
test("shapeList accepts JSON string", () => {
  const r = shapeList({ response: JSON.stringify({ summary: "s", palette: [], items: [item()] }) });
  assert.equal(r.items.length, 1);
});
test("shapeList returns null on bad json", () => {
  assert.equal(shapeList({ response: "not json" }), null);
});
