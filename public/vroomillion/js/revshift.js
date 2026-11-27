// REV & SHIFT: what happens between GO and the verdict, and (solo road races) the whole rarity reveal.
//   checking = staging: your answer flies onto a licence plate, the pre-stage lights come on, then the
//              starting tree's amber lights chase while the engine revs. It loops for as long as the
//              check takes (at least two sweeps; one for an answer on our own list).
//   accepted = a green light. Solo road races then play ONE continuous reveal (makeReveal): a flash and
//              letterbox bars, the car launches and shifts up once per rarity tier (a gear callout, a
//              camera kick, the tier ladder lighting up and the distance ticking up; the sky changes from
//              3rd gear), ending on a road sign that drops in on chains. Tap to skip. Every mode plays it:
//              the themed worlds (without the road's sky), CRAZY MODE (its payouts on the sign), and 2 players
//              and online 1v1, where each racer gets their own reveal in turn once both have answered.
//   rejected = four red flashes, the needle drops, the engine stalls in a puff of smoke; the answer stays.
// Only the show lives here: main.js (askAnswer and the round reveal) decides when, and pauses the clock.

const BULB_MS = 210; // one amber bulb
const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const TIER_HEX = ["#b9b2d6", "#b9b2d6", "#5dff8f", "#4fd1ff", "#ff4fd8", "#ffd23a"];
const pulse = (node, cls) => { if (!node) return; node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls); };

