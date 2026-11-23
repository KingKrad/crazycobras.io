// Finds a Wikidata rule for catalog prompts that don't have one, by learning it from the prompt's own
// hand-written answers: look each answer up on Wikidata, see what most of them have in common
// ("is a national park" + "in the United States", "is a film" + "war film genre", "is a song" + "by ABBA"),
// and keep the rule only if it matches most of those answers and isn't far too broad. Then
// tools/build-catalog.mjs fills the prompt's rarer tiers from it.
//
//   node tools/induce-rules.mjs --try a/b,c/d        print what it would choose, write nothing
//   node tools/induce-rules.mjs --write [--limit N] [--pool daily]
//        add the rules it finds to the catalog files (families without a rule), N at most
// Results (found, skipped and why) are kept in tools/.induced.json so a re-run picks up where it left off.
import fs from "node:fs";
import { FAMILIES } from "../public/vroomillion/js/catalog/index.js";
import { sparql, sleep } from "./wd-lib.mjs";
import { execFile } from "node:child_process";

// one try, 20 seconds at most: a size check that takes longer than that is far too broad anyway
function quick(query) {
  return new Promise((resolve, reject) => {
    execFile("curl", ["-s", "-m", "20", "-X", "POST", "-H", "Accept: application/sparql-results+json",
      "-H", "User-Agent: vroomillion-answer-builder/1.0 (trivia game data)", "--data-urlencode", "query@-",
      "-w", "\n%{http_code}", "https://query.wikidata.org/sparql"], { maxBuffer: 16 << 20 }, (err, out) => {
      const cut = out ? out.lastIndexOf("\n") : -1;
      const code = cut >= 0 ? out.slice(cut + 1).trim() : "000";
      if (!err && code === "200") { try { return resolve(JSON.parse(out.slice(0, cut)).results.bindings); } catch { /* bad JSON */ } }
      reject(new Error("HTTP " + code));
    }).stdin.end(query);
  });
}
import { normalize } from "../public/vroomillion/js/logic.js";

const args = process.argv.slice(2);
const arg = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : null);
const LOG = new URL("./.induced.json", import.meta.url);
const done = fs.existsSync(LOG) ? JSON.parse(fs.readFileSync(LOG, "utf8")) : {};

// the properties a group of answers can share, and how to say them in a rule
const PROPS = {
  P31: "is a", P279: "is a kind of", P136: "genre", P106: "occupation", P175: "performer", P495: "country of origin",
  P17: "country", P361: "part of", P1441: "appears in", P179: "series", P50: "author", P57: "director", P86: "composer",
  P264: "record label", P740: "formed in", P27: "citizenship", P641: "sport", P118: "league", P413: "position",
  P171: "parent taxon", P2012: "cuisine", P1056: "product", P176: "manufacturer", P449: "network", P136b: "",
};
// classes far too broad to mean anything on their own
const TOO_BROAD = new Set(["Q5", "Q35120", "Q223557", "Q16521", "Q4167836", "Q13442814", "Q7725634", "Q11424", "Q482994", "Q7366", "Q134556", "Q5398426", "Q571", "Q47461344", "Q215380", "Q17537576", "Q2188189", "Q1004", "Q15416", "Q6256", "Q515", "Q486972", "Q41176", "Q811979", "Q2221906", "Q618123", "Q1190554", "Q151885", "Q17442446", "Q28640", "Q12737077", "Q16334295", "Q4830453", "Q43229", "Q783794", "Q6881511", "Q167037", "Q2424752", "Q1047113"]);

const answersOf = (fam) => {
  const file = new URL(`../public/vroomillion/answers/${fam.slug}.json`, import.meta.url);
  if (!fs.existsSync(file)) return [];
  return (JSON.parse(fs.readFileSync(file, "utf8")).a[0] || []).map((x) => x.split("|")[0]).slice(0, 14);
};

