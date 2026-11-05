const $ = (id) => document.getElementById(id);

let token = null;
let maxStyles = 3;
let widgetId = null;
let result = null;
let tier = "budget";
const selected = new Set();
const photos = { room: null, inspo: null };

function setStatus(msg, isError = false) {
  const el = $("status");
  el.textContent = msg;
  el.classList.toggle("error", isError);
}

function el(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined) n.textContent = text;
  return n;
}

async function init() {
  let opts;
  try {
    const res = await fetch("/api/options");
    opts = await res.json();
  } catch {
    setStatus("Couldn't load the app. Refresh the page.", true);
    return;
  }
  maxStyles = opts.maxStyles;

  for (const r of opts.roomTypes) {
    const o = el("option", "", r);
    o.value = r;
    $("roomType").appendChild(o);
  }

  for (const s of opts.styles) {
    const b = el("button", "chip");
    b.type = "button";
    b.setAttribute("aria-pressed", "false");
    b.dataset.id = s.id;
    b.appendChild(el("span", "name", s.name));
    b.appendChild(el("span", "blurb", s.blurb));
    const dots = el("span", "dots");
    for (const hex of s.palette) {
      const d = el("span", "dot");
      d.style.background = hex;
      dots.appendChild(d);
    }
    b.appendChild(dots);
    b.addEventListener("click", () => toggleStyle(s.id, b));
    $("styles").appendChild(b);
  }

  let tries = 0;
  const timer = setInterval(() => {
    if (window.turnstile) {
      clearInterval(timer);
      widgetId = window.turnstile.render("#turnstile", {
        sitekey: opts.turnstileSiteKey,
        callback: (t) => { token = t; },
        "expired-callback": () => { token = null; },
      });
    } else if (++tries >= 50) {
      clearInterval(timer);
      setStatus("Verification failed to load. Refresh the page.", true);
    }
  }, 100);
}

function toggleStyle(id, btn) {
  if (selected.has(id)) {
    selected.delete(id);
    btn.setAttribute("aria-pressed", "false");
  } else {
    if (selected.size >= maxStyles) {
      setStatus(`You can pick up to ${maxStyles} styles.`);
      return;
    }
    selected.add(id);
    btn.setAttribute("aria-pressed", "true");
  }
  setStatus("");
}

async function resizeToJpeg(file) {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 496 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bmp.width * scale));
  canvas.height = Math.max(1, Math.round(bmp.height * scale));
  canvas.getContext("2d").drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close?.();
  for (const q of [0.85, 0.7, 0.5]) {
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", q));
    if (blob && blob.size <= 200_000) return blob;
  }
  throw new Error("That photo couldn't be shrunk enough — try another.");
}

async function onPhoto(kind, input) {
  photos[kind] = null;
  if (kind === "room") $("roomPreview").hidden = true;
  const file = input.files[0];
  if (!file) return;
  try {
    const blob = await resizeToJpeg(file);
    photos[kind] = blob;
    if (kind === "room") {
      $("roomPreview").src = URL.createObjectURL(blob);
      $("roomPreview").hidden = false;
    }
    setStatus("");
  } catch (e) {
    input.value = "";
    setStatus(e.message || "That photo couldn't be read — try another.", true);
  }
}

function readValues() {
  return {
    roomType: $("roomType").value,
    lengthFt: Number($("lengthFt").value),
    widthFt: Number($("widthFt").value),
    heightFt: Number($("heightFt").value),
    budgetUSD: Number($("budgetUSD").value),
    styles: [...selected],
    prompt: $("prompt").value.trim(),
  };
}

function checkValues(v) {
  const range = (n, lo, hi) => Number.isFinite(n) && n >= lo && n <= hi;
  if (!range(v.lengthFt, 3, 100)) return ["lengthFt", "Length must be between 3 and 100 ft."];
  if (!range(v.widthFt, 3, 100)) return ["widthFt", "Width must be between 3 and 100 ft."];
  if (!range(v.heightFt, 6, 30)) return ["heightFt", "Ceiling height must be between 6 and 30 ft."];
  if (!Number.isInteger(v.budgetUSD) || v.budgetUSD < 100 || v.budgetUSD > 200000) {
    return ["budgetUSD", "Budget must be a whole number between $100 and $200,000."];
  }
  if (v.styles.length === 0 && !photos.inspo) return ["styles", "Pick at least one style or upload an inspiration photo."];
  if (v.prompt.length > 500) return ["prompt", "Description must be 500 characters or fewer."];
  return null;
}

