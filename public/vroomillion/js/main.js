import { QUESTIONS } from "./data.js";
import { CARS, CLASSES, carById, carSprite } from "./cars.js";
import {
  TIERS, ROUNDS, ANSWER_SECONDS, LEAGUES, buildIndex, judge, metresFor, applyFenderBender,
  pickQuestions, payout, exampleAnswer,
} from "./logic.js";
import * as audio from "./audio.js";
import { Scene } from "./scene.js";

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const money = (n) => "$" + Math.round(n).toLocaleString("en-US");

// Build DOM without innerHTML.
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) if (kid != null) el.append(kid);
  return el;
}

// ---------- save data ----------
const SAVE_KEY = "vroomillion.v1";
const fresh = () => ({ cash: 0, owned: ["rustbucket"], car: "rustbucket", league: 0, muted: false, races: 0, wins: 0, vrooms: 0, deep: 0 });
let save = fresh();
try {
  const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
  if (raw && Array.isArray(raw.owned)) save = { ...save, ...raw };
} catch { /* private mode or bad data: start fresh */ }
if (!save.owned.includes(save.car)) save.car = save.owned[0] || "rustbucket";
const persist = () => {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* ignore */ }
};

// ---------- scene loop ----------
const scene = new Scene($("scene"));
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  scene.update(dt);
  scene.draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

function attract() {
  scene.setRacers([{ car: carById(save.car), label: "P1", color: "#4fd1ff", lane: 1 }]);
  scene.speed = 0.3;
}

// ---------- chrome ----------
let shownCash = save.cash;
function renderCash(animate) {
  const el = $("cash");
  if (!animate) {
    shownCash = save.cash;
    el.textContent = money(shownCash);
    return;
  }
  const from = shownCash;
  const to = save.cash;
  const start = performance.now();
  el.classList.add("pop");
  const step = (now) => {
    const k = Math.min(1, (now - start) / 900);
    shownCash = from + (to - from) * k;
    el.textContent = money(shownCash);
    if (k < 1) requestAnimationFrame(step);
    else el.classList.remove("pop");
  };
  requestAnimationFrame(step);
}

function renderSound() {
  const b = $("btn-sound");
  b.textContent = save.muted ? "SND OFF" : "SND ON";
  b.setAttribute("aria-pressed", String(!save.muted));
}

let current = "title";
function show(name) {
  current = name;
  for (const s of document.querySelectorAll(".screen")) s.classList.toggle("active", s.id === "s-" + name);
  $("title-art").classList.toggle("hidden", name !== "title");
  document.body.dataset.screen = name;
  if (name === "title") {
    raceToken++;
    audio.engineStop();
    attract();
    $("stats").textContent = save.races
      ? `RACES ${save.races} · WINS ${save.wins} · DEEP CUTS ${save.deep} · VROOMILLIONS ${save.vrooms}`
      : "NEW DRIVER. YOUR '92 RUSTBUCKET AWAITS.";
  }
  if (name === "leagues") renderLeagues();
  if (name === "versus") renderVersus();
  if (name === "garage") renderGarage();
  window.scrollTo({ top: 0 });
}

function overlay(text, cls = "") {
  const o = $("overlay");
  o.textContent = "";
  if (!text) return;
  o.append(h("div", { class: "overlay-text " + cls, text }));
}

// ---------- car widgets ----------
function spriteCanvas(car, scale = 4) {
  const src = carSprite(car);
  const cv = h("canvas", { class: "sprite", width: src.width, height: src.height, "aria-hidden": "true" });
  cv.getContext("2d").drawImage(src, 0, 0);
  cv.style.width = src.width * scale + "px";
  return cv;
}

function statLine(car) {
  const pct = Math.round(((car.power - 1) / 0.55) * 100);
  const bar = h("span", { class: "bar" }, h("span", { class: "bar-fill" }));
  bar.firstChild.style.width = Math.max(4, pct) + "%";
  return h("div", { class: "statline" },
    h("span", { text: "PWR" }), bar, h("span", { class: "num", text: "×" + car.power.toFixed(2) }),
    h("span", { class: "n2o", text: "N2O " + car.nitro }));
}

