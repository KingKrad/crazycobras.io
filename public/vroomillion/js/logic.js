import { CAT_WEIGHTS } from "./data-cats.js";
// Pure game rules: answer judging, rarity tiers and payouts. No DOM in here.

export const TIERS = [
  { id: 0, name: "STALLED", short: "STALL", metres: 0, blurb: "Not on the list. The engine coughs." },
  { id: 1, name: "TRAFFIC", short: "TRAFFIC", metres: 120, blurb: "Everybody says that one." },
  { id: 2, name: "CRUISING", short: "CRUISE", metres: 280, blurb: "Solid, but you've got company." },
  { id: 3, name: "FAST LANE", short: "FAST", metres: 480, blurb: "Not many think of that." },
  { id: 4, name: "DEEP CUT", short: "DEEP CUT", metres: 720, blurb: "Now that's niche." },
  { id: 5, name: "ONE IN A VROOMILLION", short: "VROOMILLION", metres: 1000, blurb: "Almost nobody alive says that." },
];

// Where a race ends up: its total distance decides, and the car decides how far it CAN go.
// Each destination needs a car of at least its class (cls): a beater can't reach the Moon however
// well you answer. Car power multiplies distance (x1 for the Rustbucket up to x5+ for class X), so the
// better your car, the further the same answers take you.
export const CLASS_ORDER = ["D", "C", "B", "A", "S", "X"];
export const classRank = (cls) => Math.max(0, CLASS_ORDER.indexOf(cls));
export const DESTINATIONS = [
  { id: "scrapyard", name: "THE SCRAPYARD", min: 0, cls: "D", blurb: "Rust, tyres and a dog that won't stop barking." },
  { id: "town", name: "SLEEPY TOWN", min: 1500, cls: "D", blurb: "One traffic light, and it's always green." },
  { id: "beach", name: "BEACH BOARDWALK", min: 3000, cls: "D", blurb: "Sun, sand and ice cream on the dashboard." },
  { id: "city", name: "BIG CITY", min: 5000, cls: "C", blurb: "Bright lights, tall towers, nowhere to park." },
  { id: "monaco", name: "MONACO HARBOUR", min: 8000, cls: "B", blurb: "Yachts, a casino and a very expensive coffee." },
  { id: "summit", name: "MOUNTAIN SUMMIT", min: 12000, cls: "A", blurb: "Top of the world. Mind the hairpins." },
  { id: "volcano", name: "THE VOLCANO", min: 17000, cls: "A", blurb: "Hot tarmac. Very, very hot tarmac." },
  { id: "moon", name: "THE MOON", min: 24000, cls: "S", blurb: "One small drive for a car, one giant lap for car-kind." },
  { id: "vroomcity", name: "VROOMILLION CITY", min: 32000, cls: "X", exclusive: true, blurb: "Streets of gold. Hardly anyone ever gets here." },
];
const canReach = (d, car) => !car || classRank(car.cls) >= classRank(d.cls);
// the furthest destination this distance reaches in this car
export const destinationFor = (metres, car = null) =>
  DESTINATIONS.reduce((best, d) => (metres >= d.min && canReach(d, car) ? d : best), DESTINATIONS[0]);
// the first destination the distance was enough for but the car wasn't (or null)
export const blockedBy = (metres, car) => DESTINATIONS.find((d) => metres >= d.min && !canReach(d, car)) || null;
// the furthest place a car can ever go
export const carReach = (car) => [...DESTINATIONS].reverse().find((d) => canReach(d, car));
export const EXCLUSIVE_CAR = "vroomillionaire";

