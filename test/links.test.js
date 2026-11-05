import test from "node:test";
import assert from "node:assert/strict";
import { buildLink } from "../src/links.js";

test("budget furniture link", () => {
  assert.deepEqual(buildLink("budget", "furniture", "oak desk"),
    { retailer: "IKEA", url: "https://www.ikea.com/us/en/search/?q=oak%20desk" });
});
test("script chars stripped", () => {
  const { url } = buildLink("budget", "decor", "<script>x");
  assert.ok(!url.includes("<") && !url.includes(">"));
});
test("unknown category/tier -> null", () => {
  assert.equal(buildLink("budget", "weapons", "x"), null);
  assert.equal(buildLink("luxury", "decor", "x"), null);
});