// ◀ car ▶ selector over the cars you own.
function carPicker(mount, getId, setId) {
  const draw = () => {
    const owned = CARS.filter((c) => save.owned.includes(c.id));
    const car = carById(getId());
    const move = (d) => {
      const i = owned.findIndex((c) => c.id === car.id);
      setId(owned[(i + d + owned.length) % owned.length].id);
      audio.sfx.move();
      draw();
    };
    mount.textContent = "";
    mount.append(
      h("button", { class: "arrow", type: "button", "aria-label": "Previous car", onclick: () => move(-1), disabled: owned.length < 2 }, "◀"),
      h("div", { class: "picker-car" }, spriteCanvas(car, 5), h("div", { class: "car-name", text: car.name }), statLine(car)),
      h("button", { class: "arrow", type: "button", "aria-label": "Next car", onclick: () => move(1), disabled: owned.length < 2 }, "▶"),
    );
  };
  draw();
}

// ---------- menus ----------
function renderLeagues() {
  carPicker($("picker-solo"), () => save.car, (id) => { save.car = id; persist(); });
  const list = $("league-list");
  list.textContent = "";
  LEAGUES.forEach((lg, i) => {
    const locked = i > save.league;
    list.append(h("button", {
      class: "league" + (locked ? " locked" : ""), type: "button", disabled: locked,
      onclick: () => { audio.sfx.click(); startRace({ mode: "solo", league: lg }); },
    },
    h("span", { class: "league-name", text: (locked ? "🔒 " : "") + lg.name }),
    h("span", { class: "league-info", text: locked ? `WIN ${LEAGUES[i - 1].name} TO UNLOCK` : `REACH ${lg.target.toLocaleString("en-US")} M IN ${ROUNDS} ANSWERS` }),
    h("span", { class: "league-prize", text: money(lg.prize) })));
  });
}

const versus = { p1: save.car, p2: save.car };
function renderVersus() {
  versus.p1 = save.car;
  versus.p2 = save.car;
  carPicker($("picker-p1"), () => versus.p1, (id) => { versus.p1 = id; });
  carPicker($("picker-p2"), () => versus.p2, (id) => { versus.p2 = id; });
}

function renderGarage() {
  const root = $("garage-list");
  root.textContent = "";
  for (const [cls, title] of Object.entries(CLASSES)) {
    root.append(h("h3", { class: "class-title cls-" + cls, text: title }));
    const grid = h("div", { class: "car-grid" });
    for (const car of CARS.filter((c) => c.cls === cls)) {
      const owned = save.owned.includes(car.id);
      const equipped = save.car === car.id;
      const afford = save.cash >= car.price;
      const action = equipped
        ? h("div", { class: "tag equipped", text: "EQUIPPED" })
        : owned
          ? h("button", { class: "btn small", type: "button", text: "DRIVE", onclick: () => { save.car = car.id; persist(); audio.sfx.lock(); renderGarage(); } })
          : h("button", {
            class: "btn small buy" + (afford ? "" : " poor"), type: "button", text: money(car.price),
            "aria-label": `Buy ${car.name} for ${money(car.price)}`,
            onclick: () => buy(car),
          });
      grid.append(h("div", { class: "car-card" + (owned ? " owned" : "") + (equipped ? " is-equipped" : "") },
        spriteCanvas(car, 4), h("div", { class: "car-name", text: car.name }), statLine(car), action));
    }
    root.append(grid);
  }
}

function buy(car) {
  if (save.cash < car.price) {
    audio.sfx.deny();
    overlay(`NEED ${money(car.price - save.cash)} MORE`, "small");
    setTimeout(() => current === "garage" && overlay(""), 1200);
    return;
  }
  save.cash -= car.price;
  save.owned.push(car.id);
  save.car = car.id;
  persist();
  audio.sfx.buy();
  renderCash(true);
  scene.setRacers([{ car, label: "P1", color: "#4fd1ff" }]);
  scene.confetti();
  overlay("NEW RIDE!", "win");
  setTimeout(() => current === "garage" && overlay(""), 1400);
  renderGarage();
}

