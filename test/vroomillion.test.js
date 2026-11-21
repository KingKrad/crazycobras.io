import { test } from "node:test";
import assert from "node:assert/strict";
import { QUESTIONS } from "../public/vroomillion/js/data.js";
import { carById } from "../public/vroomillion/js/cars.js";
import {
  DESTINATIONS, destinationFor,
  TIERS, ROUNDS, classRank, blockedBy, carReach, tunedCar, upgradeLevel, upgradeCost, normalize, buildIndex, judge, metresFor, applyFenderBender,
  pickQuestions, payout, deckQuestions, soloPayout, dayKey, msUntilTomorrow, canRace, markDaily, dailyLeft, nextDaily, dailyQuestions, pickFresh, promptsLeft, makeVariants, DAILY_RACES,
} from "../public/vroomillion/js/logic.js";

const fruit = buildIndex(QUESTIONS.find((q) => q.q === "Name a fruit"));

test("every question has five non-empty tiers and enough questions for a race", () => {
  assert.ok(QUESTIONS.length >= ROUNDS * 2);
  for (const q of QUESTIONS) {
    assert.equal(q.a.length, 5, q.q);
    for (const list of q.a) assert.ok(list.length > 0, q.q);
  }
});

test("normalize strips case, accents, punctuation and leading articles", () => {
  assert.equal(normalize("  The Tempest "), "tempest");
  assert.equal(normalize("Lamborghini Huracán"), "lamborghini huracan");
  assert.equal(normalize("T-Rex"), "t rex");
  assert.equal(normalize("Buddha's Hand"), "buddhas hand");
  assert.equal(normalize("C++"), "c++");
});

test("judge ranks obvious answers low and niche answers high", () => {
  assert.equal(judge(fruit, "Apple").tier, 1);
  assert.equal(judge(fruit, "kiwi").tier, 2);
  assert.ok(judge(fruit, "durian").tier >= 2, "famous for a 'rare' fruit, so tools/rescale-rarity.mjs may move it down");
  assert.equal(judge(fruit, "Jabuticaba").tier, 5);
  assert.equal(judge(fruit, "jabuticba").tier, 5, "a fixed typo of a Vroomillion answer is still a Vroomillion");
  assert.equal(judge(fruit, "jabuticba").corrected, true);
  assert.equal(judge(fruit, "spanner").tier, 0);
  assert.equal(judge(fruit, "").tier, 0);
});

test("judge accepts aliases, plurals and small typos", () => {
  assert.equal(judge(fruit, "dragonfruit").display, "dragon fruit");
  assert.equal(judge(fruit, "bananas").tier, 1);
  assert.equal(judge(fruit, "pomegranite").display, "pomegranate");
  assert.equal(judge(fruit, "fgi").tier, 0, "three-letter words get no typo forgiveness");
});

test("autocorrect snaps close misspellings to the real answer", () => {
  const cases = { banan: "banana", durain: "durian", jabuticba: "jabuticaba", rasberry: "raspberry", passionfrut: "passion fruit", "pine apple": "pineapple", strawbery: "strawberry" };
  for (const [typed, want] of Object.entries(cases)) {
    const r = judge(fruit, typed);
    assert.equal(r.display, want, typed);
    assert.equal(r.corrected, true, typed);
  }
  assert.equal(judge(fruit, "apple").corrected, undefined, "exact answers are not marked corrected");
  for (const junk of ["spanner", "zzzz", "keyboard", "car", "bread", "honey"]) assert.equal(judge(fruit, junk).tier, 0, junk);
  const music = buildIndex(QUESTIONS.find((q) => q.q === "Name a musical instrument"));
  assert.equal(judge(music, "hello").tier, 0, "a different first letter is not a typo");
  assert.equal(judge(music, "flate").display, "flute", "5+ letters forgive a wrong letter");
  assert.equal(judge(music, "harb").tier, 0, "4-letter words don't forgive a wrong letter");
  assert.equal(judge(fruit, "peech").display, "peach");
  assert.equal(judge(music, "violn").display, "violin");
});

