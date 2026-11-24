// WORLD TOUR: fetches the lists the geography prompts are generated from (countries, their regions,
// big cities) into tools/geo/lists.json. Run once; tools/geo/make-catalog.mjs reads the result.
import fs from "node:fs";
import { sparql, sleep } from "../wd-lib.mjs";
const id = (r, k) => r[k].value.split("/").pop();
const out = {};
// sovereign states, with their continents
let rows = await sparql(`SELECT ?c ?l ?n ?cont WHERE { ?c wdt:P31 wd:Q3624078. FILTER NOT EXISTS { ?c wdt:P576 [] } ?c wikibase:sitelinks ?n; rdfs:label ?l. FILTER(lang(?l)="en") OPTIONAL { ?c wdt:P30 ?cont } }`);
const countries = new Map();
for (const r of rows) { const q = id(r, "c"); const e = countries.get(q) || { q, name: r.l.value, n: Number(r.n.value), cont: [] }; if (r.cont) e.cont.push(id(r, "cont")); countries.set(q, e); }
out.countries = [...countries.values()].sort((a, b) => b.n - a.n);
console.log("countries", out.countries.length, out.countries.slice(0, 5).map((c) => c.name));
await sleep(1000);
// first-level divisions of the bigger countries (states, provinces, regions...)
out.divisions = {};
for (const c of out.countries.slice(0, 45)) {
  try {
    rows = await sparql(`SELECT DISTINCT ?d ?l ?n WHERE { wd:${c.q} wdt:P150 ?d. ?d wikibase:sitelinks ?n; rdfs:label ?l. FILTER(lang(?l)="en") FILTER NOT EXISTS { ?d wdt:P576 [] } }`);
    out.divisions[c.q] = rows.map((r) => ({ q: id(r, "d"), name: r.l.value, n: Number(r.n.value) })).sort((a, b) => b.n - a.n);
    console.log(c.name, out.divisions[c.q].length);
  } catch (e) { console.log("!!", c.name, e.message); }
  await sleep(600);
}
// the world's best-known cities (for landmark and neighbourhood prompts)
rows = await sparql(`SELECT ?i ?l ?n ?c WHERE { ?i wdt:P31/wdt:P279* wd:Q515; wikibase:sitelinks ?n. FILTER(?n >= 150) ?i rdfs:label ?l. FILTER(lang(?l)="en") OPTIONAL { ?i wdt:P17 ?c } }`);
const cities = new Map();
for (const r of rows) cities.set(id(r, "i"), { q: id(r, "i"), name: r.l.value, n: Number(r.n.value), country: r.c ? id(r, "c") : null });
out.cities = [...cities.values()].sort((a, b) => b.n - a.n);
console.log("cities", out.cities.length, out.cities.slice(0, 12).map((c) => c.name).join(", "));
fs.writeFileSync(new URL("./lists.json", import.meta.url), JSON.stringify(out, null, 1));