function renderLegend() {
  const root = $("tier-legend");
  for (const t of [...TIERS].reverse()) {
    root.append(h("div", { class: "tier-row" },
      h("span", { class: "badge t" + t.id, text: t.name }),
      h("span", { class: "tier-m", text: t.metres + " M" }),
      h("span", { class: "tier-blurb", text: t.blurb })));
  }
}

// ---------- the race ----------
let raceToken = 0;
let race = null;
let lastSetup = null;

function hudCard(r, i) {
  r.elDist = h("span", { class: "dist", text: "0 M" });
  r.elTier = h("span", { class: "badge t0 ghost", text: "READY" });
  r.elNitro = h("span", { class: "n2o", text: "N2O " + r.nitro });
  return h("div", { class: "hud-card p" + (i + 1) },
    h("div", { class: "hud-name", text: r.name }),
    h("div", { class: "hud-car", text: r.car.name }),
    r.elDist,
    race.solo ? goalBar(r) : null,
    h("div", { class: "hud-foot" }, r.elTier, r.elNitro));
}

function goalBar(r) {
  r.elGoalFill = h("span", { class: "goal-fill" });
  r.elGoalText = h("span", { class: "goal-text", text: `GOAL ${race.setup.league.target.toLocaleString("en-US")} M` });
  return h("div", { class: "goal" }, h("span", { class: "goal-bar" }, r.elGoalFill), r.elGoalText);
}

function drawGoal(r) {
  if (!r.elGoalFill) return;
  const target = race.setup.league.target;
  const k = Math.min(1, r.dist / target);
  r.elGoalFill.style.transform = `scaleX(${k})`;
  r.elGoalFill.classList.toggle("done", k >= 1);
  r.elGoalText.textContent = k >= 1 ? "GOAL REACHED!" : `${Math.round(target - r.dist).toLocaleString("en-US")} M TO GO`;
}

function startRace(setup) {
  lastSetup = setup;
  const token = ++raceToken;
  const solo = setup.mode === "solo";
  const mk = (name, car) => ({ name, car, power: car.power, nitro: car.nitro, dist: 0, tiers: [], log: [], useNitro: false });
  const racers = solo
    ? [mk("YOU", carById(save.car))]
    : [mk(setup.names[0], carById(setup.cars[0])), mk(setup.names[1], carById(setup.cars[1]))];
  race = { token, solo, setup, racers, round: 0, questions: pickQuestions(QUESTIONS, ROUNDS) };

  scene.setRacers(solo
    ? [{ car: racers[0].car, label: "P1", color: "#4fd1ff", lane: 1 }]
    : [{ car: racers[0].car, label: "P1", color: "#4fd1ff" }, { car: racers[1].car, label: "P2", color: "#ff4fd8" }]);
  if (solo) scene.goal = setup.league.target;
  scene.speed = 0.05;
  const hud = $("hud");
  hud.textContent = "";
  for (const id of ["hud", "reveal", "result-body"]) $(id).classList.toggle("solo", solo);
  racers.forEach((r, i) => hud.append(hudCard(r, i)));
  $("pips").textContent = "";
  for (let i = 0; i < ROUNDS; i++) $("pips").append(h("i", { class: "pip" }));
  $("reveal").textContent = "";
  $("hint").textContent = "";
  $("question").textContent = "GET READY…";
  $("round-label").textContent = `ROUND 1/${ROUNDS}`;
  $("answer-zone").classList.add("hidden");
  $("btn-next").classList.add("hidden");
  show("race");
  audio.engineStart();
  audio.engineSet(0.1);
  runRace(token);
}