test("a duplicated answer keeps its most common tier", () => {
  const idx = buildIndex({ q: "x", a: [["alpha"], [], [], [], ["alpha", "omega"]] });
  assert.equal(judge(idx, "alpha").tier, 1);
  assert.equal(judge(idx, "omega").tier, 5);
});

test("distance scales with tier, car power and nitro", () => {
  assert.equal(metresFor(0, 1.5, true), 0);
  assert.equal(metresFor(5, 1, false), 1000);
  assert.equal(metresFor(5, 1.2, true), 1800);
  for (let t = 1; t < TIERS.length; t++) assert.ok(TIERS[t].metres > TIERS[t - 1].metres);
});

test("a niche answer in a starter car still beats an obvious one in the best car", () => {
  assert.ok(metresFor(3, 1.0, false) > metresFor(2, 1.55, false));
});

test("matching answers cause a fender bender", () => {
  const a = judge(fruit, "durian");
  const [x, y] = applyFenderBender(a, { ...a });
  assert.equal(x.tier, a.tier - 1);
  assert.equal(y.tier, a.tier - 1);
  assert.ok(x.bump);
  const [p, q] = applyFenderBender(judge(fruit, "apple"), judge(fruit, "pear"));
  assert.equal(p.bump, undefined);
  assert.equal(q.tier, 1);
  const [m, n] = applyFenderBender(judge(fruit, "zzz"), judge(fruit, "zzz"));
  assert.equal(m.tier, 0);
  assert.equal(n.bump, undefined);
});

test("one daily race for everyone, Unlimited for everything else, everything during free play", () => {
  const today = dayKey(new Date(2026, 10, 17, 9, 30));
  assert.equal(today, "2026-11-17");
  assert.equal(dayKey(new Date(2026, 0, 5)), "2026-01-05");
  const solo = { mode: "solo", deck: "classic" };
  assert.equal(DAILY_RACES, 1);
  assert.ok(canRace({}, today, { daily: 1 }, false), "the daily race is free");
  assert.ok(!canRace({}, today, { daily: 2 }, false), "only one");
  assert.ok(!canRace({}, today, solo, false), "a regular race needs Unlimited");
  const one = { daily: markDaily({}, today, 1, 4321) };
  assert.deepEqual(one.daily, { day: today, done: { 1: 4321 } });
  assert.ok(!canRace(one, today, { daily: 1 }, false), "once a day");
  assert.equal(dailyLeft(one, today), 0);
  assert.equal(nextDaily(one, today), 0);
  assert.ok(canRace(one, "2026-11-18", { daily: 1 }, false), "new day, new daily race");
  assert.ok(!canRace({}, today, { mode: "versus", deck: "classic" }, false), "VERSUS needs Unlimited");
  assert.ok(!canRace({}, today, { mode: "solo", deck: "hard" }, false), "HARD MODE needs Unlimited");
  assert.ok(canRace({ unlimited: true }, today, { mode: "versus", deck: "hard" }, false), "unlimited");
  assert.ok(canRace({}, today, solo, true), "free play");
  assert.equal(msUntilTomorrow(new Date(2026, 10, 17, 23, 0, 0)), 60 * 60 * 1000);
});

test("a prompt never comes back, even after the mode runs out", () => {
  const deck = deckQuestions(QUESTIONS, "classic");
  const seen = [];
  const lengths = [];
  for (;;) {
    const race = pickFresh(deck, seen, ROUNDS);
    if (!race.length) break;
    assert.equal(new Set(race.map((q) => q.q)).size, race.length, "no repeats within a race");
    for (const q of race) assert.ok(!seen.includes(q.q), "never shown twice: " + q.q);
    seen.push(...race.map((q) => q.q));
    lengths.push(race.length);
    assert.equal(promptsLeft(deck, seen), deck.length - seen.length);
  }
  assert.equal(seen.length, deck.length, "every prompt was played exactly once");
  assert.ok(lengths.slice(0, -1).every((n) => n === ROUNDS), "full races until the last one");
  assert.equal(lengths.at(-1), deck.length % ROUNDS || ROUNDS, "the last race uses whatever is left");
  assert.deepEqual(pickFresh(deck, seen, ROUNDS), [], "nothing new once every prompt is played");
});

