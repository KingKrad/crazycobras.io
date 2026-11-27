// Fixes the order of the daily races in js/catalog/daily-order.js, so adding prompts never reshuffles a
// day that's already been played. Run after adding daily prompts: new daily families are laid out into
// new races at the end; races already in the file stay as they are. Families removed from the catalog are
// filled in by the game on the day (see dailyRace).
// One exception, for days nobody has played yet (from the day after tomorrow on): a family whose twin
// (same history key: the same question in other words) already came up on an earlier day is swapped for
// a fresh daily family that fits that race (if none is waiting, the last race in the order is broken up
// for its families), so the daily never asks the same thing twice.
//   node tools/daily-order.mjs
import fs from "node:fs";
import { FAMILIES } from "../public/vroomillion/js/catalog/index.js";
import { dailyLayout, poolFamilies, famKey, isWordGame, dayNumber } from "../public/vroomillion/js/racepick.js";

const file = new URL("../public/vroomillion/js/catalog/daily-order.js", import.meta.url);
let start = "2026-11-21", races = [];
if (fs.existsSync(file)) ({ DAILY_START: start, DAILY_ORDER: races } = await import(file.href + "?" + Date.now()));
const byId = new Map(FAMILIES.map((f) => [f.id, f]));
const keyOf = (id) => (byId.has(id) ? famKey(byId.get(id)) : "?" + id);

// the first race nobody can have played: two days on from today (UTC), so no time zone is mid-race
const firstOpen = Math.max(0, dayNumber(new Date().toISOString().slice(0, 10)) - dayNumber(start) + 2);
let swapped = 0, dissolved = 0;
{
  const order = races.map((line) => line.split(","));
  const pool = poolFamilies("daily").sort((a, b) => (a.id < b.id ? -1 : 1));
  const used = new Set(); // history keys of every family on an earlier day
  for (let d = 0; d < order.length; d++) {
    const ids = order[d];
    for (let k = 0; d >= firstOpen && k < ids.length; k++) {
      if (!used.has(keyOf(ids[k])) || !byId.has(ids[k])) continue;
      for (;;) {
        const inOrder = new Set(order.flat()), keys = new Set([...inOrder].map(keyOf));
        const others = ids.filter((_, j) => j !== k).map((x) => byId.get(x)).filter(Boolean);
        const clash = (f, p) => p.group === f.group || famKey(p) === famKey(f) || (p.single && f.single) || (isWordGame(p) && isWordGame(f));
        const free = pool.filter((f) => !inOrder.has(f.id) && !keys.has(famKey(f)) && !others.some((p) => clash(f, p)));
        const pick = free.find((f) => !others.some((p) => p.topic === f.topic)) || free[0];
        if (pick) { ids[k] = pick.id; swapped++; break; }
        // nothing waiting fits: the last race in the order (months away) gives up its families
        if (order.length - 1 <= d) break;
        order.pop(); dissolved++;
      }
    }
    ids.forEach((id) => used.add(keyOf(id)));
  }
  races = order.map((ids) => ids.join(","));
}
const placedIds = () => new Set(races.flatMap((r) => r.split(",")));
const placed = placedIds();
const placedKeys = new Set([...placed].map(keyOf));
// new families, except twins of ones already in the order (they'd repeat a question)
const fresh = poolFamilies("daily").filter((f) => !placed.has(f.id) && !placedKeys.has(famKey(f)));
const added = dailyLayout(fresh.length >= 7 ? fresh : []).map((r) => r.map((f) => f.id).join(","));
const all = [...races, ...added];
fs.writeFileSync(file, `// The daily races in order, one line a day from DAILY_START, then round again. Written by
// tools/daily-order.mjs: new lines go at the end and a day never changes once it could have been played
// (only days still to come lose a prompt that repeats an earlier day's question).
export const DAILY_START = "${start}";
export const DAILY_ORDER = [
${all.map((r) => `  "${r}",`).join("\n")}
];
`);
console.log(`daily order: ${races.length} races kept (${swapped} repeated questions swapped on days not played yet, ${dissolved} races at the end broken up for them), ${added.length} added, ${fresh.length - added.length * 7} families waiting for the next run`);