async function runRace(token) {
  const alive = () => token === raceToken;
  for (const n of ["3", "2", "1"]) {
    overlay(n, "count");
    audio.sfx.beep();
    await sleep(700);
    if (!alive()) return;
  }
  overlay("GO!", "count go");
  audio.sfx.go();
  scene.speed = 0.3;
  audio.engineSet(0.3);
  await sleep(600);
  if (!alive()) return;
  overlay("");

  for (let round = 0; round < ROUNDS; round++) {
    race.round = round;
    const q = race.questions[round];
    const index = buildIndex(q);
    $("round-label").textContent = `ROUND ${round + 1}/${ROUNDS}`;
    [...$("pips").children].forEach((p, i) => p.classList.toggle("on", i === round));
    $("reveal").textContent = "";
    $("hint").textContent = "";
    const qEl = $("question");
    qEl.textContent = q.q.toUpperCase();
    qEl.classList.remove("slam");
    void qEl.offsetWidth;
    qEl.classList.add("slam");

    // collect answers
    const results = [];
    for (let i = 0; i < race.racers.length; i++) {
      results[i] = await askAnswer(race.racers[i], i, token, index);
      if (!alive()) return;
    }
    const final = race.solo ? results : applyFenderBender(results[0], results[1]);
    const bumped = final.some((f) => f.bump);

    // reveal
    $("answer-zone").classList.add("hidden");
    const cards = final.map((res, i) => revealCard(race.racers[i], res, i));
    $("reveal").append(...cards);
    await sleep(500);
    for (let i = 0; i < cards.length; i++) {
      if (!alive()) return;
      cards[i].classList.add("shown");
      audio.sfx.tier(final[i].tier);
      if (final[i].tier === 5) scene.confetti();
      await sleep(final[i].tier === 5 ? 1300 : 800);
    }
    if (!alive()) return;
    if (bumped) {
      audio.sfx.bump();
      overlay("FENDER BENDER!", "small bad");
      scene.shake = scene.calm ? 0 : 0.4;
      await sleep(900);
      if (!alive()) return;
      overlay("");
    }

    // burst down the road
    const from = race.racers.map((r) => r.dist);
    const gain = race.racers.map((r, i) => metresFor(final[i].tier, r.power, r.useNitro));
    race.racers.forEach((r, i) => {
      r.tiers.push(final[i].tier);
      r.log.push({ q: q.q, answer: final[i].display || "—", tier: final[i].tier, gain: gain[i], nitro: r.useNitro, bump: !!final[i].bump });
      r.elTier.className = "badge t" + final[i].tier;
      r.elTier.textContent = TIERS[final[i].tier].short;
      scene.racers[i].nitro = r.useNitro && final[i].tier > 0;
      if (scene.racers[i].nitro) audio.sfx.nitro();
    });
    const dur = 2300;
    const t0 = performance.now();
    await new Promise((done) => {
      const step = (now) => {
        if (!alive()) return done();
        const k = Math.min(1, (now - t0) / dur);
        const e = 1 - Math.pow(1 - k, 3);
        const v = 3 * Math.pow(1 - k, 2); // derivative of the ease, 3 → 0
        let top = 0;
        race.racers.forEach((r, i) => {
          r.dist = from[i] + gain[i] * e;
          scene.racers[i].dist = r.dist;
          scene.racers[i].boost = (gain[i] / 1500) * v;
          top = Math.max(top, scene.racers[i].boost);
          r.elDist.textContent = Math.round(r.dist).toLocaleString("en-US") + " M";
          drawGoal(r);
        });
        scene.speed = 0.25 + Math.min(0.75, top * 0.9);
        audio.engineSet(scene.speed);
        if (k < 1) requestAnimationFrame(step);
        else done();
      };
      requestAnimationFrame(step);
    });
    if (!alive()) return;
    race.racers.forEach((r, i) => {
      r.useNitro = false;
      scene.racers[i].nitro = false;
      scene.racers[i].boost = 0;
    });
    if (race.solo) {
      const r = race.racers[0];
      const target = race.setup.league.target;
      if (r.dist >= target && r.dist - gain[0] < target) {
        audio.sfx.win();
        scene.confetti();
        overlay("GOAL!", "win");
        setTimeout(() => alive() && overlay(""), 1200);
      }
      $("hud").firstChild.classList.toggle("leading", r.dist >= target);
    } else {
      const lead = race.racers[0].dist === race.racers[1].dist ? -1 : race.racers[0].dist > race.racers[1].dist ? 0 : 1;
      [...$("hud").children].forEach((c, i) => c.classList.toggle("leading", i === lead));
    }
    [...$("pips").children][round].classList.add("done");

    const best = Math.max(...final.map((f) => f.tier));
    $("hint").textContent = best >= 5
      ? "THAT'S AS NICHE AS IT GETS."
      : `A VROOMILLION ANSWER: ${exampleAnswer(q, 5).toUpperCase()}`;

    await waitNext(round === ROUNDS - 1 ? "FINISH ▶" : "NEXT ▶", token);
    if (!alive()) return;
  }
  finish(token);
}

