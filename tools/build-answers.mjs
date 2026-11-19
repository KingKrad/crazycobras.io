// Builds public/vroomillion/js/data-extra.js: extra accepted answers for each prompt, pulled
// from Wikidata. Rarity comes from how many language editions of Wikipedia cover the item
// (sitelinks). Hand-written tiers always win; extra answers only ever land in tiers 2-4, so
// One in a Vroomillion stays hand-picked.
//
//   node tools/build-answers.mjs            fetch everything and write the file
//   node tools/build-answers.mjs --probe    print counts and samples, write nothing
//   node tools/build-answers.mjs --only "Name a job;Name a bird"   rebuild just these prompts
import fs from "node:fs";
import { execFile } from "node:child_process";
import { SOURCES } from "./answer-sources.mjs";
import { normalize } from "../public/vroomillion/js/logic.js";

const MAIN = new URL("../public/vroomillion/js/data-extra.js", import.meta.url);
// --out FILE writes just the prompts built in this run (for parallel builds); --merge A B ... folds them in
const outArg = process.argv.includes("--out") ? process.argv[process.argv.indexOf("--out") + 1] : null;
const OUT = outArg ? new URL("file://" + fs.realpathSync(".") + "/" + outArg) : MAIN;
const args = process.argv.slice(2);
const probe = args.includes("--probe");
const only = args.includes("--only") ? args[args.indexOf("--only") + 1].split(";").map((x) => x.trim()) : null; // "A;B;C"
const MAX = 3000; // per prompt (src.max overrides: the deep lists go much further)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// curl is used rather than fetch: it copes better with big responses through proxies.
function sparql(query) {
  return new Promise((resolve, reject) => {
    let attempt = 0;
    const go = () => {
      execFile("curl", ["-s", "-m", "65", "-X", "POST", "-H", "Accept: application/sparql-results+json",
        "-H", "User-Agent: vroomillion-answer-builder/1.0 (trivia game data)", "--data-urlencode", "query@-",
        "-w", "\n%{http_code}", "https://query.wikidata.org/sparql"], { maxBuffer: 64 << 20 }, (err, out) => {
        const cut = out ? out.lastIndexOf("\n") : -1;
        const code = cut >= 0 ? out.slice(cut + 1).trim() : "000";
        if (!err && code === "200") {
          try { return resolve(JSON.parse(out.slice(0, cut)).results.bindings); } catch { /* fall through to retry */ }
        }
        if (++attempt >= 3) return reject(new Error("HTTP " + code));
        setTimeout(go, 4000 * attempt);
      }).stdin.end(query);
    };
    go();
  });
}

// Words that never belong in a family trivia game, whatever Wikidata files them under.
const BLOCK = /\b(gokudo|godemiche|striptease|stripper|f[uü]hrer|yakuza|slave|slavery|penis|vagina|vulva|scrotum|testicle|testis|anus|anal|rectum|clitoris|labia|dildo|vibrator|sex|sexual|porn|genital|genitals|mutilation|nipple|breast|semen|sperm|masturbat\w*|erotic|fetish|bdsm|condom|brothel|prostitut\w*|rape|nazi|hitler|swastika|genocide|massacre|suicide|murder|terroris\w*|torture|lynching|slur|cocaine|heroin|meth)\b/i;
// Scientific names: "prunus domestica", "ribes", "bambusoideae". Players type common names.
const LATIN_PAIR = /^[a-z]+(us|um|a|is|ae|ii|on|es|ix|ex|os|ys)\s[a-z]+(us|um|a|is|ae|ii|i|ensis|ica|icus|ata|atus|ana|anus|ina|inus|ea|eus|osa|osus|ens|ans|ix|ex|ides|oides|alis|ale|ii|orum|arum|um|ia)$/;
const LATIN_GROUP = /(idae|inae|oideae|aceae|ales|iformes|opsida|ophyta|phyceae|eae|ini)$/;
function latin(s) { return LATIN_PAIR.test(s) || (!s.includes(" ") && LATIN_GROUP.test(s)); }

