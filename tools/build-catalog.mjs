// Builds the answers for the new prompt catalog (public/vroomillion/js/catalog/*.js): every family with
// a Wikidata rule gets public/vroomillion/answers/<slug>.json, and the live answer check gets the same
// rule (src/catalog-classes.js).
//
// A catalog line:  group/family | level | pools | flags | Prompt | rule | obvious, answers, ...
//   rule     options, then the kind of thing:  min=3 tiers=70,25 surnames taxa not=Q1,Q2 exclude=regex
//            nocheck (the rule is known right but Wikidata files some obvious answers elsewhere)
//            k:Q1,Q2   anything that is (a subclass of) a Q1 or Q2      i:Q1,Q2   instances of Q1 or Q2 only
//            l:<English label>  the class with that label that has the most members (must come last;
//                      the builder resolves it and checks enough of the obvious answers are in it)
//            w:<SPARQL binding ?i>  (must come last)
//   obvious  what most people would say: TRAFFIC. Wikidata's items (ranked by how many Wikipedia
//            languages cover them) fill CRUISING, FAST LANE and DEEP CUT, and three rare real ones are
//            ONE IN A VROOMILLION.
//
//   node tools/build-catalog.mjs                 build families that have no answers file yet
//   node tools/build-catalog.mjs --only a/b,c/d  just these families (rebuilds them)
//   node tools/build-catalog.mjs --check         list families with too few answers, write nothing
//   node tools/build-catalog.mjs --part 2/4      every 4th family starting at the 2nd (run 4 at once)
//   node tools/build-catalog.mjs --classes       just rewrite src/catalog-classes.js from the answer files
import fs from "node:fs";
import { FAMILIES } from "../public/vroomillion/js/catalog/index.js";
import { HAND } from "../public/vroomillion/js/catalog/hand.js";
import { answerSlug } from "../public/vroomillion/js/racepick.js";
import { normalize } from "../public/vroomillion/js/logic.js";
import { fetchPrompt, branches, sleep, sparql } from "./wd-lib.mjs";

// a class by English label: the one with the most members
export async function resolveLabel(label, min) {
  const rows = await sparql(`SELECT ?k (COUNT(DISTINCT ?i) AS ?n) WHERE { ?k rdfs:label ${JSON.stringify(label)}@en.
    { ?i wdt:P31/wdt:P279* ?k. } UNION { ?i wdt:P279+ ?k. } ?i wikibase:sitelinks ?s. FILTER(?s >= ${min}) } GROUP BY ?k ORDER BY DESC(?n) LIMIT 1`);
  return rows[0] ? rows[0].k.value.split("/").pop() : null;
}

const DIR = new URL("../public/vroomillion/answers/", import.meta.url);
const CLASSES = new URL("../src/catalog-classes.js", import.meta.url);
const args = process.argv.slice(2);
const only = args.includes("--only") ? new Set(args[args.indexOf("--only") + 1].split(",")) : null;
const MIN_ANSWERS = 15;

export function parseRule(rule) {
  const src = { min: 2 };
  let rest = rule.trim();
  const w = rest.indexOf("w:");
  if (w >= 0) { src.where = rest.slice(w + 2).trim(); rest = rest.slice(0, w); }
  const l = rest.indexOf("l:");
  if (l >= 0) { src.label = rest.slice(l + 2).trim(); rest = rest.slice(0, l); }
  for (const tok of rest.split(/\s+/).filter(Boolean)) {
    const [k, v] = tok.includes("=") ? [tok.slice(0, tok.indexOf("=")), tok.slice(tok.indexOf("=") + 1)] : [tok, ""];
    if (k === "min") src.min = Number(v);
    else if (k === "max") src.max = Number(v);
    else if (k === "tiers") src.tiers = v.split(",").map(Number);
    else if (k === "not") src.not = v.split(",");
    else if (k === "exclude") src.exclude = v;
    else if (k === "surnames" || k === "taxa" || k === "nocheck" || k === "geo") src[k] = true;
    // autotop=N: no hand-picked obvious answers; Wikidata's N best-known items are TRAFFIC
    else if (k === "autotop") src.autotop = Number(v);
    // noadmin: no "canton of X" / "province of Y" style entries in a list of cities
    // notcounty: places found by population: no counties, districts or regions in the list
    else if (k === "notcounty") src.exclude = "(\\b(county|district|region|municipality|regional municipality|division|parish|borough|shire|province|census area)$)|^(canton|county|province|department|prefecture|district|municipality|region|state|governorate)\\s+of\\s";
    else if (k === "noadmin") src.exclude ??= "^(canton|county|province|department|prefecture|district|municipality|region|state|governorate)\\s+of\\s";
    // minans=N: fewer answers than usual are fine (a country's neighbours, a small country's regions)
    else if (k === "minans") src.minans = Number(v);
    else if (/^[ki]:/.test(tok)) {
      const qs = tok.slice(2).split(",");
      src.where = qs.map((q) => tok[0] === "k" ? `{ ?i wdt:P31/wdt:P279* wd:${q}. } UNION { ?i wdt:P279+ wd:${q}. }` : `{ ?i wdt:P31 wd:${q}. }`).join(" UNION ");
    } else throw new Error("unknown rule part: " + tok);
  }
  return src;
}

