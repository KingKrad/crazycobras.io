// REV & SHIFT: what the answer box shows between GO and the verdict.
//   checking = staging: your answer stamps onto a licence plate, the starting tree's amber lights chase
//              and the engine revs. It loops for as long as the check takes (at least one sweep).
//   accepted = a green light, then the tach shifts up once per rarity tier (rarer answers, more gears,
//              a gear ladder lighting up beside it). Then the race's own launch takes over.
//   rejected = a red light, the needle drops and the engine stalls; the answer stays in the box.
// Only the show lives here: main.js (askAnswer) decides when, and pauses the clock meanwhile.

const SWEEP_MS = 150; // one amber bulb
const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

// tiers: TIERS from logic.js (names); sfx: audio.sfx; scene: the race scene (rev, backfire)
export function makeRig(zone, { tiers, sfx = {}, scene = null, racer = 0 }) {
  const rig = el("div", "rs-rig");
  rig.setAttribute("aria-hidden", "true");
  const tree = el("div", "rs-tree");
  const bulbs = Array.from({ length: 8 }, () => tree.appendChild(el("i")));
  const plate = el("div", "rs-plate");
  const plateText = plate.appendChild(el("b", null, "—"));
  const tach = el("div", "rs-tach");
  tach.innerHTML = '<svg viewBox="0 0 74 52"><path d="M8 46 A29 29 0 0 1 66 46" fill="none" stroke="#2a2440" stroke-width="7"/>'
    + '<path d="M54.5 23.6 A29 29 0 0 1 66 46" fill="none" stroke="#ff3b5c" stroke-width="7"/>'
    + '<g class="rs-needle"><rect x="35.5" y="18" width="3" height="28" fill="#fff"/></g><rect x="34" y="43" width="6" height="6" fill="#fff"/></svg>';
  const gear = tach.appendChild(el("div", "rs-gear", "N"));
  const needle = tach.querySelector(".rs-needle");
  const ladder = el("div", "rs-ladder");
  for (let t = 5; t >= 1; t--) {
    const row = ladder.appendChild(el("div"));
    row.dataset.t = String(t);
    row.style.setProperty("--c", `var(--t${t})`);
    row.append(el("span", null, tiers[t].short), el("em", null, String(t)));
  }
  rig.append(tree, plate, tach, ladder);
  zone.appendChild(rig);

  const PRE = [0, 1], AMB = [2, 3, 4, 5], LAST = [6, 7];
  const set = (idx, cls) => idx.forEach((k) => { bulbs[k].className = cls; });
  const clear = () => bulbs.forEach((b) => { b.className = ""; });
  const rpm = (x) => { needle.style.transform = `rotate(${-90 + Math.max(0, Math.min(1.05, x)) * 180}deg)`; };

  let run = 0;        // the current show (a newer one cancels an older one's loop)
  let sweeps = 0;     // full amber sweeps so far (an instant reply still gets one)
  let stagedAt = 0;

  function stage(text, hiddenText = false) {
    const me = ++run;
    sweeps = 0; stagedAt = performance.now();
    plateText.textContent = hiddenText ? "• • • •" : String(text).toUpperCase().slice(0, 22);
    plate.className = "rs-plate"; plate.style.removeProperty("--pc");
    gear.textContent = "N"; gear.style.removeProperty("--gc");
    ladder.classList.remove("show"); ladder.querySelectorAll("div").forEach((d) => d.classList.remove("lit", "final"));
    clear(); rpm(0.1);
    rig.classList.add("show");
    void plate.offsetWidth; plate.classList.add("land");
    (async () => {
      await wait(reduce() ? 0 : 160);
      if (me !== run) return;
      set(PRE, "amber");
      let k = 0;
      while (me === run) {
        for (let b = 0; b < AMB.length && me === run; b++) {
          bulbs[AMB[b]].className = "amber"; sfx.tick?.();
          rpm(0.5 + b * 0.1 + Math.random() * 0.06);
          if ((k * AMB.length + b) % 4 === 0) { scene?.rev?.(0.5); if (k % 2 === 0) sfx.rev?.(); }
          await wait(SWEEP_MS);
        }
        if (me !== run) return;
        rpm(0.62); await wait(90);
        set(AMB, ""); sweeps++; k++;
      }
    })();
  }
  // wait until at least one full sweep has shown, then stop the loop
  let quickShow = false; // an answer from our own list: a short sweep (about a third of a second)
  async function settle() {
    const me = run;
    const minMs = reduce() ? 0 : quickShow ? 350 : 160 + AMB.length * SWEEP_MS + 90;
    quickShow = false;
    const left = minMs - (performance.now() - stagedAt);
    if (left > 0) await wait(left);
    if (me === run) run++; // stops the staging loop
    set([...PRE, ...AMB], "");
  }

  // green, then one shift per gear (gears: how many; crazy: no tier names lit, just the gears)
  async function accept(gears, crazy = false) {
    await settle();
    set(LAST, "green");
    plate.classList.remove("land"); void plate.offsetWidth; plate.classList.add("good");
    if (!crazy) ladder.classList.add("show");
    for (let g = 1; g <= gears; g++) {
      gear.textContent = String(g);
      gear.style.setProperty("--gc", `var(--t${g})`);
      plate.style.setProperty("--pc", `var(--t${g})`);
      if (!crazy) ladder.querySelector(`[data-t="${g}"]`)?.classList.add("lit");
      sfx.shift?.();
      rpm(0.3);
      await wait(reduce() ? 0 : 70);
      rpm(g === gears ? 0.85 : 1);
      await wait(reduce() ? 60 : Math.max(200, 330 - g * 25));
    }
    if (!crazy) ladder.querySelector(`[data-t="${gears}"]`)?.classList.add("final");
    await wait(reduce() ? 0 : 180);
    hide();
  }

  // red light, the needle drops, a stall
  async function reject() {
    await settle();
    for (let k = 0; k < 3; k++) { set(LAST, "red"); await wait(reduce() ? 0 : 100); set(LAST, ""); await wait(reduce() ? 0 : 60); }
    set(LAST, "red");
    rpm(0); gear.textContent = "×"; gear.style.setProperty("--gc", "var(--red)");
    plate.classList.remove("land"); void plate.offsetWidth; plate.classList.add("bad");
    sfx.sputter?.(); scene?.backfire?.(racer);
    await wait(reduce() ? 150 : 520);
    hide();
  }

  // an answer found on our own list: a quick amber sweep, then green (the same feel, no waiting)
  async function quick(text, gears, crazy = false, hiddenText = false) {
    stage(text, hiddenText);
    quickShow = true;
    return accept(gears, crazy);
  }

  function hide() {
    run++;
    rig.classList.remove("show");
    ladder.classList.remove("show");
    setTimeout(() => { if (!rig.classList.contains("show")) { clear(); rpm(0); } }, 250);
  }

  return { stage, accept, reject, quick, hide, el: rig };
}
