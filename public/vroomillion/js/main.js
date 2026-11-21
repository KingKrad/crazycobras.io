import { CARS, CLASSES, carById, carSprite } from "./cars.js";
import {
  TIERS, ROUNDS, ANSWER_SECONDS, buildIndex, judge, metresFor, applyFenderBender, effectTier, EQUAL_CAR, CRAZY_METRES, tossWinner, roundMetres,
  pickQuestions, payout, soloPayout, exampleAnswer, deckQuestions,
  dayKey, canRace, dailyDone, dailyLeft, nextDaily, markDaily, dailyQuestions, DAILY_RACES, pickFresh, promptsLeft, makeVariants, FREE_PLAY, normalize, V2,
  DESTINATIONS, destinationFor, blockedBy, carReach, classRank, EXCLUSIVE_CAR, UPGRADES, upgradeLevel, upgradeCost, tunedCar,
} from "./logic.js";
import * as audio from "./audio.js";
import { Scene } from "./scene.js";
import { ChaseScene } from "./chase.js";
import { shareCard, saveShareCard, drawShareCard } from "./share.js";
import { prefetchDeep, deepAnswers } from "./deep.js";
import { CHANGELOG } from "./changelog.js";
import { pickRace, dailyRace, famKey, familyOf, answerSlug } from "./racepick.js";

// hand-written prompts plus the "starting with" / "ending in" / "exactly N letters" ones made from them
// The answer lists are about 2 MB, so they load in the background while the title screen is up
// instead of holding up the first screen. Races wait for them (usually long since done).
let QUESTIONS = [];
let questionsReady = false;
const buildHere = () => import("./data.js").then(({ QUESTIONS: hand }) => [...hand, ...makeVariants(hand)]);
const buildInWorker = () => new Promise((resolve, reject) => {
  const w = new Worker(new URL("./questions-worker.js", import.meta.url), { type: "module" });
  w.onmessage = (e) => { resolve(e.data); w.terminate(); };
  w.onerror = (e) => { e.preventDefault?.(); w.terminate(); reject(new Error("worker failed")); };
});
const questionsLoaded = (typeof Worker === "function" ? buildInWorker().catch(buildHere) : buildHere()).then((all) => {
  QUESTIONS = all;
  questionsReady = true;
  if (current === "leagues") renderLeagues();
  if (current === "versus") renderVersus();
  return QUESTIONS;
});

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
const fresh = () => ({
  cash: 0, owned: ["rustbucket"], car: "rustbucket", deck: "classic", muted: false,
  races: 0, wins: 0, vrooms: 0, deep: 0, best: 0, lastRunDay: null, seen: [],
  passport: {}, // destination id -> best distance there
});
// Progress is saved on this device whether or not there's an account. Three copies keep it safe:
// the main save, a backup copy on the device (a damaged save never overwrites a good one), and a copy
// on the server under an anonymous device ID, which brings it back if the browser loses its storage
// (iPhone Safari clears a site's data after 7 days without a visit).
const BACKUP_KEY = SAVE_KEY + ".backup";
const readSave = (key) => {
  try {
    const raw = JSON.parse(localStorage.getItem(key) || "null");
    return raw && typeof raw === "object" && Array.isArray(raw.owned) ? raw : null;
  } catch { return null; }
};
const tidy = (s) => {
  if (!s.passport || typeof s.passport !== "object") s.passport = {};
  if (!s.owned.includes(s.car)) s.car = s.owned[0] || "rustbucket";
  // Unlimited comes from the logged-in account on the server, never from this save.
  delete s.unlimited;
  delete s.receipt;
  return s;
};
const stored = readSave(SAVE_KEY) || readSave(BACKUP_KEY);
let save = tidy({ ...fresh(), ...(stored || {}) });
let backupTimer = 0;
const persist = () => {
  save.savedAt = Date.now();
  const text = JSON.stringify(save);
  try { localStorage.setItem(SAVE_KEY, text); localStorage.setItem(BACKUP_KEY, text); } catch { /* storage full or private mode */ }
  // the server copy, a few seconds after the last change
  clearTimeout(backupTimer);
  backupTimer = setTimeout(sendBackup, 4000);
};
function sendBackup() {
  clearTimeout(backupTimer);
  backupTimer = 0;
  try {
    fetch("/api/vroomillion/device-save", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ save }), keepalive: true }).catch(() => {});
  } catch { /* offline or no server */ }
}
// leaving the page: send a pending backup straight away
addEventListener("pagehide", () => { if (backupTimer) sendBackup(); });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && backupTimer) sendBackup(); });
// ask the browser not to clear the game's storage (Chrome and Firefox honour this)
navigator.storage?.persist?.().catch(() => {});
// nothing saved on this device: get this device's progress back from the server, if it has a copy
const restoring = stored ? Promise.resolve(false) : fetch("/api/vroomillion/device-save", { cache: "no-store" })
  .then((r) => (r.ok && (r.headers.get("content-type") || "").includes("json") ? r.json() : null))
  .then((body) => {
    if (!body?.save || !Array.isArray(body.save.owned) || readSave(SAVE_KEY)) return false;
    save = tidy({ ...fresh(), ...body.save });
    try { const t = JSON.stringify(save); localStorage.setItem(SAVE_KEY, t); localStorage.setItem(BACKUP_KEY, t); } catch { /* ignore */ }
    return true;
  })
  .catch(() => false);
if (stored) persist(); // keeps the server copy and the backup up to date from the first visit

// ---------- scene loop ----------
// Menus show a side-on banner; races use the behind-the-car road. Both draw on one canvas.
const sideScene = new Scene($("scene"));
const chaseScene = new ChaseScene($("scene"));
let scene = sideScene;
let last = performance.now();
function frame(now) {
  // the first frame's timestamp can be a hair before `last`; never step time backwards
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
  last = now;
  scene.update(dt);
  scene.draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Menus show the scene as a banner; races fill the whole window.
function fitScene() {
  if (current !== "race") {
    scene = sideScene;
    scene.resize(384, 150);
    return;
  }
  scene = chaseScene;
  const vv = window.visualViewport;
  const vw = window.innerWidth;
  const vh = vv ? vv.height : window.innerHeight;
  // Phone keyboards: the visible area shrinks, and iPhone Safari also scrolls the page up. The race is
  // pinned to the visible area (--vvtop / --vvh) so it never slides away, and while the keyboard is up
  // the road shrinks to a strip at the top so the prompt, timer and answer box all fit.
  if (vw !== fullW) { fullW = vw; fullH = 0; } // turned the phone: measure again
  fullH = Math.max(fullH, window.innerHeight, vh);
  const kb = document.activeElement === $("answer") && vh < fullH * 0.78;
  const root = document.documentElement.style;
  root.setProperty("--vvh", vh + "px");
  root.setProperty("--vvtop", (vv ? vv.offsetTop : 0) + "px");
  document.body.classList.toggle("kb", kb);
  const iw = Math.max(440, Math.min(840, Math.round(vw / 1.6))); // 16-bit: twice the old art resolution
  const k = vw / iw;
  const ih = Math.round(vh / k);
  // room for the answer bar (one compact row on the keyboard)
  const dock = Math.ceil((kb ? 74 : vw < 600 ? 150 : 128) / k);
  scene.resize(iw, ih, ih - dock - 6); // nearest car sits just above the answer bar
  requestAnimationFrame(fitCard);
}
let fullH = 0, fullW = 0; // the tallest the visible area has been at this width (no keyboard)
window.addEventListener("orientationchange", () => setTimeout(fitScene, 300));

// Keep the question card above the road so it never hides the cars.
const TOPIC = { geo: "PLACES", sports: "SPORTS", screen: "SCREEN", music: "MUSIC", food: "FOOD & DRINK", animals: "ANIMALS", everyday: "EVERYDAY", history: "HISTORY & SCIENCE" };
const topicOf = (q) => (q.deck === "car" ? "CARS" : TOPIC[q.cat] || "TRIVIA");

// "Name a country that borders France" -> lead "NAME A", subject "COUNTRY THAT BORDERS FRANCE";
// a 'starting with "M"' twist becomes its own chip.
function showQuestion(q) {
  const m = q.q.match(/^(Name (?:an?|something|someone|any)\b)\s*(.*)$/i);
  let subject = m ? m[2] : q.q;
  const twist = subject.match(/^(.*) starting with "([A-Z])"$/);
  if (twist) subject = twist[1];
  $("q-lead").textContent = m ? m[1].toUpperCase() : "";
  const qEl = $("question");
  qEl.textContent = subject.toUpperCase();
  $("q-twist").textContent = twist ? `STARTS WITH ${twist[2]}` : "";
  $("q-twist").classList.toggle("hidden", !twist);
  requestAnimationFrame(fitCard);
}

// shrink the question until it fits on two lines (three on narrow screens)
function fitQuestion() {
  const qEl = $("question");
  qEl.style.fontSize = "";
  const maxLines = window.innerWidth < 520 ? 3 : 2;
  let size = parseFloat(getComputedStyle(qEl).fontSize);
  for (let i = 0; i < 12 && size > 11; i++) {
    const lines = Math.round(qEl.scrollHeight / (size * 1.35));
    if (lines <= maxLines) break;
    size -= 1.5;
    qEl.style.fontSize = size + "px";
  }
}

function fitCard() {
  if (current !== "race") return;
  const card = $("q-card");
  const k = window.innerWidth / scene.W;
  const top = card.parentElement.getBoundingClientRect().top;
  // keyboard up: everything between the road strip and the answer box; otherwise above the nearest car
  const limit = document.body.classList.contains("kb")
    ? $("answer-zone").getBoundingClientRect().top - 6
    : scene.coverTop() * k; // roof + name tag of the nearest car
  const room = Math.max(60, Math.floor(limit - top - 6));
  card.style.maxHeight = room + "px";
  // the question never scrolls: tighten the card, then shrink the text, until it fits above the cars
  if (card.classList.contains("revealing")) return;
  card.classList.remove("tight");
  fitQuestion();
  if (card.scrollHeight <= room) return;
  card.classList.add("tight");
  const qEl = $("question");
  let size = parseFloat(getComputedStyle(qEl).fontSize);
  for (let i = 0; i < 12 && card.scrollHeight > room && size > 12; i++) {
    size -= 1;
    qEl.style.fontSize = size + "px";
  }
  // still too tall at the smallest readable size: let it overlap the car rather than cut it off
  if (card.scrollHeight > room) card.style.maxHeight = "none";
}
window.addEventListener("resize", fitScene);
window.visualViewport?.addEventListener("resize", fitScene);
window.visualViewport?.addEventListener("scroll", () => {
  if (current !== "race") return;
  unscroll();
  document.documentElement.style.setProperty("--vvtop", window.visualViewport.offsetTop + "px");
});
// the keyboard opens and closes with the answer box
// any page scroll during a race (the keyboard opening) snaps straight back
function unscroll() { if (current === "race" && (window.scrollY || document.documentElement.scrollTop)) window.scrollTo(0, 0); }
window.addEventListener("scroll", unscroll, { passive: true });
$("answer").addEventListener("focus", () => { unscroll(); fitScene(); requestAnimationFrame(() => { unscroll(); fitScene(); }); setTimeout(fitScene, 120); setTimeout(fitScene, 350); setTimeout(fitScene, 700); });
$("answer").addEventListener("blur", () => setTimeout(fitScene, 350));

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
  for (const id of ["btn-sound", "btn-sound-race"]) {
    const b = $(id);
    b.textContent = save.muted ? "SND OFF" : "SND ON";
    b.setAttribute("aria-pressed", String(!save.muted));
  }
}

// ---------- daily free run + unlimited ----------
// Daily races change at midnight UTC, the same moment for everyone (so they can share a leaderboard).
const dday = () => new Date().toISOString().slice(0, 10);
const msToUtcMidnight = () => { const n = new Date(); return Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + 1) - n.getTime(); };
function timeLeft() {
  const m = Math.ceil(msToUtcMidnight() / 60000);
  return m >= 60 ? `${Math.floor(m / 60)}H ${m % 60}M` : `${m}M`;
}

function renderDaily() {
  const box = $("daily");
  box.textContent = "";
  // admins get a shortcut to the admin screen right on the title screen (phones included)
  $("btn-admin-title")?.classList.toggle("hidden", !account?.admin);
  if (announcementText) box.append(h("div", { class: "announcement", role: "note", text: announcementText }));
  const today = dday();
  if (FREE_PLAY) {
    box.append(h("div", { class: "daily-line good", text: "★ FREE PLAY — RACE AS MUCH AS YOU LIKE" }));
  } else if (unlimitedNow()) {
    box.append(h("div", { class: "daily-line good", text: `★ UNLIMITED — ${account.email.toUpperCase()}` }));
  } else if (dailyLeft(save, today) > 0) {
    const n = dailyLeft(save, today);
    if (streakNow()) box.append(h("div", { class: "daily-line good", text: `STREAK: ${streakNow()} DAY${streakNow() === 1 ? "" : "S"} · KEEP IT GOING TODAY` }));
    box.append(h("div", { class: "daily-line good", text: `${n} DAILY RACE${n === 1 ? "" : "S"} LEFT TODAY · SAME PROMPTS FOR EVERYONE` }));
  } else {
    box.append(
      h("div", { class: "daily-line", text: DAILY_RACES === 1 ? `TODAY'S DAILY RACE IS DONE · A NEW ONE IN ${timeLeft()}` : `TODAY'S ${DAILY_RACES} DAILY RACES ARE DONE · NEW ONES IN ${timeLeft()}` }),
      h("button", { class: "btn big unlock-cta", type: "button", text: "GO UNLIMITED — $5", onclick: () => { audio.sfx.click(); openPaywall("used"); } }));
  }
}

// ---------- accounts ----------
let account = null; // { email, unlimited } from the server, or null when logged out / offline
const unlimitedNow = () => account?.unlimited === true;
const me = () => ({ ...save, unlimited: unlimitedNow() });

// Talk to the account API. Throws "offline" when there's no server (e.g. the artifact preview).
// A request that never reaches the server (a dropped connection, or a phone pausing the page while you
// switch apps) is tried once more, then reported in plain words instead of the browser's "Load failed".
const NET_ERROR = "Couldn't reach the server. Check your connection and try again.";
async function api(path, options = {}) {
  const go = () => fetch("/api/vroomillion/" + path, {
    cache: "no-store",
    ...options,
    headers: options.body ? { "content-type": "application/json" } : {},
  });
  let res;
  try { res = await go(); } catch {
    await new Promise((r) => setTimeout(r, 800));
    try { res = await go(); } catch { const e = new Error(NET_ERROR); e.network = true; throw e; }
  }
  if (!(res.headers.get("content-type") || "").includes("json")) throw new Error("offline");
  return { res, body: await res.json().catch(() => ({})) };
}

async function refreshAccount() {
  try {
    const { res, body } = await api("me");
    account = res.ok ? body : null;
    syncSeen();
    // an admin gave this player today's free races back
    if (account?.freeResetAt > (save.freeResetAt || 0)) {
      if (new Date(account.freeResetAt).toISOString().slice(0, 10) === dday()) save.daily = { day: dday(), done: {} };
      save.freeResetAt = account.freeResetAt;
      persist();
    }
  } catch {
    account = null;
    accountSeen = null;
  }
  if (current === "title") renderDaily();
  if (current === "paywall") renderPaywall();
  if (current === "account") renderAccount();
  if (current === "online" && !online) renderOnline();
}

// Shows a recovery code once, with a copy button. onDone runs after "I'VE SAVED IT".
function recoveryPanel(code, onDone, intro) {
  const msg = h("p", { class: "pay-msg", role: "status", "aria-live": "polite" });
  const codeEl = h("div", { class: "recovery-code", text: code });
  const copy = h("button", { class: "btn", type: "button", text: "COPY CODE", onclick: async () => {
    try { await navigator.clipboard.writeText(code); msg.textContent = "Copied."; } catch {
      const range = document.createRange(); range.selectNodeContents(codeEl);
      const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
      msg.textContent = "Selected: copy it with your keyboard or long-press.";
    }
  } });
  return h("div", { class: "auth-form recovery" },
    h("div", { class: "step-label", text: "SAVE YOUR RECOVERY CODE" }),
    h("p", { class: "note", text: intro || "If you ever forget your password, this code is the only way back into your account. It's shown once — screenshot it or keep it somewhere safe." }),
    codeEl, copy, msg,
    h("button", { class: "btn big", type: "button", text: "I'VE SAVED IT ▶", onclick: () => { audio.sfx.click(); onDone(); } }));
}

const authLabel = (text, input) => h("label", {}, h("span", { text }), input);
const emailInput = () => h("input", { type: "email", name: "email", autocomplete: "email", required: true, maxlength: "254", placeholder: "you@example.com", "aria-label": "Email" });
const passwordInput = (kind, placeholder) => h("input", { type: "password", name: "password", required: true, minlength: "8", maxlength: "128", autocomplete: kind, placeholder, "aria-label": "Password" });

// Sends a form to the account API and handles the shared busy / error states.
function wireForm(form, submit, msg, busyText, send, onOk) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    audio.sfx.click();
    msg.className = "pay-msg";
    msg.textContent = busyText;
    submit.disabled = true;
    try {
      const { res, body } = await send();
      if (res.ok) { audio.sfx.lock(); onOk(body); return; }
      msg.textContent = body.error || "Something went wrong. Try again.";
    } catch {
      msg.textContent = "Accounts only work on the VROOMILLION website, not in this preview.";
    }
    msg.className = "pay-msg bad";
    submit.disabled = false;
  });
}