// tiers: the obvious answers first, then Wikidata's items by coverage
export function tiersFor(top, items, src = {}) {
  const ex = src.exclude ? new RegExp(src.exclude, "i") : null;
  const seen = new Set();
  const t0 = [];
  const topKeys = new Map(); // obvious answer -> its entry (Wikidata's aliases join it)
  for (const t of top) { const k = normalize(t.split("|")[0]); if (k && !seen.has(k)) { seen.add(k); topKeys.set(k, t0.length); t0.push(t); } }
  const list = [];
  for (const it of items) {
    const forms = it.forms.filter((f) => !ex || !ex.test(f));
    if (!forms.length) continue;
    const hit = forms.map(normalize).find((k) => topKeys.has(k));
    if (hit != null) { // an obvious answer: keep its spelling, add Wikidata's other names
      const i = topKeys.get(hit);
      const have = new Set(t0[i].split("|").map(normalize));
      t0[i] = [t0[i], ...forms.filter((f) => !have.has(normalize(f)) && !seen.has(normalize(f)))].join("|");
      forms.forEach((f) => seen.add(normalize(f)));
      continue;
    }
    const fresh = forms.filter((f) => { const k = normalize(f); if (!k || seen.has(k)) return false; seen.add(k); return true; });
    if (fresh.length) list.push({ n: it.n, entry: fresh.join("|") });
  }
  const N = list.length;
  const t1 = Math.max(4, Math.round(N * 0.12));
  const t2 = t1 + Math.max(6, Math.round(N * 0.25));
  const tail = list.slice(t2);
  const rare = tail.filter((x) => x.n >= 2).slice(-Math.max(3, Math.round(tail.length * 0.3)));
  const pick = new Set((rare.length >= 3 ? rare : tail).filter((_, k, arr) => k % Math.max(1, Math.floor(arr.length / 3)) === 0).slice(0, 3).map((x) => x.entry));
  const a = [t0, list.slice(0, t1).map((x) => x.entry), list.slice(t1, t2).map((x) => x.entry), tail.filter((x) => !pick.has(x.entry)).map((x) => x.entry), [...pick]];
  // live-check thresholds: as widely covered as the CRUISING / FAST LANE and FAST LANE / DEEP CUT lines
  return { a, tiers: [list[t1]?.n ?? 70, list[t2]?.n ?? 25] };
}