function revealCard(r, res, i) {
  const t = TIERS[res.tier];
  return h("div", { class: `reveal-card p${i + 1} tier${res.tier}` },
    h("div", { class: "reveal-who", text: r.name }),
    h("div", { class: "reveal-answer", text: (res.display || "(no answer)").toUpperCase() }),
    res.corrected ? h("div", { class: "reveal-fixed", text: "(AUTOCORRECTED)" }) : null,
    h("div", { class: "badge t" + res.tier, text: t.name }),
    h("div", { class: "reveal-gain", text: `+${metresFor(res.tier, r.power, r.useNitro).toLocaleString("en-US")} M` + (r.useNitro && res.tier ? " · NITRO" : "") + (res.bump ? " · BUMPED −1" : "") }));
}

// Shows the input for one human and resolves with what they typed.
// Only a right answer (or the timer running out) ends the turn.
function askAnswer(r, i, token, index) {
  return new Promise((resolve) => {
    const zone = $("answer-zone");
    const input = $("answer");
    const fill = $("timer-fill");
    const nitroBtn = $("btn-nitro");
    const hidden = !race.solo;
    zone.classList.remove("hidden");
    zone.dataset.player = String(i + 1);
    input.value = "";
    const feedback = $("feedback");
    feedback.textContent = "";
    feedback.className = "feedback";
    input.type = hidden ? "password" : "text";
    input.autocomplete = hidden ? "new-password" : "off";
    $("turn").textContent = race.solo ? "YOUR ANSWER" : `${r.name} — TYPE IT (HIDDEN). OTHER PLAYER LOOK AWAY!`;
    r.useNitro = false;
    const drawNitro = () => {
      nitroBtn.textContent = r.useNitro ? "NITRO ARMED ×1.5" : `NITRO ×${r.nitro}`;
      nitroBtn.classList.toggle("armed", r.useNitro);
      nitroBtn.disabled = r.nitro < 1 && !r.useNitro;
      r.elNitro.textContent = "N2O " + r.nitro;
    };
    drawNitro();
    input.focus({ preventScroll: true });

    const t0 = performance.now();
    let lastTick = 99;
    let finished = false;
    const end = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      input.removeEventListener("keydown", onKey);
      input.removeEventListener("input", onInput);
      $("btn-go").removeEventListener("click", onGo);
      nitroBtn.removeEventListener("click", toggleNitro);
    };
    const stalled = { tier: 0, display: "OUT OF TIME", key: "" };
    const say = (text, cls) => {
      feedback.textContent = text;
      feedback.className = "feedback " + cls;
      void feedback.offsetWidth;
      feedback.classList.add("pop");
    };
    const lockIn = (res) => {
      end();
      audio.sfx.lock();
      if (res.corrected) {
        // show the fix for a moment, like a phone keyboard would
        say(hidden ? "AUTOCORRECTED!" : `AUTOCORRECTED: ${res.display.toUpperCase()}`, "good");
        if (!hidden) input.value = res.display.toUpperCase();
        setTimeout(() => { input.value = ""; resolve(res); }, 650);
      } else {
        input.value = "";
        resolve(res);
      }
    };
    const submit = (timedOut = false) => {
      if (finished) return;
      if (token !== raceToken) { end(); return resolve(stalled); }
      const value = input.value;
      const res = judge(index, value);
      if (res.tier > 0) return lockIn(res);
      if (timedOut) {
        end();
        input.value = "";
        return resolve(stalled);
      }
      // Wrong: keep the clock running and let them try again.
      audio.sfx.deny();
      input.classList.remove("shake");
      void input.offsetWidth;
      input.classList.add("shake");
      if (!value.trim()) say("TYPE SOMETHING!", "bad");
      else say(hidden ? "NOT ON THE LIST — TRY AGAIN!" : `"${value.trim().toUpperCase().slice(0, 24)}" ISN'T ON THE LIST — TRY AGAIN!`, "bad");
      input.value = "";
      input.focus({ preventScroll: true });
    };
    const onKey = (e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } };
    const onGo = () => submit();
    const onInput = () => audio.sfx.key();
    const toggleNitro = () => {
      if (!r.useNitro && r.nitro < 1) return;
      r.useNitro = !r.useNitro;
      r.nitro += r.useNitro ? -1 : 1;
      audio.sfx.click();
      drawNitro();
      input.focus({ preventScroll: true });
    };
    let raf = 0;
    const tick = (now) => {
      if (token !== raceToken) { end(); return resolve(stalled); }
      const left = ANSWER_SECONDS - (now - t0) / 1000;
      fill.style.transform = `scaleX(${Math.max(0, left / ANSWER_SECONDS)})`;
      fill.classList.toggle("low", left < 6);
      const whole = Math.ceil(left);
      if (whole < lastTick && whole <= 5 && whole > 0) audio.sfx.tick();
      lastTick = whole;
      if (left <= 0) return submit(true);
      raf = requestAnimationFrame(tick);
    };
    input.addEventListener("keydown", onKey);
    input.addEventListener("input", onInput);
    $("btn-go").addEventListener("click", onGo);
    nitroBtn.addEventListener("click", toggleNitro);
    raf = requestAnimationFrame(tick);
  });
}

