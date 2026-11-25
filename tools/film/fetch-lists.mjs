// BOX OFFICE: looks up the hand-picked names (tools/film/names.mjs) on Wikidata and writes their ids
// to tools/film/lists.json; tools/film/make-catalog.mjs turns them into prompts. Each name matches its
// exact English label; when several items share it, the right kind wins, then the best-known.
import fs from "node:fs";
import { sparql, sleep } from "../wd-lib.mjs";
import * as N from "./names.mjs";
const esc = (s) => JSON.stringify(s);
async function resolve(name, names, kind, loose = false) {
  const out = [], miss = [];
  for (let i = 0; i < names.length; i += 40) {
    const part = [...new Set(names.slice(i, i + 40))];
    const q = `SELECT ?i ?l ?n ?ok WHERE { VALUES ?l { ${part.map((s) => esc(s) + "@en").join(" ")} }
      ?i rdfs:label ?l; wikibase:sitelinks ?n. FILTER NOT EXISTS { ?i wdt:P31 wd:Q4167410 }
      BIND(EXISTS { ${kind} } AS ?ok) }`;
    const rows = await sparql(q);
    const best = new Map();
    for (const r of rows) {
      const l = r.l.value, it = { q: r.i.value.split("/").pop(), name: l, n: Number(r.n.value), ok: r.ok.value === "true" };
      const b = best.get(l);
      if (!b || (it.ok && !b.ok) || (it.ok === b.ok && it.n > b.n)) best.set(l, it);
    }
    for (const s of part) {
      const b = best.get(s);
      if (b && (b.ok || loose)) out.push(b);
      else if (!b && i >= 0) miss.push(s); // a big batch can come back short: these get a lookup of their own
      else console.log("  ✗", name, s, "(wrong kind " + b.q + ")");
    }
    await sleep(600);
  }
  for (const s of miss) {
    const rows = await sparql(`SELECT ?i ?n WHERE { ?i rdfs:label ${esc(s)}@en; wikibase:sitelinks ?n. ${kind} } ORDER BY DESC(?n) LIMIT 1`).catch(() => []);
    if (rows[0]) out.push({ q: rows[0].i.value.split("/").pop(), name: s, n: Number(rows[0].n.value), ok: true }); else console.log("  ✗", name, s, "(no match)");
    await sleep(400);
  }
  const order = new Map(names.map((s, k) => [s, k]));
  out.sort((a, b) => order.get(a.name) - order.get(b.name));
  console.log(name, out.length, "/", names.length);
  return out; // hand-picked order: best-known first
}
const L = {};
L.directors = await resolve("directors", N.DIRECTORS, "?x wdt:P57 ?i");
L.actors = await resolve("actors", N.ACTORS, "?x wdt:P161 ?i");
L.shows = await resolve("shows", N.SHOWS, "?i wdt:P31/wdt:P279* wd:Q15416", true);
L.franchises = await resolve("franchises", N.FRANCHISES, "VALUES ?k { wd:Q196600 wd:Q24856 wd:Q1152150 wd:Q15416 wd:Q11424 wd:Q15773347 wd:Q95074 wd:Q15711870 wd:Q1114461 } ?i wdt:P31/wdt:P279? ?k");
L.networks = await resolve("networks", N.NETWORKS, "?i wdt:P31 ?x", true);
L.studios = await resolve("studios", N.STUDIOS, "?i wdt:P31 ?x", true);
for (const [k, m] of Object.entries(N.FIXED)) for (const [name, q] of Object.entries(m)) if (!L[k].some((x) => x.name === name)) L[k].push({ q, name, n: 0, ok: true });
fs.writeFileSync(new URL("./lists.json", import.meta.url), JSON.stringify(L, null, 1));