test("prompts seen in one mode stay seen in the other", () => {
  const both = QUESTIONS.filter((q) => q.deck === "both").map((q) => q.q);
  const race = pickFresh(deckQuestions(QUESTIONS, "car"), both, ROUNDS);
  assert.ok(race.length > 0 && race.every((q) => !both.includes(q.q)));
});

test("solo prize money grows with the car class and niche answers", () => {
  const starter = carById("rustbucket");
  const hyper = carById("chiron");
  assert.deepEqual(soloPayout(3000, starter, [1, 2, 3]), { base: 6000, bonus: 0, total: 6000, rate: 2 });
  assert.equal(soloPayout(3000, starter, [4, 5]).bonus, Math.round(6000 * 0.35));
  assert.equal(soloPayout(1000, hyper, [3]).rate, 6, "class S earns $6 a metre");
  assert.equal(soloPayout(0, hyper, [0, 0]).total, 0);
});

test("pickQuestions returns distinct questions", () => {
  const picked = pickQuestions(QUESTIONS, ROUNDS);
  assert.equal(picked.length, ROUNDS);
  assert.equal(new Set(picked).size, ROUNDS);
});

test("payout rewards winning and niche answers", () => {
  assert.deepEqual(payout(1000, true, [1, 2, 3]), { base: 1000, bonus: 0, total: 1000 });
  assert.deepEqual(payout(1000, false, [4, 5]), { base: 200, bonus: 280, total: 480 });
});

const q = (text) => buildIndex(QUESTIONS.find((x) => x.q === text));

test("extra words in front of a real answer still count", () => {
  const parts = q("Name a part of a car");
  assert.equal(judge(parts, "air intake").tier, 2);
  const r = judge(parts, "front bumper");
  assert.equal(r.tier, 2);
  assert.equal(r.display, "front bumper", "shows what the player typed");
  assert.equal(r.key, "bumper", "but matches on the real answer for fender benders");
  assert.ok(judge(q("Name a car model"), "Ford Mustang").tier > 0);
  assert.ok(judge(q("Name a colour"), "dark green").tier > 0);
  assert.equal(judge(fruit, "apple pie").tier, 0, "the last word has to be the answer");
  assert.equal(judge(fruit, "purple passion fruit").key, "passion fruit", "answers ending in a category word still work");
  // every answer in the bank still works with an extra word in front
  for (const x of QUESTIONS) {
    const idx = buildIndex(x);
    for (const e of x.a.flat()) {
      const d = e.split("|")[0];
      if (normalize(d).length < 2) continue; // single letters ("C", "R") only count on their own
      assert.ok(judge(idx, "super " + d).tier > 0, `${x.q}: "super ${d}"`);
    }
  }
});

test("a trailing category word is ignored", () => {
  assert.equal(judge(q("Name a river"), "Nile River").display, "nile");
  assert.equal(judge(q("Name a famous race track"), "Monza Circuit").display, "monza");
  assert.equal(judge(q("Name an engine type or layout"), "V8 engine").display, "v8");
  assert.equal(judge(q("Name a tree"), "oak tree").display, "oak");
});

test("GEARHEAD and CLASSIC decks each have enough questions", () => {
  const car = deckQuestions(QUESTIONS, "car");
  const classic = deckQuestions(QUESTIONS, "classic");
  assert.ok(car.length >= ROUNDS * 2, "car deck " + car.length);
  assert.ok(classic.length >= ROUNDS * 2);
  assert.ok(car.every((x) => x.deck === "car" || x.deck === "both"));
  assert.ok(classic.every((x) => x.deck !== "car"));
  const hard = deckQuestions(QUESTIONS, "hard");
  assert.ok(hard.length >= ROUNDS * 2, "hard deck " + hard.length);
  assert.ok(hard.every((x) => x.hard) && classic.every((x) => !x.hard), "niche prompts only in HARD MODE");
  assert.equal(car.length + classic.length + hard.length - QUESTIONS.filter((x) => x.deck === "both").length, QUESTIONS.length);
});