function waitNext(label, token) {
  return new Promise((resolve) => {
    const btn = $("btn-next");
    btn.textContent = label;
    btn.classList.remove("hidden");
    btn.focus({ preventScroll: true });
    const go = () => {
      btn.removeEventListener("click", go);
      btn.classList.add("hidden");
      audio.sfx.click();
      resolve();
    };
    btn.addEventListener("click", go);
    const poll = setInterval(() => {
      if (token !== raceToken) { clearInterval(poll); btn.removeEventListener("click", go); btn.classList.add("hidden"); resolve(); }
    }, 200);
    btn.addEventListener("click", () => clearInterval(poll), { once: true });
  });
}

function finish(token) {
  if (token !== raceToken) return;
  const [a, b] = race.racers;
  const winner = race.solo
    ? (a.dist >= race.setup.league.target ? 0 : -1)
    : a.dist === b.dist ? -1 : a.dist > b.dist ? 0 : 1;
  audio.engineStop();
  scene.speed = 0.3;

  let pay;
  let title;
  let unlocked = null;
  if (race.solo) {
    const lg = race.setup.league;
    const won = winner === 0;
    pay = payout(lg.prize, won, a.tiers);
    title = won ? "GOAL REACHED!" : `${Math.round(lg.target - a.dist).toLocaleString("en-US")} M SHORT`;
    const idx = LEAGUES.indexOf(lg);
    if (won && idx === save.league && idx < LEAGUES.length - 1) {
      save.league = idx + 1;
      unlocked = LEAGUES[idx + 1].name;
    }
    if (won) save.wins++;
    save.vrooms += a.tiers.filter((t) => t === 5).length;
    save.deep += a.tiers.filter((t) => t === 4).length;
  } else {
    const w = winner === -1 ? a : race.racers[winner];
    pay = payout(1500, winner !== -1, w.tiers);
    title = winner === -1 ? "DEAD HEAT" : `${w.name} WINS!`;
    for (const r of race.racers) {
      save.vrooms += r.tiers.filter((t) => t === 5).length;
      save.deep += r.tiers.filter((t) => t === 4).length;
    }
  }
  save.races++;
  save.cash += pay.total;
  persist();

  const happy = !race.solo ? winner !== -1 : winner === 0;
  if (happy) { audio.sfx.win(); scene.confetti(); } else audio.sfx.lose();
  setTimeout(() => { audio.sfx.cash(); renderCash(true); }, 900);

  $("result-title").textContent = title;
  $("result-title").className = "result-title " + (happy ? "good" : "bad");
  const body = $("result-body");
  body.textContent = "";
  body.append(
    h("div", { class: "final" },
      ...race.racers.map((r, i) => h("div", { class: `final-card p${i + 1}` + (i === winner ? " winner" : "") },
        spriteCanvas(r.car, 4),
        h("div", { class: "hud-name", text: r.name }),
        h("div", { class: "dist", text: Math.round(r.dist).toLocaleString("en-US") + " M" }),
        race.solo ? h("div", { class: "note", text: `GOAL ${race.setup.league.target.toLocaleString("en-US")} M` }) : null))),
    h("div", { class: "payout" },
      h("div", { text: race.solo ? "PRIZE MONEY" : "PRIZE (SHARED GARAGE)" }),
      h("div", { class: "payout-total", text: "+" + money(pay.total) }),
      h("div", { class: "note", text: `${money(pay.base)} RACE · ${money(pay.bonus)} NICHE BONUS` }),
      unlocked ? h("div", { class: "unlock", text: `UNLOCKED: ${unlocked}!` }) : null),
    h("div", { class: "log" },
      ...a.log.map((row, i) => h("div", { class: "log-row" },
        h("div", { class: "log-q", text: `${i + 1}. ${row.q.toUpperCase()}` }),
        ...race.racers.map((r, pi) => h("div", { class: `log-a p${pi + 1}` },
          h("span", { class: "log-text", text: r.log[i].answer.toUpperCase() }),
          h("span", { class: "badge t" + r.log[i].tier, text: TIERS[r.log[i].tier].short })))))),
  );
  show("results");
}

