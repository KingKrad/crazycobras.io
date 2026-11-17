// Landing page after Stripe Checkout. Asks the server whether the session was
// really paid, then switches this browser's save to UNLIMITED.
const SAVE_KEY = "vroomillion.v1";
const $ = (id) => document.getElementById(id);

function say(title, text) {
  $("unlock-title").textContent = title;
  $("unlock-text").textContent = text;
}

async function run() {
  const id = new URLSearchParams(location.search).get("session_id") || "";
  if (!id) return say("NO RECEIPT FOUND", "Open this page from the link after checkout.");
  let paid = false;
  try {
    const res = await fetch("/api/vroomillion/verify?session_id=" + encodeURIComponent(id), { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    paid = body.paid === true;
    if (!paid) return say("NOT UNLOCKED YET", body.error || "That payment hasn't gone through. If you were charged, reload this page in a minute.");
  } catch {
    return say("COULDN'T CHECK THE PAYMENT", "Check your connection and reload this page.");
  }
  try {
    const save = JSON.parse(localStorage.getItem(SAVE_KEY) || "{}") || {};
    save.unlimited = true;
    save.receipt = id;
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    return say("PAID — BUT THIS BROWSER BLOCKS SAVING", "Turn off private browsing, then reload this page to finish unlocking.");
  }
  say("UNLIMITED UNLOCKED!", "Race as often as you like. Enjoy the hypercars.");
  $("unlock-play").textContent = "START RACING ▶";
}
run();