test("CLASSIC keeps niche prompts out and leans on geography", () => {
  const classic = deckQuestions(QUESTIONS, "classic").map((q) => q.q);
  for (const niche of ["Name a Bee Gees song", "Name a chess opening", "Name a typeface or font", "Name a South Park character", "Name a knot"]) assert.ok(!classic.includes(niche), niche);
  for (const broad of ["Name a Beatles song", "Name a Friends character", "Name a country that borders Germany", "Name a Taylor Swift song", "Name an NFL team", "Name a Simpsons character", "Name a movie with a number in the title"]) assert.ok(classic.includes(broad), broad);
  const deck = deckQuestions(ALL, "classic");
  const count = {};
  let seed = 7;
  const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 300; i++) for (const q of pickFresh(deck, [], ROUNDS, rng)) count[q.cat] = (count[q.cat] || 0) + 1;
  const total = Object.values(count).reduce((a, b) => a + b, 0);
  assert.ok(count.geo / total > 0.22, "geography is the biggest share: " + JSON.stringify(count));
  for (const c of ["sports", "screen", "music"]) assert.ok(count[c] / total > 0.08, c + " gets a fair share");
});

test("no answer appears in two tiers of the same question", () => {
  for (const x of QUESTIONS) {
    const seen = new Map();
    x.a.forEach((list, t) => list.forEach((e) => e.split("|").forEach((f) => {
      const k = normalize(f);
      if (!k) return;
      assert.ok(!seen.has(k) || seen.get(k) === t, `${x.q}: "${f}" in tiers ${seen.get(k) + 1} and ${t + 1}`);
      seen.set(k, t);
    })));
  }
});

// ---------- endless prompts ----------
const VARIANTS = makeVariants(QUESTIONS);
const ALL = [...QUESTIONS, ...VARIANTS];

test("mostly hand-written prompts, a few 'starting with' twists, each with a unique text", () => {
  const classic = deckQuestions(ALL, "classic");
  const car = deckQuestions(ALL, "car");
  assert.ok(classic.filter((q) => !q.variant).length >= 80, "hand-written classic");
  assert.ok(classic.length >= 300, "classic " + classic.length);
  assert.ok(car.length >= 80, "gearhead " + car.length);
  assert.equal(new Set(ALL.map((q) => q.q)).size, ALL.length);
  assert.ok(VARIANTS.every((v) => v.variant === "start"), "no 'ending in' or 'exactly N letters' prompts");
  const perBase = new Map();
  for (const v of VARIANTS) perBase.set(v.base, (perBase.get(v.base) || 0) + 1);
  assert.ok([...perBase.values()].every((n) => n <= 3), "at most 3 twists per category");
});

test("every generated prompt has enough answers and every answer fits its rule", () => {
  for (const v of VARIANTS) {
    assert.ok(v.a.flat().length >= 8, v.q);
    assert.ok(v.a[2].length + v.a[3].length + v.a[4].length >= 3, v.q);
    const letter = (v.q.match(/"([A-Z])"$/) || [])[1]?.toLowerCase();
    const n = Number((v.q.match(/exactly (\d+) letters$/) || [])[1]);
    for (const entry of v.a.flat()) for (const f of entry.split("|")) {
      const k = normalize(f);
      if (v.variant === "start") assert.equal(k[0], letter, `${v.q}: ${f}`);
      if (v.variant === "end") assert.equal(k.at(-1), letter, `${v.q}: ${f}`);
      if (v.variant === "length") assert.ok(!k.includes(" ") && k.length === n, `${v.q}: ${f}`);
    }
  }
});

test("generated prompts judge strictly and keep rarity tiers", () => {
  const fruitB = VARIANTS.find((v) => v.q === 'Name a fruit starting with "B"');
  assert.ok(fruitB, "fruit / B exists");
  const idx = buildIndex(fruitB);
  assert.equal(judge(idx, "banana").tier, 1);
  assert.equal(judge(idx, "ripe banana").tier, 0, "no extra words in front for generated prompts");
  assert.equal(judge(idx, "apple").tier, 0, "a fruit that doesn't start with B is not on the list");
  assert.equal(judge(idx, "blueberry").tier, 2, "rarity carries over");
  // a person can be named by surname when it fits the letter
  const champs = VARIANTS.find((v) => v.base === "Name a famous racing driver (any series)" && v.variant === "start" && v.q.endsWith('"H"'));
  if (champs) assert.ok(judge(buildIndex(champs), "hamilton").tier > 0);
});

