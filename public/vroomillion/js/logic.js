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

// ---- daily free run ----
// Local calendar day, e.g. "2026-11-17".
export function dayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function msUntilTomorrow(now = new Date()) {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next - now;
}

// FREE PLAY: while true, everyone races as often as they like and the $5 prompts are
// hidden. Set to false at launch to bring back one free race a day + Unlimited.
export const FREE_PLAY = true;

// Free players get one race per day; unlimited players race as often as they like.
export const canRace = (save, today, freePlay = FREE_PLAY) => freePlay || !!save.unlimited || save.lastRunDay !== today;

// No repeats: questions this browser has seen are skipped until every question in the
// mode has been played; then that mode starts a fresh cycle. Returns the race's
// questions and the updated list of seen question texts.
export function pickFresh(deckQs, seen, n, rng = Math.random) {
  const seenSet = new Set(seen);
  const unseen = deckQs.filter((q) => !seenSet.has(q.q));
  let picked;
  let nextSeen = [...seen];
  if (unseen.length >= n) {
    picked = pickQuestions(unseen, n, rng);
  } else {
    // finish the cycle with what's left, then top up from the rest of the mode
    const inDeck = new Set(deckQs.map((q) => q.q));
    nextSeen = nextSeen.filter((t) => !inDeck.has(t));
    const rest = deckQs.filter((q) => !unseen.includes(q));
    picked = [...pickQuestions(unseen, unseen.length, rng), ...pickQuestions(rest, n - unseen.length, rng)];
  }
  for (const q of picked) nextSeen.push(q.q);
  return { questions: picked, seen: nextSeen };
}


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
export const typoAllowance = (len) => (len >= 12 ? 3 : len >= 8 ? 2 : len >= 4 ? 1 : 0);

// Words that just name the category, so "nile river" means "nile".
const FILLER = new Set(["river", "tree", "cheese", "pasta", "dog", "bird", "fish", "game", "language", "city", "circuit", "raceway", "speedway", "superspeedway", "racetrack", "track", "engine", "racing", "team", "car", "breed", "spice", "herb", "colour", "color", "fruit", "plant", "flag"]);

function lookup(index, key, addPlural = true) {
  const variants = [key];
  if (key.endsWith("es") && key.length > 4) variants.push(key.slice(0, -2));
  if (key.endsWith("s") && key.length > 3) variants.push(key.slice(0, -1));
  if (addPlural) variants.push(key + "s");
  for (const v of variants) {
    const hit = index.get(v);
    if (hit) return hit;
  }
  return null;
}

// GEARHEAD = car questions only; CLASSIC = everything except the car-only ones.
export function deckQuestions(all, deck) {
  return deck === "car" ? all.filter((q) => q.deck === "car" || q.deck === "both") : all.filter((q) => q.deck !== "car");
}

// ONE IN A VROOMILLION only counts when the answer is spelled exactly right;
// a corrected typo scores as a DEEP CUT instead.
const capped = (res) => (res.tier === 5 ? { ...res, tier: 4, capped: true } : res);

// Returns { tier, display, key, corrected }. tier 0 means the answer isn't on the list.
// corrected is true when a typo was snapped to the nearest real answer.
export function judge(index, raw) {
  const key = normalize(raw);
  if (!key) return { tier: 0, display: "", key: "" };
  const exact = lookup(index, key);
  if (exact) return { ...exact, key: normalize(exact.display) };

  // "pine apple" -> "pineapple"
  const joined = key.includes(" ") && lookup(index, key.replace(/ /g, ""));
  if (joined) return capped({ ...joined, key: normalize(joined.display), corrected: true });

  // "nile river", "monza circuit", "v8 engine": drop a trailing category word.
  const words = key.split(" ");
  const trimmed = words.length > 1 && FILLER.has(words[words.length - 1]) ? words.slice(0, -1) : words;
  if (trimmed !== words) {
    const hit = lookup(index, trimmed.join(" "));
    if (hit) return { ...hit, key: normalize(hit.display) };
  }

  // "front bumper", "ford mustang", "dark green": extra words in front of a real answer.
  // Longest matching ending wins; the player's own words are shown.
  for (const ws of trimmed === words ? [words] : [words, trimmed]) {
    for (let i = 1; i < ws.length; i++) {
      const tail = ws.slice(i).join(" ");
      if (tail.length < 2) continue;
      const hit = lookup(index, tail, false);
      if (hit) return { ...hit, key: normalize(hit.display), display: String(raw).trim().replace(/\s+/g, " ").slice(0, 40) };
    }
  }
  // Autocorrect: snap to the closest real answer. On a tie, pick the more common one.
  // People rarely fumble the first letter, so it must match; short words can't have a wrong letter.
  const max = typoAllowance(key.length);
  const subCost = key.length < 5 ? 2 : 1;
  if (max) {
    let best = null;
    for (const [cand, hit] of index) {
      if (cand[0] !== key[0] || cand.length < 4) continue;
      if (key.length < 6 && cand.length < key.length) continue; // short words: only a missing letter, never an extra one
      const joinedD = editDistance(key.replace(/ /g, ""), cand.replace(/ /g, ""), 1, subCost);
      const d = Math.min(editDistance(key, cand, max, subCost), joinedD <= 1 ? joinedD : Infinity);
      if (d <= max && (!best || d < best.d || (d === best.d && hit.tier < best.hit.tier))) best = { d, hit };
    }
    if (best) return capped({ ...best.hit, key: normalize(best.hit.display), corrected: true });
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

// 2P: the winner's prize. tiers = the tier this racer hit each round.
export function payout(prize, won, tiers) {
  const base = won ? prize : Math.round(prize * 0.2);
  let bonus = 0;
  for (const t of tiers) {
    if (t === 4) bonus += Math.round(prize * 0.08);
    if (t === 5) bonus += Math.round(prize * 0.2);
  }
  return { base, bonus, total: base + bonus };
}

// 1P: cash for a solo run. Pricier cars earn more per metre, so savings snowball
// towards the hypercars; Deep Cuts and Vroomillions add a percentage on top.
export function soloPayout(distance, car, tiers) {
  const rate = 2 + car.price / 25000;
  const base = Math.round(distance * rate);
  const mult = tiers.reduce((m, t) => m + (t === 4 ? 0.1 : t === 5 ? 0.25 : 0), 0);
  const bonus = Math.round(base * mult);
  return { base, bonus, total: base + bonus, rate };
}

export function exampleAnswer(question, tier, rng = Math.random) {
  const list = question.a[tier - 1];
  return list[Math.floor(rng() * list.length)].split("|")[0];
}
