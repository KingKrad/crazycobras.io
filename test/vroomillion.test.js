import { test } from "node:test";
import assert from "node:assert/strict";
import { QUESTIONS } from "../public/vroomillion/js/data.js";
import {
  TIERS, ROUNDS, LEAGUES, normalize, buildIndex, judge, metresFor, applyFenderBender,
  rivalAnswer, pickQuestions, payout,
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
  assert.equal(judge(fruit, "fog").tier, 0, "short words get no typo forgiveness");
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

test("rival answers are valid for their tier and never copy the player", () => {
  const q = QUESTIONS[0];
  const idx = buildIndex(q);
  for (const league of LEAGUES) {
    assert.ok(Math.abs(league.skill.reduce((s, w) => s + w, 0) - 1) < 1e-9, league.id);
    for (let i = 0; i < 200; i++) {
      const r = rivalAnswer(q, league, "apple");
      assert.notEqual(r.key, "apple");
      if (r.tier > 0) assert.ok(judge(idx, r.display).tier >= 1);
    }
  }
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