// ---- car upgrades ----
// Tune a car you own: ENGINE (+6% power a level, 3 levels) and NITRO (+1 charge a level, 2 levels).
// Upgrades never change a car's class, so a better class is still needed to reach new places.
export const UPGRADES = {
  engine: { name: "ENGINE", levels: 3, cost: [0.3, 0.6, 1.0] },
  nitro: { name: "NITRO", levels: 2, cost: [0.25, 0.5] },
};
const carValue = (car) => Math.max(car.price || 0, 4000);
export const upgradeLevel = (ups, carId, kind) => Math.max(0, Math.min(UPGRADES[kind].levels, Number(ups?.[carId]?.[kind]) || 0));
export const upgradeCost = (car, kind, level) => Math.round(carValue(car) * UPGRADES[kind].cost[level] / 100) * 100;
// the car as it races: power and nitro with its upgrades
export function tunedCar(car, ups) {
  const engine = upgradeLevel(ups, car.id, "engine");
  const nitro = upgradeLevel(ups, car.id, "nitro");
  return { ...car, power: Math.round(car.power * (1 + 0.06 * engine) * 100) / 100, nitro: car.nitro + nitro, engine, nitroUp: nitro };
}

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

// FREE PLAY: while true, everyone races as often as they like and the $5 prompts are hidden.
export const FREE_PLAY = false;

// DAILY RACES: two solo CLASSIC races a day, the same prompts for everyone, free for every player.
// Everything else (more races, 2P VERSUS, GEARHEAD, HARD MODE, redoing a race) needs Unlimited.
// save.daily = { day, done: { 1: metres, 2: metres } } on this device.
export const DAILY_RACES = 2;
export const dailyDone = (save, today) => (save.daily?.day === today && save.daily.done && typeof save.daily.done === "object" ? save.daily.done : {});
export const dailyLeft = (save, today) => Math.max(0, DAILY_RACES - Object.keys(dailyDone(save, today)).length);
export const nextDaily = (save, today) => [1, 2].find((n) => !(n in dailyDone(save, today))) || 0;
// kind: { daily: 1 | 2 } for a daily race, otherwise { mode, deck } for an Unlimited one
export const canRace = (save, today, kind = {}, freePlay = FREE_PLAY) =>
  freePlay || !!save.unlimited || (!!kind.daily && kind.daily <= DAILY_RACES && !(kind.daily in dailyDone(save, today)));
export const markDaily = (save, today, n, metres = 0) => ({ day: today, done: { ...dailyDone(save, today), [n]: Math.round(metres) } });

