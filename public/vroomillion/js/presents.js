// Santa's fly-over (the Christmas event): the sleigh crosses the top of the screen, a present on a little
// parachute drops from it and floats down, then waits at the bottom for a while to be tapped.
// Only the show lives here; main.js decides when Santa comes and what's in the present.
const FLY_MS = 6500, FALL_MS = 4200, WAIT_MS = 14000;

// a present: a box in a colour, a ribbon both ways and a bow (pixel art, drawn once per colour)
export function presentCanvas(col = "#c8202a", ribbon = "#ffd23a", scale = 3) {
  const cv = document.createElement("canvas"); cv.width = 16 * scale; cv.height = 16 * scale;
  const g = cv.getContext("2d");
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x * scale, y * scale, w * scale, h * scale); };
  R(2, 6, 12, 9, "#1a0a10"); R(3, 7, 10, 7, col); R(1, 4, 14, 3, "#1a0a10"); R(2, 4, 12, 2, col); // box and lid
  R(7, 4, 2, 11, ribbon); R(2, 9, 12, 2, ribbon);                                                   // ribbon
  R(4, 1, 3, 3, ribbon); R(9, 1, 3, 3, ribbon); R(7, 3, 2, 2, ribbon); R(5, 2, 1, 1, col); R(10, 2, 1, 1, col); // bow
  R(4, 8, 1, 1, "rgba(255,255,255,0.5)");
  return cv;
}

// fly Santa over once. sleigh: the sleigh's side sprite. onCatch(): the present was tapped.
export function flyover(sleigh, { onCatch, onMiss, onDrop, reduced = false, bottom = 120 }) {
  const sky = document.createElement("div");
  sky.className = "santa-sky";
  sky.setAttribute("aria-hidden", "true");
  const s = sleigh;
  s.className = "santa-sleigh";
  sky.append(s);
  document.body.append(sky);
  const W = innerWidth, y = Math.max(54, innerHeight * 0.09);
  const sw = Math.min(170, W * 0.36);
  s.style.width = sw + "px";
  s.style.top = y + "px";
  s.animate([{ transform: `translateX(${-sw - 20}px)` }, { transform: `translateX(${W + 20}px)` }], { duration: reduced ? 1 : FLY_MS, easing: "linear", fill: "forwards" });
  setTimeout(() => sky.remove(), FLY_MS + 200);
  // the drop: somewhere in the middle of the screen
  const at = 0.25 + Math.random() * 0.5;
  setTimeout(() => {
    const x = Math.round(-sw - 20 + (W + sw + 40) * at + sw * 0.25);
    const left = Math.max(12, Math.min(W - 76, x));
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "santa-present";
    btn.setAttribute("aria-label", "A present from Santa! Tap to open it");
    btn.append(Object.assign(document.createElement("span"), { className: "chute" }), presentCanvas());
    btn.style.left = left + "px";
    document.body.append(btn);
    onDrop?.();
    const land = innerHeight - bottom - 70;
    btn.animate([
      { transform: `translateY(${y}px) rotate(-8deg)` }, { transform: `translateY(${y + (land - y) * 0.35}px) rotate(8deg)` },
      { transform: `translateY(${y + (land - y) * 0.7}px) rotate(-6deg)` }, { transform: `translateY(${land}px) rotate(0deg)` }], { duration: reduced ? 1 : FALL_MS, easing: "ease-in-out", fill: "forwards" });
    setTimeout(() => btn.classList.add("landed"), FALL_MS);
    let gone = false;
    const end = (caught) => { if (gone) return; gone = true; clearTimeout(t); btn.classList.add("gone"); setTimeout(() => btn.remove(), 300); caught ? onCatch?.() : onMiss?.(); };
    const t = setTimeout(() => end(false), FALL_MS + WAIT_MS);
    btn.addEventListener("click", (e) => { e.stopPropagation(); end(true); });
  }, (reduced ? 0.3 : at) * FLY_MS);
}
