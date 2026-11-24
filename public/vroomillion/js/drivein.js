// BOX OFFICE's race: a night at the drive-in. A giant screen on stilts, rows of parked cars with speaker
// posts, and the projector's beam overhead. Every answer plays as a "trailer" on the big screen, styled
// by rarity: a plain title card, sweeping spotlights, a starfield warp, explosions, and for ONE IN A
// VROOMILLION a gold BLOCKBUSTER premiere with fireworks while the whole lot flashes its headlights.
// Your car rolls forward through the rows towards the screen; rarer answers roll it further, faster.
// Same interface as the road (chase.js) and WORLD TOUR (world.js) for main.js.
import { rearSprite } from "./cars.js";

const TIER_COL = ["#6f6a80", "#c4c1d4", "#5dff8f", "#4f9dff", "#c070ff", "#ffd23f"];
const BUILD = [0, 0, 0, 0.75, 1.1, 1.6];
const TITLE_FONT = '"Bungee", "Space Grotesk", sans-serif';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);
const hash = (n) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
// the other cars at the drive-in: plain colours, drawn from the game's own rear sprites
const LOT_COLOURS = ["#c23b3b", "#3b6fc2", "#e0c341", "#3bb06a", "#8a4fc9", "#d8d8d8", "#2b2b33", "#e07a2b", "#4fb5c2"];
const lotCar = (k) => ({ id: "lot" + k, body: ["sedan", "hatch", "pickup", "van", "coupe"][k % 5], color: LOT_COLOURS[k % LOT_COLOURS.length], accent: "#222", cls: "D" });

