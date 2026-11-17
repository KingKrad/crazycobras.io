// Pure game rules: answer judging, rarity tiers, rivals and payouts. No DOM in here.

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

export const LEAGUES = [
  { id: "street", name: "STREET MEET", prize: 600, rivalPower: 1.0, skill: [0.1, 0.5, 0.3, 0.1, 0, 0], rival: "Rusty Ray" },
  { id: "club", name: "CLUB CUP", prize: 3000, rivalPower: 1.08, skill: [0.05, 0.3, 0.4, 0.2, 0.05, 0], rival: "Clutch Karla" },
  { id: "pro", name: "PRO CIRCUIT", prize: 15000, rivalPower: 1.17, skill: [0.03, 0.15, 0.35, 0.3, 0.14, 0.03], rival: "Apex Akira" },
  { id: "hyper", name: "HYPER LEAGUE", prize: 60000, rivalPower: 1.28, skill: [0, 0.08, 0.25, 0.35, 0.25, 0.07], rival: "Baron Von Boost" },
  { id: "gp", name: "VROOMILLION GP", prize: 200000, rivalPower: 1.4, skill: [0, 0.03, 0.15, 0.35, 0.32, 0.15], rival: "The Professor" },
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

function editDistance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (cur[j] < best) best = cur[j];
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

// Returns { tier, display, key }. tier 0 means the answer isn't on the list.
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
  // Forgive small typos on longer answers.
  const max = key.length >= 10 ? 2 : key.length >= 6 ? 1 : 0;
  if (max) {
    let best = null;
    for (const [cand, hit] of index) {
      const d = editDistance(key, cand, max);
      if (d <= max && (!best || d < best.d || (d === best.d && hit.tier < best.hit.tier))) best = { d, hit };
    }
    if (best) return { ...best.hit, key: normalize(best.hit.display) };
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

function pickWeighted(weights, rng) {
  let r = rng() * weights.reduce((s, w) => s + w, 0);
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r < 0) return i;
  }
  return weights.length - 1;
}

// The rival's answer for a question. It never copies the player's answer.
export function rivalAnswer(question, league, avoidKey, rng = Math.random) {
  const tier = pickWeighted(league.skill, rng);
  if (tier === 0) return { tier: 0, display: "…blanked", key: "" };
  const pool = question.a[tier - 1].map((e) => e.split("|")[0]).filter((d) => normalize(d) !== avoidKey);
  if (!pool.length) return { tier: 0, display: "…blanked", key: "" };
  const display = pool[Math.floor(rng() * pool.length)];
  return { tier, display, key: normalize(display) };
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
