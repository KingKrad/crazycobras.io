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
// people who directed at least a handful of films, by fame
L.directors = await list("directors", `SELECT ?i ?l ?n WHERE { { SELECT ?i (COUNT(?f) AS ?c) WHERE { ?f wdt:P31 wd:Q11424; wdt:P57 ?i. } GROUP BY ?i HAVING(?c >= 6) } ?i wikibase:sitelinks ?n. FILTER(?n >= 60) ?i rdfs:label ?l. FILTER(lang(?l) = "en") }`);
L.actors = await list("actors", `SELECT ?i ?l ?n WHERE { { SELECT ?i (COUNT(?f) AS ?c) WHERE { ?f wdt:P31 wd:Q11424; wdt:P161 ?i. } GROUP BY ?i HAVING(?c >= 15) } ?i wikibase:sitelinks ?n. FILTER(?n >= 70) ?i rdfs:label ?l. FILTER(lang(?l) = "en") }`);
// TV series with lots of characters on Wikidata
L.shows = await list("shows", `SELECT ?i ?l ?n WHERE { { SELECT ?i (COUNT(?ch) AS ?c) WHERE { ?ch wdt:P1441 ?i. ?i wdt:P31/wdt:P279? wd:Q5398426. } GROUP BY ?i HAVING(?c >= 10) } ?i wikibase:sitelinks ?n. FILTER(?n >= 30) ?i rdfs:label ?l. FILTER(lang(?l) = "en") }`);
// film franchises / series with lots of characters
L.franchises = await list("franchises", `SELECT ?i ?l ?n WHERE { { SELECT ?i (COUNT(?ch) AS ?c) WHERE { ?ch wdt:P1441 ?i. ?i wdt:P31/wdt:P279? ?k. VALUES ?k { wd:Q196600 wd:Q24856 wd:Q1257444 wd:Q11424 } } GROUP BY ?i HAVING(?c >= 10) } ?i wikibase:sitelinks ?n. FILTER(?n >= 40) ?i rdfs:label ?l. FILTER(lang(?l) = "en") }`);
// networks and streaming services with many shows
L.networks = await list("networks", `SELECT ?i ?l ?n WHERE { { SELECT ?i (COUNT(?s) AS ?c) WHERE { ?s wdt:P31 wd:Q5398426; wdt:P449 ?i. } GROUP BY ?i HAVING(?c >= 40) } ?i wikibase:sitelinks ?n. FILTER(?n >= 20) ?i rdfs:label ?l. FILTER(lang(?l) = "en") }`);
// studios with many films
L.studios = await list("studios", `SELECT ?i ?l ?n WHERE { { SELECT ?i (COUNT(?f) AS ?c) WHERE { ?f wdt:P31 wd:Q11424; wdt:P272 ?i. } GROUP BY ?i HAVING(?c >= 40) } ?i wikibase:sitelinks ?n. FILTER(?n >= 25) ?i rdfs:label ?l. FILTER(lang(?l) = "en") }`);
fs.writeFileSync(new URL("./lists.json", import.meta.url), JSON.stringify(L, null, 1));