test("CLASSIC races are broad prompts only, never repeat, and run out instead of recycling", () => {
  const deck = deckQuestions(ALL, "classic");
  assert.ok(deck.every((q) => !q.variant), "no 'starting with' twists in CLASSIC");
  const race = pickFresh(deck, [], ROUNDS);
  assert.equal(new Set(race.map((q) => q.base || q.q)).size, ROUNDS, "one prompt per category");
  const seen = [];
  for (let i = 0; i < 1000; i++) {
    const next = pickFresh(deck, seen, ROUNDS);
    if (!next.length) break;
    for (const q of next) { assert.ok(!seen.includes(q.q), "repeat: " + q.q); seen.push(q.q); }
  }
  assert.equal(seen.length, deck.length, "every prompt is played once before any comes back");
  assert.ok(deckQuestions(ALL, "hard").some((q) => q.variant), "twists live in HARD MODE");
});

test("part of a longer answer is fixed to the full answer and scores the same", () => {
  const beatles = buildIndex(QUESTIONS.find((x) => x.q === "Name a Beatles song"));
  for (const typed of ["Eleanor ", "eleanor", "rigby", "elanor"]) {
    const r = judge(beatles, typed);
    assert.equal(r.display, "eleanor rigby", typed);
    assert.ok(r.corrected && r.partial, "shown as a fix to confirm");
    assert.equal(r.tier, judge(beatles, "eleanor rigby").tier, "same tier as typing it in full");
  }
  assert.equal(judge(beatles, "banana").tier, 0, "a word that isn't in any answer doesn't count");
  assert.equal(judge(beatles, "love").tier, 0, "too vague a word doesn't count");
  const fruit = buildIndex(QUESTIONS.find((x) => x.q === "Name a fruit"));
  assert.equal(judge(fruit, "dragon").display, "dragon fruit");
});

test("destinations get further away, need better cars, and the last one is exclusive and very hard", () => {
  for (let i = 1; i < DESTINATIONS.length; i++) {
    assert.ok(DESTINATIONS[i].min > DESTINATIONS[i - 1].min);
    assert.ok(classRank(DESTINATIONS[i].cls) >= classRank(DESTINATIONS[i - 1].cls), "never an easier car further on");
  }
  const beater = carById("rustbucket"), hyper = carById("chiron"), legend = carById("golden");
  assert.equal(destinationFor(0, beater).id, "scrapyard");
  assert.equal(destinationFor(30000, beater).id, "beach", "a beater can't get past the beach, however far it goes");
  assert.equal(blockedBy(30000, beater).id, "city");
  assert.equal(destinationFor(30000, hyper).id, "moon");
  assert.equal(destinationFor(40000, legend).id, "vroomcity");
  assert.equal(carReach(beater).id, "beach");
  const top = DESTINATIONS.at(-1);
  assert.ok(top.exclusive);
  // the same great answers go much further in a better car
  const great = metresFor(4, 1, false) * 7;
  assert.ok(metresFor(4, hyper.power, false) * 7 > 4 * great);
  // all Deep Cuts in the best buyable car aren't enough; mostly Vroomillions with nitro are
  assert.ok(metresFor(4, legend.power, false) * 7 < top.min);
  assert.ok(metresFor(5, legend.power, false) * 4 + metresFor(5, legend.power, true) * 3 >= top.min);
  // starter car: about 3 races of average answers buys the first class C car
  const avg = soloPayout(metresFor(2, 1, false) * 4 + metresFor(3, 1, false) * 3, beater, [2, 2, 2, 2, 3, 3, 3]).total;
  assert.ok(avg * 4 > carById("wrangler").price);
});