// A seeded random number generator, so everyone gets the same daily prompts.
export function seeded(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Today's two daily races: 2 x n different prompts, picked the same way on every device.
export function dailyQuestions(deckQs, day, n = ROUNDS) {
  const ordered = [...deckQs].sort((a, b) => (a.q < b.q ? -1 : a.q > b.q ? 1 : 0)); // not the file order
  const all = pickFresh(ordered, [], n * 2, seeded("vroomillion-daily-" + day));
  return [all.slice(0, n), all.slice(n, n * 2)];
}

// ---- endless prompts ----
// Besides the hand-written prompts, every category also makes "starting with M",
// "ending in A" and "with exactly 6 letters" prompts from its own answer lists,
// keeping the same rarity tiers. Only variants with enough answers (and some rare
// ones) are used, so there are about a thousand prompts.
const LETTERS = "abcdefghijklmnopqrstuvwxyz";
const VARIANT_MIN = 8;
const VARIANTS_PER_QUESTION = 3;

function filterQuestion(q, test) {
  return q.a.map((list) => list.flatMap((entry) => {
    const forms = entry.split("|").filter((f) => { const k = normalize(f); return k && test(k); });
    return forms.length ? [forms.join("|")] : [];
  }));
}

function goodVariant(a) {
  const count = a.flat().length;
  const rare = a[2].length + a[3].length + a[4].length;
  const easier = a[0].length + a[1].length + a[2].length;
  return count >= VARIANT_MIN && rare >= 3 && easier >= 2;
}

export function makeVariants(questions) {
  const out = [];
  for (const q of questions) {
    // Only "starting with" twists, and only the few letters with the most answers, so they
    // stay a light seasoning on top of the hand-written prompts.
    const options = [];
    for (const L of LETTERS) {
      const a = filterQuestion(q, (k) => k[0] === L);
      if (goodVariant(a)) options.push({ L, a, count: a.flat().length });
    }
    options.sort((x, y) => y.count - x.count);
    for (const { L, a } of options.slice(0, VARIANTS_PER_QUESTION)) {
      out.push({ q: `${q.q} starting with "${L.toUpperCase()}"`, a, deck: q.deck, cat: q.cat, hard: q.hard, minor: q.minor, base: q.q, variant: "start" });
    }
  }
  return out;
}

// No repeats: a prompt this browser has seen never comes back. Hand-written prompts
// come first; a race never uses two prompts built from the same category if it can help it.
export function pickFresh(deckQs, seen, n, rng = Math.random) {
  const seenSet = new Set(seen);
  const unseen = deckQs.filter((q) => !seenSet.has(q.q));
  const shuffled = pickQuestions(unseen, unseen.length, rng);
  const picked = [];
  const bases = new Set();
  const take = (q) => { bases.add(q.base || q.q); picked.push(q); };
  // topic mix: each round draws a topic by weight (geography the most), then a prompt from it;
    const pool = shuffled.filter((q) => q.cat);
  for (let tries = 0; picked.length < n && tries < n * 30 && pool.length; tries++) {
    const cats = Object.keys(CAT_WEIGHTS).filter((c) => pool.some((q) => q.cat === c && !bases.has(q.base || q.q)));
    if (!cats.length) break;
    const total = cats.reduce((t, c) => t + CAT_WEIGHTS[c], 0);
    let r = rng() * total;
    const cat = cats.find((c) => (r -= CAT_WEIGHTS[c]) <= 0) || cats[cats.length - 1];
    const opts = pool.filter((q) => q.cat === cat && !bases.has(q.base || q.q));
    // within a topic, broad prompts lead: twists and one-artist / one-actor lists come up less
    const w = (q) => (q.variant ? 0.1 : 1) * (q.minor ? 0.3 : 1); // each prompt has up to 3 twists
    let r2 = rng() * opts.reduce((t, q) => t + w(q), 0);
    take(opts.find((q) => (r2 -= w(q)) <= 0) || opts[opts.length - 1]);
  }
  // prompts without a topic (older saves, tests): the old order, everyday ones first
  const rank = (q) => (q.variant ? 2 : q.pop ? 0 : 1);
  for (const q of [...shuffled].sort((x, y) => rank(x) - rank(y))) {
    if (picked.length >= n) break;
    if (bases.has(q.base || q.q)) continue;
    take(q);
  }
  for (const q of shuffled) { // top up if a mode has too few categories left
    if (picked.length >= n) break;
    if (!picked.includes(q)) picked.push(q);
  }
  return picked;
}

export const promptsLeft = (deckQs, seen) => {
  const seenSet = new Set(seen);
  return deckQs.filter((q) => !seenSet.has(q.q)).length;
};


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
  index.strict = !!question.variant; // generated prompts must match the starting letter exactly
  // words of the prompt itself, so category words like "sauce" are only dropped where they fit
  const said = normalize((question.base || question.q).replace(/\(.*?\)/g, " ")).split(" ");
  index.cats = new Set(said.flatMap((w) => [w, w.replace(/s$/, ""), w + "s", w === "flavour" ? "flavor" : w === "flavor" ? "flavour" : w, w === "colour" ? "color" : w]));
  if (index.cats.has("dessert")) ["cake", "pie", "cookie", "biscuit"].forEach((w) => index.cats.add(w));
  if (index.cats.has("drink") || index.cats.has("cocktail")) ["drink", "cocktail"].forEach((w) => index.cats.add(w));
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
// The first group can always be dropped; the rest only when the prompt itself uses the word
// ("mayochup sauce" for a condiment, "chocolate flavour" for ice cream), so "apple pie" isn't a fruit.
const FILLER_ANY = new Set(["river", "tree", "cheese", "pasta", "dog", "bird", "fish", "game", "language", "city", "circuit", "raceway", "speedway", "superspeedway", "racetrack", "track", "engine", "racing", "team", "car", "breed", "spice", "herb", "colour", "color", "fruit", "plant", "flag"]);
export const FILLER = new Set([...FILLER_ANY,
  "sauce", "condiment", "dressing", "dip", "flavour", "flavor", "soup", "stew", "cake", "cookie", "cookies", "biscuit", "biscuits", "bread", "pie", "dish", "drink", "cocktail", "beer", "wine", "tea", "coffee", "candy", "sweet", "sweets", "chocolate", "bar",
  "song", "single", "film", "movie", "show", "series", "sitcom", "cartoon", "character", "club", "fc", "band", "toy", "hat", "shoe", "shoes", "boot", "boots", "dance", "cat", "horse", "cattle", "sheep", "chicken", "flower", "mushroom", "snake", "shark", "spider", "butterfly", "whale", "monkey", "owl", "parrot", "frog",
  "island", "islands", "lake", "mountain", "volcano", "desert", "airport", "bridge", "building", "tower", "skyscraper", "state", "province", "country", "town", "religion", "star", "planet", "moon",
  "truck", "motorcycle", "motorbike", "bike", "company", "brand", "website", "app", "font", "typeface", "magazine", "newspaper", "novel", "book", "opera", "painting", "sport", "genre", "music", "instrument", "ship", "boat", "aircraft", "plane", "console", "phone", "smartphone"]);
// two-word category endings: "chocolate ice cream", "yellowstone national park"
const FILLER2 = new Set(["ice cream", "national park", "video game", "tv show", "tv series", "board game", "card game", "football club", "soccer club", "soft drink", "fast food"]);

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

// GEARHEAD = car questions only; HARD MODE = the niche prompts and letter twists; CLASSIC = the broad prompts.
export function deckQuestions(all, deck) {
  if (deck === "car") return all.filter((q) => q.deck === "car" || q.deck === "both");
  if (deck === "hard") return all.filter((q) => (q.hard || q.variant) && q.deck !== "car");
  return all.filter((q) => q.deck !== "car" && !q.hard && !q.variant); // CLASSIC: broad prompts only, no "starting with" twists
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
  const words = index.strict ? [key] : key.split(" ");
  const last = words[words.length - 1];
  const fits = (w) => FILLER_ANY.has(w) || (FILLER.has(w) && (!index.cats || index.cats.has(w)));
  const two = words.slice(-2).join(" ");
  const trimmed = words.length > 2 && FILLER2.has(two) && (!index.cats || two.split(" ").every((w) => index.cats.has(w))) ? words.slice(0, -2)
    : words.length > 1 && fits(last) ? words.slice(0, -1) : words;
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
  // The long tail (deep.js): every matching thing on Wikidata. Exact names only, never autocorrected to,
  // so a typo still snaps to a well-known answer rather than an obscure one.
  if (index.deep) {
    for (const k of [key, trimmed.join(" "), key.endsWith("s") ? key.slice(0, -1) : null]) {
      const hit = k && index.deep.get(k);
      if (hit && !(index.letter && normalize(hit.display)[0] !== index.letter)) return { ...hit, key: normalize(hit.display), deep: true };
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
  // Part of a longer answer: "eleanor" -> Eleanor Rigby, "mustang" -> Ford Mustang, "rigby" too.
  // Shown as a fix to confirm, and scores exactly like the full answer.
  const part = index.strict ? null : partialMatch(index, key); // "starting with" twists stay strict
  if (part) return { ...part, key: normalize(part.display), corrected: true, partial: true };
  // Last try: a typo of something in the long tail ("the old giutarist"). Longer answers only, and the
  // closest, most covered match wins, so a short typo can't land on an obscure item.
  const deepFix = index.deep && key.length >= 6 ? deepTypo(index, key) : null;
  if (deepFix) return capped({ ...deepFix, key: normalize(deepFix.display), corrected: true, deep: true });
  return { tier: 0, display: String(raw).trim().slice(0, 40), key };
}

function deepTypo(index, key) {
  const max = Math.min(2, typoAllowance(key.length));
  let best = null;
  for (const [cand, hit] of index.deep) {
    if (cand[0] !== key[0] || Math.abs(cand.length - key.length) > max || cand.length < 6) continue;
    if (index.letter && normalize(hit.display)[0] !== index.letter) continue;
    const d = editDistance(key, cand, max, 1);
    if (d <= max && (!best || d < best.d || (d === best.d && hit.tier < best.hit.tier))) best = { d, hit };
  }
  return best && best.hit;
}

// Words too common to point at one answer on their own.
const STOP = new Set(["the", "and", "of", "a", "an", "in", "on", "at", "for", "with", "from", "to", "my", "your", "our", "his", "her", "its", "you", "me", "is", "it", "be", "are", "was", "this", "that", "de", "la", "le", "el", "von", "van", "der", "da", "di", "du", "mr", "mrs", "ms", "dr", "st", "saint", "new", "old", "big", "little", "great", "grand", "small", "red", "blue", "green", "black", "white", "yellow", "pink", "golden", "silver", "dark", "light", "common", "royal", "king", "queen", "prince", "princess", "lord", "lady", "sir", "man", "woman", "boy", "girl", "baby", "day", "night", "time", "world", "love", "song", "theme", "part", "show", "film", "movie", "game", "series", "edition", "version", "style", "type", "kind", "classic", "original", "super", "mega", "ultra", "pro", "plus", "max", "one", "two", "three", "four", "five", "first", "second", "last"]);
const MAX_PARTIAL = 12; // a word that fits more answers than this is too vague to guess from

function wordIndex(index) {
  if (index.words) return index.words;
  const words = new Map();
  for (const [key, hit] of index) {
    // only an answer's main name counts, so "bread" can't pick up "monkey bread", an alias of bouye
    if (key !== normalize(hit.display)) continue;
    const ws = key.split(" ");
    if (ws.length < 2) continue;
    for (const w of new Set(ws)) {
      if (w.length < 4 || STOP.has(w)) continue;
      let list = words.get(w);
      if (!list) words.set(w, (list = []));
      if (!list.includes(hit)) list.push(hit);
    }
  }
  index.words = words;
  return words;
}

function bestOf(hits) {
  if (!hits.length || hits.length > MAX_PARTIAL) return null;
  return hits.reduce((b, h) => (h.tier < b.tier || (h.tier === b.tier && h.display.length < b.display.length) ? h : b));
}

function partialMatch(index, key) {
  const ws = key.split(" ");
  if (ws.length === 1) {
    if (key.length < 4 || STOP.has(key)) return null;
    const words = wordIndex(index);
    const exact = words.get(key) || (key.endsWith("s") ? words.get(key.slice(0, -1)) : null);
    if (exact) return bestOf(exact);
    // a typo in the word: "elanor" -> eleanor. Only one letter off, and only for longer words:
    // a typo of a partial answer is a double guess, so "bread" must not become "broad-leaved ..."
    if (key.length < 6) return null;
    const max = 1;
    let best = null;
    for (const [w, hits] of words) {
      if (w[0] !== key[0] || Math.abs(w.length - key.length) > max) continue;
      const d = editDistance(key, w, max, 1);
      if (d <= max && (!best || d < best.d)) best = { d, hits };
    }
    return best ? bestOf(best.hits) : null;
  }
  // several words: they must appear together, in order, inside a longer answer ("eleanor rig" too)
  if (ws.every((w) => STOP.has(w) || w.length < 3)) return null;
  const hits = [];
  for (const [cand, hit] of index) {
    if (cand !== normalize(hit.display)) continue;
    const c = " " + cand + " ";
    if (c.length > key.length + 2 && (c.includes(" " + key + " ") || c.startsWith(" " + key)) && !hits.includes(hit)) hits.push(hit);
  }
  return bestOf(hits);
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

// 1P: cash for a solo run. Higher-class cars go further AND earn more per metre, so each upgrade
// pays for the next; Deep Cuts and Vroomillions add a percentage on top.
export function soloPayout(distance, car, tiers) {
  const rate = 2 + classRank(car.cls); // $ per metre: D 2, C 3, B 4, A 5, S 6, X 7
  const base = Math.round(distance * rate);
  const mult = tiers.reduce((m, t) => m + (t === 4 ? 0.1 : t === 5 ? 0.25 : 0), 0);
  const bonus = Math.round(base * mult);
  return { base, bonus, total: base + bonus, rate };
}

// A rare-but-not-top answer to show after a round (never a Vroomillion answer).
export function exampleAnswer(question, tier = 4, rng = Math.random) {
  for (let t = tier; t >= 1; t--) {
    const list = question.a[t - 1];
    if (list.length) return list[Math.floor(rng() * list.length)].split("|")[0];
  }
  return "";
}