// tiers: TIERS from logic.js (names); sfx: audio.sfx; scene: () => the race scene now (rev, stall)
export function makeRig(zone, { tiers, sfx = {}, scene = () => null, racer = 0 }) {
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
  // the distance this answer is worth, ticking up with each gear (the full reveal only)
  const odo = ladder.appendChild(el("p", "rs-odo"));
  odo.append(el("small", null, "DISTANCE"));
  const odoVal = odo.appendChild(el("span", null, "+0 M"));
  rig.append(tree, plate, tach, ladder);
  zone.appendChild(rig);

  const PRE = [0, 1], AMB = [2, 3, 4, 5], LAST = [6, 7];
  const set = (idx, cls) => idx.forEach((k) => { bulbs[k].className = cls; });
  const clear = () => bulbs.forEach((b) => { b.className = ""; });
  const rpm = (x) => { needle.style.transform = `rotate(${-90 + Math.max(0, Math.min(1.05, x)) * 180}deg)`; };

  let run = 0;        // the current show (a newer one cancels an older one's loop)
  let sweeps = 0;     // full amber sweeps so far
  let minSweeps = 2;  // a real check shows at least two; an answer on our own list one
  let sweepDone = null; // resolves when the loop has shown its sweeps and been told to stop

  // the answer lifts off the input and lands on the plate
  function fly(text) {
    const input = zone.querySelector("input");
    if (!input || reduce()) return;
    const ir = input.getBoundingClientRect(), pr = plate.getBoundingClientRect();
    if (!ir.width || !pr.width) return;
    const f = el("div", "rs-flyer", text);
    f.style.left = ir.left + 14 + "px";
    f.style.top = ir.top + ir.height / 2 - 10 + "px";
    document.body.append(f);
    input.classList.add("rs-lifted");
    requestAnimationFrame(() => {
      const dx = pr.left + pr.width / 2 - (ir.left + 14) - f.offsetWidth / 2;
      const dy = pr.top + 16 - (ir.top + ir.height / 2 - 10);
      f.style.transform = `translate(${dx}px, ${dy}px) scale(0.9)`;
      f.style.opacity = "0";
    });
    setTimeout(() => { f.remove(); input.classList.remove("rs-lifted"); }, 320);
  }

  function stage(text, hiddenText = false, quick = false) {
    const me = ++run;
    sweeps = 0; minSweeps = quick ? 1 : 2;
    let stopWanted = false, release;
    sweepDone = { stop: () => { stopWanted = true; }, done: new Promise((r) => { release = r; }) };
    const shown = hiddenText ? "• • • •" : String(text).toUpperCase().slice(0, 22);
    plateText.textContent = shown;
    plate.className = "rs-plate"; plate.style.removeProperty("--pc");
    gear.textContent = "N"; gear.style.removeProperty("--gc");
    ladder.classList.remove("show", "full"); ladder.querySelectorAll("div").forEach((d) => d.classList.remove("lit", "final"));
    odoVal.textContent = "+0 M";
    clear(); rpm(0.1);
    rig.classList.add("show");
    if (!hiddenText) fly(shown);
    void plate.offsetWidth; plate.classList.add("land");
    sfx.lock?.();
    (async () => {
      const fast = reduce();
      // pre-stage, then stage
      await wait(fast ? 0 : quick ? 120 : 260);
      if (me !== run) return release();
      set([PRE[0]], "amber"); sfx.tick?.();
      await wait(fast ? 0 : quick ? 120 : 220);
      if (me !== run) return release();
      set(PRE, "amber"); sfx.tick?.();
      await wait(fast ? 0 : quick ? 120 : 260);
      let k = 0, lastRev = 0;
      while (me === run) {
        for (let b = 0; b < AMB.length && me === run; b++) {
          bulbs[AMB[b]].className = "amber"; sfx.tick?.();
          rpm(0.5 + b * 0.1 + Math.random() * 0.06);
          // the engine revs against the limiter (and the car shakes on the line) about every 0.6 s
          const now = performance.now();
          if (now - lastRev > 600) { lastRev = now; scene()?.rev?.(0.5); if (k % 2 === 0) sfx.rev?.(); }
          await wait(fast ? 40 : BULB_MS);
        }
        if (me !== run) break;
        rpm(0.62); await wait(fast ? 0 : 160);
        set(AMB, ""); sweeps++; k++;
        if (stopWanted && sweeps >= minSweeps) break;
        if (fast && stopWanted) break;
      }
      release();
    })();
  }

  // wait until the staging has shown its sweeps, then stop it
  async function settle() {
    if (!sweepDone) return;
    const s = sweepDone;
    sweepDone = null;
    s.stop();
    await s.done;
    set([...PRE, ...AMB], "");
  }

  // the green light (the full reveal takes it from here)
  async function green() {
    await settle();
    run++;
    set(LAST, "green");
    sfx.go?.();
    pulse(plate, "good");
    rpm(1.02);
  }

  // one gear (the full reveal drives these)
  function shiftTo(g, last = false) {
    gear.textContent = String(g);
    gear.style.setProperty("--gc", `var(--t${g})`);
    plate.style.setProperty("--pc", `var(--t${g})`);
    ladder.querySelector(`[data-t="${g}"]`)?.classList.add("lit");
    rpm(0.28);
    setTimeout(() => rpm(last ? 0.86 : 1), reduce() ? 0 : 110);
  }
  // plain: only the distance (CRAZY MODE, where the tier names don't apply)
  function showLadder(full = true, plain = false) { ladder.classList.toggle("full", full); ladder.classList.toggle("plain", plain); ladder.classList.add("show"); }
  function finalTier(g) { ladder.querySelector(`[data-t="${g}"]`)?.classList.add("final"); }
  function setOdo(m) { odoVal.textContent = "+" + Math.round(m).toLocaleString("en-US") + " M"; }
  function hideLadder() { ladder.classList.remove("show"); }

  // the short version: green, then one shift per gear in the rig (gears: how many; crazy: no tier names)
  async function accept(gears, crazy = false) {
    await green();
    if (!crazy) showLadder(false);
    for (let g = 1; g <= gears; g++) {
      shiftTo(g, g === gears);
      if (crazy) ladder.querySelector(`[data-t="${g}"]`)?.classList.remove("lit");
      sfx.shift?.();
      await wait(reduce() ? 60 : Math.max(200, 380 - g * 25));
    }
    if (!crazy) finalTier(gears);
    await wait(reduce() ? 0 : 200);
    hide();
  }

  // red light, the needle drops, a stall in a puff of smoke
  async function reject(who = racer) {
    await settle();
    run++;
    for (let k = 0; k < 4; k++) {
      set(LAST, "red");
      if (k === 0) sfx.deny?.();
      await wait(reduce() ? 0 : 150);
      set(LAST, "");
      await wait(reduce() ? 0 : 90);
    }
    set(LAST, "red");
    rpm(0); gear.textContent = "×"; gear.style.setProperty("--gc", "var(--red)");
    pulse(plate, "bad");
    sfx.sputter?.();
    scene()?.stall?.(who);
    await wait(reduce() ? 150 : 450);
    hide();
  }

  // an answer found on our own list: one quick amber sweep, then the short version
  function quick(text, gears, crazy = false, hiddenText = false) {
    stage(text, hiddenText, true);
    return accept(gears, crazy);
  }

  function hide() {
    run++;
    if (sweepDone) { sweepDone.stop(); sweepDone = null; }
    rig.classList.remove("show");
    ladder.classList.remove("show");
    setTimeout(() => { if (!rig.classList.contains("show")) { clear(); rpm(0); } }, 250);
  }

  return { stage, settle, green, accept, reject, quick, hide, shiftTo, showLadder, finalTier, setOdo, hideLadder, el: rig };
}