test("category words are dropped only where they fit the prompt", () => {
  const idx = (n) => buildIndex(QUESTIONS.find((x) => x.q === n));
  assert.equal(judge(idx("Name a sauce or condiment"), "ketchup sauce").display, "ketchup");
  assert.equal(judge(idx("Name an ice cream flavour"), "chocolate ice cream").tier, judge(idx("Name an ice cream flavour"), "chocolate").tier);
  assert.equal(judge(idx("Name an ice cream flavour"), "mint flavour").display, "mint");
  assert.equal(judge(idx("Name a fruit"), "banana fruit").display, "banana");
  assert.equal(judge(idx("Name a fruit"), "apple pie").tier, 0, "pie isn't a fruit word");
  assert.ok(judge(idx("Name a dessert"), "apple pie").tier > 0);
});

test("long-tail (deep) answers count instantly, and long typos snap to them only as a last resort", () => {
  const index = buildIndex(QUESTIONS.find((x) => x.q === "Name a sauce or condiment"));
  index.deep = new Map([["mayochup", { tier: 4, display: "mayochup" }], ["zakarpattia honey", { tier: 4, display: "zakarpattia honey" }]]);
  assert.equal(judge(index, "Mayochup").tier, 4);
  assert.equal(judge(index, "mayochups").tier, 4, "a plural still counts");
  assert.equal(judge(index, "ketchup").tier, 1, "the hand-written tier wins");
  const fixed = judge(index, "mayochop");
  assert.equal(fixed.display, "mayochup", "a typo of a long-tail answer is fixed");
  assert.ok(fixed.corrected && fixed.tier === 4);
  assert.equal(judge(index, "ketchap").display.toLowerCase(), "ketchup", "the well-known list is tried first");
  assert.equal(judge(index, "mayoc").tier, 0, "short typos never reach the long tail");
  index.letter = "k";
  assert.equal(judge(index, "mayochup").tier, 0, "starting-with twists still need the letter");
});

test("daily races are the same for everyone: 2 x 7 different prompts, new each day", () => {
  const deck = deckQuestions(QUESTIONS, "classic");
  const [a, b] = dailyQuestions(deck, "2026-11-20");
  assert.equal(a.length, ROUNDS);
  assert.equal(b.length, ROUNDS);
  assert.equal(new Set([...a, ...b].map((q) => q.q)).size, ROUNDS * 2, "14 different prompts");
  const again = dailyQuestions([...deck].reverse(), "2026-11-20");
  assert.deepEqual(again[0].map((q) => q.q), a.map((q) => q.q), "the same on every device, whatever the list order");
  assert.notDeepEqual(dailyQuestions(deck, "2026-11-21")[0].map((q) => q.q), a.map((q) => q.q), "a new set tomorrow");
});

test("car upgrades add power and nitro but never change the class", () => {
  const car = carById("rustbucket");
  const ups = { rustbucket: { engine: 3, nitro: 2 } };
  const t = tunedCar(car, ups);
  assert.equal(t.power, 1.18);
  assert.equal(t.nitro, car.nitro + 2);
  assert.equal(t.cls, "D");
  assert.equal(destinationFor(30000, t).id, "beach", "still can't leave the beach");
  assert.equal(tunedCar(car, { rustbucket: { engine: 99 } }).power, 1.18, "levels are capped");
  assert.equal(upgradeLevel({}, "rustbucket", "engine"), 0);
  assert.ok(upgradeCost(car, "engine", 0) > 0 && upgradeCost(car, "engine", 2) > upgradeCost(car, "engine", 0));
});

test("an answer with a word in front of a common answer is never much rarer than it", () => {
  const breakfast = buildIndex(QUESTIONS.find((x) => x.q === "Name a breakfast food"));
  assert.equal(judge(breakfast, "pancakes").tier, 1);
  assert.ok(judge(breakfast, "blueberry pancakes").tier <= 2, "blueberry pancakes at most one above pancakes");
  const pancake = buildIndex(QUESTIONS.find((x) => x.q === "Name a type of pancake"));
  assert.equal(judge(pancake, "blueberry pancakes").tier, 1);
  pancake.deep = new Map([["chocolate chip banana pancake", { tier: 4, display: "chocolate chip banana pancake" }]]);
  assert.ok(judge(pancake, "chocolate chip banana pancake").tier <= 2, "the long tail too");
});

