import { QUESTIONS as HAND_WRITTEN } from "./data.js";
import { CARS, CLASSES, carById, carSprite } from "./cars.js";
import {
  TIERS, ROUNDS, ANSWER_SECONDS, buildIndex, judge, metresFor, applyFenderBender,
  pickQuestions, payout, soloPayout, exampleAnswer, deckQuestions,
  dayKey, msUntilTomorrow, canRace, useFreeRace, freeLeft, isFreeKind, FREE_RACES, pickFresh, promptsLeft, makeVariants, FREE_PLAY, normalize,
  DESTINATIONS, destinationFor, EXCLUSIVE_CAR,
} from "./logic.js";
import * as audio from "./audio.js";
import { Scene } from "./scene.js";
import { ChaseScene } from "./chase.js";
import { prefetchDeep, deepAnswers } from "./deep.js";

// hand-written prompts plus the "starting with" / "ending in" / "exactly N letters" ones made from them
const QUESTIONS = [...HAND_WRITTEN, ...makeVariants(HAND_WRITTEN)];

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
let save = fresh();
try {
  const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
  if (raw && Array.isArray(raw.owned)) save = { ...save, ...raw };
} catch { /* private mode or bad data: start fresh */ }
if (!save.passport || typeof save.passport !== "object") save.passport = {};
if (!save.owned.includes(save.car)) save.car = save.owned[0] || "rustbucket";
// Unlimited comes from the logged-in account on the server, never from this save.
delete save.unlimited;
delete save.receipt;
const persist = () => {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* ignore */ }
};

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
  const vw = window.innerWidth;
  const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  document.documentElement.style.setProperty("--vvh", vh + "px");
  const iw = Math.max(440, Math.min(840, Math.round(vw / 1.6))); // 16-bit: twice the old art resolution
  const k = vw / iw;
  const ih = Math.round(vh / k);
  const dock = Math.ceil((vw < 600 ? 150 : 128) / k); // room for the answer bar
  scene.resize(iw, ih, ih - dock - 6); // nearest car sits just above the answer bar
  requestAnimationFrame(fitCard);
}

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
  const carsTop = scene.coverTop() * k; // roof + name tag of the nearest car
  const top = card.parentElement.getBoundingClientRect().top;
  const room = Math.max(90, Math.floor(carsTop - top - 6));
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
function timeLeft() {
  const m = Math.ceil(msUntilTomorrow() / 60000);
  return m >= 60 ? `${Math.floor(m / 60)}H ${m % 60}M` : `${m}M`;
}

function renderDaily() {
  const box = $("daily");
  box.textContent = "";
  const today = dayKey();
  if (FREE_PLAY) {
    box.append(h("div", { class: "daily-line good", text: "★ FREE PLAY — RACE AS MUCH AS YOU LIKE" }));
  } else if (unlimitedNow()) {
    box.append(h("div", { class: "daily-line good", text: `★ UNLIMITED — ${account.email.toUpperCase()}` }));
  } else if (freeLeft(save, today) > 0) {
    const n = freeLeft(save, today);
    box.append(h("div", { class: "daily-line good", text: `${n} FREE 1P RACE${n === 1 ? "" : "S"} LEFT TODAY` }));
  } else {
    box.append(
      h("div", { class: "daily-line", text: `TODAY'S ${FREE_RACES} FREE RACES ARE USED · MORE IN ${timeLeft()}` }),
      h("button", { class: "btn big unlock-cta", type: "button", text: "GO UNLIMITED — $5", onclick: () => { audio.sfx.click(); openPaywall("used"); } }));
  }
}

// ---------- accounts ----------
let account = null; // { email, unlimited } from the server, or null when logged out / offline
const unlimitedNow = () => account?.unlimited === true;
const me = () => ({ ...save, unlimited: unlimitedNow() });

