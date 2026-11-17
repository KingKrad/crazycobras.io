// Landing page after Stripe Checkout. Asks the server to confirm the payment with
// Stripe; the server then marks the buyer's account as UNLIMITED.
const $ = (id) => document.getElementById(id);

function say(title, text) {
  $("unlock-title").textContent = title;
  $("unlock-text").textContent = text;
}

async function run() {
  const id = new URLSearchParams(location.search).get("session_id") || "";
  if (!id) return say("NO RECEIPT FOUND", "Open this page from the link after checkout.");
  try {
    const res = await fetch("/api/vroomillion/verify?session_id=" + encodeURIComponent(id), { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (body.paid !== true) {
      return say("NOT UNLOCKED YET", body.error || "That payment hasn't gone through. If you were charged, reload this page in a minute.");
    }
    say("UNLIMITED UNLOCKED!", `${String(body.email || "Your account").toUpperCase()} can now race as often as you like. Log in with it on any device.`);
    $("unlock-play").textContent = "START RACING ▶";
  } catch {
    say("COULDN'T CHECK THE PAYMENT", "Check your connection and reload this page.");
  }
}
run();