test("hand-picked top answers fix Wikidata-built prompts", () => {
  const tier = (q, a) => judge(buildIndex(QUESTIONS.find((x) => x.q === q)), a).tier;
  assert.equal(tier("Name a baseball player", "babe ruth"), 1);
  assert.ok(tier("Name a baseball player", "george h. w. bush") >= 3, "famous, but not as a baseball player");
  assert.equal(tier("Name a butterfly", "monarch"), 1);
  assert.equal(tier("Name an airport", "jfk"), 1);
  assert.equal(tier("Name a type of pancake", "blueberry"), 1);
  assert.equal(tier("Name a US state capital", "pierre"), 5);
  for (const q of QUESTIONS) assert.ok(q.a.every((l) => l.length), q.q + " has an empty tier");
});

test("GEARHEAD is mainly cars and how they work, with the odd racing prompt", () => {
  const deck = deckQuestions([...QUESTIONS, ...makeVariants(QUESTIONS)], "car");
  assert.ok(deck.filter((q) => !q.variant).length >= 70);
  let racing = 0;
  let seed = 11;
  const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 200; i++) for (const q of pickFresh(deck, [], ROUNDS, rng, { flat: true })) if (q.minor) racing++;
  assert.ok(racing / 200 < 1, "less than one racing prompt a race on average: " + racing / 200);
  const engine = buildIndex(QUESTIONS.find((x) => x.q === "Name a part of an engine"));
  assert.equal(judge(engine, "spark plugs").tier, 1);
});

// ---------- the new prompt system: families, groups, topics ----------
import { pickRace, dailyRace, dailyLayout, famKey, familyOf, poolFamilies } from "../public/vroomillion/js/racepick.js";
import { FAMILIES, TOPICS } from "../public/vroomillion/js/catalog/index.js";
import { QUESTIONS as ALL_Q } from "../public/vroomillion/js/data.js";

test("catalog: every family has a known topic, level and pool, and no prompt is in two families", () => {
  const seen = new Map();
  const ids = new Set();
  for (const f of FAMILIES) {
    assert.ok(!ids.has(f.id), "duplicate family id " + f.id); ids.add(f.id);
    assert.ok([1, 2, 3].includes(f.level), f.id + " level");
    assert.ok(f.pools.every((p) => ["main", "daily", "car", "hard"].includes(p)), f.id + " pools");
    if (!f.pools.every((p) => p === "car")) assert.ok(TOPICS.includes(f.topic), f.id + " topic " + f.topic);
    for (const p of f.prompts) { assert.ok(!seen.has(p), `${p} is in ${seen.get(p)} and ${f.id}`); seen.set(p, f.id); }
    if (f.pools.includes("daily")) assert.ok(!f.pools.some((p) => p === "main" || p === "hard"), f.id + ": daily families are only for the daily race");
  }
});

test("catalog: a twin points at a real family in the same pools (so 'never similar' holds across Unlimited and daily)", () => {
  const byId = new Map(FAMILIES.map((f) => [f.id, f]));
  for (const f of FAMILIES.filter((x) => x.key !== x.id)) {
    const main = byId.get(f.key);
    assert.ok(main, `${f.id} is a twin of unknown ${f.key}`);
    assert.deepEqual([...f.pools].sort(), [...main.pools].sort(), `${f.id} and ${f.key} must share pools`);
  }
});

test("catalog: every prompt the game already had is in a family", () => {
  const missing = ALL_Q.filter((q) => !familyOf(q.q)).map((q) => q.q);
  assert.deepEqual(missing, []);
});

test("races: no family twice, no group twice, at most one single, seven topics when the pool allows", () => {
  for (const mode of ["classic", "car", "hard"]) {
    let seen = [];
    const total = poolFamilies(mode).length;
    for (let r = 0; r < 200 && seen.length + 7 <= total; r++) {
      const race = pickRace(mode, seen, 7, Math.random);
      assert.equal(race.length, 7);
      const keys = race.map((x) => famKey(x.family));
      assert.ok(keys.every((k) => !seen.includes(k)), `${mode} race ${r + 1} repeats a family while fresh ones are left`);
      if (mode === "classic") {
        const groups = race.map((x) => x.family.group);
        assert.equal(new Set(groups).size, 7, `${mode}: two from one group: ${groups}`);
        assert.ok(race.filter((x) => x.family.single).length <= 1);
      }
      seen = [...seen, ...keys];
      if (r > 3) break; // a few full races are enough per run; the counts are checked below
    }
  }
  // with plenty left, CLASSIC races cover seven different topics
  const race = pickRace("classic", [], 7, Math.random);
  assert.equal(new Set(race.map((x) => x.family.topic)).size, 7);
});

