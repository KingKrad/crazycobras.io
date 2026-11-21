// Picking a race from the prompt catalog (js/catalog). The rules, strongest first:
//   1. never a family you've already had (any mode, any race type), until every family is used up;
//      then the ones you had longest ago come back first
//   2. seven different topics, and never two families from the same group
//   3. at most one "one artist / one show" style prompt
// The history is a list of family ids ("F:<id>"), oldest first.
import { FAMILIES, TOPICS } from "./catalog/index.js";

export const FAM_PREFIX = "F:";
// the answers for prompts added with the new catalog live one file per prompt: answers/<slug>.json
export const answerSlug = (q) => q.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const famKey = (f) => FAM_PREFIX + (f.key || f.id);
const byPrompt = new Map(FAMILIES.flatMap((f) => f.prompts.map((p) => [p, f])));
export const familyOf = (prompt) => byPrompt.get(prompt) || null;

// which families a mode draws from, and how the topics are counted there
const POOL = { classic: "main", car: "car", hard: "hard", daily: "daily" };
const topicOf = (f, pool) => (pool === "car" ? f.carTopic || f.topic : f.topic);
export const poolFamilies = (mode, fams = FAMILIES) => fams.filter((f) => f.pools.includes(POOL[mode] || "main"));

// seen: the history list; returns families in play order, each with the prompt text to ask
export function pickRace(mode, seen, n = 7, rng = Math.random, opts = {}) {
  const pool = POOL[mode] || "main";
  // only families with answers on this copy of the game (opts.has: prompt -> bool)
  const fams = poolFamilies(mode, opts.families).filter((f) => !opts.has || f.prompts.some(opts.has));
  const order = new Map(); // family key -> position in the history (higher = more recent)
  (seen || []).forEach((k, i) => order.set(k, i));
  const fresh = fams.filter((f) => !order.has(famKey(f)));
  // used up: the oldest-seen come back first
  const stale = fams.filter((f) => order.has(famKey(f))).sort((a, b) => order.get(famKey(a)) - order.get(famKey(b)));
  const shuffled = shuffle(fresh, rng);
  const picked = [];
  const ok = (f, strict) => {
    const t = topicOf(f, pool);
    if (picked.some((p) => p.group === f.group || famKey(p) === famKey(f))) return false;
    if (f.single && picked.some((p) => p.single)) return false;
    if (strict && picked.some((p) => topicOf(p, pool) === t)) return false;
    return true;
  };
  // each round: a topic not used yet, every topic equally likely, then a family in it. Fresh families
  // always win: a repeat only comes in once nothing fresh fits (and then the oldest first).
  // strict: also a new topic; loose: only "never a repeat" (when a small pool can't meet the rest);
  // ordered: take the list in order (the stale list, oldest first) instead of a random topic
  const fill = (list, strict, ordered = false, loose = false) => {
    while (picked.length < n) {
      const open = new Map();
      for (const f of list) {
        if (picked.includes(f) || (!loose && !ok(f, strict))) continue;
        const t = strict ? topicOf(f, pool) : "any" + open.size;
        if (!open.has(t)) open.set(t, f);
        if (ordered || !strict) break;
      }
      if (!open.size) return;
      const topics = [...open.keys()];
      picked.push(open.get(topics[Math.floor(rng() * topics.length)]));
    }
  };
  fill(shuffled, true); fill(shuffled, false); fill(shuffled, false, false, true);
  fill(stale, true, true); fill(stale, false, true); fill(stale, false, true, true);
  return picked.map((f) => ({ family: f, prompt: choosePrompt(f, rng, opts.has) }));
}

// a family's wording for this race: any of its prompts that the game has answers for
export function choosePrompt(f, rng = Math.random, has = null) {
  const list = has ? f.prompts.filter((p) => has(p)) : f.prompts;
  const from = list.length ? list : f.prompts;
  return from[Math.floor(rng() * from.length)];
}

function shuffle(list, rng) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// THE DAILY RACE: one a day, the same for everyone, from its own pool (never used in Unlimited).
// The pool is laid out once into races of seven (same rules as above, fixed order), and day N plays
// race N, looping once every race has been played (about once a year at full size).
export function dailyLayout(fams = FAMILIES, n = 7) {
  let pool = poolFamilies("daily", fams);
  if (pool.length < n) pool = poolFamilies("classic", fams); // until the daily pool is written (testing only)
  const sorted = [...pool].sort((a, b) => (a.id < b.id ? -1 : 1));
  const rng = seeded("vroomillion-daily-v2");
  const left = shuffle(sorted, rng);
  const races = [];
  while (left.length >= n) {
    const race = [];
    for (const strict of [true, false, null]) {
      for (let i = 0; i < left.length && race.length < n; i++) {
        const f = left[i];
        const twin = race.some((p) => famKey(p) === famKey(f)); // never both twins in one race
        const clash = twin || (strict !== null && race.some((p) => p.group === f.group || (f.single && p.single) || (strict && p.topic === f.topic)));
        if (!clash) { race.push(f); left.splice(i--, 1); }
      }
    }
    races.push(race);
  }
  return races;
}
let layout = null;
export function dailyRace(day, fams = FAMILIES) {
  if (!layout || fams !== FAMILIES) layout = dailyLayout(fams);
  const races = layout;
  if (!races.length) return [];
  const idx = ((dayNumber(day) % races.length) + races.length) % races.length;
  const rng = seeded("vroomillion-daily-words-" + idx);
  return races[idx].map((f) => ({ family: f, prompt: choosePrompt(f, rng) }));
}
// "2026-11-21" -> days since 1 Jan 2026
export const dayNumber = (day) => Math.round((Date.parse(day + "T00:00:00Z") - Date.parse("2026-01-01T00:00:00Z")) / 86400000);

function seeded(text) {
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i++) { h = Math.imul(h ^ text.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}

export { TOPICS };
