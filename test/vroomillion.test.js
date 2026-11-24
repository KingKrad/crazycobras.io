import { test } from "node:test";
import assert from "node:assert/strict";
import { QUESTIONS } from "../public/vroomillion/js/data.js";
import { carById } from "../public/vroomillion/js/cars.js";
import {
  DESTINATIONS, destinationFor,
  TIERS, ROUNDS, classRank, blockedBy, carReach, tunedCar, normalize, buildIndex, judge, metresFor, applyFenderBender,
  payout, soloPayout, dayKey, msUntilTomorrow, canRace, markDaily, dailyLeft, nextDaily, DAILY_RACES,
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

test("CRAZY MODE flips the ladder: obvious answers score most, a stall is still nothing", async () => {
  const { metresFor, effectTier, CRAZY_METRES } = await import("../public/vroomillion/js/logic.js");
  // CRAZY MODE: only the jackpot (a top-2 answer) scores 1000; other common answers 720, down to 60
  assert.equal(metresFor(1, 1, false, true, true), 1000);
  assert.deepEqual([0, 1, 2, 3, 4, 5].map((t) => metresFor(t, 1, false, true)), [0, 720, 480, 280, 120, 60]);
  assert.deepEqual([0, 1, 2, 3, 4, 5].map((t) => metresFor(t, 1, false)), [0, 120, 280, 480, 720, 1000]);
  assert.equal(metresFor(5, 1, false, false, true), 1000, "top only matters in CRAZY MODE");
  assert.equal(metresFor(1, 2, true, true, true), Math.round(CRAZY_METRES[0] * 2 * 1.5));
  assert.deepEqual([0, 1, 2, 5].map((t) => effectTier(t, true)), [0, 4, 3, 1]);
  assert.equal(effectTier(1, true, true), 5);
  // the first two answers on a prompt's list are the jackpot ones, with all their spellings
  const { buildIndex, judge, isJackpot } = await import("../public/vroomillion/js/logic.js");
  const idx = buildIndex({ q: "Name a dog breed", a: [["labrador|lab", "poodle", "beagle"], ["pug"], [], [], []] });
  assert.deepEqual(["lab", "poodle", "beagle", "pug", "labradr"].map((x) => isJackpot(judge(idx, x))), [true, true, false, false, true]);
});

test("typo forgiveness: none under 5 letters, one for 5-9, two for 10+", async () => {
  const { typoAllowance } = await import("../public/vroomillion/js/logic.js");
  assert.deepEqual([3, 4, 5, 9, 10, 20].map(typoAllowance), [0, 0, 1, 1, 2, 2]);
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

test("matching answers cause a fender bender: a coin toss, and the loser gets half", async () => {
  const { tossWinner, roundMetres } = await import("../public/vroomillion/js/logic.js");
  const a = judge(fruit, "durian");
  const [x, y] = applyFenderBender(a, { ...a }, 1);
  assert.equal(x.tier, a.tier, "the rarity stays");
  assert.equal(y.tier, a.tier);
  assert.ok(x.bump && y.bump);
  assert.equal(x.toss, "lost");
  assert.equal(y.toss, "won");
  assert.equal(roundMetres(x, 1, false), Math.round(metresFor(a.tier, 1, false) / 2), "the loser of the toss gets half");
  assert.equal(roundMetres(y, 1, false), metresFor(a.tier, 1, false));
  const [p, q] = applyFenderBender(judge(fruit, "apple"), judge(fruit, "pear"));
  assert.equal(p.bump, undefined);
  assert.equal(q.tier, 1);
  const [m, n] = applyFenderBender(judge(fruit, "zzz"), judge(fruit, "zzz"));
  assert.equal(m.tier, 0);
  assert.equal(n.bump, undefined);
  // online: both games work the toss out the same way from the room code and round
  assert.equal(tossWinner("ABC123:3"), tossWinner("ABC123:3"));
  const wins = new Set(Array.from({ length: 20 }, (_, i) => tossWinner("ROOM:" + i)));
  assert.deepEqual([...wins].sort(), [0, 1], "both sides can win");
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

test("solo prize money grows with the car class and niche answers", () => {
  const starter = carById("rustbucket");
  const hyper = carById("chiron");
  assert.deepEqual(soloPayout(3000, starter, [1, 2, 3]), { base: 6000, bonus: 0, total: 6000, rate: 2 });
  assert.equal(soloPayout(3000, starter, [4, 5]).bonus, Math.round(6000 * 0.35));
  assert.equal(soloPayout(1000, hyper, [3]).rate, 6, "class S earns $6 a metre");
  assert.equal(soloPayout(0, hyper, [0, 0]).total, 0);
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

test("car levels add power and nitro but never change the class; old upgrades become levels", async () => {
  const { levelFor, xpForLevel, migrateUpgrades, MAX_LEVEL } = await import("../public/vroomillion/js/logic.js");
  const car = carById("rustbucket");
  assert.equal(levelFor(0), 1);
  assert.equal(levelFor(xpForLevel(5)), 5);
  assert.equal(levelFor(1e9), MAX_LEVEL, "levels are capped");
  const t = tunedCar(car, { rustbucket: xpForLevel(10) });
  assert.equal(t.level, 10);
  assert.equal(t.power, Math.round(car.power * 1.225 * 100) / 100);
  assert.equal(t.nitro, car.nitro + 2);
  assert.equal(t.cls, "D");
  assert.equal(destinationFor(30000, t).id, "beach", "still can't leave the beach");
  assert.equal(tunedCar(car, {}).power, car.power);
  const m = migrateUpgrades({ cash: 5, upgrades: { rustbucket: { engine: 3, nitro: 2 } } });
  assert.equal(m.upgrades, undefined);
  assert.equal(levelFor(m.carXp.rustbucket), 10);
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

// ---------- prompt families, groups, topics ----------
import { pickRace, dailyRace, dailyLayout, famKey, familyOf, poolFamilies, isWordGame } from "../public/vroomillion/js/racepick.js";
import { FAMILIES, TOPICS } from "../public/vroomillion/js/catalog/index.js";
import { QUESTIONS as ALL_Q } from "../public/vroomillion/js/data.js";

test("catalog: every family has a known topic, level and pool, and no prompt is in two families", () => {
  const seen = new Map();
  const ids = new Set();
  for (const f of FAMILIES) {
    assert.ok(!ids.has(f.id), "duplicate family id " + f.id); ids.add(f.id);
    assert.ok([1, 2, 3].includes(f.level), f.id + " level");
    assert.ok(f.pools.every((p) => ["main", "daily", "car", "hard", "geo"].includes(p)), f.id + " pools");
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
    if (DAILY_ORDER.indexOf(line) >= 2) assert.ok(fams.filter(isWordGame).length <= 1, "two word games: " + line);
  }
  // nearly every listed family still exists, and nearly every daily family is listed (run tools/daily-order.mjs)
  assert.ok([...seen].filter((id) => !byId.has(id)).length < 20);
  // (word games beyond one a race wait for more prompts)
  assert.ok(poolFamilies("daily").filter((f) => !seen.has(f.id) && !isWordGame(f)).length < 50, "run node tools/daily-order.mjs");
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

test("account progress merges with a device's save without losing anything earned", async () => {
  const { mergeProgress } = await import("../public/vroomillion/js/logic.js");
  const fresh = { cash: 0, owned: ["rustbucket"], races: 0, passport: {}, seen: ["x"], muted: true };
  const acct = { cash: 800, owned: ["rustbucket", "van"], races: 10, best: 3000, passport: { town: 2000 }, carXp: { van: 2000 }, savedAt: 1 };
  // a new device takes the account's progress, keeps its own history and settings
  const m = mergeProgress(fresh, acct);
  assert.equal(m.cash, 800); assert.deepEqual(m.owned, ["rustbucket", "van"]); assert.deepEqual(m.seen, ["x"]); assert.equal(m.muted, true);
  // no account copy yet, or an empty one: the device keeps its own
  assert.equal(mergeProgress(acct, null), acct);
  assert.equal(mergeProgress(acct, fresh).cash, 800);
  // both played: the more-played save leads, cars, stamps, bests and car XP combine
  const dev = { cash: 50, owned: ["rustbucket", "truck"], races: 3, best: 4000, passport: { town: 500, beach: 700 }, carXp: { van: 9000 }, savedAt: 9 };
  const both = mergeProgress(dev, acct);
  assert.equal(both.cash, 800);
  assert.equal(both.races, 10);
  assert.deepEqual(both.owned.sort(), ["rustbucket", "truck", "van"]);
  assert.deepEqual(both.passport, { town: 2000, beach: 700 });
  assert.equal(both.best, 4000);
  assert.equal(both.carXp.van, 9000);
});

test("DEAN'S MAZZY: gift-only, and the best car in the game by a big margin", async () => {
  const { CARS, GIFT_CARS, carById } = await import("../public/vroomillion/js/cars.js");
  const mazzy = carById("mazzy");
  assert.equal(mazzy.name, "DEAN'S MAZZY");
  assert.deepEqual(GIFT_CARS, ["mazzy", "tessy", "hondeezy", "nico", "zig", "audi5k"]);
  assert.equal(carById("zig").name, "ZIG'S WHIP");
  assert.equal(carById("nico").name, "NICO'S CRAZY CAR");
  assert.equal(carById("hondeezy").name, "A-DOG'S HONDEEZY");
  assert.equal(carById("tessy").name, "AMELIA'S TESSY");
  // AMELIA'S TESSY has UNLIMITED power: x1,000 in solo and 2-player, but the gift-car top power where
  // scores are compared (the daily race, online races)
  const { fairCar } = await import("../public/vroomillion/js/cars.js");
  const tessy = carById("tessy");
  assert.ok(tessy.unlimited && tessy.power >= 1000);
  assert.equal(fairCar(tessy).power, mazzy.power, "in the daily race it ties with the other top gift car");
  assert.equal(fairCar(mazzy), mazzy, "other cars race as they are");
  assert.equal(mazzy.price, 0);
  assert.equal(mazzy.cls, "X");
  const next = Math.max(...CARS.filter((c) => !c.giftOnly).map((c) => c.power));
  assert.ok(mazzy.power >= next * 1.4, `${mazzy.power} vs ${next}`);
  assert.ok(mazzy.nitro > Math.max(...CARS.filter((c) => !c.giftOnly).map((c) => c.nitro)));
});

test("the car collection: about 80 to earn, rarities, premium cars no faster than their class", async () => {
  const { CARS, COLLECTION, PREMIUM, rarityOf, paintsFor } = await import("../public/vroomillion/js/cars.js");
  assert.ok(COLLECTION.length >= 75, String(COLLECTION.length));
  assert.equal(new Set(CARS.map((c) => c.id)).size, CARS.length, "unique ids");
  for (const c of CARS) assert.ok(["COMMON", "RARE", "EPIC", "LEGENDARY", "ONE OF A KIND"].includes(rarityOf(c)), c.id);
  for (const p of PREMIUM) {
    const top = Math.max(...CARS.filter((c) => c.cls === p.cls && !c.premium && !c.giftOnly && !c.exclusive).map((c) => c.power));
    assert.ok(p.power < top, `${p.id} must not be the best of class ${p.cls}`);
    assert.ok(p.premium <= 500);
  }
  for (const c of CARS) assert.equal(new Set(paintsFor(c)).size, 4, c.id + " has 4 different paints");
});