test("races: once everything is used, the oldest-seen families come back first", () => {
  const fams = parseTiny();
  const seen = fams.map((f) => famKey(f)); // all seen, first ones oldest
  const race = pickRace("classic", seen, 2, () => 0.99, { families: fams });
  assert.deepEqual(race.map((x) => x.family.id).sort(), ["a/a", "b/b"]);
});
function parseTiny() {
  return ["a", "b", "c", "d"].map((x, i) => ({ id: `${x}/${x}`, group: x, topic: TOPICS[i], level: 1, pools: ["main"], single: false, prompts: ["Name " + x] }));
}

test("daily race: the same seven for everyone on a day, different the next day, seven groups", () => {
  const a = dailyRace("2026-12-01").map((x) => x.prompt);
  assert.deepEqual(dailyRace("2026-12-01").map((x) => x.prompt), a);
  assert.notDeepEqual(dailyRace("2026-12-02").map((x) => x.prompt), a);
  // once the daily pool is full size (a year of races), every daily race has seven different groups
  if (poolFamilies("daily").length >= 7 * 300) for (const race of dailyLayout()) assert.equal(new Set(race.map((f) => f.group)).size, 7);
});

test("daily order: fixed, every daily family at most once, seven groups a race, new families laid out", async () => {
  const { DAILY_START, DAILY_ORDER } = await import("../public/vroomillion/js/catalog/daily-order.js");
  const byId = new Map(FAMILIES.map((f) => [f.id, f]));
  const seen = new Set();
  for (const line of DAILY_ORDER) {
    const ids = line.split(",");
    assert.equal(ids.length, 7, line);
    for (const id of ids) { assert.ok(!seen.has(id), "twice: " + id); seen.add(id); }
    const fams = ids.map((id) => byId.get(id)).filter(Boolean);
    assert.equal(new Set(fams.map((f) => f.group)).size, fams.length, line);
  }
  // nearly every listed family still exists, and nearly every daily family is listed (run tools/daily-order.mjs)
  assert.ok([...seen].filter((id) => !byId.has(id)).length < 20);
  assert.ok(poolFamilies("daily").filter((f) => !seen.has(f.id)).length < 7, "run node tools/daily-order.mjs");
  // the start day gets the first line
  assert.deepEqual(dailyRace(DAILY_START).map((x) => x.family.id), DAILY_ORDER[0].split(","));
});

test("catalog: every family has answers (built into the game, or an answers/<prompt>.json file)", async () => {
  const fs = await import("node:fs");
  const { answerSlug } = await import("../public/vroomillion/js/racepick.js");
  const have = new Set(ALL_Q.map((q) => q.q));
  const missing = FAMILIES.filter((f) => !f.prompts.some((p) => have.has(p) || fs.existsSync(new URL(`../public/vroomillion/answers/${answerSlug(p)}.json`, import.meta.url))));
  assert.deepEqual(missing.map((f) => f.id), []);
});

test("answer files: five tiers, the obvious answers in TRAFFIC, no 'not this' notes left in", async () => {
  const fs = await import("node:fs");
  const dir = new URL("../public/vroomillion/answers/", import.meta.url);
  for (const f of fs.readdirSync(dir)) {
    const d = JSON.parse(fs.readFileSync(new URL(f, dir), "utf8"));
    assert.equal(d.a.length, 5, f);
    assert.ok(d.a[0].length >= 5, f + ": TRAFFIC");
    for (const t of d.a) for (const e of t) assert.ok(!/ no$/.test(e) || /^(oh|uh) no$/.test(e), `${f}: ${e}`);
  }
});