// Cloudflare Turnstile on the sign-up form, when the server has it switched on (/api/vroomillion/config).
let botCheckKey;
async function turnstileKey() {
  if (botCheckKey === undefined) {
    try { botCheckKey = (await api("config")).body.turnstileSiteKey || null; } catch { botCheckKey = null; }
  }
  return botCheckKey;
}
let turnstileLoad;
function loadTurnstile() {
  turnstileLoad ||= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => resolve(window.turnstile);
    s.onerror = () => { turnstileLoad = null; reject(new Error("bot check didn't load")); };
    document.head.append(s);
  });
  return turnstileLoad;
}
// Returns { el, take() }: el stays empty and take() gives "" when the check is off. A token works
// once, so take() also resets the widget for the next try.
function botCheck() {
  const el = h("div", { class: "bot-check" });
  let token = "";
  let ts = null;
  let id = null;
  turnstileKey().then(async (key) => {
    if (!key) return;
    ts = await loadTurnstile();
    id = ts.render(el, { sitekey: key, theme: "dark", callback: (t) => { token = t; }, "expired-callback": () => { token = ""; } });
  }).catch(() => { el.textContent = "The robot check couldn't load. Reload the page to try again."; });
  const take = () => {
    const t = token;
    token = "";
    if (ts && id != null) ts.reset(id);
    return t;
  };
  return { el, take };
}

// Create-account / log-in / forgot-password form. mode is "signup", "login" or "reset".
function authForm(mode, onDone) {
  let form;
  const swap = (next) => form.replaceWith(authForm(next, onDone));
  const msg = h("p", { class: "pay-msg", role: "status", "aria-live": "polite" });
  const email = emailInput();
  if (mode === "reset") {
    const code = h("input", { type: "text", name: "code", required: true, maxlength: "40", autocomplete: "off", autocapitalize: "characters", spellcheck: "false", placeholder: "XXXXX-XXXXX-XXXXX-XXXXX", "aria-label": "Recovery code" });
    const password = passwordInput("new-password", "10+ characters");
    const submit = h("button", { class: "btn big", type: "submit", text: "SET NEW PASSWORD" });
    form = h("form", { class: "auth-form", novalidate: true },
      h("div", { class: "step-label", text: "FORGOT YOUR PASSWORD?" }),
      h("p", { class: "note", text: "Use the recovery code you saved when you made your account." }),
      authLabel("EMAIL", email), authLabel("RECOVERY CODE", code), authLabel("NEW PASSWORD", password),
      submit, msg,
      h("p", { class: "note" }, "Lost the code too? If you bought Unlimited, see ", h("a", { href: "terms.html#contact", text: "Getting help" }), "."),
      h("button", { class: "link", type: "button", text: "Back to log in", onclick: () => swap("login") }));
    wireForm(form, submit, msg, "Resetting…",
      () => api("reset-password", { method: "POST", body: JSON.stringify({ email: email.value, code: code.value, password: password.value }) }),
      (body) => {
        account = { email: body.email, unlimited: body.unlimited }; syncSeen();
        form.replaceWith(recoveryPanel(body.recoveryCode, onDone, "Password changed and other devices signed out. Your old recovery code no longer works — here's your new one."));
      });
    return form;
  }
  const signup = mode === "signup";
  const password = passwordInput(signup ? "new-password" : "current-password", signup ? "10+ characters" : "password");
  const submit = h("button", { class: "btn big", type: "submit", text: signup ? "CREATE ACCOUNT" : "LOG IN" });
  const bots = signup ? botCheck() : null;
  form = h("form", { class: "auth-form", novalidate: true },
    authLabel("EMAIL", email), authLabel("PASSWORD", password),
    bots && bots.el, submit, msg,
    signup ? h("p", { class: "note" }, "Accounts are for players 13 and over. Your email is used only for your account. ",
      h("a", { href: "terms.html", text: "Terms" }), " · ", h("a", { href: "privacy.html", text: "Privacy" })) : null,
    signup ? null : h("button", { class: "link", type: "button", text: "Forgot password?", onclick: () => swap("reset") }),
    h("button", { class: "link", type: "button", text: signup ? "Already have an account? Log in" : "New here? Create an account",
      onclick: () => swap(signup ? "login" : "signup") }));
  wireForm(form, submit, msg, signup ? "Creating your account…" : "Logging in…",
    () => api(mode, { method: "POST", body: JSON.stringify({ email: email.value, password: password.value, ...(bots ? { turnstile: bots.take() } : {}) }) }),
    (body) => {
      account = { email: body.email, unlimited: body.unlimited }; syncSeen();
      password.value = "";
      if (body.recoveryCode) form.replaceWith(recoveryPanel(body.recoveryCode, onDone));
      else onDone();
    });
  return form;
}

// Make a new recovery code (the old one stops working). Needs the password.
function newCodeForm() {
  const password = passwordInput("current-password", "your password");
  const msg = h("p", { class: "pay-msg", role: "status", "aria-live": "polite" });
  const submit = h("button", { class: "btn", type: "submit", text: "MAKE A NEW CODE" });
  const form = h("form", { class: "auth-form hidden", novalidate: true },
    h("p", { class: "note", text: "Lost your recovery code? Make a new one. The old code stops working." }),
    authLabel("PASSWORD", password), submit, msg);
  wireForm(form, submit, msg, "Making a new code…",
    () => api("recovery-code", { method: "POST", body: JSON.stringify({ password: password.value }) }),
    (body) => form.replaceWith(recoveryPanel(body.recoveryCode, () => renderAccount(), "Here's your new recovery code. The old one no longer works.")));
  const open = h("button", { class: "link", type: "button", text: "New recovery code…", onclick: () => { open.remove(); form.classList.remove("hidden"); password.focus(); } });
  return h("div", { class: "danger-zone" }, open, form);
}

async function logOut() {
  audio.sfx.click();
  try { await api("logout", { method: "POST" }); } catch { /* offline: nothing to end */ }
  account = null;
  accountSeen = null;
  show("title");
}

let paywallReason = "used"; // "used" (no free races left) or "mode" (a mode free players don't get)
function openPaywall(reason) { paywallReason = reason; show("paywall"); }
function renderPaywall() {
  $("pay-lead").textContent = paywallReason === "mode"
    ? "2P VERSUS, GEARHEAD and HARD MODE are part of Unlimited."
    : dailyLeft(save, dday()) > 0
      ? "Unlimited races on top of the daily two, in every mode."
      : (DAILY_RACES === 1 ? `You've played today's daily race. A new one in ${timeLeft()}.` : `You've played today's ${DAILY_RACES} daily races. New ones in ${timeLeft()}.`);
  $("pay-msg").textContent = "";
  const step = $("pay-step");
  step.textContent = "";
  if (!account) {
    step.append(h("div", { class: "step-label", text: "STEP 1 OF 2 · CREATE YOUR ACCOUNT" }), authForm("signup", renderPaywall));
  } else if (account.unlimited) {
    step.append(h("div", { class: "daily-line good", text: `★ ${account.email.toUpperCase()} HAS UNLIMITED` }),
      h("button", { class: "btn big", type: "button", text: "RACE ▶", onclick: () => { audio.sfx.click(); show("leagues"); } }));
  } else {
    step.append(
      h("div", { class: "step-label", text: "STEP 2 OF 2 · PAY" }),
      h("div", { class: "signed-in", text: `LOGGED IN AS ${account.email.toUpperCase()}` }),
      h("label", { class: "agree" },
        h("input", { type: "checkbox", id: "agree-no-refunds", onchange: (e) => { $("btn-buy").disabled = !e.target.checked; } }),
        h("span", {}, "I understand Unlimited starts right away and is non-refundable. I agree to the ", h("a", { href: "terms.html", text: "Terms" }), ".")),
      h("button", { class: "btn big", id: "btn-buy", type: "button", disabled: true, text: "UNLOCK UNLIMITED — $5", onclick: () => { audio.sfx.click(); buyUnlimited(); } }),
      h("button", { class: "link", type: "button", text: "Not you? Log out", onclick: logOut }));
  }
}

function renderAccount() {
  const box = $("account-box");
  box.textContent = "";
  if (!account) {
    box.append(h("p", { class: "note", text: "Bought Unlimited? Log in to use it on this device." }), authForm("login", () => show("title")));
    return;
  }
  box.append(...[
    h("div", { class: "signed-in", text: account.email.toUpperCase() }),
    h("div", { class: "daily-line" + (account.unlimited ? " good" : ""), text: account.unlimited ? (account.admin ? "★ ADMIN · UNLIMITED" : "★ UNLIMITED") : (DAILY_RACES === 1 ? "FREE PLAYER — 1 DAILY RACE A DAY" : `FREE PLAYER — ${DAILY_RACES} DAILY RACES A DAY`) }),
    nicknameForm(),
    account.admin ? h("button", { class: "btn big", type: "button", text: "ADMIN", onclick: () => { audio.sfx.click(); show("admin"); } }) : null,
    account.unlimited || FREE_PLAY ? null : h("button", { class: "btn big unlock-cta", type: "button", text: "GO UNLIMITED — $5", onclick: () => { audio.sfx.click(); openPaywall("used"); } }),
    h("button", { class: "btn", type: "button", text: "LOG OUT", onclick: logOut }),
    newCodeForm(),
    deleteAccountForm(),
  ].filter(Boolean));
}

// ---------- admin (accounts in the ADMIN_EMAILS secret) ----------
async function adminCall(body) {
  const { res, body: out } = await api("admin", { method: "POST", body: JSON.stringify(body) });
  if (!res.ok) throw new Error(out.error || "Something went wrong.");
  return out;
}

// ---------- ONLINE 1V1: race a friend, each on your own device ----------
// The host (logged in, Unlimited) makes a room and shares its code or link; the friend joins with a name.
// Both games load the same seven prompts, count down together from the server's start time, and after
// each round swap results through /api/vroomillion/online (polling, about once a second while waiting).
let online = null; // { code, token, seat, host: bool, deck, poll }
const onlineCall = async (body) => {
  const { res, body: out } = await api("online", { method: "POST", body: JSON.stringify(body) });
  if (!res.ok) { const e = new Error(out.error || "Something went wrong."); e.status = res.status; throw e; }
  return out;
};
const inviteLink = (code) => `${location.origin}/vroomillion/?race=${code}`;
const stopPoll = () => { if (online?.poll) { clearTimeout(online.poll); online.poll = 0; } };
// a race link (vroomillion.com/vroomillion/?race=CODE) opens straight onto the join screen
const linkCode = (new URLSearchParams(location.search).get("race") || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);

function renderOnline() {
  const box = $("online-box");
  box.textContent = "";
  if (online?.code) return onlineLobby(box);
  stopPoll();
  const nameIn = (v) => h("input", { type: "text", maxlength: "16", value: v, placeholder: "your name", "aria-label": "Your name", autocomplete: "nickname" });
  const myName = account?.nickname && !/^RACER /.test(account.nickname) ? account.nickname : (save.onlineName || "");
  // join
  const code = h("input", { type: "text", maxlength: "6", value: linkCode, placeholder: "CODE", "aria-label": "Race code", autocomplete: "off", autocapitalize: "characters", class: "code-in" });
  const jName = nameIn(myName);
  const jMsg = h("p", { class: "pay-msg", role: "status", "aria-live": "polite" });
  const join = h("form", { class: "online-card" }, h("div", { class: "step-label", text: "JOIN A FRIEND'S RACE" }),
    h("p", { class: "note", text: "Got a code or link from a friend? Free, no account needed." }), code, jName,
    h("button", { class: "btn big", type: "submit", text: "JOIN RACE" }), jMsg);
  join.addEventListener("submit", async (e) => {
    e.preventDefault(); audio.sfx.click(); jMsg.textContent = "Joining…";
    save.onlineName = jName.value.trim().slice(0, 16); persist();
    const car = tuned(carById(save.car));
    try {
      const out = await onlineCall({ action: "join", code: code.value.trim().toUpperCase(), name: jName.value || "RACER", car: car.id, power: car.power, nitro: car.nitro, ...(V2 ? { seen: seenList() } : {}) });
      online = { code: code.value.trim().toUpperCase(), token: out.token, seat: 1, host: false };
      renderOnline();
    } catch (err) { jMsg.textContent = err.message === "offline" ? "Online races work on the VROOMILLION website." : err.message; }
  });
  // create
  const cMsg = h("p", { class: "pay-msg", role: "status", "aria-live": "polite" });
  const create = h("div", { class: "online-card" }, h("div", { class: "step-label", text: "CREATE A RACE" }));
  if (!account) {
    create.append(h("p", { class: "note", text: "Log in with Unlimited to create a race. Your friend joins free." }),
      h("button", { class: "btn", type: "button", text: "LOG IN", onclick: () => { audio.sfx.click(); show("account"); } }));
  } else if (!unlimitedNow()) {
    create.append(h("p", { class: "note", text: "Creating online races is part of Unlimited. Your friends join free." }),
      h("button", { class: "btn big unlock-cta", type: "button", text: "GO UNLIMITED — $5", onclick: () => { audio.sfx.click(); openPaywall("mode"); } }));
  } else {
    const cName = nameIn(myName || "YOU");
    const modes = h("div", { class: "modes" });
    let deck = ["classic", "car", "hard"].includes(save.onlineDeck) ? save.onlineDeck : "classic";
    const drawModes = () => { modes.textContent = ""; for (const [id, label] of [["classic", "CLASSIC"], ["car", "GEARHEAD"], ["hard", "HARD MODE"]]) modes.append(h("button", { class: `mode mode-${id}`, type: "button", "aria-pressed": String(deck === id), onclick: () => { deck = id; drawModes(); } }, h("span", { class: "mode-name", text: label }))); };
    drawModes();
    const go = h("button", { class: "btn big", type: "button", text: "CREATE RACE", onclick: async () => {
      audio.sfx.click(); cMsg.textContent = "Making your race…";
      save.onlineName = cName.value.trim().slice(0, 16); save.onlineDeck = deck; persist();
      await questionsLoaded;
      // the new prompt system picks at START, once the friend's history is in
      const prompts = V2 ? [] : pickFresh(deckQuestions(QUESTIONS, deck), [], ROUNDS, Math.random, { flat: deck === "car" }).map((q) => q.q);
      const car = tuned(carById(save.car));
      try {
        const out = await onlineCall({ action: "create", deck, name: cName.value || "YOU", car: car.id, power: car.power, nitro: car.nitro, prompts, crazy: !!save.crazy, equalCars: !!save.equalCars });
        online = { code: out.code, token: out.token, seat: 0, host: true };
          renderOnline();
      } catch (err) { cMsg.textContent = err.message === "offline" ? "Online races work on the VROOMILLION website." : err.message; }
    } });
    create.append(h("p", { class: "note", text: "Pick the prompts, then send your friend the code or link." }), cName, modes, ruleToggles(true), go, cMsg);
  }
  box.append(...(linkCode ? [join, create] : [create, join]),
    h("p", { class: "note", text: `You race in your ${carById(save.car).name}. Same seven prompts for both of you; rarer answers drive further.` }));
  if (linkCode) jName.focus();
}

function onlineLobby(box) {
  const me = online;
  const status = h("p", { class: "note", role: "status", "aria-live": "polite", text: "Connecting…" });
  const players = h("div", { class: "online-players" });
  const actions = h("div", { class: "admin-actions row" });
  const leave = h("button", { class: "link", type: "button", text: "Leave this race", onclick: () => { stopPoll(); online = null; renderOnline(); } });
  if (me.host) {
    const link = inviteLink(me.code);
    const msg = h("span", { class: "note" });
    box.append(h("div", { class: "online-card" },
      h("div", { class: "step-label", text: "SEND THIS TO YOUR FRIEND" }),
      h("div", { class: "race-code", text: me.code }),
      h("div", { class: "note invite-link", text: link }),
      h("div", { class: "admin-actions row" },
        h("button", { class: "btn small", type: "button", text: "COPY LINK", onclick: async () => { try { await navigator.clipboard.writeText(link); msg.textContent = "Copied!"; } catch { msg.textContent = "Select the link above to copy it."; } } }),
        navigator.share ? h("button", { class: "btn small", type: "button", text: "SHARE", onclick: () => navigator.share({ text: `Race me in VROOMILLION! Code ${me.code}`, url: link }).catch(() => {}) }) : null,
        msg)));
  } else {
    box.append(h("div", { class: "online-card" }, h("div", { class: "step-label", text: `RACE ${me.code}` })));
  }
  box.append(players, status, actions, leave);
  let started = false;
  const tick = async () => {
    if (current !== "online" || online !== me || started) return;
    let st;
    try { st = await onlineCall({ action: "state", code: me.code, token: me.token }); } catch (err) {
      // the room is gone or not ours: stop. Anything else (a dropped connection, a busy server): keep trying.
      if (err.status === 404 || err.status === 403) { status.textContent = err.message; online = null; return; }
      status.textContent = "Connection lost. Reconnecting…";
      me.poll = setTimeout(tick, 2500);
      return;
    }
    me.deck = st.deck;
    players.textContent = "";
    st.players.forEach((p, i) => players.append(h("div", { class: "online-player p" + (i + 1) },
      h("span", { class: "hud-name", text: (p.joined ? p.name : "WAITING…") + (i === me.seat ? " (YOU)" : "") }),
      h("span", { class: "note", text: p.joined ? carById(p.car).name : "" }))));
    actions.textContent = "";
    if (st.status === "racing" && st.startAt) { started = true; return onlineBegin(st); }
    if (!st.players[1].joined) status.textContent = `Waiting for your friend to join · ${modeName(st.deck)}`;
    else if (me.host) {
      status.textContent = `${st.players[1].name} is here! Start when you're both ready.`;
      actions.append(h("button", { class: "btn big", type: "button", text: "START RACE", onclick: async (e) => {
        e.target.disabled = true; audio.sfx.click();
        try {
          if (V2) await questionsLoaded;
          const prompts = V2 && !st.prompts.length ? v2OnlinePrompts(st.deck, st.guestSeen || []) : undefined;
          const s2 = await onlineCall({ action: "start", code: me.code, token: me.token, prompts }); started = true; onlineBegin(s2);
        } catch (err) { status.textContent = err.message; e.target.disabled = false; }
      } }));
    } else status.textContent = `Waiting for ${st.players[0].name} to start · ${modeName(st.deck)}`;
    me.poll = setTimeout(tick, 1500);
  };
  tick();
}

