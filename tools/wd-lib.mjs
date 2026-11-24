// Shared Wikidata helpers for the answer builders (tools/build-answers.mjs, tools/build-catalog.mjs):
// SPARQL with retries, label cleaning, and fetching every item a prompt's rule matches.
import fs from "node:fs";
import { execFile } from "node:child_process";
import { normalize } from "../public/vroomillion/js/logic.js";
export const MAX = 3000; // per prompt (src.max overrides: the deep lists go much further)
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// curl is used rather than fetch: it copes better with big responses through proxies.
export function sparql(query) {
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
export const BLOCK = /\b(gokudo|godemiche|striptease|stripper|f[uü]hrer|yakuza|slave|slavery|penis|vagina|vulva|scrotum|testicle|testis|anus|anal|rectum|clitoris|labia|dildo|vibrator|sex|sexual|porn|genital|genitals|mutilation|nipple|breast|semen|sperm|masturbat\w*|erotic|fetish|bdsm|condom|brothel|prostitut\w*|rape|nazi|hitler|swastika|genocide|massacre|suicide|murder|terroris\w*|torture|lynching|slur|cocaine|heroin|meth)\b/i;
// Scientific names: "prunus domestica", "ribes", "bambusoideae". Players type common names.
export const LATIN_PAIR = /^[a-z]+(us|um|a|is|ae|ii|on|es|ix|ex|os|ys)\s[a-z]+(us|um|a|is|ae|ii|i|ensis|ica|icus|ata|atus|ana|anus|ina|inus|ea|eus|osa|osus|ens|ans|ix|ex|ides|oides|alis|ale|ii|orum|arum|um|ia)$/;
export const LATIN_GROUP = /(idae|inae|oideae|aceae|ales|iformes|opsida|ophyta|phyceae|eae|ini)$/;
export function latin(s) { return LATIN_PAIR.test(s) || (!s.includes(" ") && LATIN_GROUP.test(s)); }

// a label players could actually type
export function clean(label, src = {}) {
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
export function tierFor(n, src) {
  const [t2, t3] = src.tiers || [70, 25];
  if (n >= t2) return 2;
  if (n >= t3) return 3;
  return 4;
}

// Raw wikitext of a Wikipedia page (index.php?action=raw is not rate-limited like the API).
export function rawPage(title) {
  return new Promise((resolve) => {
    execFile("curl", ["-s", "-m", "30", "-H", "User-Agent: vroomillion-answer-builder/1.0", "https://en.wikipedia.org/w/index.php?title=" + encodeURIComponent(title.replace(/ /g, "_")) + "&action=raw"],
      { maxBuffer: 64 << 20 }, (err, out) => resolve(err ? "" : out));
  });
}

// Answers from the links on Wikipedia list pages; popularity looked up on Wikidata by article title.
export async function fetchPages(src) {
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

export function branches(where) {
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
export const notKinds = (src) => (src.not?.length ? `?i wdt:P31/wdt:P279* ?nk. VALUES ?nk { ${src.not.map((q) => "wd:" + q).join(" ")} }` : "");

export async function fetchPrompt(prompt, src) {
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
    // Wikidata keeps many names only under "mul" (the same in every language) and drops the English copy:
    // Kendrick Lamar, Nicki Minaj, Radiohead. An English label wins when there is one.
    // geography prompts (WORLD TOUR) also fetch each place's coordinates
    const rows = await sparql(`SELECT ?i ?l ?alt${src.geo ? " ?co" : ""} WHERE { VALUES ?i { ${batch} } ?i rdfs:label ?l. FILTER(lang(?l) IN ("en", "mul")) OPTIONAL { ?i skos:altLabel ?alt. FILTER(lang(?alt) IN ("en", "mul")) }${src.geo ? " OPTIONAL { ?i wdt:P625 ?co }" : ""} }`);
    for (const r of rows) {
      const id = r.i.value.split("/").pop();
      const e = names.get(id) || { label: r.l.value, alts: [] };
      if (r.co && !e.at) { const m = /Point\(([-\d.eE]+) ([-\d.eE]+)\)/.exec(r.co.value); if (m) e.at = [Math.round(Number(m[2]) * 100) / 100, Math.round(Number(m[1]) * 100) / 100]; }
      if (r.l["xml:lang"] === "en") e.label = r.l.value;
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
    return { n: x.n, forms: [...new Set(forms)], ...(e.at ? { at: e.at } : {}) };
  }).filter((x) => x.forms.length);
}

