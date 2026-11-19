// The long tail of answers: for each prompt, every matching thing on Wikidata (deep/<prompt>.json, built by
// tools/build-answers.mjs --deep). A race fetches only its own prompts' files, in the background as it
// starts, so an obscure answer is found instantly instead of waiting on the live check.
import { normalize } from "./logic.js";

let manifest = null;
const maps = new Map(); // prompt -> Map(answer key -> { tier, display })
const loading = new Map();

function manifestReady() {
  if (!manifest) manifest = fetch("deep/index.json").then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
  return manifest;
}

// tier from how widely covered the thing is, on the prompt's own scale (the same rule as the live check)
const tierOf = (n, [t2, t3]) => (n >= t2 ? 2 : n >= t3 ? 3 : 4);

export function prefetchDeep(prompts) {
  return manifestReady().then((index) => Promise.all([...new Set(prompts)].map((p) => {
    if (maps.has(p) || loading.has(p) || !index[p]) return loading.get(p);
    const job = fetch("deep/" + index[p].file)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        const map = new Map();
        const tiers = Array.isArray(d.tiers) ? d.tiers : [70, 25];
        for (const [entry, n] of d.a) {
          const forms = entry.split("|");
          const hit = { tier: tierOf(n, tiers), display: forms[0] };
          for (const f of forms) { const k = normalize(f); if (k && !map.has(k)) map.set(k, hit); }
        }
        maps.set(p, map);
      })
      .catch(() => {})
      .finally(() => loading.delete(p));
    loading.set(p, job);
    return job;
  })));
}

// the prompt's deep answers if they've arrived (null otherwise: the live check still covers it)
export const deepAnswers = (prompt) => maps.get(prompt) || null;
