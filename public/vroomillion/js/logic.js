// Pure game rules: answer judging, rarity tiers and payouts. No DOM in here.

export const TIERS = [
  { id: 0, name: "STALLED", short: "STALL", metres: 0, blurb: "Not on the list. The engine coughs." },
  { id: 1, name: "TRAFFIC", short: "TRAFFIC", metres: 120, blurb: "Everybody says that one." },
  { id: 2, name: "CRUISING", short: "CRUISE", metres: 280, blurb: "Solid, but you've got company." },
  { id: 3, name: "FAST LANE", short: "FAST", metres: 480, blurb: "Not many think of that." },
  { id: 4, name: "DEEP CUT", short: "DEEP CUT", metres: 720, blurb: "Now that's niche." },
  { id: 5, name: "ONE IN A VROOMILLION", short: "VROOMILLION", metres: 1000, blurb: "Almost nobody alive says that." },
];

export const ROUNDS = 7;
export const ANSWER_SECONDS = 25;
export const NITRO_BOOST = 1.5;

// Solo tracks: reach the goal distance within the race to win the prize.
export const LEAGUES = [
  { id: "street", name: "STREET MEET", prize: 600, target: 2000 },
  { id: "club", name: "CLUB CUP", prize: 3000, target: 3000 },
  { id: "pro", name: "PRO CIRCUIT", prize: 15000, target: 4000 },
  { id: "hyper", name: "HYPER LEAGUE", prize: 60000, target: 5000 },
  { id: "gp", name: "VROOMILLION GP", prize: 200000, target: 6000 },
];

export function normalize(s) {
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/['’`.]/g, "")
    .replace(/[^a-z0-9+#]+/g, " ")
    .trim()
    .replace(/^(the|a|an) /, "")
    .replace(/\s+/g, " ");
}

// Map of normalized answer -> { tier (1..5), display }. If an answer appears twice,
// the more common tier wins, so a typo in the data can never over-reward.
export function buildIndex(question) {
  const index = new Map();
  question.a.forEach((list, i) => {
    for (const entry of list) {
      const forms = entry.split("|");
      for (const form of forms) {
        const key = normalize(form);
        if (key && !index.has(key)) index.set(key, { tier: i + 1, display: forms[0] });
      }
    }
  });
  return index;
}

// Typo distance: insert, delete, substitute, or swap two neighbouring letters each cost 1.
// subCost 2 means a wrong letter isn't forgiven, only missing / extra / swapped ones.
export function editDistance(a, b, max, subCost = 1) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev2 = null;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : subCost));
      if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) cur[j] = Math.min(cur[j], prev2[j - 2] + 1);
      if (cur[j] < best) best = cur[j];
    }
    if (best > max) return max + 1;
    prev2 = prev;
    prev = cur;
  }
  return prev[b.length];
}

// How many typos to forgive for an answer of this length.
export const typoAllowance = (len) => (len >= 9 ? 2 : len >= 4 ? 1 : 0);

// Returns { tier, display, key, corrected }. tier 0 means the answer isn't on the list.
// corrected is true when a typo was snapped to the nearest real answer.
export function judge(index, raw) {
  const key = normalize(raw);
  if (!key) return { tier: 0, display: "", key: "" };
  const variants = [key];
  if (key.endsWith("es") && key.length > 4) variants.push(key.slice(0, -2));
  if (key.endsWith("s") && key.length > 3) variants.push(key.slice(0, -1));
  variants.push(key + "s");
  for (const v of variants) {
    const hit = index.get(v);
    if (hit) return { ...hit, key: normalize(hit.display) };
  }
  // Autocorrect: snap to the closest real answer. On a tie, pick the more common one.
  // People rarely fumble the first letter, so it must match; short words can't have a wrong letter.
  const max = typoAllowance(key.length);
  const subCost = key.length < 6 ? 2 : 1;
  if (max) {
    let best = null;
    for (const [cand, hit] of index) {
      if (cand[0] !== key[0] || cand.length < 4) continue;
      if (key.length < 6 && cand.length < key.length) continue; // short words: only a missing letter, never an extra one
      const d = Math.min(editDistance(key, cand, max, subCost), editDistance(key.replace(/ /g, ""), cand.replace(/ /g, ""), max, subCost));
      if (d <= max && (!best || d < best.d || (d === best.d && hit.tier < best.hit.tier))) best = { d, hit };
    }
    if (best) return { ...best.hit, key: normalize(best.hit.display), corrected: true };
  }
  return { tier: 0, display: String(raw).trim().slice(0, 40), key };
}

export function metresFor(tier, power, nitro) {
  return Math.round(TIERS[tier].metres * power * (nitro ? NITRO_BOOST : 1));
}

// Two racers giving the same answer rub doors: both drop one tier (never below TRAFFIC).
export function applyFenderBender(a, b) {
  if (a.tier > 0 && b.tier > 0 && a.key === b.key) {
    return [{ ...a, tier: Math.max(1, a.tier - 1), bump: true }, { ...b, tier: Math.max(1, b.tier - 1), bump: true }];
  }
  return [a, b];
}

export function pickQuestions(all, n, rng = Math.random) {
  const pool = [...all];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}

// Cash for a finished race. tiers = the tier this racer hit each round.
export function payout(prize, won, tiers) {
  const base = won ? prize : Math.round(prize * 0.2);
  let bonus = 0;
  for (const t of tiers) {
    if (t === 4) bonus += Math.round(prize * 0.08);
    if (t === 5) bonus += Math.round(prize * 0.2);
  }
  return { base, bonus, total: base + bonus };
}

export function exampleAnswer(question, tier, rng = Math.random) {
  const list = question.a[tier - 1];
  return list[Math.floor(rng() * list.length)].split("|")[0];
}
