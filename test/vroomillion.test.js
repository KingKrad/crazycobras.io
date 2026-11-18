import { test } from "node:test";
import assert from "node:assert/strict";
import { QUESTIONS } from "../public/vroomillion/js/data.js";
import {
  TIERS, ROUNDS, normalize, buildIndex, judge, metresFor, applyFenderBender,
  pickQuestions, payout, deckQuestions, soloPayout, dayKey, msUntilTomorrow, canRace, pickFresh, promptsLeft, makeVariants,
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
  assert.equal(judge(fruit, "durian").tier, 4);
  assert.equal(judge(fruit, "Jabuticaba").tier, 5);
  assert.equal(judge(fruit, "jabuticba").tier, 4, "a typo of a Vroomillion answer only scores a Deep Cut");
  assert.equal(judge(fruit, "jabuticba").capped, true);
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
  assert.equal(x.tier, 3);
  assert.equal(y.tier, 3);
  assert.ok(x.bump);
  const [p, q] = applyFenderBender(judge(fruit, "apple"), judge(fruit, "pear"));
  assert.equal(p.bump, undefined);
  assert.equal(q.tier, 1);
  const [m, n] = applyFenderBender(judge(fruit, "zzz"), judge(fruit, "zzz"));
  assert.equal(m.tier, 0);
  assert.equal(n.bump, undefined);
});

test("one free race per day, unlimited races after paying, everything during free play", () => {
  const today = dayKey(new Date(2026, 10, 17, 9, 30));
  assert.equal(today, "2026-11-17");
  assert.equal(dayKey(new Date(2026, 0, 5)), "2026-01-05");
  assert.ok(canRace({}, today, false), "never raced");
  assert.ok(canRace({ lastRunDay: "2026-11-16" }, today, false), "raced yesterday");
  assert.ok(!canRace({ lastRunDay: today }, today, false), "already raced today");
  assert.ok(canRace({ lastRunDay: today, unlimited: true }, today, false), "unlimited");
  assert.ok(canRace({ lastRunDay: today }, today, true), "free play");
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

test("solo prize money grows with the car and niche answers", () => {
  const starter = { price: 0 };
  const bugatti = { price: 1600000 };
  assert.deepEqual(soloPayout(3000, starter, [1, 2, 3]), { base: 6000, bonus: 0, total: 6000, rate: 2 });
  assert.equal(soloPayout(3000, starter, [4, 5]).bonus, Math.round(6000 * 0.35));
  assert.ok(soloPayout(8000, bugatti, [3]).total > 100 * soloPayout(3000, starter, [3]).total / 2);
  assert.equal(soloPayout(0, bugatti, [0, 0]).total, 0);
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
  assert.equal(car.length + classic.length - QUESTIONS.filter((x) => x.deck === "both").length, QUESTIONS.length);
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

test("races use hand-written prompts first and don't repeat a category", () => {
  const deck = deckQuestions(ALL, "classic");
  const race = pickFresh(deck, [], ROUNDS);
  assert.ok(race.every((q) => !q.variant), "hand-written first");
  const hand = deck.filter((q) => !q.variant).map((q) => q.q);
  const later = pickFresh(deck, hand, ROUNDS);
  assert.equal(later.length, ROUNDS);
  assert.ok(later.every((q) => q.variant));
  assert.equal(new Set(later.map((q) => q.base)).size, ROUNDS, "one prompt per category in a race");
});