const thinHand = [];
async function main() {
  fs.mkdirSync(DIR, { recursive: true });
  // hand-written families (no Wikidata rule): their answers are in catalog/hand.js, tiers as written
  for (const f of FAMILIES.filter((x) => !x.src && x.top && (only ? only.has(x.id) : true))) {
    const q = f.prompts[0];
    // never over an existing file (later tools merge extra answers into it) unless asked to
    if (!only && !args.includes("--force") && fs.existsSync(new URL(answerSlug(q) + ".json", DIR))) continue;
    // a hand family accepts only what's written here (there's no AI judge)
    const tiersText = HAND[q] || ["", "", "", "", ""];
    const a = tiersText.map((t) => t.split(",").map((x) => x.trim()).filter(Boolean));
    if (f.top) a[0] = [...new Set([...f.top, ...a[0]])];
    fs.writeFileSync(new URL(answerSlug(q) + ".json", DIR), JSON.stringify({ q, a, tiers: [999999, 999999], fam: f.id, hand: true }));
  }
  if (thinHand.length) console.log("hand families without answers in catalog/hand.js:", thinHand.length, thinHand.slice(0, 10).join(", "));
  const part = args.includes("--part") ? args[args.indexOf("--part") + 1].split("/").map(Number) : null;
  const todo = FAMILIES.filter((f) => f.src && (only ? only.has(f.id) : true)).filter((f, i) => !part || i % part[1] === part[0] - 1);
  const thin = [];
  for (const f of todo) {
    const q = f.prompts[0];
    const file = new URL(answerSlug(q) + ".json", DIR);
    if (!only && fs.existsSync(file) && !args.includes("--force")) continue;
    let src;
    try { src = parseRule(f.src); } catch (e) { console.log("!! bad rule", f.id, e.message); continue; }
    if (src.label) {
      let k = null;
      try { k = await resolveLabel(src.label, src.min); } catch (e) { console.log("!! label lookup failed", f.id, e.message); continue; }
      if (!k) { thin.push(`${f.id} (no class "${src.label}")`); console.log("-- no class", f.id, src.label); continue; }
      src.where = `{ ?i wdt:P31/wdt:P279* wd:${k}. } UNION { ?i wdt:P279+ wd:${k}. }`;
      src.qid = k;
    }
    let items;
    try { items = await fetchPrompt(q, src); } catch (e) { console.log("!! failed", f.id, e.message); continue; }
    // part of the rule timed out: don't write a list that's missing half its answers (try again later)
    if (items.partial) { thin.push(`${f.id} (part of the query failed)`); console.log("!! partial, not written:", f.id); continue; }
    // (a short list keeps rarity in it: TRAFFIC is at most its best-known 30%)
    const top = f.top || (src.autotop ? items.slice(0, Math.min(src.autotop, Math.max(5, Math.round(items.length * 0.3)))).map((it) => it.forms[0]) : []);
    const { a, tiers } = tiersFor(top, items, src);
    const n = a.flat().length;
    // the right kind of thing? enough of the obvious answers should be on Wikidata's list
    const wdKeys = new Set(items.flatMap((it) => it.forms.map(normalize)));
    const matched = (f.top || []).filter((t) => t.split("|").some((x) => wdKeys.has(normalize(x)))).length;
    // (animal groups are checked loosely: "crab" is a group, Wikidata's answers are species)
    if ((f.top || []).length && !src.taxa && !src.nocheck && matched < Math.min(3, Math.ceil(f.top.length / 3))) {
      thin.push(`${f.id} (only ${matched}/${f.top.length} obvious answers on Wikidata${src.qid ? " " + src.qid : ""})`);
      console.log(`-- mismatch: ${f.id} ${matched}/${f.top.length}`); continue;
    }
    if (n < (src.minans ?? MIN_ANSWERS) || a[0].length === 0) { thin.push(`${f.id} (${n})`); console.log(`-- too few: ${f.id} ${n}`); continue; }
    if (args.includes("--check")) { console.log(`${f.id}: ${n}`); continue; }
    // the live check's rule travels in the file; --classes collects them (so several builders can run at once)
    const live = { where: branches(src.where).map((b) => `{ ${b} }`).join(" UNION "), tiers, exclude: src.exclude || null, taxa: !!src.taxa };
    // WORLD TOUR: where each answer is on the map (keyed by its first spelling)
    let at = null;
    if (src.geo) {
      const byForm = new Map();
      for (const it of items) if (it.at) for (const fm of it.forms) if (!byForm.has(normalize(fm))) byForm.set(normalize(fm), it.at);
      at = {};
      for (const e of a.flat()) { const forms = e.split("|"); const hit = forms.map((x) => byForm.get(normalize(x))).find(Boolean); if (hit) at[normalize(forms[0])] = hit; }
    }
    fs.writeFileSync(file, JSON.stringify({ q, a, tiers, fam: f.id, ...(src.qid ? { qid: src.qid } : {}), live, ...(at ? { at } : {}) }));
    console.log(`${f.id}: ${n} answers (${a.map((t) => t.length).join("/")})  ${a[1].slice(0, 5).map((e) => e.split("|")[0]).join(", ")}`);
    await sleep(300);
  }
  if (!args.includes("--check") && !part) writeClasses();
  if (thin.length) console.log("\nTOO FEW ANSWERS (fix or drop):\n" + thin.join("\n"));
}
function writeClasses() {
  const classes = {};
  for (const f of fs.readdirSync(DIR).filter((x) => x.endsWith(".json"))) {
    const d = JSON.parse(fs.readFileSync(new URL(f, DIR), "utf8"));
    if (d.live) classes[d.q] = d.live;
  }
  fs.writeFileSync(CLASSES, `// GENERATED by tools/build-catalog.mjs from the prompt catalog. Do not edit by hand.
// For the live answer check: the Wikidata pattern (binding ?i) an answer must match, per catalog prompt.
export const CATALOG_CLASSES = ${JSON.stringify(classes)};
`);
  console.log("live check rules:", Object.keys(classes).length);
}
if (import.meta.url === "file://" + process.argv[1]) { if (args.includes("--classes")) writeClasses(); else await main(); }