// each answer -> its most-covered Wikidata item (search runs on Wikidata's side), with the facts we compare
async function lookup(answers) {
  const values = answers.map((a) => JSON.stringify(a)).join(" ");
  const rows = await sparql(`SELECT ?q ?i ?s WHERE {
    VALUES ?q { ${values} }
    SERVICE wikibase:mwapi { bd:serviceParam wikibase:api "EntitySearch"; wikibase:endpoint "www.wikidata.org"; mwapi:search ?q; mwapi:language "en"; mwapi:limit "4". ?i wikibase:apiOutputItem mwapi:item. }
    ?i wikibase:sitelinks ?s. }`);
  const best = new Map();
  for (const r of rows) {
    const q = r.q.value, id = r.i.value.split("/").pop(), s = Number(r.s.value);
    if (!best.has(q) || best.get(q).s < s) best.set(q, { id, s });
  }
  const ids = [...new Set([...best.values()].map((b) => b.id))];
  if (!ids.length) return { best, facts: new Map() };
  await sleep(1500);
  const props = Object.keys(PROPS).filter((p) => /^P\d+$/.test(p));
  const facts = await sparql(`SELECT ?i ?p ?v WHERE { VALUES ?i { ${ids.map((x) => "wd:" + x).join(" ")} } VALUES ?p { ${props.map((p) => "wdt:" + p).join(" ")} } ?i ?p ?v. FILTER(isIRI(?v)) }`);
  const byItem = new Map();
  const ups = new Set();
  for (const r of facts) {
    const id = r.i.value.split("/").pop();
    const p = r.p.value.split("/").pop(), v = r.v.value.split("/").pop();
    if (!byItem.has(id)) byItem.set(id, new Set());
    byItem.get(id).add(p + "=" + v);
    if (p === "P31" || p === "P106" || p === "P279") ups.add(v);
  }
  // one level up: physicist and chemist are both "scientist"; different kinds of dish are all "dish"
  if (ups.size) {
    await sleep(1500);
    const parents = await sparql(`SELECT ?c ?up WHERE { VALUES ?c { ${[...ups].slice(0, 400).map((x) => "wd:" + x).join(" ")} } ?c wdt:P279 ?up. }`).catch(() => []);
    const upOf = new Map();
    for (const r of parents) {
      const c = r.c.value.split("/").pop(), up = r.up.value.split("/").pop();
      if (!upOf.has(c)) upOf.set(c, new Set());
      upOf.get(c).add(up);
    }
    for (const set of byItem.values()) {
      for (const pv of [...set]) {
        const [p, v] = pv.split("=");
        if (!["P31", "P106", "P279"].includes(p)) continue;
        for (const up of upOf.get(v) || []) set.add(p + "^=" + up);
      }
    }
  }
  return { best, facts: byItem };
}

// how many items a rule matches (stops counting at 6000), keeping items in at least `min` languages
async function size(where, min) {
  const rows = await quick(`SELECT (COUNT(*) AS ?n) WHERE { SELECT ?i WHERE { ${where} ?i wikibase:sitelinks ?s. FILTER(?s >= ${min}) } LIMIT 6000 }`);
  return Number(rows[0]?.n?.value || 0);
}
const clause = (pv) => {
  const [p, v] = pv.split("=");
  if (p === "P31" || p === "P31^") return `{ ?i wdt:P31/wdt:P279* wd:${v}. }`;
  if (p === "P279" || p === "P279^") return `{ ?i wdt:P279+ wd:${v}. }`;
  if (p === "P106^") return `?i wdt:P106/wdt:P279* wd:${v}.`;
  return `?i wdt:${p} wd:${v}.`;
};
const kindOf = (pv) => pv.split("=")[0].replace("^", "");

// prompts with an extra condition ("from the '70s", "by ABBA", "in Scotland", "that starts with B",
// "X or Y") need that condition in the rule, which a learned rule can't promise: leave those to hand
const QUALIFIED = /'\d0s|\b\d{4}s?\b|\b(from|by|in|on|with|without|that|who|which|or|and|than|under|over|for|at|of)\b|\b(famous|first|last|best|worst|most|least)\b.*\b(of|in)\b/i;
export async function induce(fam) {
  if (QUALIFIED.test(fam.prompts[0].replace(/^Name (a|an|the|some)\s+/i, ""))) return { skip: "the prompt has a condition a learned rule can't promise" };
  const answers = answersOf(fam);
  if (answers.length < 6) return { skip: "too few answers" };
  const { best, facts } = await lookup(answers);
  const found = answers.filter((a) => best.has(a) && facts.has(best.get(a).id));
  if (found.length < Math.max(5, answers.length * 0.45)) return { skip: `only ${found.length}/${answers.length} answers found on Wikidata` };
  // what they share: count each property=value over the answers found
  const count = new Map();
  for (const a of found) for (const pv of facts.get(best.get(a).id)) count.set(pv, (count.get(pv) || 0) + 1);
  const need = Math.max(4, Math.ceil(found.length * 0.55));
  const shared = [...count].filter(([pv, n]) => n >= need && !TOO_BROAD.has(pv.split("=")[1])).sort((a, b) => b[1] - a[1]);
  // also allow a broad class when it's paired with something specific (film + war genre)
  const broad = [...count].filter(([pv, n]) => n >= need && TOO_BROAD.has(pv.split("=")[1]) && /^P31=/.test(pv)).sort((a, b) => b[1] - a[1]);
  const tries = [];
  for (const [pv] of shared.slice(0, 4)) tries.push([pv]);
  for (const [b] of broad.slice(0, 2)) for (const [pv] of shared.filter(([x]) => !/^P31|^P279/.test(x)).slice(0, 3)) tries.push([b, pv]);
  for (const [a] of shared.slice(0, 3)) for (const [pv] of shared.slice(0, 5)) if (a < pv && kindOf(a) !== kindOf(pv)) tries.push([a, pv]);
  let pick = null;
  for (const t of tries.slice(0, 6)) {
    const where = t.map(clause).join(" ");
    const covered = found.filter((a) => t.every((pv) => facts.get(best.get(a).id).has(pv))).length;
    if (covered < need) continue;
    // big enough to add answers, small enough to mean the prompt. Too big (every model, every scientist)?
    // keep only the better-known ones: items in more Wikipedia languages.
    for (const min of [3, 10, 25]) {
      let n;
      try { n = await size(where, min); } catch { n = 1e9; } // timed out: far too broad at this level
      await sleep(400);
      if (n < 25) break;
      if (n < 6000) {
        const score = covered * 10 - Math.log10(n) - (min > 3 ? 1 : 0);
        if (!pick || score > pick.score) pick = { where, n, covered, score, parts: t, min };
        break;
      }
    }
  }
  if (!pick) return { skip: `nothing shared by ${need}+ answers that's a sensible size`, shared: shared.slice(0, 4).map(([pv, n]) => pv + "×" + n) };
  // Specific enough? The prompt's own answers are its most obvious ones, so for the right rule they sit
  // near the top of what it matches (ranked by Wikipedia languages). "Anywhere in the UK" for Scotland,
  // or "anyone who ever modelled" for supermodels, puts London or Picasso on top instead: rejected.
  await sleep(1200);
  const top = await quick(`SELECT ?i WHERE { ${pick.where} ?i wikibase:sitelinks ?s. FILTER(?s >= ${pick.min}) } ORDER BY DESC(?s) LIMIT 40`).catch(() => []);
  const topIds = new Set(top.map((r) => r.i.value.split("/").pop()));
  const ours = new Set(found.map((a) => best.get(a).id));
  const inTop = [...ours].filter((id) => topIds.has(id)).length;
  const wantTop = Math.max(4, Math.ceil(ours.size * 0.4));
  if (inTop < wantTop) return { skip: `too broad: only ${inTop} of its answers are in the top 40 (needs ${wantTop})`, rule: undefined, tried: pick.where };
  return { rule: `min=${pick.min} w:${pick.where}`, size: pick.n, covered: `${pick.covered}/${found.length} found (${answers.length} answers)`, parts: pick.parts };
}

