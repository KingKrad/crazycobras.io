// BOX OFFICE: fetches the lists the movie & TV prompts are generated from (famous directors, actors,
// TV shows, networks, studios, franchises) into tools/film/lists.json. tools/film/make-catalog.mjs reads it.
import fs from "node:fs";
import { sparql, sleep } from "../wd-lib.mjs";
const id = (r, k) => r[k].value.split("/").pop();
async function list(name, q) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const rows = await sparql(q);
      const m = new Map();
      for (const r of rows) if (!m.has(id(r, "i"))) m.set(id(r, "i"), { q: id(r, "i"), name: r.l.value, n: Number(r.n.value) });
      const out = [...m.values()].sort((a, b) => b.n - a.n);
      console.log(name, out.length, out.slice(0, 8).map((x) => x.name).join(", "));
      await sleep(800);
      return out;
    } catch (e) { console.log("retry", name, e.message); await sleep(5000); }
  }
  return [];
}
const L = {};
// ranked by fame (how many Wikipedias cover them); prompts that come out thin are dropped at build time
const top = (cls, min, extra = "") => `SELECT ?i ?l ?n WHERE { ?i wdt:P106 wd:${cls}; wikibase:sitelinks ?n. FILTER(?n >= ${min}) ${extra} ?i rdfs:label ?l. FILTER(lang(?l) = "en") }`;
const kind = (cls, min) => `SELECT ?i ?l ?n WHERE { ?i wdt:P31 wd:${cls}; wikibase:sitelinks ?n. FILTER(?n >= ${min}) ?i rdfs:label ?l. FILTER(lang(?l) = "en") }`;
L.directors = await list("directors", top("Q2526255", 70));
L.actors = await list("actors", top("Q10800557", 90));
L.shows = await list("shows", kind("Q5398426", 55));
L.franchises = await list("franchises", kind("Q196600", 45));
L.networks = [...await list("channels", kind("Q2001305", 45)), ...await list("streaming", kind("Q15590336", 30))].sort((a, b) => b.n - a.n);
L.studios = await list("studios", kind("Q1762059", 35));
fs.writeFileSync(new URL("./lists.json", import.meta.url), JSON.stringify(L, null, 1));