async function onSubmit(e) {
  e.preventDefault();
  const v = readValues();
  const problem = checkValues(v);
  if (problem) {
    setStatus(problem[1], true);
    const target = $(problem[0]);
    (target.id === "styles" ? target.querySelector("button") : target)?.focus();
    return;
  }
  if (!token) {
    setStatus("Please complete the verification check.", true);
    return;
  }

  const fd = new FormData();
  fd.append("payload", JSON.stringify(v));
  if (photos.room) fd.append("room_photo", new File([photos.room], "room.jpg", { type: "image/jpeg" }));
  if (photos.inspo) fd.append("inspo_photo", new File([photos.inspo], "inspo.jpg", { type: "image/jpeg" }));
  fd.append("turnstile", token);

  const btn = $("submitBtn");
  btn.disabled = true;
  btn.querySelector(".spinner").hidden = false;
  setStatus("Designing your room… this takes about 15 seconds.");

  try {
    const res = await fetch("/api/generate", { method: "POST", body: fd });
    let body = {};
    try { body = await res.json(); } catch { /* ignore */ }
    if (!res.ok) {
      setStatus(body.error || "Something went wrong.", true);
    } else {
      setStatus("");
      showResult(body);
    }
  } catch {
    setStatus("Something went wrong.", true);
  } finally {
    btn.disabled = false;
    btn.querySelector(".spinner").hidden = true;
    token = null;
    if (window.turnstile) window.turnstile.reset(widgetId ?? undefined);
  }
}

function showResult(body) {
  result = body;
  $("resultImg").src = body.image;
  $("downloadBtn").href = body.image;
  const pal = $("palette");
  pal.replaceChildren();
  if (!body.list) {
    $("summary").textContent = "Shopping list unavailable this time — try generating again.";
    $("tabs").hidden = true;
    $("total").textContent = "";
    $("items").replaceChildren();
  } else {
    $("summary").textContent = body.list.summary;
    for (const hex of body.list.palette) {
      const s = el("span", "swatch");
      s.style.background = hex;
      s.title = hex;
      pal.appendChild(s);
    }
    $("tabs").hidden = false;
    setTier("budget");
  }
  $("results").hidden = false;
  $("results").scrollIntoView({ behavior: "smooth" });
}

function setTier(t) {
  tier = t;
  $("tabBudget").setAttribute("aria-selected", String(t === "budget"));
  $("tabRec").setAttribute("aria-selected", String(t === "recommended"));
  const list = result.list;
  $("total").textContent = "Estimated total: $" + list.totals[t].toLocaleString("en-US");
  const ul = $("items");
  ul.replaceChildren();
  for (const item of list.items) {
    const d = item[t];
    const li = el("li");
    const left = el("div");
    left.appendChild(el("div", "", item.name));
    left.appendChild(el("div", "why", item.why));
    li.appendChild(left);
    li.appendChild(el("div", "price", "$" + d.priceUSD.toLocaleString("en-US")));
    const a = el("a", "shop", `Shop at ${d.retailer} →`);
    a.href = d.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer nofollow";
    li.appendChild(a);
    ul.appendChild(li);
  }
}

$("design-form").addEventListener("submit", onSubmit);
$("inspoPhoto").addEventListener("change", (e) => onPhoto("inspo", e.target));
$("roomPhoto").addEventListener("change", (e) => onPhoto("room", e.target));
$("prompt").addEventListener("input", () => { $("counter").textContent = `${$("prompt").value.length}/500`; });
$("tabBudget").addEventListener("click", () => result?.list && setTier("budget"));
$("tabRec").addEventListener("click", () => result?.list && setTier("recommended"));
$("startOver").addEventListener("click", () => {
  $("results").hidden = true;
  window.scrollTo({ top: 0, behavior: "smooth" });
});

init();