// Both games count down to the server's start time, then race the same prompts.
async function onlineBegin(st) {
  stopPoll();
  const o = online;
  online = null; // the race has the room now; the online screen starts fresh next time
  await questionsLoaded;
  if (V2) await Promise.race([loadAnswers(st.prompts), new Promise((r) => setTimeout(r, 6000))]);
  const byText = { get: (t) => getQ(t) };
  // a prompt this copy of the game doesn't have (an older version): race it on the live check alone
  const questions = st.prompts.map((t) => byText.get(t) || { q: t, a: [[], [], [], [], []], cat: "everyday" });
  const offset = st.now - Date.now(); // server clock minus ours
  const wait = st.startAt - offset - Date.now() - 2100; // the 3-2-1 takes about 2.1 s
  const go = () => startRace({
    mode: "versus", online: { code: o.code, token: o.token, seat: o.seat, deck: st.deck, players: st.players }, crazy: !!st.crazy, equal: !!st.equalCars,
    questions, names: st.players.map((p, i) => (i === o.seat ? "YOU" : (p.name || "FRIEND").toUpperCase())), cars: st.players.map((p) => p.car || "rustbucket"),
  });
  overlay(wait > 600 ? "GET READY!" : "", "small");
  setTimeout(go, Math.max(0, wait));
}

// ---------- rematch ----------
// After an online race both results screens show REMATCH. The host's makes a new room (fresh prompts,
// same mode) linked to the old one; the friend's asks for one and joins the new room as soon as it
// exists. Either way both land in the new room's lobby, where the host taps START as usual.
let rematch = null; // { code, token, seat, deck, name, friend, prompts, asked, ask, next, poll }
function drawRematch() {
  const b = $("btn-redo"), r = rematch;
  if (!r) return;
  b.disabled = false;
  if (r.seat === 0) b.textContent = r.ask ? `REMATCH — ${r.friend} WANTS ONE!` : "REMATCH";
  else if (r.next) b.textContent = `JOIN ${r.friend}'S REMATCH`;
  else if (r.asked) { b.textContent = `WAITING FOR ${r.friend}…`; b.disabled = true; }
  else b.textContent = "ASK FOR A REMATCH";
}
function rematchPoll(r) {
  if (rematch !== r || current !== "results") return;
  onlineCall({ action: "state", code: r.code, token: r.token }).then((st) => {
    if (rematch !== r) return;
    r.ask = st.rematchAsk; r.next = st.next;
    if (r.seat === 1 && r.asked && r.next) return rematchJoin(r);
    drawRematch();
  }).catch(() => {}).finally(() => { if (rematch === r && current === "results") r.poll = setTimeout(() => rematchPoll(r), 2000); });
}
async function rematchJoin(r) {
  const car = tuned(carById(save.car));
  try {
    const out = await onlineCall({ action: "join", code: r.next, name: r.name, car: car.id, power: car.power, nitro: car.nitro, ...(V2 ? { seen: seenList() } : {}) });
    rematch = null; clearTimeout(r.poll);
    online = { code: r.next, token: out.token, seat: 1, host: false };
    show("online");
  } catch (err) { overlay(err.message, "small"); r.asked = false; r.next = null; drawRematch(); }
}
async function rematchGo() {
  const r = rematch;
  if (!r) return;
  audio.sfx.click();
  if (r.seat === 1) {
    if (r.next) return rematchJoin(r);
    r.asked = true; drawRematch();
    onlineCall({ action: "rematch", code: r.code, token: r.token }).then((out) => { if (out.next && rematch === r) { r.next = out.next; rematchJoin(r); } }).catch(() => {});
    return;
  }
  $("btn-redo").disabled = true; $("btn-redo").textContent = "MAKING REMATCH…";
  await questionsLoaded;
  const prompts = V2 ? [] : pickFresh(deckQuestions(QUESTIONS, r.deck), r.prompts, ROUNDS, Math.random, { flat: r.deck === "car" }).map((q) => q.q);
  const car = tuned(carById(save.car));
  try {
    const out = await onlineCall({ action: "create", deck: r.deck, name: r.name, car: car.id, power: car.power, nitro: car.nitro, prompts, from: r.code, fromToken: r.token, crazy: !!r.crazy, equalCars: !!r.equal });
    rematch = null; clearTimeout(r.poll);
    online = { code: out.code, token: out.token, seat: 0, host: true };
    show("online");
  } catch (err) { overlay(err.message, "small"); drawRematch(); }
}

// my result for a round (sent once; retried a couple of times if the network blips)
function onlineSend(round, res, nitro, tries = 0) {
  const o = race.online;
  onlineCall({ action: "answer", code: o.code, token: o.token, round, tier: res.tier, answer: res.display || "", nitro: !!nitro })
    .catch(() => { if (tries < 3) setTimeout(() => onlineSend(round, res, nitro, tries + 1), 1000); });
}

// wait for my friend's result for this round; a friend who's gone quiet for long counts as stalled
function onlineOpponent(round, token) {
  const o = race.online;
  const opp = 1 - o.seat;
  const r = race.racers[opp];
  const give = ANSWER_SECONDS * 1000 + 20000;
  const t0 = Date.now();
  return new Promise((resolve) => {
    const done = (res) => { overlay(""); resolve(res); };
    const tick = async () => {
      if (token !== raceToken) return done({ tier: 0, display: "", key: "" });
      try {
        const st = await onlineCall({ action: "state", code: o.code, token: o.token });
        const hit = st.results.find((x) => x.seat === opp && x.round === round);
        if (hit) {
          if (hit.nitro && r.nitro > 0) { r.useNitro = true; r.nitro -= 1; } else r.useNitro = false;
          return done({ tier: hit.tier, display: hit.answer || "", key: normalize(hit.answer || "") });
        }
      } catch { /* keep trying */ }
      if (Date.now() - t0 > give) { r.useNitro = false; return done({ tier: 0, display: "", key: "" }); }
      overlay(`WAITING FOR ${r.name}…`, "small");
      setTimeout(tick, 1200);
    };
    tick();
  });
}

// ---------- anonymous round stats, answer reports, announcement ----------
// After each race: which prompts were played, how often people stall, which accepted answers were given.
// No player ID goes with it, and a stalled (unaccepted) answer's text is never sent.
function sendRoundStats() {
  const rounds = race.racers.flatMap((r) => r.log.map((l) => ({ prompt: l.q, tier: l.tier, ...(l.tier > 0 ? { answer: l.answer.toLowerCase().slice(0, 40) } : {}) })));
  if (rounds.length) api("round-stats", { method: "POST", body: JSON.stringify({ rounds: rounds.slice(0, 7) }) }).catch(() => {});
  if (rounds.length > 7) api("round-stats", { method: "POST", body: JSON.stringify({ rounds: rounds.slice(7, 14) }) }).catch(() => {});
}

// "REPORT" beside each answer on the results screen: tell us a tier or answer is wrong.
function reportLink(prompt, entry) {
  const btn = h("button", { class: "link report-link", type: "button", text: "REPORT", "aria-label": `Report the answer ${entry.answer} for ${prompt}` });
  btn.addEventListener("click", () => {
    audio.sfx.click();
    const row = btn.closest(".log-row");
    if (row.querySelector(".report-form")) return;
    const reasons = [["too-common", "SHOULD BE RARER"], ["too-rare", "SHOULD BE MORE COMMON"], ...(entry.tier === 0 ? [["should-count", "SHOULD HAVE COUNTED"]] : [["should-not-count", "SHOULDN'T COUNT"]]), ["other", "SOMETHING ELSE"]]
      .filter(([r]) => entry.tier > 0 || !["too-common", "too-rare"].includes(r));
    const pick = h("select", { "aria-label": "What's wrong" }, ...reasons.map(([v, t]) => h("option", { value: v, text: t })));
    const note = h("input", { type: "text", maxlength: "200", placeholder: "optional: tell us more", "aria-label": "More detail" });
    const msg = h("span", { class: "note" });
    const form = h("form", { class: "report-form" }, h("span", { class: "note", text: `"${entry.answer}" →` }), pick, note, h("button", { class: "btn small", type: "submit", text: "SEND" }), msg);
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      msg.textContent = "Sending…";
      try {
        const { res, body } = await api("report", { method: "POST", body: JSON.stringify({ prompt, answer: entry.answer, tier: entry.tier, reason: pick.value, note: note.value }) });
        if (!res.ok) throw new Error(body.error || "Couldn't send that.");
        form.replaceWith(h("p", { class: "note good", text: "Thanks — we'll take a look." }));
      } catch (err) { msg.textContent = err.message === "offline" ? "Reports work on the VROOMILLION website." : err.message; }
    });
    row.append(form);
    pick.focus();
  });
  return btn;
}

// The announcement set on the admin screen, shown at the top of the title screen.
let announcementText = null;
api("config").then(({ body }) => { announcementText = body.announcement || null; if (current === "title") renderDaily(); }).catch(() => {});

// ---------- the admin screen: Overview, Players, Daily, Prompts, Reports, Settings ----------
const ADMIN_TABS = [["overview", "OVERVIEW"], ["players", "PLAYERS"], ["daily", "DAILY"], ["prompts", "PROMPTS"], ["reports", "REPORTS"], ["settings", "SETTINGS"]];
let adminTab = "overview";
const fmtDay = (d) => d.slice(5).replace("-", "/");
const fmtDate = (t) => (t ? new Date(t).toISOString().slice(0, 10) : "—");
const fmtM = (m) => Math.round(m).toLocaleString("en-US") + " M";
const tile = (label, value, sub) => h("div", { class: "admin-tile" }, h("div", { class: "admin-n", text: String(value) }), h("div", { class: "note", text: label }), sub ? h("div", { class: "admin-sub", text: sub }) : null);

// A one-series bar chart of daily values (oldest left). Hover or tap a bar for its exact value.
function barChart(title, rows, fmt = (n) => String(n)) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  const total = rows.reduce((t, r) => t + r.n, 0);
  const bars = h("div", { class: "chart-bars", role: "img", "aria-label": `${title}: ${rows.map((r) => `${r.day} ${fmt(r.n)}`).join(", ")}` },
    ...rows.map((r) => {
      const bar = h("div", { class: "chart-bar", title: `${r.day}: ${fmt(r.n)}`, tabindex: "0" });
      bar.style.height = Math.max(r.n ? 4 : 1, Math.round((r.n / max) * 100)) + "%";
      return h("div", { class: "chart-col" }, bar);
    }));
  const readout = h("div", { class: "chart-readout", text: `TOTAL ${fmt(total)} · PEAK ${fmt(max === 1 && !rows.some((r) => r.n) ? 0 : max)}` });
  bars.addEventListener("pointerover", (e) => { if (e.target.classList.contains("chart-bar")) readout.textContent = e.target.title.toUpperCase(); });
  bars.addEventListener("focusin", (e) => { if (e.target.classList.contains("chart-bar")) readout.textContent = e.target.title.toUpperCase(); });
  bars.addEventListener("pointerleave", () => { readout.textContent = `TOTAL ${fmt(total)} · PEAK ${fmt(max)}`; });
  return h("div", { class: "chart" },
    h("div", { class: "step-label", text: title }), bars,
    h("div", { class: "chart-axis" }, h("span", { text: fmtDay(rows[0].day) }), h("span", { text: fmtDay(rows.at(-1).day) })),
    readout);
}

function renderAdmin() {
  const box = $("admin-box");
  box.textContent = "";
  if (!account?.admin) { box.append(h("p", { class: "note", text: "Log in with an admin account." })); return; }
  const body = h("div", { class: "admin-body" });
  const tabs = h("div", { class: "admin-tabs", role: "tablist" }, ...ADMIN_TABS.map(([id, label]) =>
    h("button", { class: "admin-tab" + (adminTab === id ? " on" : ""), type: "button", role: "tab", "aria-selected": String(adminTab === id), text: label,
      onclick: () => { audio.sfx.click(); adminTab = id; renderAdmin(); } })));
  box.append(tabs, body);
  const fail = (e) => { body.textContent = ""; body.append(h("p", { class: "pay-msg bad", text: e.message === "offline" ? "The admin screen needs the live site." : e.message })); };
  body.append(h("p", { class: "note", text: "Loading…" }));
  ({ overview: adminOverview, players: adminPlayers, daily: adminDaily, prompts: adminPrompts, reports: adminReports, settings: adminSettings })[adminTab](body).catch(fail);
}

async function adminOverview(body) {
  const o = await adminCall({ action: "overview" });
  body.textContent = "";
  const money = (n) => "$" + n.toLocaleString("en-US");
  body.append(
    h("div", { class: "step-label", text: "MONEY" }),
    h("div", { class: "admin-tiles" }, tile("TODAY", money(o.money.today)), tile("LAST 7 DAYS", money(o.money.week)), tile("ALL TIME", money(o.money.allTime), `${o.money.sales} SALE${o.money.sales === 1 ? "" : "S"} × $${o.money.price}`), tile("UNLIMITED", o.unlimited, "INCL. GIFTED")),
    barChart("REVENUE PER DAY (14 DAYS)", o.money.perDay, money),
    h("div", { class: "step-label", text: "PLAYERS" }),
    h("div", { class: "admin-tiles" }, tile("ACCOUNTS", o.users), tile("NEW (24H)", o.newToday), tile("ACTIVE TODAY", o.activity.devicesToday, `${o.activity.accountsToday} WITH ACCOUNTS`), tile("ACTIVE 7 DAYS", o.activity.devicesWeek, `${o.activity.accountsWeek} WITH ACCOUNTS`)),
    h("p", { class: "note", text: `Active = devices that played (with or without an account). ${o.activity.devicesAll.toLocaleString("en-US")} devices have played in all.` }),
    barChart("NEW ACCOUNTS PER DAY (14 DAYS)", o.signups),
    barChart("RACES STARTED PER DAY (14 DAYS)", [...o.races].reverse().map((r) => ({ day: r.day, n: r.total }))),
    h("table", { class: "admin-races" },
      h("tr", {}, ...["DAY", "1P", "GEAR", "HARD", "2P", "ALL"].map((t) => h("th", { text: t }))),
      ...o.races.slice(0, 7).map((r) => h("tr", {}, ...[fmtDay(r.day), r["solo-classic"], r["solo-car"], r["solo-hard"], r.versus, r.total].map((v) => h("td", { text: String(v) }))))));
}

async function adminPlayers(body, q = "", offset = 0) {
  const list = await adminCall({ action: "players", q, offset });
  body.textContent = "";
  const search = h("input", { type: "search", value: q, placeholder: "search email or nickname", "aria-label": "Search players", autocomplete: "off" });
  const form = h("form", { class: "admin-search" }, search, h("button", { class: "btn small", type: "submit", text: "SEARCH" }));
  form.addEventListener("submit", (e) => { e.preventDefault(); adminPlayers(body, search.value.trim(), 0).catch((err) => body.append(h("p", { class: "pay-msg bad", text: err.message }))); });
  const detail = h("div", { class: "admin-player" });
  const rows = list.players.map((p) => h("button", { class: "admin-row", type: "button", onclick: () => showPlayer(p) },
    h("span", { class: "admin-row-main", text: p.email }),
    h("span", { class: "admin-row-tags", text: [p.admin ? "ADMIN" : null, p.paid ? "PAID" : p.unlimited ? "UNLIMITED" : null, p.streak ? `STREAK ${p.streak}` : null].filter(Boolean).join(" · ") || "FREE" }),
    h("span", { class: "admin-row-sub", text: `joined ${fmtDate(p.createdAt)} · seen ${fmtDate(p.lastSeen)}` })));
  const more = h("div", { class: "admin-pager" },
    offset > 0 ? h("button", { class: "btn small", type: "button", text: "◀ NEWER", onclick: () => adminPlayers(body, q, Math.max(0, offset - 25)) }) : null,
    h("span", { class: "note", text: `${list.total ? offset + 1 : 0}–${offset + list.players.length} OF ${list.total}` }),
    offset + 25 < list.total ? h("button", { class: "btn small", type: "button", text: "OLDER ▶", onclick: () => adminPlayers(body, q, offset + 25) }) : null);
  body.append(form, detail, h("div", { class: "admin-list" }, ...(rows.length ? rows : [h("p", { class: "note", text: "No players found." })])), more);

  function showPlayer(p) {
    detail.textContent = "";
    const msg = h("p", { class: "pay-msg", role: "status", "aria-live": "polite" });
    const act = async (req, done, after) => {
      msg.textContent = "Working…";
      try { const out = await adminCall(req); msg.textContent = done; if (after) after(out); } catch (e) { msg.textContent = e.message; }
    };
    const confirmBox = h("input", { type: "email", placeholder: "type their email to confirm", "aria-label": "Type the email to confirm deleting", autocomplete: "off" });
    detail.append(
      h("div", { class: "signed-in", text: p.email.toUpperCase() }),
      h("div", { class: "note", text: [p.admin ? "ADMIN" : null, p.unlimited ? "UNLIMITED" : "FREE PLAYER", p.paid ? `PAID ${fmtDate(p.paidAt)}` : null].filter(Boolean).join(" · ") }),
      h("div", { class: "note", text: `NAME ${p.nickname || "(default)"} · STREAK ${p.streak} · RACES ${p.races} · JOINED ${fmtDate(p.createdAt)} · LAST SEEN ${fmtDate(p.lastSeen)}` }),
      h("div", { class: "admin-actions" },
        h("button", { class: "btn small", type: "button", text: p.unlimited ? "REMOVE UNLIMITED" : "GIVE UNLIMITED", onclick: () => act({ action: "set-unlimited", email: p.email, unlimited: !p.unlimited }, p.unlimited ? "Unlimited removed." : "Unlimited given.", (np) => showPlayer({ ...p, ...np })) }),
        h("button", { class: "btn small", type: "button", text: "GIVE TODAY'S DAILY RACES BACK", onclick: () => act({ action: "reset-free", email: p.email }, "Done. Their daily races come back next time they open the game while logged in.") }),
        p.nickname ? h("button", { class: "btn small", type: "button", text: "RESET NICKNAME", onclick: () => act({ action: "reset-nickname", email: p.email }, "Nickname reset to the default.", (np) => showPlayer({ ...p, ...np })) }) : null),
      p.admin ? null : h("details", { class: "danger-zone" }, h("summary", { text: "Delete this account…" }),
        h("p", { class: "note", text: "Deletes the account, its sessions and its leaderboard scores. This can't be undone." }),
        confirmBox,
        h("button", { class: "btn small danger", type: "button", text: "DELETE ACCOUNT", onclick: () => act({ action: "delete-player", email: p.email, confirm: confirmBox.value }, "Account deleted.", () => adminPlayers(body, q, offset)) })),
      msg);
    detail.scrollIntoView({ block: "nearest" });
  }
}

