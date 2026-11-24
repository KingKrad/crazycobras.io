// WORLD TOUR: builds geo/places.json, a small gazetteer (place name -> [lat, lon]) of countries,
// capitals, cities and regions from the built geography answer files. The race uses it to find places
// named in prompts whose own answer file has no coordinates (the older prompts WORLD TOUR shares).
import fs from "node:fs";
import { normalize } from "../../public/vroomillion/js/logic.js";
const DIR = new URL("../../public/vroomillion/answers/", import.meta.url);
const KEEP = /^g[a-z]*\//; // every WORLD TOUR family
const out = {};
for (const f of fs.readdirSync(DIR)) {
  if (!f.endsWith(".json")) continue;
  const d = JSON.parse(fs.readFileSync(new URL(f, DIR), "utf8"));
  if (!d.at || !KEEP.test(d.fam || "")) continue;
  // the best-known tiers only (TRAFFIC to FAST LANE): rarer places stay in their own prompt's file
  // the best-known only: every tier for countries and capitals; TRAFFIC and CRUISING for the rest
  const tiers = /^(gcountry|gborder|glang|gcapital)\//.test(d.fam) ? d.a : d.a.slice(0, 2);
  for (const e of tiers.flat()) {
    const forms = e.split("|");
    const at = d.at[normalize(forms[0])];
    if (!at) continue;
    for (const fm of forms.slice(0, 2)) { const k = normalize(fm); if (k && !out[k]) out[k] = at.map((v) => Math.round(v * 10) / 10); }
  }
}
const OUT = new URL("../../public/vroomillion/geo/places.json", import.meta.url);
fs.writeFileSync(OUT, JSON.stringify(out));
console.log("gazetteer:", Object.keys(out).length, "places,", fs.statSync(OUT).size, "bytes");
