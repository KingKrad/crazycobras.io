// Finds Wikidata classes for new catalog prompts: for each label, the items with that English label that
// have the most members (instances or subclasses with at least min Wikipedia languages), with samples.
//   node tools/find-class.mjs "board game;card game;hat" [min=3]
import { sparql, sleep } from "./wd-lib.mjs";

const labels = process.argv[2].split(";").map((s) => s.trim()).filter(Boolean);
const min = Number((process.argv[3] || "min=3").split("=")[1]);
async function one(label) {
  const rows = await sparql(`SELECT ?k (COUNT(DISTINCT ?i) AS ?n) (SUM(IF(?s >= 25, 1, 0)) AS ?pop) WHERE {
    ?k rdfs:label ${JSON.stringify(label)}@en. { ?i wdt:P31/wdt:P279* ?k. } UNION { ?i wdt:P279+ ?k. }
    ?i wikibase:sitelinks ?s. FILTER(?s >= ${min}) } GROUP BY ?k ORDER BY DESC(?n) LIMIT 2`);
  if (!rows.length) return `${label}: none`;
  const k = rows[0].k.value.split("/").pop();
  const top = await sparql(`SELECT ?l ?s WHERE { { ?i wdt:P31/wdt:P279* wd:${k}. } UNION { ?i wdt:P279+ wd:${k}. } ?i wikibase:sitelinks ?s; rdfs:label ?l. FILTER(lang(?l) = "en") } ORDER BY DESC(?s) LIMIT 10`);
  return `${label}: ${k} n=${rows[0].n.value} pop=${rows[0].pop.value}${rows[1] ? ` (also ${rows[1].k.value.split("/").pop()} n=${rows[1].n.value})` : ""} | ${top.map((r) => r.l.value).join(", ")}`;
}
const out = await Promise.all(labels.map((l, i) => sleep(i * 250).then(() => one(l)).catch((e) => `${l}: error ${e.message}`)));
console.log(out.join("\n"));