async function adminDaily(body, d) {
  const out = await adminCall({ action: "daily", ...(d ? { day: d } : {}) });
  body.textContent = "";
  const prev = new Date(Date.parse(out.day + "T00:00:00Z") - 86400000).toISOString().slice(0, 10);
  const next = new Date(Date.parse(out.day + "T00:00:00Z") + 86400000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  body.append(h("div", { class: "admin-pager" },
    h("button", { class: "btn small", type: "button", text: "◀ DAY", onclick: () => adminDaily(body, prev) }),
    h("span", { class: "step-label", text: `DAILY RACES · ${out.day} (UTC)` }),
    out.day < today ? h("button", { class: "btn small", type: "button", text: "DAY ▶", onclick: () => adminDaily(body, next) }) : null));
  for (const r of out.races) {
    const msg = h("p", { class: "pay-msg", role: "status" });
    body.append(h("div", { class: "board-box" },
      h("div", { class: "board-title", text: `DAILY RACE ${r.race}` }),
      h("div", { class: "admin-tiles" }, tile("PLAYERS", r.players), tile("AVERAGE", fmtM(r.avg)), tile("TOP", fmtM(r.top))),
      r.scores.length ? h("ol", { class: "board" }, ...r.scores.map((s, i) => h("li", {},
        h("span", { class: "board-rank", text: String(i + 1) }),
        h("span", { class: "board-name", text: `${s.nickname} · ${s.email}` }),
        h("span", { class: "board-m", text: fmtM(s.metres) }),
        h("button", { class: "link", type: "button", text: "remove", "aria-label": `Remove ${s.nickname}'s score`,
          onclick: async () => { msg.textContent = "Removing…"; try { await adminCall({ action: "remove-score", email: s.email, race: r.race, day: out.day }); adminDaily(body, out.day); } catch (e) { msg.textContent = e.message; } } })))) : h("p", { class: "note", text: "No scores." }),
      msg));
  }
  const days = [...new Set(out.history.map((x) => x.day))].sort();
  if (days.length) {
    const rows = [];
    for (let i = 13; i >= 0; i--) { const dd = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10); rows.push({ day: dd, n: out.history.filter((x) => x.day === dd).reduce((t, x) => t + x.n, 0) }); }
    body.append(barChart("DAILY RACE SCORES SENT PER DAY (14 DAYS)", rows));
  }
  body.append(h("div", { class: "step-label", text: "LIVE STREAKS (ACCOUNTS)" }),
    out.streaks.length ? h("table", { class: "admin-races" }, h("tr", {}, h("th", { text: "DAYS IN A ROW" }), h("th", { text: "PLAYERS" })),
      ...out.streaks.map((s) => h("tr", {}, h("td", { text: String(s.streak) }), h("td", { text: String(s.n) })))) : h("p", { class: "note", text: "No live streaks yet." }));
}

async function adminPrompts(body) {
  const out = await adminCall({ action: "prompts" });
  body.textContent = "";
  const t = out.totals;
  const pct = (a, b) => (b ? Math.round((a / b) * 100) + "%" : "—");
  const detail = h("div", { class: "admin-player" });
  const open = async (prompt) => {
    detail.textContent = "Loading…";
    const p = await adminCall({ action: "prompt", prompt });
    detail.textContent = "";
    const s = p.stats || { plays: 0, stalls: 0, t1: 0, t2: 0, t3: 0, t4: 0, t5: 0 };
    detail.append(h("div", { class: "signed-in", text: prompt.toUpperCase() }),
      h("div", { class: "note", text: `PLAYED ${s.plays} · STALLED ${pct(s.stalls, s.plays)} · TRAFFIC JAM ${s.t1} · CRUISING ${s.t2} · FAST LANE ${s.t3} · TURBO ${s.t4} · VROOMILLION ${s.t5}` }),
      p.answers.length ? h("table", { class: "admin-races" }, h("tr", {}, h("th", { text: "ANSWER" }), h("th", { text: "TIER" }), h("th", { text: "TIMES" })),
        ...p.answers.map((a) => h("tr", {}, h("td", { text: a.answer }), h("td", { text: TIERS[a.tier].short }), h("td", { text: String(a.n) })))) : h("p", { class: "note", text: "No answers counted yet." }));
    detail.scrollIntoView({ block: "nearest" });
  };
  const table = (rows, extra) => rows.length ? h("div", { class: "admin-list" }, ...rows.map((r) => h("button", { class: "admin-row", type: "button", onclick: () => open(r.prompt).catch((e) => { detail.textContent = e.message; }) },
    h("span", { class: "admin-row-main", text: r.prompt }), h("span", { class: "admin-row-tags", text: extra(r) })))) : h("p", { class: "note", text: "Nothing yet — stats start with the next races played." });
  body.append(
    h("div", { class: "admin-tiles" }, tile("PROMPTS PLAYED", t.prompts), tile("ROUNDS", t.plays), tile("STALLED", pct(t.stalls, t.plays)), tile("VROOMILLIONS", t.vrooms)),
    detail,
    h("div", { class: "step-label", text: "MOST PLAYED" }), table(out.played, (r) => `${r.plays} PLAYS · ${pct(r.stalls, r.plays)} STALL`),
    h("div", { class: "step-label", text: "HARDEST (MOST STALLS, 5+ PLAYS)" }), table(out.stalled, (r) => `${pct(r.stalls, r.plays)} STALL · ${r.plays} PLAYS`),
    h("p", { class: "note", text: "Tap a prompt for its most common answers. Counted anonymously; only accepted answers are stored." }));
}

const REASON_TEXT = { "too-common": "should be rarer", "too-rare": "should be more common", "should-count": "should count", "should-not-count": "shouldn't count", other: "other" };
async function adminReports(body, status = "open") {
  const out = await adminCall({ action: "reports", status });
  body.textContent = "";
  body.append(h("div", { class: "admin-tabs small" }, ...["open", "fixed", "dismissed"].map((st) =>
    h("button", { class: "admin-tab" + (st === status ? " on" : ""), type: "button", text: `${st.toUpperCase()} (${out.counts[st] || 0})`, onclick: () => adminReports(body, st) }))));
  if (!out.reports.length) { body.append(h("p", { class: "note", text: status === "open" ? "No open reports. Players send these from the results screen." : "None." })); return; }
  for (const r of out.reports) {
    const msg = h("span", { class: "note" });
    const set = (st) => async () => { msg.textContent = "…"; try { await adminCall({ action: "resolve-report", id: r.id, status: st }); adminReports(body, status); } catch (e) { msg.textContent = e.message; } };
    body.append(h("div", { class: "board-box report" },
      h("div", { class: "board-title", text: r.prompt.toUpperCase() }),
      h("div", { text: `"${r.answer || "—"}" scored ${TIERS[r.tier]?.name || "?"} — player says it ${REASON_TEXT[r.reason] || r.reason}` }),
      r.note ? h("div", { class: "note", text: `"${r.note}"` }) : null,
      h("div", { class: "note", text: fmtDate(r.at) }),
      h("div", { class: "admin-actions row" },
        status !== "fixed" ? h("button", { class: "btn small", type: "button", text: "MARK FIXED", onclick: set("fixed") }) : null,
        status !== "dismissed" ? h("button", { class: "btn small", type: "button", text: "DISMISS", onclick: set("dismissed") }) : null,
        status !== "open" ? h("button", { class: "btn small", type: "button", text: "REOPEN", onclick: set("open") }) : null, msg)));
  }
}

async function adminSettings(body) {
  const out = await adminCall({ action: "get-settings" });
  body.textContent = "";
  const input = h("input", { type: "text", maxlength: "140", value: out.announcement, placeholder: "e.g. New prompts this weekend!", "aria-label": "Announcement" });
  const msg = h("p", { class: "pay-msg", role: "status", "aria-live": "polite" });
  const save = async (text) => {
    msg.textContent = "Saving…";
    try { const r = await adminCall({ action: "set-announcement", text }); input.value = r.announcement; msg.textContent = r.announcement ? "Live on everyone's title screen." : "Announcement removed."; announcementText = r.announcement || null; } catch (e) { msg.textContent = e.message; }
  };
  body.append(h("div", { class: "step-label", text: "TITLE-SCREEN ANNOUNCEMENT" }),
    h("p", { class: "note", text: "Shows at the top of everyone's title screen. Up to 140 characters. Leave empty to remove it." }),
    input,
    h("div", { class: "admin-actions row" },
      h("button", { class: "btn small", type: "button", text: "SAVE", onclick: () => save(input.value) }),
      h("button", { class: "btn small", type: "button", text: "REMOVE", onclick: () => save("") })),
    msg);
}

// Delete the account after re-entering the password.
function deleteAccountForm() {
  const password = h("input", { type: "password", autocomplete: "current-password", maxlength: "128", placeholder: "your password", "aria-label": "Password to confirm deleting your account" });
  const msg = h("p", { class: "pay-msg", role: "status", "aria-live": "polite" });
  const go = h("button", { class: "btn danger", type: "submit", text: "DELETE MY ACCOUNT" });
  const form = h("form", { class: "auth-form hidden", novalidate: true },
    h("p", { class: "note", text: account?.unlimited ? "This removes your email and password and you lose Unlimited. It can't be undone." : "This removes your email and password. It can't be undone." }),
    h("label", {}, h("span", { text: "PASSWORD" }), password), go, msg);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    go.disabled = true;
    msg.className = "pay-msg";
    msg.textContent = "Deleting…";
    try {
      const { res, body } = await api("delete-account", { method: "POST", body: JSON.stringify({ password: password.value }) });
      if (res.ok) { account = null; audio.sfx.deny(); show("title"); return; }
      msg.textContent = body.error || "Couldn't delete the account. Try again.";
    } catch {
      msg.textContent = "Couldn't reach the server. Try again.";
    }
    msg.className = "pay-msg bad";
    go.disabled = false;
  });
  const open = h("button", { class: "link", type: "button", text: "Delete account…", onclick: () => { open.remove(); form.classList.remove("hidden"); password.focus(); } });
  return h("div", { class: "danger-zone" }, open, form);
}

async function buyUnlimited() {
  const btn = $("btn-buy");
  const msg = $("pay-msg");
  btn.disabled = true;
  msg.className = "pay-msg";
  msg.textContent = "Opening secure checkout…";
  try {
    const { res, body } = await api("checkout", { method: "POST", body: JSON.stringify({ acceptNoRefunds: $("agree-no-refunds")?.checked === true }) });
    if (res.ok && typeof body.url === "string" && body.url.startsWith("https://checkout.stripe.com/")) {
      window.location.assign(body.url);
      return;
    }
    if (res.status === 401) { account = null; renderPaywall(); }
    if (res.status === 409) { await refreshAccount(); return; }
    msg.textContent = body.error || "Couldn't start checkout. Try again later.";
  } catch {
    msg.textContent = "Payments only work on the VROOMILLION website, not in this preview.";
  }
  msg.className = "pay-msg bad";
  btn.disabled = false;
}

// WHAT'S NEW: the latest update on the title screen, every update on its own screen
const LOG_SEEN_KEY = "vroomillion.log-seen";
function logItems(entry) { return h("ul", { class: "log-items" }, ...entry.items.map((t) => h("li", { text: t }))); }
function renderWhatsNew() {
  const box = $("whats-new");
  const latest = CHANGELOG[0];
  box.textContent = "";
  if (!latest) return;
  let seen = null;
  try { seen = localStorage.getItem(LOG_SEEN_KEY); } catch {}
  const head = h("p", { class: "log-head" }, h("span", { text: "WHAT'S NEW" }), " ", h("span", { class: "log-date", text: latest.date }));
  if (seen !== latest.id) head.append(" ", h("span", { class: "soon-tag", text: "NEW" }));
  box.append(head, h("p", { class: "log-title", text: latest.title }), logItems(latest),
    h("button", { class: "btn small", type: "button", "data-go": "updates", text: "ALL UPDATES" }));
}
function renderUpdates() {
  const list = $("updates-list");
  list.textContent = "";
  for (const e of CHANGELOG) list.append(h("div", { class: "log-entry" }, h("p", { class: "log-head" }, h("span", { class: "log-date", text: e.date })), h("p", { class: "log-title", text: e.title }), logItems(e)));
  try { if (CHANGELOG[0]) localStorage.setItem(LOG_SEEN_KEY, CHANGELOG[0].id); } catch {}
}

// ---------- auto-update ----------
// Each deploy writes its version to version.json (tools/stamp.mjs). When a newer one is out, the page
// reloads itself to pick it up: right away on menu screens, or as soon as the player is back on one
// (never mid-race, in an online room, or while filling in a form). Progress is saved first.
const BUILD = "dev";
const SAFE_TO_RELOAD = new Set(["title", "how", "garage", "passport", "board", "updates", "leagues"]);
let updateReady = null;
function reloadForUpdate() {
  if (!updateReady || !SAFE_TO_RELOAD.has(current) || online) return;
  // once per version per tab, in case the CDN is still serving the old page for a moment
  try { if (sessionStorage.getItem("vroomillion.reloaded") === updateReady) return; sessionStorage.setItem("vroomillion.reloaded", updateReady); } catch {}
  try { if (backupTimer) sendBackup(); } catch {}
  overlay("NEW UPDATE!", "ok");
  setTimeout(() => location.reload(), 600);
}
async function checkForUpdate() {
  if (BUILD === "dev" || updateReady) return reloadForUpdate();
  try {
    const r = await fetch("version.json?t=" + Date.now(), { cache: "no-store" });
    const v = r.ok ? (await r.json()).v : null;
    if (v && v !== BUILD) { updateReady = v; reloadForUpdate(); }
  } catch {}
}
setInterval(checkForUpdate, 60 * 1000);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") checkForUpdate(); });

