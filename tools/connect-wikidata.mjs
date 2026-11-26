// Switches back on the Wikidata rules that had been switched off because Wikidata disagreed with the
// hand-written answers (tools/wikidata-connect-rules.mjs). For each prompt it:
//   - keeps every hand-written answer and tier as it is,
//   - adds Wikidata's items that aren't on the list yet, in the rarer tiers by how widely covered they are,
//   - turns on the live answer check with the rule (src/catalog-classes.js, via build-catalog --classes),
// and writes what the two disagree on to wikidata-discrepancies.md: obvious answers Wikidata doesn't have
// under the rule, and the best-known answers it adds that weren't on the list (the ones worth a look).
//   node tools/connect-wikidata.mjs [--only a/b,c/d]
import fs from "node:fs";
import { FAMILIES } from "../public/vroomillion/js/catalog/index.js";
import { answerSlug } from "../public/vroomillion/js/racepick.js";
import { normalize } from "../public/vroomillion/js/logic.js";
import { fetchPrompt, branches, sleep } from "./wd-lib.mjs";
import { parseRule, tiersFor, resolveLabel } from "./build-catalog.mjs";
import { CONNECT } from "./wikidata-connect-rules.mjs";

const DIR = new URL("../public/vroomillion/answers/", import.meta.url);
const args = process.argv.slice(2);
const only = args.includes("--only") ? new Set(args[args.indexOf("--only") + 1].split(",")) : null;
const REPORT = new URL("../wikidata-discrepancies.md", import.meta.url);
const old = fs.existsSync(REPORT) ? fs.readFileSync(REPORT, "utf8") : "";
const sections = new Map([...old.matchAll(/^## (.+?)\n([\s\S]*?)(?=^## |$(?![\s\S]))/gm)].map((m) => [m[1].split(" — ")[0], m[0]]));
const failed = [];

for (const [id, { rule, from }] of Object.entries(CONNECT)) {
  if (only && !only.has(id)) continue;
  const f = FAMILIES.find((x) => x.id === id);
  if (!f) { failed.push(`${id}: no such prompt any more`); continue; }
  const q = f.prompts[0];
  const file = new URL(answerSlug(q) + ".json", DIR);
  const d = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : { q, a: [f.top || [], [], [], [], []], fam: id };
  let src;
  try { src = parseRule(rule); } catch (e) { failed.push(`${id}: bad rule (${e.message})`); continue; }
  if (src.label) {
    const k = await resolveLabel(src.label, src.min).catch(() => null);
    if (!k) { failed.push(`${id}: Wikidata has no class "${src.label}"`); continue; }
    src.where = `{ ?i wdt:P31/wdt:P279* wd:${k}. } UNION { ?i wdt:P279+ wd:${k}. }`;
  }
  let items;
  try { items = await fetchPrompt(q, src); } catch (e) { failed.push(`${id}: lookup failed (${e.message})`); continue; }
  if (items.partial) console.log("   (part of the rule timed out: the list may be short)", id);
  const top = d.a[0] || [];
  const { a: wa, tiers } = tiersFor(top, items, src);
  // merge: everything hand-written stays; Wikidata's new items go in its tiers
  const have = new Set(d.a.flat().flatMap((e) => e.split("|").map(normalize)));
  const added = [];
  const out = d.a.map((t) => [...t]);
  while (out.length < 5) out.push([]);
  out[0] = wa[0]; // the obvious answers, now with Wikidata's other names for them
  for (let k = 1; k < 5; k++) for (const e of wa[k] || []) {
    const forms = e.split("|");
    if (forms.some((x) => have.has(normalize(x)))) continue;
    forms.forEach((x) => have.add(normalize(x)));
    out[k].push(e); added.push(e.split("|")[0]);
  }
  const wdKeys = new Set(items.flatMap((it) => it.forms.map(normalize)));
  const misses = top.filter((t) => !t.split("|").some((x) => wdKeys.has(normalize(x)))).map((t) => t.split("|")[0]);
  d.a = out;
  d.tiers = tiers;
  d.live = { where: branches(src.where).map((b) => `{ ${b} }`).join(" UNION "), tiers, exclude: src.exclude || null, taxa: !!src.taxa };
  d.wd = "connected";
  fs.writeFileSync(file, JSON.stringify(d));
  // the best-known additions first (Wikidata's order): the ones most likely to be noticed if wrong
  sections.set(q, `## ${q} — ${from}\n` +
    `- Wikidata's list: ${items.length} items · added ${added.length} new answers · ${top.length - misses.length}/${top.length} obvious answers found\n` +
    `- Obvious answers Wikidata doesn't have under this rule (still accepted from the hand list): ${misses.length ? misses.join(", ") : "none"}\n` +
    `- Best-known answers it adds (check these for ones that don't fit): ${added.slice(0, 25).join(", ") || "none"}\n\n`);
  console.log(`${id}: ${items.length} on Wikidata, +${added.length} answers, misses ${misses.length}/${top.length}`);
  await sleep(400);
}
const head = `# Wikidata discrepancies

These prompts have their Wikidata rule switched back on (tools/connect-wikidata.mjs): Wikidata's answers are
added to the hand-written lists, and the live answer check accepts anything Wikidata files under the rule.
For each one: the obvious answers Wikidata doesn't have (they still count, from the hand list), and the
best-known answers Wikidata adds that weren't on the list, which is where any wrong answers would show up.

`;
fs.writeFileSync(REPORT, head + [...sections.values()].join("") + (failed.length ? "## Not connected\n" + failed.map((x) => "- " + x).join("\n") + "\n" : ""));
console.log("done.", failed.length ? "failed: " + failed.join("; ") : "");