// a label players could actually type
function clean(label, src = {}) {
  let s = label.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
  if (!s || s.length > 40 || s.length < 2) return null;
  if (/[:/\\|"\[\]{}<>=@]/.test(s)) return null;
  if (/^(q\d+|list of|category|template)/i.test(s)) return null;
  const k = normalize(s);
  if (!k || k.length < 2 || !/[a-z]/.test(k)) return null;
  if (BLOCK.test(k)) return null;
  if (src.exclude) { const re = new RegExp(src.exclude, "i"); if (re.test(k) || re.test(s.toLowerCase()) || re.test(k.replace(/ /g, "-"))) return null; }
  if (/^(january|february|march|april|may|june|july|august|september|october|november|december) \d+$/.test(k)) return null;
  if (src.taxa && latin(k)) return null; // only plant and animal prompts: elsewhere "pina colada" would look Latin
  return s.toLowerCase();
}

// src.tiers = [CRUISING from, FAST LANE from] in sitelinks; animals and people are covered in far more
// languages than everyday things, so their prompts use higher thresholds.
function tierFor(n, src) {
  const [t2, t3] = src.tiers || [70, 25];
  if (n >= t2) return 2;
  if (n >= t3) return 3;
  return 4;
}

// Raw wikitext of a Wikipedia page (index.php?action=raw is not rate-limited like the API).
function rawPage(title) {
  return new Promise((resolve) => {
    execFile("curl", ["-s", "-m", "30", "-H", "User-Agent: vroomillion-answer-builder/1.0", "https://en.wikipedia.org/w/index.php?title=" + encodeURIComponent(title.replace(/ /g, "_")) + "&action=raw"],
      { maxBuffer: 64 << 20 }, (err, out) => resolve(err ? "" : out));
  });
}

// Answers from the links on Wikipedia list pages; popularity looked up on Wikidata by article title.
async function fetchPages(src) {
  const titles = new Map(); // article title -> what the page shows
  for (const page of src.pages) {
    const text = await rawPage(page);
    for (const m of text.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g)) {
      const target = m[1].trim();
      if (/^(file|image|category|wikipedia|template|help|portal|list of|lists of|wp|wikt|commons|s|d):/i.test(target) || /^list(s)? of/i.test(target)) continue;
      if (/^\d+$/.test(target)) continue;
      if (!titles.has(target)) titles.set(target, m[2] && !/[\[{]/.test(m[2]) ? m[2] : target);
    }
    await sleep(800);
  }
  const all = [...titles.keys()];
  const counts = new Map();
  for (let k = 0; k < all.length; k += 120) {
    const batch = all.slice(k, k + 120).map((t) => JSON.stringify(t.charAt(0).toUpperCase() + t.slice(1)) + "@en").join(" ");
    try {
      // people, countries and cities linked from list pages (songwriters, composers, places) aren't answers
      // src.require: the linked article must be one of these kinds of thing on Wikidata (a musical, a song, a film...).
      // Otherwise people, countries and cities linked from list pages (songwriters, settings) are dropped.
      const check = src.require
        // strictKind: only real instances count (drops generic class articles like "cover version" or "single")
        ? `BIND(EXISTS { ?i ${src.strictKind ? "wdt:P31" : "(wdt:P31|wdt:P279)"}/wdt:P279* ?ok. VALUES ?ok { ${src.require.map((q) => "wd:" + q).join(" ")} } }${notKinds(src) ? ` && NOT EXISTS { ${notKinds(src)} }` : ""}${src.performer ? ` && (NOT EXISTS { ?i wdt:P175 ?pp. } || EXISTS { ?i wdt:P175 ?pa. ?pa_wp schema:about ?pa; schema:isPartOf <https://en.wikipedia.org/>; schema:name ${JSON.stringify(src.performer)}@en. })` : ""} AS ?good)`
        // anything that is a person, any kind of place, a language, an organisation, an event, a period of
        // time, a chemical or a creative work is never an answer here ("europe", "paris", "water", "winter")
        : `BIND(NOT EXISTS { ?i wdt:P31/wdt:P279* ?bad. VALUES ?bad { wd:Q5 wd:Q2221906 wd:Q34770 wd:Q315 wd:Q43229 wd:Q1190554 wd:Q186081 wd:Q11173 wd:Q79529 wd:Q17537576 wd:Q11862829 wd:Q9174 wd:Q4830453 wd:Q482994 wd:Q134556 } } AS ?good)`;
      const rows = await sparql(`SELECT ?t ?n ?good WHERE { VALUES ?t { ${batch} } ?a schema:about ?i; schema:isPartOf <https://en.wikipedia.org/>; schema:name ?t. ?i wikibase:sitelinks ?n. ${check} }`);
      for (const r of rows) counts.set(r.t.value.toLowerCase(), r.good.value === "true" ? Number(r.n.value) : -1);
    } catch { /* unknown popularity: treat as rare */ }
    await sleep(500);
  }
  return all.map((t) => {
    const n = counts.get(t.toLowerCase()) ?? (src.require ? -1 : 1); // with a required kind, unknown articles are dropped
    if (n < 0) return { n, forms: [] };
    // without a required kind, very widely covered links from list pages are usually generic ("water",
    // "milk", "europe"): the real well-known answers are hand-written already
    if (!src.require && n >= (src.pageMax ?? 90)) return { n, forms: [] };
    const forms = [...new Set([t, titles.get(t)].map((f) => clean(f, src)).filter(Boolean))];
    for (const f of [...forms]) for (const p of src.strip || []) if (f.startsWith(p) && f.length > p.length + 2) forms.push(f.slice(p.length));
    return { n, forms };
  }).filter((x) => x.forms.length && x.n >= (src.pageMin ?? (src.where ? 1 : src.min ?? 1))).sort((a, b) => b.n - a.n).slice(0, MAX);
}

function branches(where) {
  where = where.trim();
  if (!where.startsWith("{")) return [where];
  const parts = [];
  let depth = 0;
  let start = -1;
  let i = 0;
  for (; i < where.length; i++) {
    const c = where[i];
    if (c === "{") { if (depth === 0) start = i + 1; depth++; }
    else if (c === "}") { depth--; if (depth === 0) { parts.push(where.slice(start, i)); const rest = where.slice(i + 1).trimStart(); if (!rest.startsWith("UNION")) { i++; break; } } }
  }
  const tail = where.slice(i).trim();
  return parts.map((p) => p.trim() + " " + tail);
}

// src.not: kinds of thing that are never answers for this prompt (albums for a song prompt, novels for films)
const notKinds = (src) => (src.not?.length ? `?i wdt:P31/wdt:P279* ?nk. VALUES ?nk { ${src.not.map((q) => "wd:" + q).join(" ")} }` : "");

async function fetchPrompt(prompt, src) {
  // step 1: the items and their sitelink counts (cheap); step 2: English labels and aliases in batches
  // "{ A } UNION { B } rest" runs as separate small queries "A rest" and "B rest": far less likely to time out
  const found = new Map();
  for (const branch of branches(src.where)) {
    let rows;
    try {
      rows = await sparql(`SELECT ?i ?n WHERE { ${branch} ?i wikibase:sitelinks ?n. FILTER(?n >= ${src.min ?? 1})${notKinds(src) ? ` FILTER NOT EXISTS { ${notKinds(src)} }` : ""} }`);
    } catch (e) {
      console.log("   (part skipped: " + e.message + ")  " + branch.slice(0, 80));
      continue;
    }
    for (const r of rows) found.set(r.i.value.split("/").pop(), Number(r.n.value));
    await sleep(500);
  }
  const top = [...found].map(([id, n]) => ({ id, n })).sort((a, b) => b.n - a.n).slice(0, src.max ?? MAX);
  const names = new Map();
  for (let k = 0; k < top.length; k += 300) {
    const batch = top.slice(k, k + 300).map((x) => "wd:" + x.id).join(" ");
    const rows = await sparql(`SELECT ?i ?l ?alt WHERE { VALUES ?i { ${batch} } ?i rdfs:label ?l. FILTER(lang(?l) = "en") OPTIONAL { ?i skos:altLabel ?alt. FILTER(lang(?alt) = "en") } }`);
    for (const r of rows) {
      const id = r.i.value.split("/").pop();
      const e = names.get(id) || { label: r.l.value, alts: [] };
      if (r.alt && e.alts.length < 4 && !e.alts.includes(r.alt.value)) e.alts.push(r.alt.value);
      names.set(id, e);
    }
    await sleep(400);
  }
  return top.filter((x) => names.has(x.id)).map((x) => {
    const e = names.get(x.id);
    // aliases are messy on Wikidata: keep short, plain ones only
    const alts = e.alts.filter((x) => x.split(" ").length <= 3 && !/\b(by|for|from|with|in|of the)\b/i.test(x) && !/^[A-Z0-9]{1,3}$/.test(x));
    if (clean(e.label, src) === null) return { n: x.n, forms: [] }; // main name filtered: drop its aliases too
    const forms = [e.label, ...alts].map((f) => clean(f, src)).filter(Boolean);
    for (const f of [...forms]) for (const p of src.strip || []) if (f.startsWith(p) && f.length > p.length + 2) forms.push(f.slice(p.length));
    // people: their surname on its own counts too ("einstein")
    if (src.surnames && forms[0]) { const last = forms[0].split(" ").pop(); if (last.length >= 4 && last !== forms[0]) forms.push(last); }
    return { n: x.n, forms: [...new Set(forms)] };
  }).filter((x) => x.forms.length);
}

// The live answer check (src/check.js) uses the same rules: for each prompt, the SPARQL pattern an
// item must match, its rarity thresholds and exclusions. Written to src/answer-classes.js.
async function classesFile() {
  const out = {};
  for (const [prompt, src] of Object.entries(SOURCES)) {
    if (!src) continue;
    const parts = [];
    if (src.where) parts.push(...branches(src.where).map((b) => `{ ${b} }`));
    if (src.require) parts.push(`{ ?i (wdt:P31|wdt:P279)/wdt:P279* ?ok. VALUES ?ok { ${src.require.map((q) => "wd:" + q).join(" ")} } }`);
    if (!parts.length) continue;
    out[prompt] = { where: parts.join(" UNION "), tiers: src.tiers || [70, 25], exclude: src.exclude || null, taxa: !!src.taxa, ...(src.exact ? { exact: true } : {}), ...(src.titleRx ? { titleRx: src.titleRx } : {}) };
  }
  try {
    const { PROMPTS } = await import("./prompt-sources.mjs");
    const genFile = new URL("../public/vroomillion/js/data-gen.js", import.meta.url);
    const GEN = fs.existsSync(genFile) ? (await import(genFile.href + "?" + Date.now())).GEN : {};
    for (const [prompt, src] of Object.entries(PROMPTS)) {
      if (!GEN[prompt]) continue; // only prompts that made it into the game
      // a prompt built from list pages only is checked against its required kinds of thing
      const where = src.where ? branches(src.where).map((b) => `{ ${b} }`).join(" UNION ")
        : src.require ? `{ ?i wdt:P31/wdt:P279* ?ok. VALUES ?ok { ${src.require.map((q) => "wd:" + q).join(" ")} } }` : null;
      if (!where) continue;
      out[prompt] = { where, tiers: GEN[prompt].tiers, exclude: src.exclude || null, taxa: !!src.taxa };
    }
  } catch (e) { console.log("generated prompts not included:", e.message); }
  const file = new URL("../src/answer-classes.js", import.meta.url);
  fs.writeFileSync(file, `// GENERATED by tools/build-answers.mjs from tools/answer-sources.mjs. Do not edit by hand.
// For the live answer check: the Wikidata pattern (binding ?i) an answer must match for each prompt.
export const BLOCK = ${JSON.stringify(BLOCK.source)};
export const CLASSES = ${JSON.stringify(out, null, 1)};
`);
  console.log("wrote", file.pathname, Object.keys(out).length, "prompts");
}
if (args.includes("--classes")) { await classesFile(); process.exit(0); }

// --deep: the long tail. Every item of each prompt's kind on Wikidata, most covered first (up to
// 15,000), one file per prompt in public/vroomillion/deep/. The game loads the few files a race needs
// in the background, so obscure answers count instantly instead of waiting on the live check.
// --deep-index rebuilds deep/index.json from the files there.
const DEEP_DIR = new URL("../public/vroomillion/deep/", import.meta.url);
const deepSlug = (q) => q.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
function deepIndex() {
  const files = fs.readdirSync(DEEP_DIR).filter((f) => f.endsWith(".json") && f !== "index.json");
  const index = {};
  for (const f of files) { const d = JSON.parse(fs.readFileSync(new URL(f, DEEP_DIR), "utf8")); index[d.q] = { file: f, n: d.a.length }; }
  fs.writeFileSync(new URL("index.json", DEEP_DIR), JSON.stringify(index));
  console.log("deep index:", Object.keys(index).length, "prompts");
}
if (args.includes("--deep-index")) { deepIndex(); process.exit(0); }
if (args.includes("--deep")) {
  fs.mkdirSync(DEEP_DIR, { recursive: true });
  const { PROMPTS } = await import("./prompt-sources.mjs");
  const genFile = new URL("../public/vroomillion/js/data-gen.js", import.meta.url);
  const GEN = (await import(genFile.href)).GEN;
  const todo = [];
  for (const [q, src] of Object.entries(PROMPTS)) if (GEN[q] && src.where) todo.push([q, src, GEN[q].tiers]);
  for (const [q, src] of Object.entries(SOURCES)) if (src?.where && !/schema:description/.test(src.where)) todo.push([q, src, src.tiers || [70, 25]]);
  const only = args.includes("--only") ? new Set(args[args.indexOf("--only") + 1].split(";")) : null;
  for (const [q, src, tiers] of todo) {
    if (only && !only.has(q)) continue;
    const file = new URL(deepSlug(q) + ".json", DEEP_DIR);
    if (fs.existsSync(file) && !args.includes("--force")) continue;
    let items;
    try { items = await fetchPrompt(q, { ...src, min: 0, max: 15000 }); } catch (e) { console.log("!! failed:", q, e.message); continue; }
    const a = items.filter((x) => x.forms.length).map((x) => [x.forms.join("|"), x.n]);
    if (a.length < 10) { console.log("-- skipped", q, a.length); continue; }
    fs.writeFileSync(file, JSON.stringify({ q, tiers, a }));
    console.log(q + ": " + a.length + " deep answers");
    await sleep(600);
  }
  deepIndex();
  process.exit(0);
}

// --prompts: whole new questions from tools/prompt-sources.mjs. Tiers by rank within the prompt:
// the most widely covered few are TRAFFIC, then CRUISING, FAST LANE, DEEP CUT, and three of the
// rarest real items (at least two language editions) are ONE IN A VROOMILLION.
if (args.includes("--prompts")) {
  const { PROMPTS } = await import("./prompt-sources.mjs");
  const out = {};
  for (const [q, src] of Object.entries(PROMPTS)) {
    if (only && !only.includes(q)) continue;
    let items;
    try { items = [...(src.where ? await fetchPrompt(q, src) : []), ...(src.pages ? await fetchPages(src) : [])].sort((x, y) => y.n - x.n); } catch (e) { console.log("!! failed:", q, e.message); continue; }
    const seen = new Set();
    const list = [];
    for (const it of items) {
      const forms = it.forms.filter((f) => { const k = normalize(f); if (!k || seen.has(k)) return false; seen.add(k); return true; });
      if (forms.length) list.push({ n: it.n, entry: forms.join("|") });
    }
    if (list.length < 8) { console.log(`-- skipped ${q}: only ${list.length} answers`); continue; }
    const N = list.length;
    // small closed sets (8-60 answers, e.g. a director's films) split evenly; big ones keep TRAFFIC to the famous few
    const small = N < 60;
    const t1 = small ? Math.round(N * 0.2) : Math.max(6, Math.min(14, Math.round(N * 0.03)));
    const t2 = small ? Math.round(N * 0.42) : t1 + Math.max(6, Math.round(N * 0.1));
    const t3 = small ? Math.round(N * 0.66) : t2 + Math.max(8, Math.round(N * 0.22));
    const tail = list.slice(t3);
    const rare = tail.filter((x) => x.n >= 2).slice(-Math.max(3, Math.round(tail.length * 0.3)));
    const pick = new Set((rare.length >= 3 ? rare : tail).filter((_, k, arr) => k % Math.max(1, Math.floor(arr.length / 3)) === 0).slice(0, N < 20 ? 1 : 3).map((x) => x.entry));
    const a = [list.slice(0, t1), list.slice(t1, t2), list.slice(t2, t3), tail.filter((x) => !pick.has(x.entry)), tail.filter((x) => pick.has(x.entry))].map((l) => l.map((x) => x.entry));
    // thresholds for the live check: an item covered as widely as the CRUISING / FAST LANE boundary
    const thresholds = [list[t1]?.n ?? 70, list[t2]?.n ?? 25];
    out[q] = { q, a, ...(src.deck ? { deck: src.deck } : {}), gen: true, tiers: thresholds };
    console.log(`${q}: ${N} answers (t1 ${a[0].length}, t2 ${a[1].length}, t3 ${a[2].length}, t4 ${a[3].length}, t5 ${a[4].length})`);
    await sleep(800);
  }
  const file = outArg ? OUT : new URL("../public/vroomillion/js/data-gen.js", import.meta.url);
  let all = out;
  if (!outArg && fs.existsSync(file) && only) all = { ...(await import(file.href + "?" + Date.now())).GEN, ...out };
  writeGen(all, file);
  process.exit(0);
}
if (args.includes("--merge-gen")) {
  const file = new URL("../public/vroomillion/js/data-gen.js", import.meta.url);
  const all = fs.existsSync(file) ? (await import(file.href + "?" + Date.now())).GEN : {};
  for (const f of args.slice(args.indexOf("--merge-gen") + 1)) Object.assign(all, (await import("file://" + fs.realpathSync(f) + "?" + Date.now())).GEN);
  writeGen(all, file);
  process.exit(0);
}
function writeGen(all, file) {
  const body = Object.values(all).map((q) => "  " + JSON.stringify(q) + ",").join("\n");
  fs.writeFileSync(file, `// GENERATED by tools/build-answers.mjs --prompts from tools/prompt-sources.mjs (Wikidata). Do not edit by hand.
// Whole questions: five tiers by how widely covered each answer is. tiers = live-check thresholds.
export const GEN = {
${Object.entries(all).map(([k, q]) => "  " + JSON.stringify(k) + ": " + JSON.stringify(q) + ",").join("\n")}
};
`);
  console.log("wrote", file.pathname, Object.keys(all).length, "prompts");
  void body;
}

if (args.includes("--merge")) {
  const { EXTRA } = await import(MAIN.href + "?" + Date.now());
  for (const f of args.slice(args.indexOf("--merge") + 1)) {
    const part = (await import("file://" + fs.realpathSync(f) + "?" + Date.now())).EXTRA;
    Object.assign(EXTRA, part);
    console.log("merged", f, Object.keys(part).length, "prompts");
  }
  writeOut(EXTRA, MAIN);
  process.exit(0);
}

if (args.includes("--refilter")) {
  const { EXTRA } = await import(OUT.href + "?" + Date.now());
  let dropped = 0;
  for (const [prompt, tiers] of Object.entries(EXTRA)) {
    const src = SOURCES[prompt] || {};
    // if an answer's main name is filtered out, its aliases go too ("dalai lama" takes "grand lama" with it)
    EXTRA[prompt] = tiers.map((list) => list.map((e) => {
      const forms = e.split("|");
      if (clean(forms[0], src) === null) { dropped += forms.length; return ""; }
      return forms.filter((f) => { const ok = clean(f, src) !== null; if (!ok) dropped++; return ok; }).join("|");
    }).filter(Boolean));
  }
  writeOut(EXTRA);
  console.log("refiltered, dropped", dropped, "forms");
  process.exit(0);
}

function writeOut(extra, file = OUT) {
  const body = Object.entries(extra).map(([k, t]) => `  ${JSON.stringify(k)}: [\n${t.map((l) => `    ${JSON.stringify(l)},`).join("\n")}\n  ],`).join("\n");
  fs.writeFileSync(file, `// GENERATED by tools/build-answers.mjs from Wikidata and Wikipedia list pages. Do not edit by hand:\n// change tools/answer-sources.mjs and rebuild. Extra accepted answers per prompt, as [CRUISING, FAST LANE, DEEP CUT].\n// Hand-written tiers in data.js win.\nexport const EXTRA = {\n${body}\n};\n`);
}

const { HAND_QUESTIONS } = await import("../public/vroomillion/js/data.js");
const known = new Map(HAND_QUESTIONS.map((q) => [q.q, new Set(q.a.flat().flatMap((e) => e.split("|")).map(normalize))]));
let existing = {};
if (!outArg && fs.existsSync(OUT) && only) existing = (await import(OUT.href + "?" + Date.now())).EXTRA;
const extra = { ...existing };

for (const [prompt, src] of Object.entries(SOURCES)) {
  if (src?.checkOnly) continue; // live check rules only, no answer list
  if (!src || (only && !only.includes(prompt))) continue;
  if (!known.has(prompt)) { console.log("?? no such prompt:", prompt); continue; }
  let items;
  try { items = [...(src.where ? await fetchPrompt(prompt, src) : []), ...(src.pages ? await fetchPages(src) : [])]; } catch (e) { console.log("!! failed:", prompt, e.message); continue; }
  const have = known.get(prompt);
  const tiers = [[], [], []];
  let added = 0;
  for (const it of items) {
    const forms = it.forms.filter((f) => !have.has(normalize(f)));
    if (forms.length < it.forms.length) { forms.forEach((f) => have.add(normalize(f))); continue; } // already a hand-written answer (any form): keep its hand tier
    if (!forms.length) continue;
    forms.forEach((f) => have.add(normalize(f)));
    tiers[tierFor(it.n, src) - 2].push(forms.join("|"));
    added++;
  }
  extra[prompt] = tiers;
  console.log(`${prompt}: ${items.length} from Wikidata, ${added} new  (t2 ${tiers[0].length}, t3 ${tiers[1].length}, t4 ${tiers[2].length})`);
  if (probe) console.log("   top:", tiers[0].slice(0, 8).join(", ") || tiers[1].slice(0, 8).join(", "), "\n   low:", tiers[2].slice(-6).join(", "));
  await sleep(1200);
}

if (!probe) {
  writeOut(extra);
  console.log("wrote", OUT.pathname);
}