let current = "title";
function show(name) {
  current = name;
  for (const s of document.querySelectorAll(".screen")) s.classList.toggle("active", s.id === "s-" + name);
  $("title-art").classList.toggle("hidden", name !== "title");
  document.body.dataset.screen = name;
  if (name !== "race") {
    $("pops").textContent = "";
    document.querySelector(".stage").classList.remove("launch", ...[0, 1, 2, 3, 4, 5].map((t) => "launch-t" + t));
  }
  fitScene();
  if (name === "title") {
    raceToken++;
    audio.engineStop();
    attract();
    renderDaily();
    $("stats").textContent = save.races
      ? `MODE ${modeName(save.deck)} · BEST ${Math.round(save.best).toLocaleString("en-US")} M · RACES ${save.races} · TURBOS ${save.deep} · VROOMILLIONS ${save.vrooms}`
      : "NEW DRIVER. YOUR '92 RUSTBUCKET AWAITS.";
  }
  if (name === "title") renderWhatsNew();
  if (updateReady) setTimeout(reloadForUpdate, 300);
  if (name === "updates") renderUpdates();
  if (name === "leagues") renderLeagues();
  if (name === "paywall") renderPaywall();
  if (name === "account") renderAccount();
  if (name === "admin") renderAdmin();
  if (name === "versus") renderVersus();
  if (name === "garage") renderGarage();
  if (name === "passport") renderPassport();
  if (name !== "passport") closeStamp();
  if (name === "board") renderBoardScreen();
  if (name === "online") renderOnline();
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

const tuned = (car) => tunedCar(car, save.upgrades);
function statLine(car0) {
  const car = tuned(car0);
  const pct = Math.round(((car.power - 1) / 5) * 100);
  const bar = h("span", { class: "bar" }, h("span", { class: "bar-fill" }));
  bar.firstChild.style.width = Math.max(4, pct) + "%";
  return h("div", { class: "statline" },
    h("span", { text: "PWR" }), bar, h("span", { class: "num", text: "×" + car.power.toFixed(2) }),
    h("span", { class: "n2o", text: "N2O " + car.nitro }),
    h("span", { class: "reach", text: "GOES AS FAR AS " + carReach(car).name }));
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
const MODES = [
  { id: "classic", name: "CLASSIC", info: "SPORTS, SCREEN, MUSIC, PLACES" },
  { id: "car", name: "GEARHEAD", info: "CARS & HOW THEY WORK" },
  { id: "hard", name: "HARD MODE", info: "NICHE & EXPERT" },
];
const modeName = (id) => MODES.find((m) => m.id === id)?.name || "CLASSIC";

function modeSwitch(mount, onChange) {
  mount.textContent = "";
  mount.append(...MODES.map((m) => h("button", {
    class: "mode mode-" + m.id, type: "button", "aria-pressed": String(save.deck === m.id),
    onclick: () => { save.deck = m.id; persist(); audio.sfx.move(); modeSwitch(mount, onChange); onChange?.(); },
  }, h("span", { class: "mode-name", text: m.name }), h("span", { class: "mode-info", text: m.info }),
    // modes free players don't get
    m.id !== "classic" && !FREE_PLAY && !unlimitedNow() ? h("span", { class: "mode-lock", text: "UNLIMITED ONLY" }) : null)));
}
// Prompts already raced. Logged in: the account's list (the same on every device, cached in
// save.acctSeen for a fast start). Not logged in: this device's own list (save.seen).
// The first time an account logs in on a device, what was played here without one is added to it.
// the new prompt system: a picked family -> the question the race engine plays (its answers, if any)
let qIndex = null;
const qByText = () => (qIndex && qIndex.size === QUESTIONS.length ? qIndex : (qIndex = new Map(QUESTIONS.map((q) => [q.q, q]))));
const famKeyOf = (prompt) => { const f = familyOf(prompt); return f ? famKey(f) : prompt; };
// prompts added with the new catalog keep their answers in answers/<slug>.json, loaded for the race
const extraQ = new Map();
const getQ = (p) => qByText().get(p) || extraQ.get(p);
const hasQ = (p) => qByText().has(p) || extraQ.has(p) || !!familyOf(p)?.src;
function loadAnswers(prompts) {
  return Promise.all(prompts.filter((p) => !getQ(p)).map((p) =>
    fetch("answers/" + answerSlug(p) + ".json").then((r) => (r.ok ? r.json() : null)).then((d) => { if (d?.a) extraQ.set(p, { cat: "everyday", ...d, q: p }); }).catch(() => {})));
}
function v2Questions(picks) {
  // a prompt whose answers didn't load: the live check alone judges it
  return picks.map(({ family, prompt }) => ({ ...(getQ(prompt) || { q: prompt, a: [[], [], [], [], []], cat: "everyday" }), fam: famKey(family) }));
}
// pick the race's prompts, load any answer files, then start it
async function startRaceV2(setup) {
  await questionsLoaded;
  const daily = setup.daily && !setup.redo ? setup.daily : 0;
  const picks = daily ? dailyRace(dday()) : pickRace(save.deck, seenList(), ROUNDS, Math.random, { has: hasQ });
  overlay("LOADING…", "small");
  await Promise.race([loadAnswers(picks.map((x) => x.prompt)), new Promise((r) => setTimeout(r, 6000))]);
  overlay("");
  startRace({ ...setup, v2questions: v2Questions(picks) });
}
// online races: seven prompts fresh for both players (each one's history of families)
const v2OnlinePrompts = (deck, otherSeen = [], avoid = []) =>
  pickRace(deck, [...seenList(), ...otherSeen, ...avoid.map(famKeyOf)], ROUNDS, Math.random, { has: hasQ }).map((x) => x.prompt);

let accountSeen = null; // the account's list once synced, null when logged out
const deviceSeen = () => (Array.isArray(save.seen) ? save.seen : []);
const seenList = () => (account && accountSeen ? accountSeen : deviceSeen());
let seenQueue = Promise.resolve();
function sendSeen(change) {
  const email = account?.email;
  seenQueue = seenQueue.then(async () => {
    try {
      const { res, body } = await api("seen", { method: "POST", body: JSON.stringify(change) });
      if (!res.ok || account?.email !== email || !Array.isArray(body.seen)) return false;
      accountSeen = body.seen;
      if (Number.isInteger(body.races)) accountRaces = Math.max(body.races, accountRaces || 0);
      save.acctSeen = { email, list: body.seen };
      persist();
      return true;
    } catch { return false; } // offline: the next sync sends everything again
  });
  return seenQueue;
}
async function syncSeen() {
  if (!account?.email) { accountSeen = null; accountRaces = null; return; }
  const email = account.email;
  const cached = save.acctSeen?.email === email ? save.acctSeen.list : [];
  accountSeen = [...cached];
  const firstHere = save.seenMergedFor !== email;
  // anything raced while offline, plus (once per device) what was played here without an account
  const add = [...new Set([...cached, ...(firstHere ? deviceSeen() : [])])];
  if ((await sendSeen({ add, ...(firstHere && save.unlRaces ? { racesAtLeast: save.unlRaces } : {}) })) && firstHere) { save.seenMergedFor = email; persist(); }
  if (current === "leagues") renderLeagues();
  if (current === "versus") renderVersus();
}
function markSeen(prompt) {
  if (account && accountSeen) {
    if (accountSeen.includes(prompt)) return;
    accountSeen = [...accountSeen, prompt];
    save.acctSeen = { email: account.email, list: accountSeen };
    persist();
    sendSeen({ add: [prompt] });
  } else if (!deviceSeen().includes(prompt)) {
    save.seen = [...deviceSeen(), prompt];
    persist();
  }
}
function unseeMode(prompts) {
  if (account && accountSeen) {
    accountSeen = accountSeen.filter((t) => !prompts.has(t));
    save.acctSeen = { email: account.email, list: accountSeen };
    sendSeen({ remove: [...prompts] });
  } else {
    save.seen = deviceSeen().filter((t) => !prompts.has(t));
  }
  persist();
}
const leftInMode = () => V2 ? 1 : promptsLeft(deckQuestions(QUESTIONS, save.deck), seenList());

// "28 NEW PROMPTS LEFT" under the mode switch; when none are left, say what to do instead.
function renderPromptsLeft(el, startBtn, ready) {
  if (!questionsReady) {
    el.className = "prompts-left";
    el.textContent = "LOADING PROMPTS…";
    startBtn.disabled = true;
    return; // redrawn when they arrive
  }
  startBtn.disabled = false;
  // the new prompt system never runs out (old prompts come back once all are seen), and the count is hidden
  if (V2) { el.className = "prompts-left"; el.textContent = ""; ready(); return; }
  const left = leftInMode();
  el.className = "prompts-left" + (left ? "" : " none");
  el.textContent = left
    ? `${left.toLocaleString("en-US")} NEW PROMPT${left === 1 ? "" : "S"} LEFT IN ${modeName(save.deck)}${left < ROUNDS ? ` · LAST RACE IS ${left} ROUND${left === 1 ? "" : "S"}` : ""}`
    : `YOU'VE PLAYED ALL ${deckQuestions(QUESTIONS, save.deck).length.toLocaleString("en-US")} ${modeName(save.deck)} PROMPTS! START THEM OVER, TRY ANOTHER MODE, OR REDO A RACE FROM ITS RESULTS SCREEN.`;
  el.append(...(left ? [] : [h("button", { class: "btn small restart", type: "button", text: "START THE PROMPTS OVER", onclick: () => {
    audio.sfx.click();
    unseeMode(new Set(deckQuestions(QUESTIONS, save.deck).map((q) => q.q)));
    show(current);
  } })]));
  startBtn.disabled = !left;
  if (!left) startBtn.textContent = "NO NEW PROMPTS";
  else ready();
}

// ---------- streaks and the daily leaderboard ----------
const STREAK_BONUS = 1000; // $ per day of the streak, up to STREAK_CAP days
const STREAK_CAP = 7;
// the streak right now: alive if the last daily race was today or yesterday (UTC)
function streakNow() {
  const t = dday(), y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const local = save.streak && [t, y].includes(save.streak.day) ? save.streak.count : 0;
  return Math.max(local, account?.streak || 0);
}

// One leaderboard (top 10 for a daily race), drawn into el.
async function drawBoard(el, n) {
  el.textContent = "";
  el.append(h("div", { class: "board-title", text: DAILY_RACES === 1 ? "DAILY RACE · TOP 10" : `DAILY RACE ${n} · TOP 10` }));
  let body;
  try { ({ body } = await api("daily-board?race=" + n)); } catch { el.append(h("p", { class: "note", text: "Leaderboards work on the VROOMILLION website." })); return; }
  if (!body.top?.length) { el.append(h("p", { class: "note", text: "Nobody on it yet today. Be the first!" })); return; }
  const list = h("ol", { class: "board" });
  body.top.forEach((r, i) => list.append(h("li", { class: body.me && body.me.rank === i + 1 && body.me.name === r.name ? "me" : "" },
    h("span", { class: "board-rank", text: String(i + 1) }), h("span", { class: "board-name", text: r.name }),
    h("span", { class: "board-m", text: r.metres.toLocaleString("en-US") + " M" }))));
  el.append(list);
  el.append(h("p", { class: "note", text: body.me
    ? `YOU: #${body.me.rank} OF ${body.players} · ${body.me.metres.toLocaleString("en-US")} M`
    : `${body.players} PLAYER${body.players === 1 ? "" : "S"} TODAY` + (account ? "" : " · LOG IN TO GET ON THE BOARD") }));
}

// After a daily race: send the score (logged in), then show the board.
function dailyBoardSlot(n, racer) {
  const el = h("div", { class: "board-box" }, h("p", { class: "note", text: "Loading the leaderboard…" }));
  (async () => {
    if (account) {
      try {
        const { res, body } = await api("daily", { method: "POST", body: JSON.stringify({ race: n, metres: Math.round(racer.dist), tiers: racer.tiers.slice(0, 7) }) });
        if (res.ok && Number.isInteger(body.streak)) { account.streak = body.streak; account.streakDay = body.day; }
      } catch { /* offline: just show the board */ }
    }
    drawBoard(el, n);
  })();
  return el;
}

function renderBoardScreen() {
  const root = $("board-lists");
  root.textContent = "";
  for (let n = 1; n <= DAILY_RACES; n++) { const el = h("div", { class: "board-box" }); root.append(el); drawBoard(el, n); }
  const nick = $("board-nick");
  nick.textContent = "";
  if (!account) { nick.append(h("p", { class: "note", text: "Log in and finish a daily race to get on the leaderboard." })); return; }
  nick.append(nicknameForm());
}

// The name on the leaderboard (never your email).
function nicknameForm() {
  const input = h("input", { type: "text", maxlength: "16", minlength: "3", value: account.nickname || "", "aria-label": "Leaderboard name", autocomplete: "off" });
  const msg = h("p", { class: "pay-msg", role: "status", "aria-live": "polite" });
  const form = h("form", { class: "nick-form" },
    h("label", { class: "note", text: "YOUR LEADERBOARD NAME" }), input,
    h("button", { class: "btn small", type: "submit", text: "SAVE NAME" }), msg);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    audio.sfx.click();
    try {
      const { res, body } = await api("nickname", { method: "POST", body: JSON.stringify({ nickname: input.value }) });
      msg.textContent = res.ok ? "Saved." : body.error || "Couldn't save that.";
      if (res.ok) account.nickname = body.nickname;
    } catch { msg.textContent = "Names work on the VROOMILLION website."; }
  });
  return form;
}

// Unlimited races are numbered: RACE #1, RACE #2... (on the account when logged in, else this device)
let accountRaces = null;
const racesRun = () => (account && accountRaces != null ? accountRaces : save.unlRaces || 0);

function renderLeagues() {
  // the two daily races: the same prompts for everyone today, free for every player
  const daily = $("daily-solo");
  daily.textContent = "";
  const done = dailyDone(save, dday());
  for (let n = 1; n <= DAILY_RACES; n++) {
    const played = n in done;
    daily.append(h("button", {
      class: "btn daily-race" + (played ? " done" : ""), type: "button", disabled: played,
      text: played ? (DAILY_RACES === 1 ? "DAILY" : `DAILY ${n}`) + (done[n] ? ` ✓ ${done[n].toLocaleString("en-US")} M` : " ✓ PLAYED") : DAILY_RACES === 1 ? "DAILY RACE" : `DAILY RACE ${n}`,
      onclick: () => { audio.sfx.click(); startRace({ mode: "solo", daily: n }); },
    }));
  }
  const st = streakNow();
  $("daily-note").textContent = (dailyLeft(save, dday())
    ? (DAILY_RACES === 1 ? "Same 7 prompts for everyone today. Free, once a day." : "Same 7 prompts for everyone today. Free, once each.")
    : DAILY_RACES === 1 ? `Done. A new daily race in ${timeLeft()}.` : `Both done. New daily races in ${timeLeft()}.`) + (st ? ` Streak: ${st} day${st === 1 ? "" : "s"}.` : "");
  modeSwitch($("mode-solo"), renderLeagues);
  const rules1p = $("rules-solo");
  rules1p.textContent = "";
  rules1p.append(ruleToggles(false));
  carPicker($("picker-solo"), () => save.car, (id) => { save.car = id; persist(); });
  $("best-solo").textContent = save.best ? Math.round(save.best).toLocaleString("en-US") + " M" : "—";
  const ok = canRace(me(), dayKey(), { mode: "solo", deck: save.deck });
  renderPromptsLeft($("left-solo"), $("btn-start-1p"), () => {
    $("btn-start-1p").textContent = ok ? `START RACE #${(racesRun() + 1).toLocaleString("en-US")}` : "UNLIMITED RACES — $5";
  });
}

const versus = { p1: save.car, p2: save.car };
// Race rules the player can switch: CRAZY MODE (unlimited races and 1v1, never the daily race) and,
// for 1v1, whether the cars matter. Kept on the save, so they stick between races.
function ruleToggles(versusRules) {
  const box = h("div", { class: "rules" });
  const draw = () => {
    box.textContent = "";
    const toggle = (key, label, on, off) => h("button", { class: "rule-btn" + (save[key] ? " on" : ""), type: "button", "aria-pressed": String(!!save[key]),
      onclick: () => { audio.sfx.click(); save[key] = !save[key]; persist(); draw(); } },
      h("span", { class: "rule-name", text: `${label}: ${save[key] ? "ON" : "OFF"}` }), h("span", { class: "rule-note", text: save[key] ? on : off }));
    box.append(toggle("crazy", "CRAZY MODE", "Flipped! The most obvious answer scores most", "Rarer answers score more"));
    if (versusRules) box.append(toggle("equalCars", "EQUAL CARS", "Cars don't matter: both x1, 2 nitro", "Your car's power and nitro count"));
  };
  draw();
  return box;
}

function renderVersus() {
  modeSwitch($("mode-2p"), renderVersus);
  renderPromptsLeft($("left-2p"), $("btn-start-2p"), () => {
    $("btn-start-2p").textContent = canRace(me(), dayKey(), { mode: "versus", deck: save.deck }) ? "START RACE" : "2P IS UNLIMITED — $5";
  });
  const rules2p = $("rules-2p");
  rules2p.textContent = "";
  rules2p.append(ruleToggles(true));
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
      const action = car.exclusive && !owned
        ? h("div", { class: "tag locked", text: "LOCKED · REACH VROOMILLION CITY" })
        : equipped
        ? h("div", { class: "tag equipped", text: "EQUIPPED" })
        : owned
          ? h("button", { class: "btn small", type: "button", text: "DRIVE", onclick: () => { save.car = car.id; persist(); audio.sfx.lock(); renderGarage(); } })
          : h("button", {
            class: "btn small buy" + (afford ? "" : " poor"), type: "button", text: money(car.price),
            "aria-label": `Buy ${car.name} for ${money(car.price)}`,
            onclick: () => buy(car),
          });
      grid.append(h("div", { class: "car-card" + (owned ? " owned" : "") + (equipped ? " is-equipped" : "") },
        spriteCanvas(car, 4), h("div", { class: "car-name", text: car.name }), statLine(car), action,
        owned ? upgradeRow(car) : null));
    }
    root.append(grid);
  }
}

// ENGINE / NITRO upgrade buttons on an owned car
function upgradeRow(car) {
  return h("div", { class: "upgrades" }, ...Object.entries(UPGRADES).map(([kind, u]) => {
    const level = upgradeLevel(save.upgrades, car.id, kind);
    if (level >= u.levels) return h("div", { class: "tag up-max", text: `${u.name} MAX` });
    const cost = upgradeCost(car, kind, level);
    return h("button", {
      class: "btn small up" + (save.cash >= cost ? "" : " poor"), type: "button",
      text: `${u.name} ${level + 1}/${u.levels} · ${money(cost)}`,
      "aria-label": `Upgrade ${u.name.toLowerCase()} on ${car.name} for ${money(cost)}`,
      onclick: () => {
        if (save.cash < cost) { audio.sfx.deny(); overlay(`NEED ${money(cost - save.cash)} MORE`, "small"); setTimeout(() => current === "garage" && overlay(""), 1200); return; }
        save.cash -= cost;
        save.upgrades = { ...(save.upgrades || {}), [car.id]: { ...(save.upgrades?.[car.id] || {}), [kind]: level + 1 } };
        persist();
        audio.sfx.buy();
        renderCash(true);
        renderGarage();
      },
    });
  }));
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
      tierBadge(t.id, "span"),
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
  r.elSpeed = h("span", { class: "speedo", text: "READY" });
  return h("div", { class: "hud-card p" + (i + 1) },
    h("div", { class: "hud-name", text: r.name }),
    h("div", { class: "hud-car", text: r.car.name }),
    h("div", { class: "dist-row" }, r.elDist, r.elSpeed),
    race.solo ? h("div", { class: "hud-best", text: save.best ? `BEST ${Math.round(save.best).toLocaleString("en-US")} M` : "FIRST RUN" }) : null,
    h("div", { class: "hud-foot" }, r.elTier, r.elNitro));
}