// ---------- wiring ----------
let started = false;
function firstTouch() {
  audio.unlock();
  if (!started) {
    started = true;
    if (!save.muted) audio.musicStart();
  }
}
document.addEventListener("pointerdown", firstTouch);
document.addEventListener("keydown", firstTouch);

document.addEventListener("click", (e) => {
  const go = e.target.closest("[data-go]");
  if (go) { audio.sfx.click(); overlay(""); show(go.dataset.go); }
});
$("btn-home").addEventListener("click", () => { overlay(""); show("title"); });
$("btn-1p").addEventListener("click", () => { audio.sfx.click(); show("leagues"); });
$("btn-2p").addEventListener("click", () => { audio.sfx.click(); show("versus"); });
$("btn-garage").addEventListener("click", () => { audio.sfx.click(); show("garage"); });
$("btn-results-garage").addEventListener("click", () => { audio.sfx.click(); show("garage"); });
$("btn-how").addEventListener("click", () => { audio.sfx.click(); show("how"); });
$("btn-quit").addEventListener("click", () => { audio.sfx.deny(); overlay(""); show("title"); });
$("btn-again").addEventListener("click", () => { audio.sfx.click(); if (lastSetup) startRace(lastSetup); });
$("btn-start-2p").addEventListener("click", () => {
  audio.sfx.click();
  const clean = (id, fallback) => ($(id).value.trim().toUpperCase().slice(0, 10) || fallback);
  startRace({ mode: "versus", names: [clean("name-p1", "P1"), clean("name-p2", "P2")], cars: [versus.p1, versus.p2] });
});
$("btn-sound").addEventListener("click", () => {
  save.muted = !save.muted;
  persist();
  audio.setMuted(save.muted);
  if (save.muted) audio.musicStop();
  else { audio.unlock(); audio.musicStart(); audio.sfx.click(); }
  renderSound();
});

audio.setMuted(save.muted);
renderSound();
renderCash(false);
renderLegend();
show("title");