// Talk to the account API. Throws "offline" when there's no server (e.g. the artifact preview).
async function api(path, options = {}) {
  const res = await fetch("/api/vroomillion/" + path, {
    cache: "no-store",
    ...options,
    headers: options.body ? { "content-type": "application/json" } : {},
  });
  if (!(res.headers.get("content-type") || "").includes("json")) throw new Error("offline");
  return { res, body: await res.json().catch(() => ({})) };
}

async function refreshAccount() {
  try {
    const { res, body } = await api("me");
    account = res.ok ? body : null;
    // an admin gave this player today's free races back
    if (account?.freeResetAt > (save.freeResetAt || 0)) {
      if (dayKey(new Date(account.freeResetAt)) === dayKey()) save.freeUsed = 0;
      save.freeResetAt = account.freeResetAt;
      persist();
    }
  } catch {
    account = null;
  }
  if (current === "title") renderDaily();
  if (current === "paywall") renderPaywall();
  if (current === "account") renderAccount();
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
        account = { email: body.email, unlimited: body.unlimited };
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
      account = { email: body.email, unlimited: body.unlimited };
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
  show("title");
}

let paywallReason = "used"; // "used" (no free races left) or "mode" (a mode free players don't get)
function openPaywall(reason) { paywallReason = reason; show("paywall"); }
function renderPaywall() {
  $("pay-lead").textContent = paywallReason === "mode"
    ? "2P VERSUS, GEARHEAD and HARD MODE are part of Unlimited."
    : freeLeft(save, dayKey()) > 0
      ? "Race as often as you like, in every mode, every day."
      : `You've used today's ${FREE_RACES} free races. More in ${timeLeft()}.`;
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
    h("div", { class: "daily-line" + (account.unlimited ? " good" : ""), text: account.unlimited ? (account.admin ? "★ ADMIN · UNLIMITED" : "★ UNLIMITED") : `FREE PLAYER — ${FREE_RACES} 1P RACES A DAY` }),
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

function renderAdmin() {
  const box = $("admin-box");
  box.textContent = "";
  if (!account?.admin) { box.append(h("p", { class: "note", text: "Log in with an admin account." })); return; }
  const stats = h("div", { class: "admin-stats", text: "Loading stats…" });
  const email = h("input", { type: "email", maxlength: "254", placeholder: "player@email.com", "aria-label": "Player email", autocomplete: "off" });
  const msg = h("p", { class: "pay-msg", role: "status", "aria-live": "polite" });
  const player = h("div", { class: "admin-player" });
  const showPlayer = (p) => {
    player.textContent = "";
    player.append(
      h("div", { class: "signed-in", text: p.email.toUpperCase() }),
      h("div", { class: "note", text: [p.admin ? "ADMIN" : null, p.unlimited ? "UNLIMITED" : "FREE PLAYER", p.paid ? "PAID" : null, "JOINED " + new Date(p.createdAt).toISOString().slice(0, 10)].filter(Boolean).join(" · ") }),
      h("div", { class: "admin-actions" },
        h("button", { class: "btn", type: "button", text: p.unlimited ? "REMOVE UNLIMITED" : "GIVE UNLIMITED", onclick: () => act({ action: "set-unlimited", email: p.email, unlimited: !p.unlimited }, p.unlimited ? "Unlimited removed." : "Unlimited given.") }),
        h("button", { class: "btn", type: "button", text: "GIVE TODAY'S FREE RACES BACK", onclick: () => act({ action: "reset-free", email: p.email }, "Done. Their free races reset next time they open the game while logged in.") })));
  };
  const act = async (body, done) => {
    msg.textContent = "Working…";
    try { const p = await adminCall(body); showPlayer(p); msg.textContent = done || ""; } catch (e) { msg.textContent = e.message; player.textContent = ""; }
  };
  const form = h("form", { class: "auth-form", novalidate: true },
    h("div", { class: "step-label", text: "FIND A PLAYER" }), email,
    h("button", { class: "btn big", type: "submit", text: "LOOK UP" }), msg, player);
  form.addEventListener("submit", (e) => { e.preventDefault(); audio.sfx.click(); act({ action: "lookup", email: email.value }); });
  box.append(stats, form);

  adminCall({ action: "stats" }).then((st) => {
    stats.textContent = "";
    const tile = (label, n) => h("div", { class: "admin-tile" }, h("div", { class: "admin-n", text: String(n) }), h("div", { class: "note", text: label }));
    stats.append(
      h("div", { class: "admin-tiles" }, tile("ACCOUNTS", st.users), tile("UNLIMITED", st.unlimited), tile("PAID", st.paid), tile("NEW (24H)", st.newToday)),
      h("div", { class: "step-label", text: "RACES STARTED (UTC DAYS)" }),
      h("table", { class: "admin-races" },
        h("tr", {}, ...["DAY", "1P", "GEAR", "HARD", "2P", "ALL"].map((t) => h("th", { text: t }))),
        ...st.races.map((r) => h("tr", {}, ...[r.day.slice(5), r["solo-classic"], r["solo-car"], r["solo-hard"], r.versus, r.total].map((v) => h("td", { text: String(v) }))))));
  }).catch((e) => { stats.textContent = e.message === "offline" ? "The admin screen needs the live site." : e.message; });
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
      ? `MODE ${modeName(save.deck)} · BEST ${Math.round(save.best).toLocaleString("en-US")} M · RACES ${save.races} · DEEP CUTS ${save.deep} · VROOMILLIONS ${save.vrooms}`
      : "NEW DRIVER. YOUR '92 RUSTBUCKET AWAITS.";
  }
  if (name === "leagues") renderLeagues();
  if (name === "paywall") renderPaywall();
  if (name === "account") renderAccount();
  if (name === "admin") renderAdmin();
  if (name === "versus") renderVersus();
  if (name === "garage") renderGarage();
  if (name === "passport") renderPassport();
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
const MODES = [
  { id: "classic", name: "CLASSIC", info: "SPORTS, SCREEN, MUSIC, PLACES" },
  { id: "car", name: "GEARHEAD", info: "CARS & RACING ONLY" },
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
const seenList = () => (Array.isArray(save.seen) ? save.seen : []);
const leftInMode = () => promptsLeft(deckQuestions(QUESTIONS, save.deck), seenList());

// "28 NEW PROMPTS LEFT" under the mode switch; when none are left, say what to do instead.
function renderPromptsLeft(el, startBtn, ready) {
  const left = leftInMode();
  el.className = "prompts-left" + (left ? "" : " none");
  el.textContent = left
    ? `${left.toLocaleString("en-US")} NEW PROMPT${left === 1 ? "" : "S"} LEFT IN ${modeName(save.deck)}${left < ROUNDS ? ` · LAST RACE IS ${left} ROUND${left === 1 ? "" : "S"}` : ""}`
    : `YOU'VE PLAYED ALL ${deckQuestions(QUESTIONS, save.deck).length.toLocaleString("en-US")} ${modeName(save.deck)} PROMPTS! START THEM OVER, TRY ANOTHER MODE, OR REDO A RACE FROM ITS RESULTS SCREEN.`;
  el.append(...(left ? [] : [h("button", { class: "btn small restart", type: "button", text: "START THE PROMPTS OVER", onclick: () => {
    audio.sfx.click();
    const mode = new Set(deckQuestions(QUESTIONS, save.deck).map((q) => q.q));
    save.seen = seenList().filter((t) => !mode.has(t));
    persist();
    show(current);
  } })]));
  startBtn.disabled = !left;
  if (!left) startBtn.textContent = "NO NEW PROMPTS";
  else ready();
}

function renderLeagues() {
  modeSwitch($("mode-solo"), renderLeagues);
  carPicker($("picker-solo"), () => save.car, (id) => { save.car = id; persist(); });
  $("best-solo").textContent = save.best ? Math.round(save.best).toLocaleString("en-US") + " M" : "—";
  const ok = canRace(me(), dayKey(), { mode: "solo", deck: save.deck });
  const n = freeLeft(save, dayKey());
  renderPromptsLeft($("left-solo"), $("btn-start-1p"), () => {
    $("btn-start-1p").textContent = ok
      ? (FREE_PLAY || unlimitedNow() ? "START RACE" : `START FREE RACE (${n} LEFT)`)
      : isFreeKind("solo", save.deck) ? "GO UNLIMITED — $5" : `${modeName(save.deck)} IS UNLIMITED — $5`;
  });
}

const versus = { p1: save.car, p2: save.car };
function renderVersus() {
  modeSwitch($("mode-2p"), renderVersus);
  renderPromptsLeft($("left-2p"), $("btn-start-2p"), () => {
    $("btn-start-2p").textContent = canRace(me(), dayKey(), { mode: "versus", deck: save.deck }) ? "START RACE" : "2P IS UNLIMITED — $5";
  });
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
  r.elSpeed = h("span", { class: "speedo", text: "READY" });
  return h("div", { class: "hud-card p" + (i + 1) },
    h("div", { class: "hud-name", text: r.name }),
    h("div", { class: "hud-car", text: r.car.name }),
    h("div", { class: "dist-row" }, r.elDist, r.elSpeed),
    race.solo ? h("div", { class: "hud-best", text: save.best ? `BEST ${Math.round(save.best).toLocaleString("en-US")} M` : "FIRST RUN" }) : null,
    h("div", { class: "hud-foot" }, r.elTier, r.elNitro));
}

// "+720 M" bursting up from a car, sized by how rare the answer was.
function popGain(i, metres, tier, nitro) {
  const at = scene.anchor(i);
  const el = h("div", { class: `gain-pop gp${tier}` },
    h("span", { class: "gain-m", text: tier ? `+${metres.toLocaleString("en-US")} M` : "STALLED" }),
    tier >= 4 ? h("span", { class: "gain-tag", text: tier === 5 ? "VROOMILLION!" : "DEEP CUT!" }) : null,
    nitro ? h("span", { class: "gain-tag nitro", text: "NITRO!" }) : null);
  el.style.left = (at.x * 100).toFixed(1) + "%";
  el.style.top = (at.y * 100).toFixed(1) + "%";
  $("pops").append(el);
  setTimeout(() => el.remove(), 1800);
}


// setup.redo replays setup.questions exactly; otherwise the race gets prompts never seen before.
function startRace(setup) {
  const today = dayKey();
  const kind = { mode: setup.mode === "solo" ? "solo" : "versus", deck: save.deck };
  if (!canRace(me(), today, kind)) {
    openPaywall(isFreeKind(kind.mode, kind.deck) ? "used" : "mode");
    return;
  }
  const questions = setup.redo && setup.questions?.length
    ? setup.questions
    : pickFresh(deckQuestions(QUESTIONS, save.deck), seenList(), ROUNDS);
  if (!questions.length) {
    // nothing new left in this mode: back to the setup screen, which explains
    show(setup.mode === "solo" ? "leagues" : "versus");
    return;
  }
  prefetchDeep(questions.map((q) => q.base || q.q)); // the long-tail answer lists, in the background
  lastSetup = { ...setup, redo: false, questions };
  if (!unlimitedNow() && !FREE_PLAY) Object.assign(save, useFreeRace(save, today));
  persist();
  // count the race for the admin stats (no personal data); fails quietly without a server
  api("race-start", { method: "POST", body: JSON.stringify({ kind: kind.mode === "versus" ? "versus" : "solo-" + (kind.deck || "classic") }) }).catch(() => {});
  const token = ++raceToken;
  const solo = setup.mode === "solo";
  const mk = (name, car) => ({ name, car, power: car.power, nitro: car.nitro, dist: 0, tiers: [], log: [], useNitro: false });
  const racers = solo
    ? [mk("YOU", carById(save.car))]
    : [mk(setup.names[0], carById(setup.cars[0])), mk(setup.names[1], carById(setup.cars[1]))];
  race = { token, solo, setup, racers, round: 0, questions };

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
  $("mode-label").textContent = modeName(save.deck);
  $("mode-label").className = "mode-tag mode-" + save.deck;
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
    $("q-kicker").textContent = `${topicOf(q)} · ${round + 1}/${rounds}`;
    // a prompt counts as seen once it's shown, so quitting early doesn't use up the rest
    if (!seenList().includes(q.q)) { save.seen = [...seenList(), q.q]; persist(); }
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
    for (let i = 0; i < race.racers.length; i++) {
      results[i] = await askAnswer(race.racers[i], i, token, index);
      if (!alive()) return;
    }
    const final = race.solo ? results : applyFenderBender(results[0], results[1]);
    const bumped = final.some((f) => f.bump);

    // reveal: everything else fades, the answer slams into the middle and the car smashes through it
    $("answer-zone").classList.add("hidden");
    $("q-hint").classList.add("hidden");
    $("q-card").classList.add("hidden");
    document.body.classList.add("smashing");
    const smashCards = final.map((res, i) => {
      const r = race.racers[i];
      const m = metresFor(res.tier, r.power, r.useNitro);
      return {
        who: race.solo ? "" : r.name.toUpperCase(),
        answer: (res.display || "NO ANSWER").toUpperCase(),
        tierName: TIERS[res.tier].name + (res.bump ? " (BUMPED)" : ""),
        gain: res.tier ? `+${m.toLocaleString("en-US")} M${r.useNitro ? " NITRO" : ""}` : "0 M",
        tier: res.tier,
        color: i ? "#ff4fd8" : "#4fd1ff",
      };
    });
    // The boost starts the moment each car breaks through its card, from the speed it hit it at,
    // so the car never slows down between the crash and the run up the road.
    const from = race.racers.map((r) => r.dist);
    const gain = race.racers.map((r, i) => metresFor(final[i].tier, r.power, r.useNitro));
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
      const tier = final[i].tier;
      const nitro = r.useNitro && tier > 0;
      const dur = BOOST_MS[tier] + (nitro ? 300 : 0);
      runs[i] = { t0: performance.now(), dur, b0: scene.racers[i].boost || 0, peak: (gain[i] / 1500) * 3, gears: 2 + tier, gear: 0, tier };
      scene.racers[i].nitro = nitro;
      scene.launch(i, tier, nitro, dur / 1000);
      popGain(i, gain[i], tier, nitro);
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
      $("hint").textContent = "FENDER BENDER! SAME ANSWER — BOTH DROP A TIER.";
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
    $("hint").textContent = (bumped ? "FENDER BENDER — BOTH DROPPED A TIER. " : "") + (best >= 5
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
  const top = Math.max(...race.racers.map((r) => r.dist));
  const dest = destinationFor(top);
  const newStamp = !(dest.id in save.passport);
  save.passport[dest.id] = Math.max(save.passport[dest.id] || 0, Math.round(top));
  const carUnlocked = !!dest.exclusive && !save.owned.includes(EXCLUSIVE_CAR);
  if (carUnlocked) save.owned.push(EXCLUSIVE_CAR);
  persist();
  race.arrival = { dest, newStamp, carUnlocked, top };

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
    carUnlocked ? h("div", { class: "arrive-tag gold", text: "THE VROOMILLIONAIRE IS YOURS!" }) : null);
  $("overlay").textContent = "";
  $("overlay").append(card);
  if (dest.exclusive || newStamp) { scene.confetti(); audio.sfx.win(); } else audio.sfx.cash();
  await sleep(dest.exclusive ? 3600 : 2600);
  $("overlay").textContent = "";
  document.body.classList.remove("smashing");
}

function revealCard(r, res, i) {
  const t = TIERS[res.tier];
  return h("div", { class: `reveal-card p${i + 1} tier${res.tier}` },
    h("div", { class: "reveal-who", text: r.name }),
    h("div", { class: "reveal-answer", text: (res.display || "(no answer)").toUpperCase() }),
    h("div", { class: "badge t" + res.tier, text: t.name }),
    h("div", { class: "reveal-gain", text: `+${metresFor(res.tier, r.power, r.useNitro).toLocaleString("en-US")} M` + (r.useNitro && res.tier ? " · NITRO" : "") + (res.bump ? " · BUMPED −1" : "") }));
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
      signal: AbortSignal.timeout(6000),
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
    const hidden = !race.solo;
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
    $("turn").textContent = race.solo ? "" : `${r.name} — TYPE IT (HIDDEN). OTHER PLAYER LOOK AWAY!`;
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
      input.value = "";
      resolve(res);
    };
    // A typo is fixed automatically and locked in straight away; the reveal shows the real name.
    // A fixed typo keeps its score, but can't be a One in a Vroomillion.
    let checking = false;
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
      // Not on our list: ask Wikidata (through our server) before saying no. The clock keeps running.
      if (index.prompt && value.trim().length >= 3) {
        if (checking) return;
        checking = true;
        // usually already answered: the lookup started while they were typing
        const slow = onlineKnown(index, value) ? 0 : setTimeout(() => { $("btn-go").disabled = true; say("CHECKING…", "fix"); }, 250);
        checkOnline(index, value).then((hit) => {
          clearTimeout(slow);
          checking = false;
          $("btn-go").disabled = false;
          if (finished || token !== raceToken) return;
          feedback.textContent = "";
          if (!hit) return reject(value);
          const found = { tier: onlineTier(hit), display: hit.label, key: normalize(hit.label), online: true };
          const same = (a) => normalize(a).replace(/ /g, "");
          lockIn(same(hit.label) === same(value) ? found : { ...found, corrected: true });
        });
        return;
      }
      reject(value);
    };
    // Wrong: keep the clock running and let them try again.
    const reject = (value) => {
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
    // Look answers up while they type: a short pause after typing an answer that isn't on our list
    // starts the Wikidata check, so by the time they press GO the result is usually already here.
    let prefetch = 0;
    const onInput = () => {
      audio.sfx.key();
      clearTimeout(prefetch);
      const value = input.value;
      if (!index.prompt || value.trim().length < 3) return;
      prefetch = setTimeout(() => {
        if (finished || token !== raceToken || input.value !== value) return;
        if (judge(index, value).tier > 0) return; // on our list: nothing to look up
        checkOnline(index, value);
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

function destResult({ dest, newStamp, carUnlocked, top }) {
  const next = DESTINATIONS.find((d) => d.min > top);
  return h("div", { class: "dest-result" + (dest.exclusive ? " exclusive" : "") },
    h("div", { class: "note", text: "THIS RACE TOOK YOU TO" }),
    h("div", { class: "dest-name", text: dest.name }),
    h("div", { class: "note", text: [newStamp ? "NEW PASSPORT STAMP!" : "", carUnlocked ? "GOLD CAR UNLOCKED: THE VROOMILLIONAIRE" : "",
      next ? `NEXT: ${next.exclusive ? "??? (EXCLUSIVE)" : next.name} AT ${next.min.toLocaleString("en-US")} M` : "YOU'VE BEEN EVERYWHERE."].filter(Boolean).join(" · ") }),
    h("button", { class: "btn small", type: "button", text: "OPEN PASSPORT", onclick: () => { audio.sfx.click(); show("passport"); } }));
}

// The passport: every destination, stamped once you've reached it.
function renderPassport() {
  const root = $("passport-grid");
  root.textContent = "";
  const got = Object.keys(save.passport).length;
  $("passport-count").textContent = `${got} OF ${DESTINATIONS.length} STAMPS`;
  for (const d of DESTINATIONS) {
    const best = save.passport[d.id];
    const cv = h("canvas", { class: "stamp-art", width: 192, height: 108, "aria-hidden": "true" });
    try { const sc = new ChaseScene(cv); sc.resize(192, 108, 100); sc.preview(d.id); } catch { /* preview is decoration only */ }
    root.append(h("div", { class: "stamp" + (best ? " got" : " locked") + (d.exclusive ? " exclusive" : "") },
      cv,
      h("div", { class: "stamp-name", text: best || !d.exclusive ? d.name : "??? EXCLUSIVE ???" }),
      h("div", { class: "stamp-info", text: best ? `BEST ${best.toLocaleString("en-US")} M` : d.min ? `REACH ${d.min.toLocaleString("en-US")} M IN ONE RACE` : "FINISH ANY RACE" }),
      best ? h("div", { class: "stamp-mark", text: "VISITED" }) : null));
  }
}

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
    newBest = a.dist > save.best;
    if (newBest) save.best = a.dist;
    title = newBest && save.races > 0 ? "NEW BEST!" : "RUN COMPLETE";
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
    h("div", { class: "payout" },
      h("div", { text: race.solo ? "PRIZE MONEY" : "PRIZE (SHARED GARAGE)" }),
      h("div", { class: "payout-total", text: "+" + money(pay.total) }),
      h("div", { class: "note", text: race.solo
        ? `${money(pay.base)} FOR ${Math.round(a.dist).toLocaleString("en-US")} M IN THE ${a.car.name.toUpperCase()} · ${money(pay.bonus)} NICHE BONUS`
        : `${money(pay.base)} RACE · ${money(pay.bonus)} NICHE BONUS` })),
    FREE_PLAY || unlimitedNow() ? null : h("div", { class: "daily-next" },
      h("div", { text: freeLeft(save, dayKey()) > 0 ? `${freeLeft(save, dayKey())} FREE 1P RACE${freeLeft(save, dayKey()) === 1 ? "" : "S"} LEFT TODAY` : `MORE FREE RACES IN ${timeLeft()}` }),
      h("button", { class: "btn big unlock-cta", type: "button", text: "GO UNLIMITED — $5", onclick: () => { audio.sfx.click(); openPaywall("used"); } })),
    h("div", { class: "log" },
      ...a.log.map((row, i) => h("div", { class: "log-row" },
        h("div", { class: "log-q", text: `${i + 1}. ${row.q.toUpperCase()}` }),
        ...race.racers.map((r, pi) => h("div", { class: `log-a p${pi + 1}` },
          h("span", { class: "log-text", text: r.log[i].answer.toUpperCase() }),
          h("span", { class: "badge t" + r.log[i].tier, text: TIERS[r.log[i].tier].short })))))),
  ].filter(Boolean));
  const paid = canRace(me(), dayKey(), { mode: race.solo ? "solo" : "versus", deck: save.deck });
  const left = leftInMode();
  $("btn-again").textContent = !paid ? "NEW RACE — $5" : left ? "NEW RACE" : "NO NEW PROMPTS";
  $("btn-again").disabled = paid && !left;
  $("btn-redo").textContent = paid ? "REDO THIS RACE" : "REDO — $5";
  show("results");
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
$("btn-garage").addEventListener("click", () => { audio.sfx.click(); show("garage"); });
$("btn-passport").addEventListener("click", () => { audio.sfx.click(); show("passport"); });
$("btn-results-garage").addEventListener("click", () => { audio.sfx.click(); show("garage"); });
$("btn-how").addEventListener("click", () => { audio.sfx.click(); show("how"); });
$("btn-quit").addEventListener("click", () => { audio.sfx.deny(); overlay(""); show("title"); });
$("btn-again").addEventListener("click", () => { audio.sfx.click(); if (lastSetup) startRace({ ...lastSetup, redo: false }); });
$("btn-redo").addEventListener("click", () => { audio.sfx.click(); if (lastSetup) startRace({ ...lastSetup, redo: true }); });
$("btn-start-1p").addEventListener("click", () => { audio.sfx.click(); startRace({ mode: "solo" }); });
$("btn-account").addEventListener("click", () => { audio.sfx.click(); show("account"); });
$("btn-start-2p").addEventListener("click", () => {
  audio.sfx.click();
  const clean = (id, fallback) => ($(id).value.trim().toUpperCase().slice(0, 10) || fallback);
  startRace({ mode: "versus", names: [clean("name-p1", "P1"), clean("name-p2", "P2")], cars: [versus.p1, versus.p2] });
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
show("title");
refreshAccount();
