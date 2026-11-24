// WORLD TOUR: tidies the built geography answer files. TRAFFIC needs at least 5 answers (moved up from
// the next tiers), and a prompt with fewer than 8 answers in all is dropped (too short to have rare
// answers). Prints what it dropped; tools/geo/make-catalog.mjs leaves dropped prompts out next time.
import fs from "node:fs";
import { FAMILIES } from "../../public/vroomillion/js/catalog/index.js";
import { answerSlug } from "../../public/vroomillion/js/racepick.js";
const DIR = new URL("../../public/vroomillion/answers/", import.meta.url);
const dropped = [];
let fixed = 0;
for (const f of FAMILIES.filter((x) => x.pools.length === 1 && x.pools[0] === "geo")) {
  const file = new URL(answerSlug(f.prompts[0]) + ".json", DIR);
  if (!fs.existsSync(file)) continue;
  const d = JSON.parse(fs.readFileSync(file, "utf8"));
  const n = d.a.flat().length;
  if (n < 8) { fs.unlinkSync(file); dropped.push(f.id); continue; }
  let moved = false;
  for (let t = 1; t < 5 && d.a[0].length < 5; t++) while (d.a[0].length < 5 && d.a[t].length) { d.a[0].push(d.a[t].shift()); moved = true; }
  if (moved) { fs.writeFileSync(file, JSON.stringify(d)); fixed++; }
}
const DROP = new URL("./dropped.json", import.meta.url);
const prev = fs.existsSync(DROP) ? JSON.parse(fs.readFileSync(DROP, "utf8")) : [];
fs.writeFileSync(DROP, JSON.stringify([...new Set([...prev, ...dropped])].sort(), null, 1));
console.log(`fixed TRAFFIC in ${fixed}, dropped ${dropped.length}:`, dropped.join(", "));
