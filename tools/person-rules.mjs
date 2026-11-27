// Wikidata rules for catalog prompts about named artists or actors ("Name a Lana Del Rey, Lorde or Halsey
// song", "Name a Tom Hanks movie", "Name a Beatles album"), which have only hand-written answers. Each
// name is looked up on Wikidata (a person, band or group only), and the rule is "songs performed by them",
// "films they're in or directed" or "their albums". A rule is kept only if most of the prompt's own obvious
// answers pass it, so a wrong lookup never gets in. Then tools/build-catalog.mjs --only builds the answers.
//
//   node tools/person-rules.mjs --try          print what it would write
//   node tools/person-rules.mjs --write        put the rules into the catalog lines (6th column)
import fs from "node:fs";
import { FAMILIES } from "../public/vroomillion/js/catalog/index.js";
import { normalize } from "../public/vroomillion/js/logic.js";
import { sparql, sleep } from "./wd-lib.mjs";

const args = process.argv.slice(2);
const RX = /^Name an? (.+?) (song|movie|film|album)$/;
const CAT = new URL("../public/vroomillion/js/catalog/", import.meta.url);
const ANS = new URL("../public/vroomillion/answers/", import.meta.url);
const slug = (q) => q.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// catalog lines that have no rule yet: id -> line
const open = new Map();
for (const f of fs.readdirSync(CAT).filter((x) => /^w\d+\.js$/.test(x))) {
  for (const line of fs.readFileSync(new URL(f, CAT), "utf8").split("\n")) {
    const m = line.match(/^\s*([a-z0-9]+\/[a-z0-9-]+)\s*\|/);
    const cols = line.split("|");
    if (m && cols.length >= 7 && !cols[5].trim()) open.set(m[1], { file: f });
  }
}

const names = (s) => s.split(/\s*,\s*|\s+or\s+|\s+and\s+|\s*&\s*/).map((x) => x.trim()).filter(Boolean);

// a name -> the best-known person or band/group Wikidata finds for it
async function who(name) {
  const rows = await sparql(`SELECT ?i ?s ?h WHERE {
    SERVICE wikibase:mwapi { bd:serviceParam wikibase:api "EntitySearch"; wikibase:endpoint "www.wikidata.org"; mwapi:search ${JSON.stringify(name)}; mwapi:language "en"; mwapi:limit "8". ?i wikibase:apiOutputItem mwapi:item. }
    ?i wikibase:sitelinks ?s.
    BIND(EXISTS { ?i wdt:P31 wd:Q5 } AS ?h)
    FILTER(EXISTS { ?i wdt:P31 wd:Q5 } || EXISTS { ?i wdt:P31/wdt:P279* wd:Q2088357 } || EXISTS { ?i wdt:P31/wdt:P279* wd:Q215380 })
  } ORDER BY DESC(?s) LIMIT 1`);
  return rows[0] ? rows[0].i.value.split("/").pop() : null;
}

const KIND = {
  song: (q) => `?i wdt:P175 wd:${q}. ?i wdt:P31 ?t. VALUES ?t { wd:Q7366 wd:Q134556 wd:Q105543609 wd:Q2188189 }`,
  album: (q) => `?i wdt:P175 wd:${q}. ?i wdt:P31/wdt:P279* wd:Q482994.`,
  movie: (q) => `{ ?i wdt:P161 wd:${q}. } UNION { ?i wdt:P57 wd:${q}. } ?i wdt:P31/wdt:P279* wd:Q11424.`,
};
KIND.film = KIND.movie;

async function ruleFor(f) {
  const p = f.prompts.find((x) => RX.test(x));
  const [, who_, kind] = p.match(RX);
  if (!/[A-Z]/.test(who_)) return { skip: "no names" };
  const qs = [];
  for (const n of names(who_)) {
    const q = await who(n);
    if (!q) return { skip: `no person or group for "${n}"` };
    qs.push(q);
    await sleep(300);
  }
  // movies: each person's branch is itself two (cast or director)
  const parts = kind === "movie" || kind === "film"
    ? qs.flatMap((q) => [`?i wdt:P161 wd:${q}. ?i wdt:P31/wdt:P279* wd:Q11424.`, `?i wdt:P57 wd:${q}. ?i wdt:P31/wdt:P279* wd:Q11424.`])
    : qs.map((q) => KIND[kind](q));
  const where = parts.map((b) => `{ ${b} }`).join(" UNION ");
  // the check: the obvious answers should be on it
  const rows = await sparql(`SELECT DISTINCT ?l WHERE { ${where} ?i rdfs:label ?l. FILTER(lang(?l) IN ("en", "mul")) }`);
  const have = new Set(rows.map((r) => normalize(r.l.value.replace(/\s*\([^)]*\)\s*/g, " "))));
  const top = (f.top || []).map((t) => t.split("|"));
  const ok = top.filter((forms) => forms.some((x) => have.has(normalize(x)))).length;
  if (rows.length < 10) return { skip: `only ${rows.length} on Wikidata` };
  if (ok < Math.ceil(top.length * 0.5)) return { skip: `only ${ok}/${top.length} obvious answers match`, qs };
  return { rule: `min=0 minans=10 nocheck w:${where}`, size: rows.length, ok: `${ok}/${top.length}`, qs };
}

const todo = FAMILIES.filter((f) => open.has(f.id) && f.prompts.some((p) => RX.test(p)));
console.log(todo.length, "families");
const found = new Map();
for (const f of todo) {
  let r;
  try { r = await ruleFor(f); } catch (e) { r = { skip: e.message }; }
  console.log(`${f.id} | ${f.prompts[0]} → ${r.rule ? `RULE ${r.size} items, ${r.ok} obvious` : "skip: " + r.skip}`);
  if (r.rule) found.set(f.id, r.rule);
  await sleep(300);
}
if (args.includes("--write")) {
  let n = 0;
  for (const file of new Set([...found.keys()].map((id) => open.get(id).file))) {
    const url = new URL(file, CAT);
    const text = fs.readFileSync(url, "utf8");
    const out = text.split("\n").map((line) => {
      const m = line.match(/^\s*([a-z0-9]+\/[a-z0-9-]+)\s*\|/);
      if (!m || !found.has(m[1])) return line;
      const cols = line.split("|");
      if (cols[5].trim()) return line;
      n++;
      cols[5] = " " + found.get(m[1]) + " ";
      return cols.join("|");
    }).join("\n");
    fs.writeFileSync(url, out);
  }
  console.log(`wrote ${n} rules; now: node tools/build-catalog.mjs --only ${[...found.keys()].join(",")}`);
  fs.writeFileSync(new URL("./.person-rules.json", import.meta.url), JSON.stringify([...found.keys()]));
}
console.log(`${found.size} of ${todo.length} have a rule`);
