// Fixes the order of the daily races in js/catalog/daily-order.js, so adding prompts never reshuffles a
// day that's already been played. Run after adding daily prompts: new daily families are laid out into
// new races at the end; races already in the file stay as they are. Families removed from the catalog are
// filled in by the game on the day (see dailyRace).
//   node tools/daily-order.mjs
import fs from "node:fs";
import { FAMILIES } from "../public/vroomillion/js/catalog/index.js";
import { dailyLayout, poolFamilies } from "../public/vroomillion/js/racepick.js";

const file = new URL("../public/vroomillion/js/catalog/daily-order.js", import.meta.url);
let start = "2026-11-21", races = [];
if (fs.existsSync(file)) ({ DAILY_START: start, DAILY_ORDER: races } = await import(file.href + "?" + Date.now()));
const placed = new Set(races.flatMap((r) => r.split(",")));
const fresh = poolFamilies("daily").filter((f) => !placed.has(f.id));
const added = dailyLayout(fresh.length >= 7 ? fresh : []).map((r) => r.map((f) => f.id).join(","));
const all = [...races, ...added];
fs.writeFileSync(file, `// The daily races in order, one line a day from DAILY_START, then round again. Written by
// tools/daily-order.mjs: lines are only ever added at the end, so a day never changes after it's played.
export const DAILY_START = "${start}";
export const DAILY_ORDER = [
${all.map((r) => `  "${r}",`).join("\n")}
];
`);
console.log(`daily order: ${races.length} races kept, ${added.length} added, ${fresh.length - added.length * 7} families waiting for the next run`);
