// Finds likely near-twin prompt families: two families where most of one's obvious answers (TRAFFIC and
// CRUISING) are also obvious answers to the other. Such pairs break "never a similar prompt again" and should be
// merged into one family (or one of them dropped).   node tools/twins.mjs [threshold=0.5]
import fs from "node:fs";
import { FAMILIES } from "../public/vroomillion/js/catalog/index.js";
import { answerSlug } from "../public/vroomillion/js/racepick.js";
import { QUESTIONS } from "../public/vroomillion/js/data.js";
import { normalize } from "../public/vroomillion/js/logic.js";

const th = Number(process.argv[2] || 0.5);
// pairs looked at and kept apart on purpose: different questions that share answers only because one list
// is huge (every animal is in "Name a mammal" / "an animal in the ocean"), or GEARHEAD's car-only overlap
const OK = [/^[a-z0-9]+\/(chars|places|things|mobs|items|spells|types|vehicles)$/, /^animal(trait)?\//, /^(maker|model|engine|parts|care|racing|culture)s?2?\//, /^pepper\//];
const BIG = new Set(["character/cartoon", "character/superhero", "mammal/mammal", "sea/sea", "reptile/reptile", "vehicle/aircraft", "wild/legs", "brand/carbrand", "game/videogame", "street/street"]);
const byQ = new Map(QUESTIONS.map((q) => [q.q, q]));
const keysOf = (entries) => new Set(entries.flatMap((e) => e.split("|").map(normalize)).filter((k) => k && k.length > 2));
const fams = FAMILIES.map((f) => {
  const tiers = [];
  for (const p of f.prompts) {
    const file = new URL(`../public/vroomillion/answers/${answerSlug(p)}.json`, import.meta.url);
    const a = byQ.get(p)?.a || (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")).a : null);
    if (a) tiers.push(a);
  }
  return { f, top: keysOf(tiers.flatMap((a) => [...a[0], ...a[1]].slice(0, 40))), all: keysOf(tiers.flatMap((a) => a.flat())) };
}).filter((x) => x.top.size >= 5);
const out = [];
for (const a of fams) for (const b of fams) {
  if (a === b || a.f.group === b.f.group || (a.f.key || a.f.id) === (b.f.key || b.f.id)) continue;
  if (BIG.has(b.f.id) && OK.some((r) => r.test(a.f.id))) continue; // same group already never shares a race; still distinct families
  let hit = 0;
  for (const k of a.top) if (b.all.has(k)) hit++;
  const share = hit / a.top.size;
  if (share >= th) out.push([share, a.f, b.f]);
}
out.sort((x, y) => y[0] - x[0]);
for (const [s, a, b] of out) console.log(`${Math.round(s * 100)}%  ${a.id} "${a.prompts[0]}"  inside  ${b.id} "${b.prompts[0]}"`);
console.log(out.length, "pairs");
