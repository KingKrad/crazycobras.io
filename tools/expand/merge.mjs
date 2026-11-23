// Adds hand-written extra answers to prompts' answer files: tools/expand/<batch>.json maps a prompt to
// [CRUISING, FAST LANE, TURBO, ONE IN A VROOMILLION] lists. The obvious answers (TRAFFIC) stay as they
// are; anything already in the file (any tier) is skipped.
//   node tools/expand/merge.mjs week1 [--drop "a;b;c"]
import fs from "node:fs";
import { answerSlug } from "../../public/vroomillion/js/racepick.js";
import { normalize } from "../../public/vroomillion/js/logic.js";
const [batch] = process.argv.slice(2);
const drop = new Set((process.argv.includes("--drop") ? process.argv[process.argv.indexOf("--drop") + 1] : "").split(";").map((s) => normalize(s)).filter(Boolean));
const data = JSON.parse(fs.readFileSync(new URL(`./${batch}.json`, import.meta.url), "utf8"));
let added = 0, files = 0;
for (const [prompt, tiers] of Object.entries(data)) {
  const url = new URL(`../../public/vroomillion/answers/${answerSlug(prompt)}.json`, import.meta.url);
  if (!fs.existsSync(url)) { console.log("no answers file:", prompt); continue; }
  const j = JSON.parse(fs.readFileSync(url, "utf8"));
  const have = new Set(j.a.flat().flatMap((e) => e.split("|")).map(normalize));
  tiers.forEach((list, k) => {
    for (const ans of list) {
      const key = normalize(ans);
      if (!key || have.has(key) || drop.has(key)) continue;
      have.add(key);
      j.a[k + 1].push(ans);
      added++;
    }
  });
  j.expanded = (j.expanded || 0) + 1;
  fs.writeFileSync(url, JSON.stringify(j));
  files++;
}
console.log(`${files} prompts, ${added} answers added`);