// ---- run ----
const famBySlug = (f) => ({ ...f, slug: f.prompts[0].toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") });
const tryIds = arg("--try");
if (tryIds) {
  for (const id of tryIds.split(",")) {
    const f = FAMILIES.find((x) => x.id === id);
    if (!f) { console.log(id, "no such family"); continue; }
    const r = await induce(famBySlug(f)).catch((e) => ({ error: e.message }));
    console.log(id, "|", f.prompts[0], "→", JSON.stringify(r));
    await sleep(2000);
  }
}

// --write: add the rules to the catalog lines (the rule column is the 6th), most-played pools first
if (args.includes("--write")) {
  const limit = Number(arg("--limit") || 100);
  const pool = arg("--pool");
  const CAT = new URL("../public/vroomillion/js/catalog/", import.meta.url);
  const files = fs.readdirSync(CAT).filter((f) => /^w\d+\.js$/.test(f));
  // which families still have no rule, straight from the catalog lines
  const lines = new Map(); // id -> { file, line }
  for (const f of files) {
    const text = fs.readFileSync(new URL(f, CAT), "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*([a-z0-9]+\/[a-z0-9-]+)\s*\|/);
      if (!m) continue;
      const cols = line.split("|");
      if (cols.length >= 7 && !cols[5].trim()) lines.set(m[1], { file: f, line });
    }
  }
  const order = (f) => (f.pools.includes("daily") ? 0 : f.pools.includes("main") ? 1 : 2);
  const todo = FAMILIES.filter((f) => lines.has(f.id) && !done[f.id] && (!pool || f.pools.includes(pool))).sort((a, b) => order(a) - order(b)).slice(0, limit);
  console.log(`${todo.length} families to try (${lines.size} without a rule)`);
  let found = 0;
  for (const f of todo) {
    let r;
    try { r = await induce(famBySlug(f)); } catch (e) { r = { error: e.message }; }
    done[f.id] = { at: Date.now(), ...r };
    if (r.rule) found++; // kept in the log; --apply writes them into the catalog in one go
    fs.writeFileSync(LOG, JSON.stringify(done, null, 1));
    console.log(`${f.id} | ${f.prompts[0]} → ${r.rule ? "RULE " + r.size + " items, " + r.covered : "skip: " + (r.skip || r.error)}`);
    await sleep(600);
  }
  console.log(`done: ${found} rules added`);
}

// --apply: write every rule found so far into the catalog lines that still have no rule
if (args.includes("--apply")) {
  const CAT = new URL("../public/vroomillion/js/catalog/", import.meta.url);
  let n = 0;
  for (const f of fs.readdirSync(CAT).filter((x) => /^w\d+\.js$/.test(x))) {
    const url = new URL(f, CAT);
    let text = fs.readFileSync(url, "utf8");
    const out = text.split("\n").map((line) => {
      const m = line.match(/^\s*([a-z0-9]+\/[a-z0-9-]+)\s*\|/);
      const cols = line.split("|");
      if (!m || cols.length < 7 || cols[5].trim() || !done[m[1]]?.rule) return line;
      n++;
      const c = cols.map((x) => x.trim());
      c[5] = done[m[1]].rule;
      return c.join(" | ");
    }).join("\n");
    if (out !== text) fs.writeFileSync(url, out);
  }
  console.log(`applied ${n} rules`);
}