// ---------- the full reveal: over the road, from the green light to the tier's road sign ----------
// stageEl: .stage (the road's canvases live there); scene: () => the race scene now
export function makeReveal(stageEl, { tiers, sfx = {}, scene = () => null }) {
  const layer = el("div", "rs-show");
  layer.setAttribute("aria-hidden", "true");
  const amb = layer.appendChild(el("canvas", "rs-amb"));
  const ag = amb.getContext("2d");
  const streaks = layer.appendChild(el("div", "rs-streaks"));
  const vignette = layer.appendChild(el("div", "rs-vignette"));
  const callout = layer.appendChild(el("div", "rs-callout"));
  const calloutGear = callout.appendChild(el("small"));
  const calloutTier = callout.appendChild(el("b"));
  const sparks = layer.appendChild(el("div", "rs-sparks"));
  const rays = layer.appendChild(el("div", "rs-rays"));
  const signWrap = layer.appendChild(el("div", "rs-signwrap"));
  const sign = signWrap.appendChild(el("div", "rs-sign"));
  const hang = sign.appendChild(el("div", "rs-hang"));
  hang.append(el("i"), el("i"));
  const board = sign.appendChild(el("div", "rs-board"));
  board.append(el("div", "rs-bulbs"));
  const kicker = board.appendChild(el("small"));
  const arrows = board.appendChild(el("div", "rs-arrows"));
  arrows.append(el("span", null, "⇧"), el("span", null, "⇧"), el("span", null, "⇧"));
  const signTier = board.appendChild(el("b"));
  const blurb = board.appendChild(el("em"));
  const sub = board.appendChild(el("span", "rs-sub"));
  const bars = layer.appendChild(el("div", "rs-bars"));
  const flash = layer.appendChild(el("div", "rs-flash"));
  const skipHint = layer.appendChild(el("div", "rs-skip", "TAP TO SKIP ▸▸"));
  void bars; void vignette;
  stageEl.appendChild(layer);

  // ---- the background effects: one transparent canvas over the road, pixel-scaled like it ----
  const STARS = Array.from({ length: 34 }, (_, i) => ({ x: ((i * 73 + 11) % 195) / 195, y: ((i * 47) % 92) / 92, ph: i * 1.7, sp: 0.8 + (i % 5) * 0.35, big: i % 9 === 0 }));
  const fx = { s: 0, a3: 0, a4: 0, a5: 0, t: 0, comets: [], next: 0, sky: 0, on: false, raf: 0, last: 0 };
  // the aurora ribbon: one soft column, stretched per pixel column (cheap)
  const ribbon = (() => {
    const c = document.createElement("canvas"); c.width = 1; c.height = 32;
    const g = c.getContext("2d");
    for (let j = 0; j < 32; j++) { g.fillStyle = `rgba(255,255,255,${Math.sin((j / 32) * Math.PI)})`; g.fillRect(0, j, 1, 1); }
    return c;
  })();
  const tinted = [[63, 224, 138], [255, 210, 63], [63, 224, 160]].map(([r, g, b]) => {
    const c = document.createElement("canvas"); c.width = 1; c.height = 32;
    const x = c.getContext("2d");
    x.drawImage(ribbon, 0, 0); x.globalCompositeOperation = "source-in"; x.fillStyle = `rgb(${r},${g},${b})`; x.fillRect(0, 0, 1, 32);
    return c;
  });
  function drawAmb(dt) {
    const sc = scene();
    const src = sc?.canvas;
    if (src && (amb.width !== src.width || amb.height !== src.height)) { amb.width = src.width; amb.height = src.height; }
    const W = amb.width, H = amb.height;
    const hz = Math.max(20, sc?.horizon || H * 0.4);
    const u = W / 195; // the prototype's road was 195 px wide
    fx.t += dt;
    ag.clearRect(0, 0, W, H);
    fx.s += ((fx.on ? 1 : 0) - fx.s) * Math.min(1, dt * 2.5);
    for (const k of [3, 4, 5]) fx["a" + k] += ((fx.on && fx.sky === k ? 1 : 0) - fx["a" + k]) * Math.min(1, dt * 2.2);
    // twinkling stars, fading out towards the horizon
    if (fx.s > 0.02) {
      for (const st of STARS) {
        const x = Math.round(st.x * W), y = Math.round(st.y * hz * 0.66);
        const tw = 0.5 + 0.5 * Math.sin(fx.t * st.sp + st.ph);
        const fade = Math.max(0, 1 - y / (hz * 0.73));
        ag.fillStyle = `rgba(255,255,255,${(0.15 + 0.6 * tw) * fade * fx.s})`;
        ag.fillRect(x, y, 1, 1);
        if (st.big && tw > 0.8) { ag.fillStyle = `rgba(255,255,255,${0.35 * fade * fx.s})`; ag.fillRect(x - 1, y, 3, 1); ag.fillRect(x, y - 1, 1, 3); }
      }
    }
    // FAST LANE: a shooting star now and then
    if (fx.a3 > 0.02) {
      fx.next -= dt;
      if (fx.next <= 0 && fx.sky === 3) { fx.comets.push({ x: W * (0.2 + Math.random() * 0.75), y: hz * (0.05 + Math.random() * 0.35), life: 0 }); fx.next = 0.55 + Math.random() * 0.5; }
      for (const c of fx.comets) {
        c.life += dt; const p = c.life / 0.7;
        const x = c.x - p * 70 * u, y = c.y + p * 26 * u;
        for (let i = 0; i < 14; i++) { ag.fillStyle = `rgba(159,208,255,${(1 - i / 14) * (1 - p) * 0.9 * fx.a3})`; ag.fillRect(Math.round(x + i * 2.6 * u), Math.round(y - i * 0.95 * u), Math.max(1, Math.round(u)), Math.max(1, Math.round(u))); }
      }
      fx.comets = fx.comets.filter((c) => c.life < 0.7);
    } else fx.comets.length = 0;
    // TURBO: two searchlights sweeping from behind the horizon, and a pulsing neon horizon line
    if (fx.a4 > 0.02) {
      for (const [ox, col, ph] of [[W * 0.22, "255,79,216", 0], [W * 0.78, "79,209,255", 2.1]]) {
        const ang = -Math.PI / 2 + Math.sin(fx.t * 0.9 + ph) * 0.55, len = hz * 1.3, spread = 0.07;
        ag.beginPath(); ag.moveTo(ox, hz);
        ag.lineTo(ox + Math.cos(ang - spread) * len, hz + Math.sin(ang - spread) * len);
        ag.lineTo(ox + Math.cos(ang + spread) * len, hz + Math.sin(ang + spread) * len);
        ag.closePath();
        const gr = ag.createLinearGradient(ox, hz, ox + Math.cos(ang) * len, hz + Math.sin(ang) * len);
        gr.addColorStop(0, `rgba(${col},${0.35 * fx.a4})`); gr.addColorStop(1, `rgba(${col},0)`);
        ag.fillStyle = gr; ag.fill();
      }
      ag.fillStyle = `rgba(255,106,216,${(0.35 + 0.25 * Math.sin(fx.t * 3)) * fx.a4})`; ag.fillRect(0, hz - 1, W, 2);
    }
    // VROOMILLION: three slow aurora ribbons, green and gold, just above the horizon
    if (fx.a5 > 0.02) {
      ag.globalAlpha = 0.3 * fx.a5;
      for (let k = 0; k < 3; k++) {
        for (let x = 0; x < W; x += 2) {
          const y = hz * (0.44 + k * 0.1) + Math.sin((x / u) * 0.045 + fx.t * 0.7 + k * 1.3) * 9 * u + Math.sin((x / u) * 0.012 - fx.t * 0.4 + k) * 7 * u;
          const hgt = (22 + Math.sin((x / u) * 0.08 + fx.t + k) * 6) * u;
          ag.drawImage(tinted[k], 0, 0, 1, 32, x, Math.round(y), 2, Math.round(hgt));
        }
      }
      ag.globalAlpha = 1;
    }
    const busy = fx.on || fx.s > 0.02 || fx.a3 > 0.02 || fx.a4 > 0.02 || fx.a5 > 0.02;
    return busy;
  }
  function loop(now) {
    const dt = Math.min(0.05, (now - (fx.last || now)) / 1000);
    fx.last = now;
    if (drawAmb(dt)) fx.raf = requestAnimationFrame(loop);
    else { fx.raf = 0; fx.last = 0; ag.clearRect(0, 0, amb.width, amb.height); }
  }
  const startAmb = () => { if (!fx.raf) { fx.last = 0; fx.raf = requestAnimationFrame(loop); } };

  // ---- skipping: a tap jumps to the sign; another tap (once it's up) ends it ----
  let skipping = false, wake = null, armed = 0;
  const nap = (ms) => (skipping ? Promise.resolve() : new Promise((r) => {
    const t = setTimeout(done, reduce() ? Math.min(ms, 160) : ms);
    function done() { clearTimeout(t); if (wake === done) wake = null; r(); }
    wake = done;
  }));
  const onTap = (e) => {
    if (performance.now() < armed) return;
    if (e.target.closest?.("button, input, a")) return;
    skipping = true;
    wake?.();
  };

  function spark(hex, n) {
    sparks.style.setProperty("--c", hex);
    for (let i = 0; i < n; i++) {
      const e = el("i"), a = Math.random() * Math.PI * 2, r = 60 + Math.random() * 110;
      e.style.setProperty("--x", Math.cos(a) * r + "px"); e.style.setProperty("--y", Math.sin(a) * r * 0.7 + "px");
      e.style.animationDelay = Math.random() * 120 + "ms";
      sparks.append(e); setTimeout(() => e.remove(), 1400);
    }
  }
  function showSign(tier, answer, metres, names = tiers, who = "") {
    const T = names[tier];
    kicker.textContent = (who ? who + " · " : "") + (tier === 5 ? `★ ${T.rarity} ★` : T.rarity);
    signTier.textContent = "";
    const word = tier === 5 ? T.short : T.name;
    [...word].forEach((ch, i) => { const sp = el("span", null, ch === " " ? " " : ch); sp.style.setProperty("--i", i); signTier.append(sp); });
    blurb.textContent = T.blurb;
    sub.textContent = "";
    sub.append(el("span", null, `“${String(answer).toUpperCase().slice(0, 18)}”`), el("i", null, `+${Math.round(metres).toLocaleString("en-US")} M`));
    // hang it just under the prompt card (its chains go up behind the card)
    const card = document.querySelector("#q-card:not(.hidden)")?.getBoundingClientRect();
    const box = stageEl.getBoundingClientRect();
    signWrap.style.top = card && card.height ? Math.round(card.bottom - box.top + 10 - 74) + "px" : "";
    rays.style.top = card && card.height ? Math.round(card.bottom - box.top + 90) + "px" : "";
    sign.className = "rs-sign t" + tier; void sign.offsetWidth; sign.classList.add("show");
    rays.classList.toggle("on", tier === 5);
  }

  const ORD = ["", "1ST GEAR", "2ND GEAR", "3RD GEAR", "4TH GEAR", "5TH GEAR"];
  let active = false, guard = 0;

  // tier: 1–5; metres: what the answer is worth; rig: the REV & SHIFT rig (already green);
  // launch(): start the car's real run; onGear(g): the car's own shift (sound, backfire); alive(): still this race;
  // who: the racer's name on the sign (2 players, online); labels: names for the tiers instead of TIERS
  // (CRAZY MODE's payouts); hold: how long the sign stays up (ms); sky: the road's sky effects and speed
  // lines (off in the themed worlds, which aren't a road)
  async function play({ tier, answer, metres, rig, launch, onGear, alive = () => true, who = "", labels = null, hold = 0, sky = true }) {
    active = true; skipping = false;
    const sc = scene();
    const calm = reduce();
    const names = labels || tiers;
    const lines = (o) => { streaks.style.opacity = calm || !sky ? "0" : String(o); };
    const kick = () => { if (!calm) pulse(stageEl, "rs-kick"); };
    armed = performance.now() + 250;
    addEventListener("pointerdown", onTap, true);
    // quitting mid-reveal ends it at once
    guard = setInterval(() => { if (!alive()) { skipping = true; wake?.(); } }, 200);
    layer.classList.add("on");
    fx.on = sky; fx.sky = 0; if (sky) startAmb();
    // the green light: a white flash, a punch-in and the letterbox bars
    pulse(flash, "go");
    stageEl.classList.add("rs-cine");
    if (!calm) stageEl.classList.add("rs-punch");
    await nap(650);
    stageEl.classList.remove("rs-punch");
    if (!alive()) return end();
    rig?.showLadder(true, !!labels);
    rig?.setOdo(0);
    launch?.();
    if (!calm) pulse(stageEl, "rs-rumble");
    lines(0.4);
    await nap(350);
    // one shift per tier: rarer answers get more gears
    let odo = 0;
    const tick = (to) => {
      const from = odo, t0 = performance.now(), ms = skipping ? 0 : 450;
      odo = to;
      const step = (now) => {
        const k = ms ? Math.min(1, (now - t0) / ms) : 1;
        rig?.setOdo(from + (to - from) * (1 - (1 - k) ** 3));
        if (k < 1 && active) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    for (let g = 1; g <= tier && alive(); g++) {
      const hex = TIER_HEX[g];
      rig?.shiftTo(g, g === tier);
      tick(metres * tiers[g].metres / tiers[tier].metres);
      if (g >= 3) { if (sky) fx.sky = g; sc?.rare?.(g); }
      if (!skipping) {
        callout.style.setProperty("--c", hex);
        calloutGear.textContent = ORD[g];
        calloutTier.textContent = names[g].short;
        pulse(callout, "run");
        kick();
      }
      if (onGear) onGear(g); else sfx.shift?.();
      await nap(110);
      lines(Math.min(1, 0.4 + g * 0.15));
      await nap(g === tier ? 820 : 680);
    }
    if (!alive()) return end();
    // the stamp: the sign drops in on its chains
    skipping = false;
    armed = performance.now() + 300;
    rig?.setOdo(metres);
    rig?.finalTier(tier);
    rig?.hideLadder();
    callout.classList.remove("run");
    streaks.style.opacity = "0";
    if (!calm) stageEl.classList.add("rs-freeze");
    showSign(tier, answer, metres, names, who);
    pulse(flash, "go");
    skipHint.classList.add("on");
    setTimeout(() => { if (!active) return; kick(); spark(TIER_HEX[tier], tier * 6); sfx.tier?.(tier); }, calm ? 0 : 420);
    if (tier === 5) {
      sc?.confetti?.();
      sfx.win?.();
      for (let i = 0; i < 4 && !skipping; i++) { spark(TIER_HEX[5], 16); await nap(360); }
    } else sfx.ding?.();
    if (alive()) await nap(hold || (tier >= 4 ? 3400 : 2800));
    end();
  }
  function end() {
    active = false;
    clearInterval(guard);
    removeEventListener("pointerdown", onTap, true);
    wake = null;
    sign.className = "rs-sign";
    rays.classList.remove("on");
    callout.classList.remove("run");
    streaks.style.opacity = "0";
    skipHint.classList.remove("on");
    layer.classList.remove("on");
    stageEl.classList.remove("rs-cine", "rs-punch", "rs-freeze");
    fx.on = false; fx.sky = 0;
  }

  return { play, end, get active() { return active; } };
}
