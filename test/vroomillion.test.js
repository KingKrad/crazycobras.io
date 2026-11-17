import { test } from "node:test";
import assert from "node:assert/strict";
import { QUESTIONS } from "../public/vroomillion/js/data.js";
import {
  TIERS, ROUNDS, LEAGUES, normalize, buildIndex, judge, metresFor, applyFenderBender,
  pickQuestions, payout, deckQuestions,
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
  assert.equal(judge(music, "flate").tier, 0, "short words don't forgive a wrong letter");
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

test("solo tracks get harder and pay more", () => {
  for (let i = 1; i < LEAGUES.length; i++) {
    assert.ok(LEAGUES[i].target > LEAGUES[i - 1].target);
    assert.ok(LEAGUES[i].prize > LEAGUES[i - 1].prize);
  }
  // the first track is winnable in the starter car with mostly CRUISING answers
  assert.ok(metresFor(2, 1, false) * 5 + metresFor(3, 1, false) * 2 >= LEAGUES[0].target);
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