// "+720 M" bursting up from a car, sized by how rare the answer was.
function popGain(i, metres, tier, nitro, crazy = false) {
  const at = scene.anchor(i);
  const el = h("div", { class: `gain-pop gp${tier}` },
    h("span", { class: "gain-m", text: tier ? `+${metres.toLocaleString("en-US")} M` : "STALLED" }),
    tier >= 3 ? h("span", { class: "gain-tag", text: crazy ? (tier === 5 ? "CRAZY!" : tier === 4 ? "NICE!" : "OK!") : tier === 5 ? "VROOMILLION!" : tier === 4 ? "TURBO! ULTRA RARE" : "RARE!" }) : null,
    nitro ? h("span", { class: "gain-tag nitro", text: "NITRO!" }) : null);
  el.style.left = (at.x * 100).toFixed(1) + "%";
  el.style.top = (at.y * 100).toFixed(1) + "%";
  $("pops").append(el);
  setTimeout(() => el.remove(), 1800);
}


// setup.redo replays setup.questions exactly; otherwise the race gets prompts never seen before.
function startRace(setup) {
  if (V2 && !setup.online && !setup.v2questions && !(setup.redo && setup.questions?.length)) {
    const today = dday();
    const daily = setup.daily && !setup.redo ? setup.daily : 0;
    if (canRace(me(), today, daily ? { daily } : { mode: setup.mode === "solo" ? "solo" : "versus", deck: save.deck })) return startRaceV2(setup);
  }
  if (!questionsReady) { questionsLoaded.then(() => startRace(setup)); return; }
  const today = dday();
  const daily = setup.daily && !setup.redo ? setup.daily : 0;
  const kind = daily ? { daily } : { mode: setup.mode === "solo" ? "solo" : "versus", deck: save.deck };
  if (!setup.online && !canRace(me(), today, kind)) {
    if (daily) { show("leagues"); return; } // already played today: the screen says so
    openPaywall(setup.mode === "solo" && save.deck === "classic" ? "used" : "mode");
    return;
  }
  const questions = setup.online
    ? setup.questions
    : setup.redo && setup.questions?.length && !daily
      ? setup.questions
      : V2
        ? setup.v2questions
        : daily
          ? dailyQuestions(deckQuestions(QUESTIONS, "classic"), today)[daily - 1]
          : pickFresh(deckQuestions(QUESTIONS, save.deck), seenList(), ROUNDS, Math.random, { flat: save.deck === "car" });
  if (!questions.length) {
    // nothing new left in this mode: back to the setup screen, which explains
    show(setup.mode === "solo" ? "leagues" : "versus");
    return;
  }
  prefetchDeep(questions.map((q) => q.base || q.q)); // the long-tail answer lists, in the background
  lastSetup = { ...setup, redo: false, questions };
  // a daily race counts as played once it starts; an Unlimited race gets the next number
  let label;
  if (setup.online) {
    label = "ONLINE 1V1";
  } else if (daily) {
    save.daily = markDaily(save, today, daily);
    label = DAILY_RACES === 1 ? "DAILY RACE" : `DAILY ${daily} OF ${DAILY_RACES}`;
  } else {
    const n = racesRun() + 1;
    save.unlRaces = Math.max(save.unlRaces || 0, n);
    if (account) { if (accountRaces != null) accountRaces = n; sendSeen({ race: true }); }
    label = setup.redo ? `RACE #${n} · REDO` : `RACE #${n}`;
  }
  persist();
  // count the race for the admin stats (no personal data); fails quietly without a server
  api("race-start", { method: "POST", body: JSON.stringify({ kind: daily ? "solo-classic" : kind.mode === "versus" ? "versus" : "solo-" + (kind.deck || "classic") }) }).catch(() => {});
  const token = ++raceToken;
  const solo = setup.mode === "solo";
  const mk = (name, car) => ({ name, car, power: car.power, nitro: car.nitro, dist: 0, tiers: [], log: [], useNitro: false });
  const racers = solo
    ? [mk("YOU", tuned(carById(save.car)))]
    : [mk(setup.names[0], tuned(carById(setup.cars[0]))), mk(setup.names[1], tuned(carById(setup.cars[1])))];
  if (setup.online) racers.forEach((r, i) => {
    if (i === setup.online.seat) return;
    const p = setup.online.players[i];
    if (p.power) r.power = p.power;
    if (Number.isInteger(p.nitro)) r.nitro = p.nitro;
  });
  // 1v1 with "cars don't matter": everyone races as a x1 car with 2 nitro charges (the car still shows)
  if (!solo && setup.equal) racers.forEach((r) => { r.power = EQUAL_CAR.power; r.nitro = EQUAL_CAR.nitro; });
  const crazy = !!setup.crazy && !daily; // CRAZY MODE never applies to the daily race
  race = { token, solo, setup, racers, round: 0, questions, daily, label, online: setup.online || null, crazy };

  scene = chaseScene; // races use the behind-the-car view
  scene.setRacers(solo
    ? [{ car: racers[0].car, label: "P1", color: "#4fd1ff", lane: 1 }]
    : [{ car: racers[0].car, label: "P1", color: "#4fd1ff" }, { car: racers[1].car, label: "P2", color: "#ff4fd8" }]);
  scene.speed = 0.05;
  const hud = $("hud");
  hud.textContent = "";
  for (const id of ["hud", "reveal", "result-body"]) $(id).classList.toggle("solo", solo);
  racers.forEach((r, i) => hud.append(hudCard(r, i)));
  $("pips").textContent = "";
  for (let i = 0; i < questions.length; i++) $("pips").append(h("i", { class: "pip" }));
  $("reveal").textContent = "";
  $("hint").textContent = "";
  $("question").textContent = "GET READY…";
  $("q-lead").textContent = "";
  $("q-twist").classList.add("hidden");
  $("round-label").textContent = `ROUND 1 OF ${questions.length}`;
  $("q-kicker").textContent = "GET READY";
  $("mode-label").textContent = daily ? label : `${label} · ${modeName(setup.online ? setup.online.deck : save.deck)}` + (crazy ? " · CRAZY" : "") + (!solo && setup.equal ? " · EQUAL CARS" : "");
  $("mode-label").className = "mode-tag mode-" + (daily ? "daily" : save.deck);
  $("answer-zone").classList.add("hidden");
  $("btn-next").classList.add("hidden");
  $("q-card").classList.add("hidden"); // keep the 3-2-1 countdown visible
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
  $("q-card").classList.remove("hidden");
  audio.sfx.go();
  scene.speed = 0.3;
  audio.engineSet(0.3);
  await sleep(600);
  if (!alive()) return;
  overlay("");

  const rounds = race.questions.length;
  for (let round = 0; round < rounds; round++) {
    race.round = round;
    const q = race.questions[round];
    const index = buildIndex(q);
    index.prompt = q.base || q.q; // the live check knows prompts by their base wording
    if (q.variant === "start") index.letter = (q.q.match(/"([A-Z])"$/) || [])[1]?.toLowerCase();
    // the long tail, fetched when the race started; read on each guess, so it counts as soon as it arrives
    Object.defineProperty(index, "deep", { get: () => deepAnswers(index.prompt), configurable: true });
    $("round-label").textContent = `ROUND ${round + 1} OF ${rounds}`;
    // the new prompt system shows no topic label (it would give the answer space away)
    $("q-kicker").textContent = V2 ? `PROMPT ${round + 1}/${rounds}` : `${topicOf(q)} · ${round + 1}/${rounds}`;
    // a prompt counts as seen once it's shown, so quitting early doesn't use up the rest
    if (V2) markSeen(q.fam || famKeyOf(q.q)); // the new system: the whole family, in every race type
    else if (!race.online) markSeen(q.q);
    $("q-hint").classList.remove("hidden");
    $("q-card").classList.remove("revealing", "hidden");
    requestAnimationFrame(fitCard);
    [...$("pips").children].forEach((p, i) => p.classList.toggle("on", i === round));
    $("reveal").textContent = "";
    $("hint").textContent = "";
    const qEl = $("question");
    showQuestion(q);
    qEl.classList.remove("slam");
    void qEl.offsetWidth;
    qEl.classList.add("slam");

    // collect answers
    const results = [];
    if (race.online) {
      // online: I answer here, my friend answers on their device; the server swaps the results
      const mine = race.online.seat;
      results[mine] = await askAnswer(race.racers[mine], mine, token, index);
      if (!alive()) return;
      onlineSend(round, results[mine], race.racers[mine].useNitro);
      results[1 - mine] = await onlineOpponent(round, token);
      if (!alive()) return;
    } else {
      for (let i = 0; i < race.racers.length; i++) {
        results[i] = await askAnswer(race.racers[i], i, token, index);
        if (!alive()) return;
      }
    }
    // same answer: a FENDER BENDER, and a coin toss for the points (online, both games land it the same way)
    const winner = race.online ? tossWinner(`${race.online.code}:${round}`) : tossWinner();
    const final = race.solo ? results : applyFenderBender(results[0], results[1], winner);
    const bumped = final.some((f) => f.bump);
    if (bumped) { await coinToss(winner); if (!alive()) return; }

    // reveal: everything else fades, the answer slams into the middle and the car smashes through it
    $("answer-zone").classList.add("hidden");
    $("q-hint").classList.add("hidden");
    $("q-card").classList.add("hidden");
    document.body.classList.add("smashing");
    const smashCards = final.map((res, i) => {
      const r = race.racers[i];
      const m = roundMetres(res, r.power, r.useNitro, race.crazy);
      return {
        who: race.solo ? "" : r.name.toUpperCase(),
        answer: (res.display || "NO ANSWER").toUpperCase(),
        tierName: TIERS[res.tier].name + (res.tier ? " · " + TIERS[res.tier].rarity : "") + (res.bump ? (res.half ? " · LOST TOSS, HALF" : " · WON THE TOSS") : ""),
        gain: res.tier ? `+${m.toLocaleString("en-US")} M${r.useNitro ? " NITRO" : ""}` : "0 M",
        tier: res.tier,
        color: i ? "#ff4fd8" : "#4fd1ff",
      };
    });
    // The boost starts the moment each car breaks through its card, from the speed it hit it at,
    // so the car never slows down between the crash and the run up the road.
    const from = race.racers.map((r) => r.dist);
    const gain = race.racers.map((r, i) => roundMetres(final[i], r.power, r.useNitro, race.crazy));
    const topTier = Math.max(...final.map((f) => f.tier));
    race.racers.forEach((r, i) => {
      r.tiers.push(final[i].tier);
      r.log.push({ q: q.q, answer: final[i].display || "—", tier: final[i].tier, gain: gain[i], nitro: r.useNitro, bump: !!final[i].bump });
      r.elTier.className = "badge t" + final[i].tier;
      r.elTier.textContent = TIERS[final[i].tier].short;
    });
    const stage = document.querySelector(".stage");
    const BOOST_MS = [2300, 2400, 2600, 2900, 3400, 4200]; // rarer answers get a longer run
    const runs = race.racers.map(() => null);
    const startRun = (i) => {
      if (runs[i] || !alive()) return;
      const r = race.racers[i];
      const tier = effectTier(final[i].tier, race.crazy); // the size of the effects: the payout, not the rarity, in CRAZY MODE
      const nitro = r.useNitro && tier > 0;
      const dur = BOOST_MS[tier] + (nitro ? 300 : 0);
      runs[i] = { t0: performance.now(), dur, b0: scene.racers[i].boost || 0, peak: (gain[i] / 1500) * 3, gears: 2 + tier, gear: 0, tier };
      scene.racers[i].nitro = nitro;
      scene.launch(i, tier, nitro, dur / 1000);
      popGain(i, gain[i], tier, nitro, race.crazy);
      audio.sfx.launch(tier);
      if (tier >= 2) audio.sfx.whoosh(tier);
      if (tier === 0) audio.sfx.sputter();
      if (nitro) audio.sfx.nitro();
      if (!stage.classList.contains("launch")) stage.classList.add("launch", "launch-t" + topTier);
    };
    scene.onEvent = (type, card) => {
      if (type === "slam") audio.sfx.tier(card.tier);
      else if (type === "impact") { audio.sfx.smash(card.tier); if (card.tier === 5) scene.confetti(); startRun(card.i); }
      // STALLED: bounce off the card, then cough black smoke
      else if (type === "bonk") { audio.sfx.bonk(); setTimeout(() => startRun(card.i), 450); }
    };
    let smashed = false;
    const run = new Promise((done) => {
      let last = performance.now();
      const step = (now) => {
        if (!alive()) return done();
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        let top = 0;
        let finished = smashed;
        race.racers.forEach((r, i) => {
          const R = runs[i];
          if (!R) { finished = false; return; }
          const k = Math.min(1, (now - R.t0) / R.dur);
          if (k < 1) finished = false;
          const q1 = 1 - k;
          // speed rises to a peak just after the crash, then eases off; distance is its integral
          const v = q1 * q1 * (1 + 4 * k);
          const e = 1 - (2.5 * q1 ** 3 - 1.5 * q1 ** 4);
          const b = Math.max(R.peak * v, R.b0 * q1 ** 3);
          r.dist = from[i] + gain[i] * e;
          scene.racers[i].dist = r.dist;
          scene.racers[i].boost = b;
          top = Math.max(top, b);
          r.elDist.textContent = Math.round(r.dist).toLocaleString("en-US") + " M";
          r.elSpeed.textContent = Math.round(40 + Math.min(4.5, b) * 85 * r.power) + " KM/H";
          // climb through the gears; Fast Lane and up backfire on each shift
          const g = Math.min(R.gears - 1, Math.floor(e * R.gears));
          if (g > R.gear && b > 0.3) {
            R.gear = g;
            audio.sfx.shift();
            if (R.tier >= 3) { scene.backfire(i); audio.sfx.backfire(); }
          }
          if (k < 1) audio.engineSet(Math.max(scene.speed * 0.6, (R.tier > 0 ? 0.35 + 0.65 * ((e * R.gears) % 1) : 0.2) * Math.min(1, b + 0.3)));
        });
        if (runs.some(Boolean)) {
          // ease the road speed towards the boost (never a jump), and pull the camera back with it
          const target = 0.25 + Math.min(0.75, top * 0.9);
          scene.speed += (target - scene.speed) * Math.min(1, dt * 5);
          scene.kick = Math.max(scene.kick, Math.min(1.3, top * 0.45));
          scene.stretch = Math.max(scene.stretch, Math.min(2, top * 0.7));
        }
        if (finished) done();
        else requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    await scene.smash(smashCards);
    document.body.classList.remove("smashing");
    if (!alive()) return;
    smashed = true;
    // a card that never got hit still launches its car
    race.racers.forEach((_, i) => { if (!runs[i] && final[i].tier > 0) startRun(i); });
    if (bumped) {
      audio.sfx.bump();
      overlay("FENDER BENDER!", "small bad");
      scene.shake = scene.calm ? 0 : 0.4;
      setTimeout(() => { if (alive()) overlay(""); }, 900);
    }
    await run;
    scene.onEvent = null;
    stage.classList.remove("launch", "launch-t" + topTier);
    if (!alive()) return;
    race.racers.forEach((r, i) => {
      r.elSpeed.textContent = "CRUISING";
      r.useNitro = false;
      scene.racers[i].nitro = false;
      scene.racers[i].boost = 0;
    });
    if (!race.solo) {
      const lead = race.racers[0].dist === race.racers[1].dist ? -1 : race.racers[0].dist > race.racers[1].dist ? 0 : 1;
      [...$("hud").children].forEach((c, i) => c.classList.toggle("leading", i === lead));
    }
    [...$("pips").children][round].classList.add("done");

    // the answers stay up, small, while you decide to go on
    $("q-card").classList.add("revealing");
    $("reveal").textContent = "";
    $("reveal").append(...final.map((res, i) => { const c = revealCard(race.racers[i], res, i); c.classList.add("shown"); return c; }));
    $("q-card").classList.remove("hidden");
    requestAnimationFrame(fitCard);

    const best = Math.max(...final.map((f) => f.tier));
    const tossWon = final.findIndex((f) => f.toss === "won");
    $("hint").textContent = (bumped ? `FENDER BENDER — ${race.racers[tossWon].name.toUpperCase()} WON THE TOSS, ${race.racers[1 - tossWon].name.toUpperCase()} GOT HALF. ` : "") + (best >= 5
      ? "THAT'S AS NICHE AS IT GETS."
      : `A RARE ONE HERE: ${exampleAnswer(q, 4).toUpperCase()}`);

    await waitNext(round === rounds - 1 ? "FINISH ▶" : "NEXT ▶", token);
    if (!alive()) return;
  }
  await arrive(token);
  finish(token);
}

// After the last round the road turns into wherever this race's distance has taken you.
async function arrive(token) {
  const alive = () => token === raceToken;
  // online: your own distance takes you somewhere (your friend's stamp is theirs); same screen: the leader's
  const lead = race.online ? race.racers[race.online.seat] : race.racers.reduce((a, b) => (b.dist > a.dist ? b : a));
  const top = lead.dist;
  const dest = destinationFor(top, lead.car);
  const blocked = blockedBy(top, lead.car); // went far enough, but the car can't go there
  // CRAZY MODE is for fun: it shows where you'd have got to, but doesn't stamp the passport or unlock cars
  const newStamp = !race.crazy && !(dest.id in save.passport);
  if (!race.crazy) save.passport[dest.id] = Math.max(save.passport[dest.id] || 0, Math.round(top));
  const carUnlocked = !race.crazy && !!dest.exclusive && !save.owned.includes(EXCLUSIVE_CAR);
  if (carUnlocked) save.owned.push(EXCLUSIVE_CAR);
  persist();
  race.arrival = { dest, newStamp, carUnlocked, top, car: lead.car, blocked };

  $("q-card").classList.add("hidden");
  document.body.classList.add("smashing");
  scene.arrive(dest.id);
  scene.speed = 0.55;
  audio.engineSet(0.5);
  await sleep(1900);
  if (!alive()) return;
  const card = h("div", { class: "arrive-card" + (dest.exclusive ? " exclusive" : "") },
    h("div", { class: "arrive-kicker", text: dest.exclusive ? "EXCLUSIVE AREA · WELCOME TO" : "YOU'VE ARRIVED AT" }),
    h("div", { class: "arrive-name", text: dest.name }),
    h("div", { class: "arrive-blurb", text: dest.blurb }),
    newStamp ? h("div", { class: "arrive-tag", text: "NEW PASSPORT STAMP!" }) : null,
    blocked ? h("div", { class: "arrive-tag warn", text: `YOUR CAR MAXED OUT · ${blocked.name} NEEDS CLASS ${blocked.cls}` }) : null,
    carUnlocked ? h("div", { class: "arrive-tag gold", text: "THE VROOMILLIONAIRE IS YOURS!" }) : null);
  $("overlay").textContent = "";
  $("overlay").append(card);
  if (dest.exclusive || newStamp) { scene.confetti(); audio.sfx.win(); } else audio.sfx.cash();
  await sleep(dest.exclusive ? 3600 : 2600);
  $("overlay").textContent = "";
  document.body.classList.remove("smashing");
}

// A tier badge: the name, with its rarity word (COMMON ... LEGENDARY) underneath, in the rarity colour.
function tierBadge(tier, tag = "div", short = false) {
  const t = TIERS[tier];
  return h(tag, { class: "badge t" + tier }, short ? t.short : t.name, tier ? h("span", { class: "rarity", text: t.rarity }) : null);
}

// FENDER BENDER coin toss: a pixel coin in both players' colours spins up and lands on the winner.
function coinToss(winner) {
  return new Promise((resolve) => {
    const [a, b] = race.racers;
    const face = (r, cls) => h("div", { class: "coin-face " + cls }, h("span", { text: r.name.toUpperCase().slice(0, 10) }));
    const coin = h("div", { class: "coin" }, face(a, "p1"), face(b, "p2"));
    const result = h("div", { class: "coin-result" });
    const box = h("div", { class: "coin-toss" }, h("div", { class: "coin-title", text: "FENDER BENDER!" }),
      h("div", { class: "coin-sub", text: "SAME ANSWER · COIN TOSS FOR THE POINTS" }), h("div", { class: "coin-stage" }, coin), result);
    const o = $("overlay");
    o.textContent = "";
    o.append(box);
    audio.sfx.bump();
    setTimeout(() => audio.sfx.flip(), 300);
    const quick = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const turns = 6 * 360 + (winner ? 180 : 0); // an odd half turn shows player 2's side
    const spin = coin.animate([
      { transform: "translateY(0) rotateY(0deg)" },
      { transform: `translateY(-90px) rotateY(${turns / 2}deg)`, offset: 0.5 },
      { transform: `translateY(0) rotateY(${turns}deg)` },
    ], { duration: quick ? 200 : 1500, delay: 300, easing: "cubic-bezier(0.3, 0.6, 0.4, 1)", fill: "forwards" });
    spin.finished.catch(() => {}).then(() => {
      audio.sfx.ding();
      result.textContent = `${race.racers[winner].name.toUpperCase()} WINS THE TOSS! ${race.racers[1 - winner].name.toUpperCase()} GETS HALF.`;
      box.classList.add("landed", "w" + (winner + 1));
      setTimeout(() => { o.textContent = ""; resolve(); }, 1400);
    });
  });
}

function revealCard(r, res, i) {
  const t = TIERS[res.tier];
  return h("div", { class: `reveal-card p${i + 1} tier${res.tier}` },
    h("div", { class: "reveal-who", text: r.name }),
    h("div", { class: "reveal-answer", text: (res.display || "(no answer)").toUpperCase() }),
    tierBadge(res.tier),
    h("div", { class: "reveal-gain", text: `+${roundMetres(res, r.power, r.useNitro, race.crazy).toLocaleString("en-US")} M` + (r.useNitro && res.tier ? " · NITRO" : "") + (res.bump ? (res.half ? " · LOST THE TOSS, HALF" : " · WON THE TOSS") : "") }));
}

// Live check for answers that aren't on the list (src/check.js). Remembered per prompt, so a repeated
// guess doesn't ask again. Offline (or in the preview) it just finds nothing.
const onlineSeen = new Map();
const onlinePending = new Map(); // lookups still in flight, shared by the typing prefetch and the GO press
function checkOnline(index, value) {
  const k = index.prompt + "|" + normalize(value);
  if (onlineSeen.has(k)) return Promise.resolve(onlineSeen.get(k));
  if (onlinePending.has(k)) return onlinePending.get(k);
  const p = lookupOnline(index, value, k).finally(() => onlinePending.delete(k));
  onlinePending.set(k, p);
  return p;
}
// The answer as typed so far, already answered? (no network, no waiting)
const onlineKnown = (index, value) => onlineSeen.has(index.prompt + "|" + normalize(value));
async function lookupOnline(index, value, k) {
  let hit = null;
  let settled = false; // a real yes/no from the server; a failed lookup is not remembered, so a retry can pass
  try {
    const res = await fetch("/api/vroomillion/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: index.prompt, answer: value }),
      signal: AbortSignal.timeout(10000), // Wikidata, then the AI judge for catalog prompts
    });
    if (res.ok) {
      settled = true;
      const j = await res.json();
      if (j.found && typeof j.label === "string") hit = j;
    }
  } catch { /* offline: nothing found */ }
  // "starting with" twists: the real answer must still start with the letter
  if (hit && index.letter && normalize(hit.label)[0] !== index.letter) hit = null;
  if (settled) onlineSeen.set(k, hit);
  return hit;
}
// Found online = not on our lists = rare. Never a One in a Vroomillion (those are hand-picked).
function onlineTier(hit) {
  if (Number.isInteger(hit.tier) && hit.tier >= 1 && hit.tier <= 4) return hit.tier; // the AI judge's verdict
  const [t2, t3] = Array.isArray(hit.tiers) ? hit.tiers : [70, 25];
  return hit.n >= t2 ? 2 : hit.n >= t3 ? 3 : 4;
}

// Shows the input for one human and resolves with what they typed.
// Only a right answer (or the timer running out) ends the turn.
function askAnswer(r, i, token, index) {
  return new Promise((resolve) => {
    const zone = $("answer-zone");
    const input = $("answer");
    const fill = $("timer-fill");
    const nitroBtn = $("btn-nitro");
    const hidden = !race.solo && !race.online; // same-screen 2P hides answers; online doesn't need to
    const ring = $("ring-fg");
    const secs = $("secs");
    $("q-hint").classList.remove("hidden");
    zone.classList.remove("hidden");
    zone.dataset.player = String(i + 1);
    input.value = "";
    const feedback = $("feedback");
    feedback.textContent = "";
    feedback.className = "feedback";
    input.type = hidden ? "password" : "text";
    input.autocomplete = hidden ? "new-password" : "off";
    $("turn").textContent = race.solo || race.online ? "" : `${r.name} — TYPE IT (HIDDEN). OTHER PLAYER LOOK AWAY!`;
    r.useNitro = false;
    const drawNitro = () => {
      const narrow = window.innerWidth < 520;
      nitroBtn.textContent = r.useNitro ? (narrow ? "N2O ON" : "NITRO ARMED ×1.5") : `${narrow ? "N2O" : "NITRO"} ×${r.nitro}`;
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
      input.value = "";
      resolve(res);
    };
    // A typo is never sent on its own: the fix shows up as they type, Enter puts it in the box,
    // and Enter / GO again uses it. A fixed typo scores the same as the real answer.
    let suggestion = null;
    let checking = false; // an online check is running for the last GO; further presses wait for it
    const offer = (fix) => {
      suggestion = fix;
      input.value = fix.display;
      audio.sfx.click();
      say(`DID YOU MEAN "${fix.display.toUpperCase().slice(0, 28)}"? PRESS GO TO USE IT`, "fix");
      input.focus({ preventScroll: true });
      input.select();
    };
    const submit = (timedOut = false) => {
      if (finished) return;
      if (token !== raceToken) { end(); return resolve(stalled); }
      const value = input.value;
      if (suggestion && normalize(value) === suggestion.key) return lockIn(suggestion);
      suggestion = null;
      const res = judge(index, value);
      if (res.tier > 0 && res.corrected && !timedOut) return offer(res);
      if (res.tier > 0) return lockIn(res);
      if (timedOut) {
        end();
        input.value = "";
        return resolve(stalled);
      }
      // Not on our list: ask the online check (usually already started while they typed) and give one
      // verdict. CHECKING… shows meanwhile; after 3 s with no answer it's a no, so there's never a
      // wrong-then-right flip. A late "yes" is still remembered for the next time someone tries it.
      if (index.prompt && value.trim().length >= 3) {
        const same = (a) => normalize(a).replace(/ /g, "");
        const asFound = (hit) => ({ tier: onlineTier(hit), display: hit.label, key: normalize(hit.label), online: true });
        const verdict = (hit) => {
          if (hit) return same(hit.label) === same(value) ? lockIn(asFound(hit)) : offer({ ...asFound(hit), corrected: true });
          return reject(value);
        };
        if (onlineKnown(index, value)) return verdict(onlineSeen.get(index.prompt + "|" + normalize(value)));
        if (checking) return;
        checking = true;
        say("CHECKING…", "checking");
        Promise.race([checkOnline(index, value), new Promise((r) => setTimeout(() => r(null), 3000))]).then((hit) => {
          checking = false;
          if (finished || token !== raceToken) return;
          // they've started typing something new meanwhile: a "no" doesn't wipe it
          if (!hit && normalize(input.value) !== normalize(value)) return reject(value, true);
          verdict(hit);
        });
        return;
      }
      reject(value);
    };
    // Wrong: keep the clock running and let them try again.
    const reject = (value, keepInput = false) => {
      audio.sfx.deny();
      input.classList.remove("shake");
      void input.offsetWidth;
      input.classList.add("shake");
      if (!value.trim()) say("TYPE SOMETHING!", "bad");
      else say(hidden ? "NOT ON THE LIST — TRY AGAIN!" : `"${value.trim().toUpperCase().slice(0, 24)}" ISN'T ON THE LIST — TRY AGAIN!`, "bad");
      if (!keepInput) input.value = "";
      input.focus({ preventScroll: true });
    };
    const onKey = (e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } };
    const onGo = () => submit();
    // Look answers up while they type: a short pause after typing an answer that isn't on our list
    // starts the Wikidata check, so by the time they press GO the result is usually already here.
    let prefetch = 0;
    // The fix for a typo shows the moment it's typed ("DID YOU MEAN ..."), without sending anything.
    const hint = (value, fix) => {
      if (input.value !== value || finished) return;
      const text = fix && `DID YOU MEAN "${fix.toUpperCase().slice(0, 28)}"? PRESS ENTER`;
      if (text) { if (feedback.textContent !== text) say(text, "fix hint"); }
      else if (feedback.classList.contains("hint")) { feedback.textContent = ""; feedback.className = "feedback"; }
    };
    const liveHints = !!race.daily || save.deck === "classic";
    const onInput = () => {
      audio.sfx.key();
      clearTimeout(prefetch);
      const value = input.value;
      if (suggestion && normalize(value) !== suggestion.key) suggestion = null;
      const res = value.trim().length >= 4 ? judge(index, value) : { tier: 0 };
      // typing hints only in regular (CLASSIC) races; GEARHEAD and HARD MODE show the fix after Enter
      if (liveHints) hint(value, res.tier > 0 && res.corrected && !res.partial ? res.display : null);
      if (!index.prompt || value.trim().length < 3 || res.tier > 0) return; // on our list: nothing to look up
      prefetch = setTimeout(() => {
        if (finished || token !== raceToken || input.value !== value) return;
        checkOnline(index, value).then((hit) => {
          const same = (a) => normalize(a).replace(/ /g, "");
          if (liveHints && hit && same(hit.label) !== same(value)) hint(value, hit.label);
        });
      }, 220);
    };
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
      const frac = Math.max(0, left / ANSWER_SECONDS);
      fill.style.transform = `scaleX(${frac})`;
      fill.classList.toggle("low", left < 6);
      ring.style.strokeDashoffset = String(100 - frac * 100);
      ring.classList.toggle("low", left < 6);
      secs.textContent = String(Math.max(0, Math.ceil(left)));
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

function destResult({ dest, newStamp, carUnlocked, top, car, blocked }) {
  const next = DESTINATIONS.find((d) => d.min > dest.min && (d.min > top || blocked === d));
  const needs = (d) => (car && classRank(car.cls) < classRank(d.cls) ? ` · NEEDS A CLASS ${d.cls} CAR` : "");
  return h("div", { class: "dest-result" + (dest.exclusive ? " exclusive" : "") },
    h("div", { class: "note", text: "THIS RACE TOOK YOU TO" }),
    h("div", { class: "dest-name", text: dest.name }),
    h("div", { class: "note", text: [newStamp ? "NEW PASSPORT STAMP!" : "", carUnlocked ? "GOLD CAR UNLOCKED: THE VROOMILLIONAIRE" : "",
      blocked ? `YOU WENT FAR ENOUGH FOR ${blocked.name}, BUT IT NEEDS A CLASS ${blocked.cls} CAR` : "",
      next && next !== blocked ? `NEXT: ${next.exclusive ? "??? (EXCLUSIVE)" : next.name} AT ${next.min.toLocaleString("en-US")} M${needs(next)}` : !next ? "YOU'VE BEEN EVERYWHERE." : ""].filter(Boolean).join(" · ") }),
    h("div", { class: "dest-actions" },
      newStamp || dest.exclusive ? shareButtons(dest, save.passport[dest.id] || top) : null,
      h("button", { class: "btn small", type: "button", text: "OPEN PASSPORT", onclick: () => { audio.sfx.click(); show("passport"); } })));
}

// SHARE (the phone's share sheet: TikTok, Instagram, Messages...) and SAVE IMAGE for a passport stamp.
function shareButtons(dest, best, small = false) {
  const stamps = () => [Object.keys(save.passport).length, DESTINATIONS.length];
  const cls = "btn small share" + (small ? " tiny" : "");
  const busy = async (btn, job, done) => {
    audio.sfx.click();
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = "MAKING…";
    try { const r = await job(); btn.textContent = r === "saved" || done ? "SAVED!" : label; } catch { btn.textContent = "TRY AGAIN"; }
    btn.disabled = false;
    setTimeout(() => { btn.textContent = label; }, 2000);
  };
  const share = h("button", { class: cls, type: "button", text: small ? "SHARE" : "SHARE STAMP",
    onclick: () => busy(share, () => shareCard(dest, best, stamps())) });
  const saveBtn = h("button", { class: cls, type: "button", text: small ? "SAVE" : "SAVE IMAGE",
    onclick: () => busy(saveBtn, () => saveShareCard(dest, best, stamps()), true) });
  return h("span", { class: "share-row" }, share, saveBtn);
}

// The passport: a little book. The cover opens, pages flip (buttons, swipe, arrow keys, or tap a
// side of the book), and every place you've reached is a sticker. Tap a sticker to see its picture big,
// with SHARE and SAVE. Wide screens show two pages at a time, phones one.
let ppTurn = null; // the open passport's page turner, for the arrow keys
function renderPassport() {
  const root = $("passport-grid");
  root.textContent = "";
  root.className = "pp-wrap";
  const got = Object.keys(save.passport).length;
  $("passport-count").textContent = `${got} OF ${DESTINATIONS.length} STAMPS`;
  const narrow = window.innerWidth < 720;
  const page = (cls, ...kids) => h("div", { class: "pp-page " + cls }, ...kids);
  const pages = [ppIdPage(got, page)];
  for (let k = 0; k < DESTINATIONS.length; k += 2) {
    pages.push(page("pp-visas", h("div", { class: "pp-head", text: `VISAS · ${pages.length}` }),
      h("div", { class: "pp-stamps" }, ...DESTINATIONS.slice(k, k + 2).map((d, n) => ppSticker(d, k + n, got)))));
  }
  const cover = h("div", { class: "pp-cover" },
    h("div", { class: "pp-crest" }, h("span", { class: "pp-wheel" })),
    h("div", { class: "pp-cover-title", text: "VROOMILLION" }),
    h("div", { class: "pp-cover-sub", text: "PASSPORT" }),
    h("div", { class: "pp-cover-count", text: `${got} / ${DESTINATIONS.length} STAMPS` }),
    h("div", { class: "pp-cover-tap", text: "TAP TO OPEN" }));
  const endpaper = () => page("pp-end", h("div", { class: "pp-seal", text: "VROOM" }), h("div", { class: "pp-note", text: "MORE PLACES THE FURTHER YOU DRIVE" }));
  const faces = [cover, ...pages];
  const leaves = [];
  if (narrow) for (const f of faces) leaves.push([f, page("pp-blank")]);
  else for (let i = 0; i < faces.length; i += 2) leaves.push([faces[i], faces[i + 1] || endpaper()]);
  const els = leaves.map(([front, back]) => h("div", { class: "pp-leaf" }, h("div", { class: "pp-face front" }, front), h("div", { class: "pp-face back" }, back)));
  const book = h("div", { class: "pp-book" + (narrow ? " single" : "") }, ...els);
  const prev = h("button", { class: "btn small", type: "button", text: "PREV" });
  const next = h("button", { class: "btn small", type: "button", text: "NEXT" });
  const label = h("span", { class: "pp-label" });
  let flipped = 0;
  const draw = () => {
    els.forEach((el, i) => { el.classList.toggle("flipped", i < flipped); if (!el.classList.contains("turning")) el.style.zIndex = String(i < flipped ? i + 1 : leaves.length - i); });
    book.classList.toggle("closed", flipped === 0);
    book.classList.toggle("ended", flipped === leaves.length);
    prev.disabled = flipped === 0;
    next.disabled = flipped === leaves.length;
    label.textContent = flipped === 0 ? "CLOSED" : flipped === leaves.length ? "THE END" : narrow ? `PAGE ${flipped} OF ${leaves.length - 1}` : `PAGES ${flipped * 2 - 1}–${flipped * 2}`;
  };
  const turn = (dir) => {
    const n = Math.max(0, Math.min(leaves.length, flipped + dir));
    if (n === flipped) return;
    const el = els[dir > 0 ? flipped : n]; // the leaf that's moving goes over the others while it turns
    el.classList.add("turning");
    el.style.zIndex = "60";
    setTimeout(() => { el.classList.remove("turning"); draw(); }, 760);
    flipped = n;
    audio.sfx.click();
    draw();
  };
  ppTurn = turn;
  prev.addEventListener("click", () => turn(-1));
  next.addEventListener("click", () => turn(1));
  // tap the right side to go on, the left to go back; swipe works too
  let downX = null;
  book.addEventListener("pointerdown", (e) => { downX = e.clientX; });
  book.addEventListener("pointerup", (e) => {
    if (downX == null) return;
    const dx = e.clientX - downX;
    downX = null;
    if (e.target.closest(".pp-sticker")) return;
    if (Math.abs(dx) > 40) return turn(dx < 0 ? 1 : -1);
    const box = book.getBoundingClientRect();
    if (flipped === 0) return turn(1);
    turn(e.clientX - box.left > box.width * (narrow ? 0.3 : 0.5) ? 1 : -1);
  });
  root.append(book, h("div", { class: "pp-nav" }, prev, label, next));
  draw();
}

// the inside cover: who you are and how far you've gone
function ppIdPage(got, page) {
  const name = (account?.nickname && !/^RACER /.test(account.nickname) ? account.nickname : save.onlineName || "DRIVER").toUpperCase();
  const car = carById(save.car);
  const field = (k, v) => h("div", { class: "pp-field" }, h("span", { class: "pp-k", text: k }), h("span", { class: "pp-v", text: v }));
  const mrz = `P<VRM<${name.replace(/[^A-Z0-9]/g, "<")}<<<<<<<<<<<<<<<<<<<<<<<<`.slice(0, 30);
  return page("pp-id",
    h("div", { class: "pp-head", text: "PASSPORT · PASSEPORT · PASAPORTE" }),
    h("div", { class: "pp-id-top" }, h("div", { class: "pp-photo" }, h("span", { class: "pp-wheel dark" })),
      h("div", {}, field("NAME", name), field("CAR", car.name.toUpperCase()), field("CLASS", car.cls))),
    field("BEST RUN", save.best ? `${Math.round(save.best).toLocaleString("en-US")} M` : "—"),
    field("RACES", String(save.races || 0)),
    field("STAMPS", `${got} OF ${DESTINATIONS.length}`),
    field("VROOMILLIONS", String(save.vrooms || 0)),
    h("div", { class: "pp-mrz", text: mrz }),
    h("div", { class: "pp-mrz", text: `${String(save.races || 0).padStart(6, "0")}<${String(got)}VRM<<<<<<<<<<<<<<<<<<<<`.slice(0, 30) }));
}

// a visited place is a sticker you can tap; one you haven't reached is an empty slot
function ppSticker(d, idx, got) {
  const best = save.passport[d.id];
  const cv = h("canvas", { class: "pp-art", width: 192, height: 108, "aria-hidden": "true" });
  try { const sc = new ChaseScene(cv); sc.resize(192, 108, 100); sc.preview(d.id); } catch { /* preview is decoration only */ }
  if (!best) {
    return h("div", { class: "pp-slot" + (d.exclusive ? " exclusive" : "") }, cv,
      h("div", { class: "pp-slot-name", text: d.exclusive ? "??? EXCLUSIVE ???" : d.name }),
      h("div", { class: "pp-slot-need", text: d.min ? `REACH ${d.min.toLocaleString("en-US")} M · CLASS ${d.cls}+ CAR` : "FINISH ANY RACE" }));
  }
  const el = h("button", { class: "pp-sticker" + (d.exclusive ? " gold" : ""), type: "button", "aria-label": `${d.name}. Best ${best.toLocaleString("en-US")} metres. Open the picture` },
    cv, h("div", { class: "pp-sticker-name", text: d.name }),
    h("div", { class: "pp-best", text: `BEST ${best.toLocaleString("en-US")} M` }),
    h("div", { class: "pp-ink", text: "VISITED" }));
  el.style.setProperty("--tilt", [-4, 3, -2, 5, -3, 2, -5, 4, -1][idx % 9] + "deg");
  el.addEventListener("click", (e) => {
    e.stopPropagation();
    audio.sfx.click();
    el.classList.add("lift");
    setTimeout(() => { el.classList.remove("lift"); openStamp(d, best, got); }, 320);
  });
  return el;
}

// the picture for a place, shown big on the page, with SHARE and SAVE
async function openStamp(d, best, got) {
  closeStamp();
  const shot = h("div", { class: "pp-shot", text: "DEVELOPING…" });
  const close = h("button", { class: "btn", type: "button", text: "CLOSE", onclick: () => { audio.sfx.click(); closeStamp(); } });
  const box = h("div", { class: "pp-viewer-box" }, shot, h("div", { class: "pp-viewer-name", text: d.name }), h("p", { class: "note", text: d.blurb }), shareButtons(d, best), close);
  const v = h("div", { class: "pp-viewer", id: "pp-viewer", role: "dialog", "aria-modal": "true", "aria-label": d.name }, box);
  v.addEventListener("click", (e) => { if (e.target === v) closeStamp(); });
  document.body.append(v);
  close.focus({ preventScroll: true });
  try {
    const cv = await drawShareCard(d, best, [got, DESTINATIONS.length]);
    cv.className = "pp-card";
    cv.setAttribute("role", "img");
    cv.setAttribute("aria-label", `${d.name} passport stamp`);
    shot.textContent = "";
    shot.append(cv);
  } catch { shot.textContent = "COULDN'T DRAW THE PICTURE"; }
}
function closeStamp() { $("pp-viewer")?.remove(); }
document.addEventListener("keydown", (e) => {
  if (current !== "passport") return;
  if (e.key === "Escape" && $("pp-viewer")) { closeStamp(); return; }
  if ($("pp-viewer") || !ppTurn) return;
  if (e.key === "ArrowRight") ppTurn(1);
  else if (e.key === "ArrowLeft") ppTurn(-1);
});

function finish(token) {
  if (token !== raceToken) return;
  const [a, b] = race.racers;
  const winner = race.solo ? 0 : a.dist === b.dist ? -1 : a.dist > b.dist ? 0 : 1;
  audio.engineStop();
  scene.speed = 0.3;

  let pay;
  let title;
  let newBest = false;
  if (race.solo) {
    pay = soloPayout(a.dist, a.car, a.tiers);
    newBest = !race.crazy && a.dist > save.best; // a CRAZY MODE run never sets your best
    if (newBest) save.best = a.dist;
    title = newBest && save.races > 0 ? "NEW BEST!" : race.daily ? `DAILY RACE ${race.daily} DONE` : "RUN COMPLETE";
    if (race.daily && dailyDone(save, dday())[race.daily] != null) save.daily = markDaily(save, dday(), race.daily, a.dist);
    save.vrooms += a.tiers.filter((t) => t === 5).length;
    save.deep += a.tiers.filter((t) => t === 4).length;
  } else {
    const w = winner === -1 ? a : race.racers[winner];
    pay = race.online ? payout(1500, winner === race.online.seat, race.racers[race.online.seat].tiers) : payout(1500, winner !== -1, w.tiers);
    title = winner === -1 ? "DEAD HEAT" : race.online && winner === race.online.seat ? "YOU WIN!" : `${w.name} WINS!`;
    for (const r of race.racers) {
      save.vrooms += r.tiers.filter((t) => t === 5).length;
      save.deep += r.tiers.filter((t) => t === 4).length;
    }
  }
  // daily race: keep the streak going (days in a row) for a bonus, once a day
  let streakBonus = 0;
  if (race.daily) {
    const t = dday(), y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const st = save.streak || { count: 0, day: null };
    if (st.day !== t) {
      save.streak = { count: Math.max(st.day === y ? st.count + 1 : 1, account?.streakDay === y ? (account.streak || 0) + 1 : 0), day: t };
      streakBonus = STREAK_BONUS * Math.min(STREAK_CAP, save.streak.count);
    }
  }
  sendRoundStats();
  save.races++;
  save.cash += pay.total + streakBonus;
  persist();

  const happy = race.solo ? newBest || a.tiers.includes(5) : winner !== -1;
  if (happy) { audio.sfx.win(); scene.confetti(); } else audio.sfx.lose();
  setTimeout(() => { audio.sfx.cash(); renderCash(true); }, 900);

  $("result-title").textContent = title;
  $("result-title").className = "result-title " + (happy ? "good" : "bad");
  const body = $("result-body");
  body.textContent = "";
  body.append(...[
    h("div", { class: "final" },
      ...race.racers.map((r, i) => h("div", { class: `final-card p${i + 1}` + (i === winner ? " winner" : "") },
        spriteCanvas(r.car, 4),
        h("div", { class: "hud-name", text: r.name }),
        h("div", { class: "dist", text: Math.round(r.dist).toLocaleString("en-US") + " M" }),
        race.solo ? h("div", { class: "note", text: newBest ? "PERSONAL BEST" : `BEST ${Math.round(save.best).toLocaleString("en-US")} M` }) : null))),
    race.arrival ? destResult(race.arrival) : null,
    race.daily ? dailyBoardSlot(race.daily, a) : null,
    h("div", { class: "payout" },
      h("div", { text: race.solo || race.online ? "PRIZE MONEY" : "PRIZE (SHARED GARAGE)" }),
      h("div", { class: "payout-total", text: "+" + money(pay.total + streakBonus) }),
      streakBonus ? h("div", { class: "note good", text: `${save.streak.count}-DAY STREAK BONUS +${money(streakBonus)}` }) : null,
      h("div", { class: "note", text: race.solo
        ? `${money(pay.base)} FOR ${Math.round(a.dist).toLocaleString("en-US")} M IN THE ${a.car.name.toUpperCase()} · ${money(pay.bonus)} NICHE BONUS`
        : `${money(pay.base)} RACE · ${money(pay.bonus)} NICHE BONUS` })),
    FREE_PLAY || unlimitedNow() ? null : h("div", { class: "daily-next" },
      h("div", { text: dailyLeft(save, dday()) > 0 ? `${dailyLeft(save, dday())} DAILY RACE${dailyLeft(save, dday()) === 1 ? "" : "S"} LEFT TODAY` : (DAILY_RACES === 1 ? `NEW DAILY RACE IN ${timeLeft()}` : `NEW DAILY RACES IN ${timeLeft()}`) }),
      h("button", { class: "btn big unlock-cta", type: "button", text: "GO UNLIMITED — $5", onclick: () => { audio.sfx.click(); openPaywall("used"); } })),
    h("div", { class: "log" },
      ...a.log.map((row, i) => h("div", { class: "log-row" },
        h("div", { class: "log-q", text: `${i + 1}. ${row.q.toUpperCase()}` }),
        ...race.racers.map((r, pi) => h("div", { class: `log-a p${pi + 1}` },
          h("span", { class: "log-text", text: r.log[i].answer.toUpperCase() }),
          tierBadge(r.log[i].tier, "span", true),
          reportLink(row.q, r.log[i])))))),
  ].filter(Boolean));
  const paid = canRace(me(), dayKey(), { mode: race.solo ? "solo" : "versus", deck: save.deck });
  const left = leftInMode();
  const dailyNext = race.daily && !paid ? nextDaily(save, dday()) : 0;
  $("btn-again").textContent = dailyNext ? `DAILY RACE ${dailyNext}` : !paid ? "NEW RACE — $5" : left ? `RACE #${(racesRun() + 1).toLocaleString("en-US")}` : "NO NEW PROMPTS";
  $("btn-again").disabled = paid && !left;
  $("btn-redo").textContent = paid ? "REDO THIS RACE" : "REDO — $5";
  // online: "again" goes back to the online screen; "redo" becomes REMATCH with the same friend
  if (race.online) {
    $("btn-again").textContent = "NEW ONLINE RACE"; $("btn-again").disabled = false;
    const o = race.online;
    rematch = { code: o.code, token: o.token, seat: o.seat, deck: o.deck, name: o.players[o.seat]?.name || "RACER",
      friend: (o.players[1 - o.seat]?.name || "FRIEND").toUpperCase(), prompts: race.questions.map((q) => q.q), asked: false, ask: false, next: null, crazy: race.crazy, equal: !!race.setup.equal };
    drawRematch();
  } else { rematch = null; $("btn-redo").disabled = false; }
  show("results");
  if (rematch) rematchPoll(rematch);
}

// ---------- wiring ----------
// Browsers only allow sound after the first tap or key press.
const firstTouch = () => audio.unlock();
document.addEventListener("pointerdown", firstTouch);
document.addEventListener("keydown", firstTouch);

document.addEventListener("click", (e) => {
  const go = e.target.closest("[data-go]");
  if (go) { audio.sfx.click(); overlay(""); show(go.dataset.go); }
});
$("btn-home").addEventListener("click", () => { overlay(""); show("title"); });
$("btn-1p").addEventListener("click", () => { audio.sfx.click(); show("leagues"); });
$("btn-2p").addEventListener("click", () => { audio.sfx.click(); show("versus"); });
$("btn-online").addEventListener("click", () => { audio.sfx.click(); show("online"); });
$("btn-garage").addEventListener("click", () => { audio.sfx.click(); show("garage"); });
$("btn-passport").addEventListener("click", () => { audio.sfx.click(); show("passport"); });
$("btn-results-garage").addEventListener("click", () => { audio.sfx.click(); show("garage"); });
$("btn-how").addEventListener("click", () => { audio.sfx.click(); show("how"); });
$("btn-quit").addEventListener("click", () => { audio.sfx.deny(); overlay(""); show("title"); });
$("btn-again").addEventListener("click", () => {
  audio.sfx.click();
  if (rematch) { clearTimeout(rematch.poll); rematch = null; online = null; return show("online"); }
  if (!lastSetup) return;
  const next = lastSetup.daily && !unlimitedNow() && !FREE_PLAY ? nextDaily(save, dday()) : 0;
  startRace(next ? { mode: "solo", daily: next } : { ...lastSetup, daily: 0, redo: false });
});
$("btn-redo").addEventListener("click", () => {
  if (rematch) return rematchGo();
  audio.sfx.click(); if (lastSetup) startRace({ ...lastSetup, redo: true });
});
$("btn-start-1p").addEventListener("click", () => { audio.sfx.click(); startRace({ mode: "solo", crazy: !!save.crazy }); });
$("btn-account").addEventListener("click", () => { audio.sfx.click(); show("account"); });
$("btn-start-2p").addEventListener("click", () => {
  audio.sfx.click();
  const clean = (id, fallback) => ($(id).value.trim().toUpperCase().slice(0, 10) || fallback);
  startRace({ mode: "versus", names: [clean("name-p1", "P1"), clean("name-p2", "P2")], cars: [versus.p1, versus.p2], crazy: !!save.crazy, equal: !!save.equalCars });
});
function toggleSound() {
  save.muted = !save.muted;
  persist();
  audio.setMuted(save.muted);
  if (!save.muted) { audio.unlock(); audio.sfx.click(); }
  renderSound();
}
$("btn-sound").addEventListener("click", toggleSound);
$("btn-sound-race").addEventListener("click", toggleSound);
// refresh the "next free run" countdown on the title screen
setInterval(() => { if (current === "title") renderDaily(); }, 30000);

audio.setMuted(save.muted);
renderSound();
renderCash(false);
renderLegend();
show(linkCode ? "online" : "title"); // a race link opens the join screen
refreshAccount();
// progress brought back from the server copy: redraw with it
restoring.then((ok) => { if (ok && current !== "race") { renderCash(); show(current); } });