export class DriveInScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.g = canvas.getContext("2d");
    this.W = 320; this.H = 480; this.u = 1;
    this.racers = []; this.time = 0;
    this.cards = []; this.particles = [];
    this.show = null; // the trailer on the big screen
    this.flash = 0; this.flashColor = "#fff"; this.lights = 0;
    this.shake = 0; this.speed = 0; this.kick = 0; this.stretch = 0;
    this.calm = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.onEvent = null; this.lobby = false;
    this.stars = [...Array(60)].map((_, i) => [hash(i), hash(i + 99) * 0.4, hash(i + 7)]);
  }
  // BOX OFFICE's home screen: your car idles in the aisle while sample trailers loop on the big screen
  lobbyTick(car) {
    const REEL = [["METROPOLIS", 2], ["NOSFERATU", 3], ["THE GENERAL", 1], ["CASABLANCA", 4], ["SEVEN SAMURAI", 3], ["VERTIGO", 5]];
    if (!this.lobby || !this.racers.length || this.racers[0].car?.id !== car?.id) {
      this.lobby = true;
      this.setRacers([{ car, label: "", color: "#4fd1ff" }]);
      this.reelI = 0; this.reelWait = 0.8;
    }
    if (this.cards.length) return;
    this.reelWait -= 1 / 30;
    if (this.reelWait > 0) return;
    const [answer, tier] = REEL[this.reelI++ % REEL.length];
    this.onEvent = null;
    this.smash([{ answer, tier, fx: tier, tierName: ["", "TRAFFIC", "CRUISING", "FAST LANE · RARE", "TURBO · ULTRA RARE", "ONE IN A VROOMILLION"][tier], gain: "", i: 0 }]).then(() => { if (this.lobby) this.launch(0, tier, false, 2.5); });
    this.reelWait = 3.5;
  }
  setHi(canvas, R) { this.hiG = canvas ? canvas.getContext("2d") : null; this.hiScale = R; }
  resize(w, h, carBottom) { this.W = w; this.H = h; this.u = Math.max(1, w / 320); this.bottom = carBottom || h * 0.82; }
  // the big screen: the top of the play area, under the question card
  screenBox() {
    const W = this.W, top = this.H * 0.44, sw = Math.min(W * 0.86, (this.bottom - top) * 1.25), sh = sw * 0.42;
    return { x: (W - sw) / 2, y: top + 4 * this.u, w: sw, h: sh };
  }
  coverTop() { return this.H * 0.44 - 6 * this.u; }
  setRacers(list) {
    if (!list.some((r) => r.label === "")) this.lobby = false;
    this.racers = list.map((r, i) => ({ ...r, dist: 0, boost: 0, nitro: false, roll: 0, lane: list.length > 1 ? (i ? 0.58 : 0.42) : 0.5, honk: 0 }));
    this.rows = 0; this.cards = []; this.particles = []; this.show = null;
  }
  anchor(i) {
    const r = this.racers[i]; if (!r) return { x: 0.5, y: 0.7 };
    return { x: r.lane, y: clamp((this.bottom - 30 * this.u) / this.H, 0.2, 0.9) };
  }
  // ---- the answer: a trailer on the big screen ----
  smash(cards) {
    return new Promise((resolve) => {
      this.cards = cards.map((c, i) => ({ ...c, fx: c.fx ?? c.tier, build: BUILD[c.fx ?? c.tier] || 0, i, t: 0, phase: "slam", revealed: !(BUILD[c.fx ?? c.tier] > 0) }));
      // the rarest answer of the round gets the screen; a 2-player round splits it
      this.show = { t: 0, cards: this.cards };
      this.cardsDone = resolve;
    });
  }
  launch(i, tier, nitro, secs) {
    const r = this.racers[i]; if (!r) return;
    r.roll = tier ? (0.6 + tier * 0.55) * (nitro ? 1.3 : 1) : 0;
    r.rollT = 0; r.rollSecs = Math.max(1, secs);
    if (!tier) { this.puff(r, 8, "#c9c4d6"); return; }
    r.honk = 0.6;
    if (tier >= 4) { this.lights = 1.6; this.puff(r, 20, "#ffd23a"); }
  }
  backfire(i) { const r = this.racers[i]; if (r) this.puff(r, 4, "#ff9a1f"); }
  arrive() {}
  rare(tier) { this.flash = 0.3 + tier * 0.07; this.flashColor = TIER_COL[tier] || "#fff"; }
  confetti() {
    const cols = ["#ff4fd8", "#ffd23a", "#5dff8f", "#4fd1ff", "#ffffff"];
    for (let k = 0; k < 90; k++) this.particles.push({ x: this.W * Math.random(), y: -10 - Math.random() * 60, vx: (Math.random() - 0.5) * 40, vy: 60 + Math.random() * 80, life: 2 + Math.random(), c: cols[k % 5], s: 2 + Math.random() * 2 });
  }
  puff(r, n, c) {
    const x = this.W * r.lane, y = this.bottom - 6 * this.u;
    for (let k = 0; k < n; k++) { const a = Math.random() * Math.PI * 2, s = 20 + Math.random() * 50; this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, life: 0.5 + Math.random() * 0.5, c, s: 2 }); }
  }
  firework(x, y, col) {
    for (let k = 0; k < 36; k++) { const a = (k / 36) * Math.PI * 2, s = 60 + Math.random() * 50; this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.9 + Math.random() * 0.4, c: k % 3 ? col : "#fff", s: 2, g: 40 }); }
  }

  update(dt) {
    this.time += dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 0.8);
    if (this.lights > 0) this.lights = Math.max(0, this.lights - dt);
    let pending = false;
    for (const c of this.cards) {
      c.t += dt;
      if (c.phase === "slam" && c.t >= 0.35) { c.phase = "hold"; this.onEvent?.("slam", c); if (!c.build) c.holdFrom = c.t; }
      else if (c.phase === "hold" && !c.revealed && c.t >= 0.35 + c.build) { c.revealed = true; c.holdFrom = c.t; this.onEvent?.("reveal", c); }
      else if (c.phase === "hold" && c.revealed && c.t >= (c.holdFrom ?? 0.35) + 0.9 + c.fx * 0.15) { c.phase = "done"; this.onEvent?.("impact", c); }
      if (c.phase !== "done") pending = true;
    }
    if (this.cards.length && !pending) { this.cards = []; const r = this.cardsDone; this.cardsDone = null; r?.(); }
    if (this.show) {
      this.show.t += dt;
      const top = Math.max(...this.show.cards.map((c) => (c.revealed ? c.fx : 0)));
      // fireworks over the screen for the big ones
      if (top >= 4 && !this.calm && Math.random() < dt * (top === 5 ? 4 : 1.5)) { const b = this.screenBox(); this.firework(b.x + Math.random() * b.w, b.y - 10 * this.u - Math.random() * 40 * this.u, TIER_COL[top]); }
      if (this.show.t > 9) this.show = null;
    }
    // rolling forward through the rows
    for (const r of this.racers) {
      if (r.honk > 0) r.honk -= dt;
      if (r.roll > 0) { r.rollT += dt; const k = clamp(r.rollT / r.rollSecs, 0, 1); const v = Math.sin(Math.PI * k) * r.roll; this.rows += (v * dt) / this.racers.length; if (k >= 1) r.roll = 0; }
    }
    if (this.lobby) this.rows += dt * 0.15;
    for (const q of this.particles) { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.g) q.vy += q.g * dt; }
    this.particles = this.particles.filter((q) => q.life > 0);
  }

  draw() {
    const { g, W, H, u } = this;
    g.save();
    g.imageSmoothingEnabled = false;
    if (this.shake > 0 && !this.calm) g.translate((Math.random() - 0.5) * 6 * u * this.shake, (Math.random() - 0.5) * 6 * u * this.shake);
    // the night sky
    const sky = g.createLinearGradient(0, 0, 0, H * 0.7);
    sky.addColorStop(0, "#05030f"); sky.addColorStop(0.6, "#1a0f3a"); sky.addColorStop(1, "#3a1a4a");
    g.fillStyle = sky; g.fillRect(-10, -10, W + 20, H + 20);
    g.fillStyle = "#fff";
    for (const [x, y, p] of this.stars) if (Math.sin(this.time * 2 + p * 9) > -0.6) g.fillRect(Math.round(x * W), Math.round(y * H), Math.max(1, Math.round(u)), Math.max(1, Math.round(u)));
    // distant hills and a town glow
    const b = this.screenBox();
    const hz = b.y + b.h + 30 * u;
    g.fillStyle = "#140c26";
    g.beginPath(); g.moveTo(0, hz); for (let x = 0; x <= W; x += 8 * u) g.lineTo(x, hz - 14 * u - Math.abs(Math.sin(x * 0.02)) * 18 * u); g.lineTo(W, hz); g.closePath(); g.fill();
    // the screen on its stilts, and the beam
    g.fillStyle = "#2a2238";
    for (const sx of [b.x + b.w * 0.1, b.x + b.w * 0.5, b.x + b.w * 0.9]) g.fillRect(Math.round(sx - 2 * u), Math.round(b.y + b.h), Math.round(4 * u), Math.round(hz - b.y - b.h + 6 * u));
    g.fillStyle = "#0b0618"; g.fillRect(Math.round(b.x - 4 * u), Math.round(b.y - 4 * u), Math.round(b.w + 8 * u), Math.round(b.h + 8 * u));
    this.drawScreen(g, b);
    // the lot: rows of parked cars scrolling towards you as you roll forward
    const lotTop = hz, lotH = H - hz;
    const ground = g.createLinearGradient(0, lotTop, 0, H);
    ground.addColorStop(0, "#1c1626"); ground.addColorStop(1, "#2c2436");
    g.fillStyle = ground; g.fillRect(0, lotTop, W, lotH);
    const beam = g.createLinearGradient(0, H, 0, b.y);
    beam.addColorStop(0, "rgba(255,255,230,0.0)"); beam.addColorStop(1, `rgba(255,255,230,${0.08 + (this.show ? 0.06 : 0)})`);
    g.fillStyle = beam; g.beginPath(); g.moveTo(W / 2 - 6 * u, H); g.lineTo(b.x, b.y); g.lineTo(b.x + b.w, b.y); g.lineTo(W / 2 + 6 * u, H); g.closePath(); g.fill();
    // rows of parked cars either side of the centre aisle, scrolling towards you as you roll up it
    const frac = this.rows % 1, base = Math.floor(this.rows);
    const ROWS = 6;
    for (let k = ROWS; k >= 0; k--) {
      const d = (k + frac) / ROWS; // 0 far .. 1 near
      const y = lotTop + lotH * Math.pow(d, 1.7);
      const sc = 0.3 + d * 1.05;
      const rowId = base - k;
      // the aisle narrows into the distance
      const aisle = W * (0.1 + d * 0.16);
      g.fillStyle = "rgba(255,255,255,0.06)"; g.fillRect(0, Math.round(y), W, Math.max(1, Math.round(u * d)));
      for (const side of [-1, 1]) for (let c = 0; c < 3; c++) {
        if (hash(rowId * 13 + c * 5 + side) < 0.22) continue;
        const x = W / 2 + side * (aisle + (c + 0.5) * 34 * u * sc);
        if (x < -30 * u || x > W + 30 * u) continue;
        const car = lotCar(Math.floor(hash(rowId * 7 + c * 3 + side) * 40));
        this.drawCar(g, car, x, y, 28 * u * sc, this.lights > 0 && Math.sin(this.time * 20 + c + side) > 0);
        g.fillStyle = "#4a4258"; g.fillRect(Math.round(x + side * 16 * u * sc), Math.round(y - 13 * u * sc), Math.max(1, Math.round(2 * u * sc)), Math.round(13 * u * sc));
        g.fillStyle = "#8a8298"; g.fillRect(Math.round(x + side * 16 * u * sc - u * sc), Math.round(y - 15 * u * sc), Math.max(2, Math.round(4 * u * sc)), Math.max(1, Math.round(3 * u * sc)));
      }
    }
    // the aisle's centre line, moving as you roll
    g.fillStyle = "rgba(255,210,58,0.35)";
    for (let k = 0; k < 12; k++) { const d = ((k + (this.rows * 2) % 1) / 12); const y = lotTop + lotH * Math.pow(d, 1.7); g.fillRect(Math.round(W / 2 - u * (0.5 + d)), Math.round(y), Math.max(1, Math.round(u * (1 + d * 2))), Math.max(1, Math.round(u * 3 * d))); }
    // you
    for (const r of this.racers) {
      const x = r.lane * W, y = this.bottom;
      this.drawCar(g, r.car, x, y, (this.racers.length > 1 ? 40 : 56) * u, r.honk > 0 || this.lights > 0, true);
      if (r.roll > 0 || r.honk > 0) { g.globalAlpha = 0.18; g.fillStyle = "#fff6c8"; g.beginPath(); g.moveTo(x - 20 * u, y - 20 * u); g.lineTo(x - 60 * u, y - 140 * u); g.lineTo(x + 60 * u, y - 140 * u); g.lineTo(x + 20 * u, y - 20 * u); g.closePath(); g.fill(); g.globalAlpha = 1; }
      g.fillStyle = r.color || "#4fd1ff"; g.fillRect(Math.round(x - 8 * u), Math.round(y - 58 * u), Math.round(16 * u), Math.round(7 * u));
    }
    for (const q of this.particles) { g.globalAlpha = clamp(q.life * 2, 0, 1); g.fillStyle = q.c; const s = Math.max(1, Math.round(q.s * u * 0.7)); g.fillRect(Math.round(q.x), Math.round(q.y), s, s); }
    g.globalAlpha = 1;
    if (this.flash > 0 && !this.calm) { g.globalAlpha = Math.min(0.4, this.flash); g.fillStyle = this.flashColor; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
    g.restore();
    this.drawHi();
  }
  drawCar(g, car, x, y, width, lightsOn, mine = false) {
    let spr;
    try { spr = rearSprite(car, Math.floor(this.time * 4) % 2); } catch { spr = null; }
    if (!spr) return;
    const res = spr.res || 1, k = width / (spr.width / res), w = Math.round((spr.width / res) * k), h = Math.round((spr.height / res) * k);
    g.drawImage(spr, Math.round(x - w / 2), Math.round(y - h), w, h);
    if (lightsOn) { g.globalAlpha = 0.5; g.fillStyle = "#ff3b3b"; g.fillRect(Math.round(x - w * 0.45), Math.round(y - h * 0.45), Math.round(w * 0.9), Math.max(1, Math.round(h * 0.1))); g.globalAlpha = 1; }
    if (mine) { g.globalAlpha = 0.25; g.fillStyle = "#000"; g.beginPath(); g.ellipse(x, y, w * 0.55, h * 0.12, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; }
  }
  // the picture on the big screen (the words are drawn sharp on the full-resolution layer)
  drawScreen(g, b) {
    const s = this.show, u = this.u;
    g.save(); g.beginPath(); g.rect(b.x, b.y, b.w, b.h); g.clip();
    if (!s) {
      // between trailers: the countdown leader and flicker
      g.fillStyle = "#d8d2c0"; g.fillRect(b.x, b.y, b.w, b.h);
      g.globalAlpha = 0.2 + 0.1 * Math.sin(this.time * 30); g.fillStyle = "#000"; g.fillRect(b.x, b.y, b.w, b.h); g.globalAlpha = 1;
      g.strokeStyle = "#2a2238"; g.lineWidth = Math.max(1, u); g.beginPath(); g.arc(b.x + b.w / 2, b.y + b.h / 2, b.h * 0.36, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(b.x + b.w / 2, b.y + b.h / 2); g.lineTo(b.x + b.w / 2 + Math.cos(this.time * 4) * b.h * 0.36, b.y + b.h / 2 + Math.sin(this.time * 4) * b.h * 0.36); g.stroke();
      g.restore(); return;
    }
    const top = Math.max(...s.cards.map((c) => (c.revealed ? c.fx : 1)));
    const bg = ["#120a20", "#16102a", "#0f2a1c", "#0c1a3a", "#200a36", "#2a1a00"][top];
    g.fillStyle = bg; g.fillRect(b.x, b.y, b.w, b.h);
    const t = s.t;
    if (top >= 2 && !this.calm) { // spotlights sweeping
      g.globalAlpha = 0.25; g.fillStyle = TIER_COL[top];
      for (const side of [-1, 1]) { const a = Math.sin(t * 1.6 + side) * 0.5; g.beginPath(); g.moveTo(b.x + b.w / 2 + side * b.w * 0.3, b.y + b.h); g.lineTo(b.x + b.w / 2 + side * b.w * 0.3 + Math.sin(a) * b.h * 1.4 - b.w * 0.06, b.y - 4); g.lineTo(b.x + b.w / 2 + side * b.w * 0.3 + Math.sin(a) * b.h * 1.4 + b.w * 0.06, b.y - 4); g.closePath(); g.fill(); }
      g.globalAlpha = 1;
    }
    if (top >= 3 && !this.calm) { // a starfield warp
      g.fillStyle = "#fff";
      for (let k = 0; k < 40; k++) { const a = hash(k) * Math.PI * 2, r = ((t * 0.6 + hash(k + 5)) % 1) * b.w * 0.6; g.fillRect(Math.round(b.x + b.w / 2 + Math.cos(a) * r), Math.round(b.y + b.h / 2 + Math.sin(a) * r * 0.5), Math.max(1, Math.round(u * (1 + r / b.w * 2))), Math.max(1, Math.round(u))); }
    }
    if (top >= 4 && !this.calm) { // explosions along the bottom
      for (let k = 0; k < 4; k++) { const ph = (t * 1.3 + k * 0.27) % 1, x = b.x + b.w * (0.15 + k * 0.23), r = ph * b.h * 0.5; g.globalAlpha = 1 - ph; g.fillStyle = k % 2 ? "#ff9a1f" : "#ffd23a"; g.beginPath(); g.arc(x, b.y + b.h, r, Math.PI, 0); g.fill(); }
      g.globalAlpha = 1;
    }
    if (top === 5) { g.globalAlpha = 0.25 + 0.15 * Math.sin(t * 8); g.fillStyle = "#ffd23a"; g.fillRect(b.x, b.y, b.w, b.h); g.globalAlpha = 1; }
    // film scratches and flicker
    if (!this.calm) { g.fillStyle = "rgba(255,255,255,0.12)"; for (let k = 0; k < 3; k++) if (hash(Math.floor(t * 12) + k) > 0.6) g.fillRect(Math.round(b.x + hash(Math.floor(t * 12) * 3 + k) * b.w), b.y, Math.max(1, Math.round(u)), b.h); }
    g.restore();
  }
  drawHi() {
    const hg = this.hiG; if (!hg) return;
    const R = this.hiScale || 1, css = this.cssPx || 1, px = (n) => n / css;
    hg.setTransform(1, 0, 0, 1, 0, 0); hg.clearRect(0, 0, hg.canvas.width, hg.canvas.height); hg.setTransform(R, 0, 0, R, 0, 0);
    hg.textAlign = "center"; hg.textBaseline = "middle";
    for (const r of this.racers) { hg.font = `${px(9)}px ${TITLE_FONT}`; hg.fillStyle = "#0b0618"; hg.fillText(r.label || "", r.lane * this.W, this.bottom - 54.5 * this.u); }
    const s = this.show; if (!s) return;
    const b = this.screenBox();
    const n = s.cards.length;
    s.cards.forEach((c, i) => {
      const cx = b.x + b.w * (n > 1 ? (i ? 0.75 : 0.25) : 0.5), cw = b.w / n;
      const slam = c.phase === "slam" ? Math.min(1, c.t / 0.35) : 1;
      const sc = 1 + 1.4 * (1 - slam) * (1 - slam);
      const building = !c.revealed;
      const fx = c.revealed ? c.fx : Math.min(c.fx, 1 + Math.floor(Math.min(1, (c.t - 0.35) / (c.build || 1)) * c.fx));
      const ans = (c.answer || "").toUpperCase();
      hg.save();
      hg.translate(cx + (building && !this.calm ? (Math.random() - 0.5) * px(4) : 0), b.y + b.h * 0.46);
      hg.scale(sc, sc); hg.globalAlpha = slam;
      hg.font = `${px(10)}px ${TITLE_FONT}`; hg.fillStyle = TIER_COL[fx];
      hg.fillText(c.revealed ? (c.fx === 5 ? "★ BLOCKBUSTER ★" : "NOW SHOWING") : "COMING SOON…", 0, -b.h * 0.3, cw * 0.9);
      const size = px(clamp(28 - Math.max(0, ans.length - 10) * 1.1, 13, 28)) / n ** 0.3;
      hg.font = `${size}px ${TITLE_FONT}`;
      hg.fillStyle = "#05020c"; hg.fillText(ans, px(2), px(2), cw * 0.92);
      hg.fillStyle = c.fx === 5 && c.revealed ? "#ffd23a" : "#ffffff"; hg.fillText(ans, 0, 0, cw * 0.92);
      hg.font = `${px(11)}px ${TITLE_FONT}`;
      hg.fillStyle = TIER_COL[fx]; hg.fillText(c.revealed ? c.tierName || "" : ". . .", 0, b.h * 0.24, cw * 0.92);
      hg.fillStyle = "#ffd23a"; hg.fillText(c.revealed ? c.gain || "" : "? ? ?", 0, b.h * 0.36, cw * 0.92);
      hg.restore();
    });
  }
}
