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
    this.racers = []; this.time = 0; this.dtLast = 0; this.curtain = 0;
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
  // u: the pixel scale. Wide screens size by height too, or the cars grow up into the big screen
  resize(w, h, carBottom) { this.W = w; this.H = h;
    // the shared canvas follows (with the phone keyboard up the screen is much shorter): a part left
    // over from the old size would never be redrawn and smears into streaks
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; } this.u = Math.max(1, Math.min(w, h * 0.7) / 320); this.bottom = carBottom || h * 0.82; }
  // the big screen: the top of the play area, under the question card
  screenBox() {
    const W = this.W, top = this.H * 0.44, sw = Math.min(W * 0.86, (this.bottom - top) * 1.25), sh = sw * 0.42;
    return { x: (W - sw) / 2, y: top + 4 * this.u, w: sw, h: sh };
  }
  coverTop() { return this.H * 0.44 - 6 * this.u; }
  setRacers(list) {
    if (!list.some((r) => r.label === "")) this.lobby = false;
    this.racers = list.map((r, i) => ({ ...r, dist: 0, boost: 0, nitro: false, roll: 0, lane: list.length > 1 ? (i ? 0.58 : 0.42) : 0.5, honk: 0 }));
    this.rows = 0; this.cards = []; this.particles = []; this.show = null; this.fin = null;
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
    this.time += dt; this.dtLast = dt;
    if (this.fin) { this.fin.t += dt; if (this.fin.t > 3.7) this.lights = 0.3; } // THE END: the whole lot flashes its lights
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

  // ---- the scenery that never moves, painted once per screen size ----
  buildBg() {
    const { W, H, u } = this, b = this.screenBox(), hz = b.y + b.h + 30 * u;
    const key = [W, H, Math.round(b.y), Math.round(b.w)].join();
    if (this.bgKey === key) return;
    this.bgKey = key;
    const c = this.bg || (this.bg = document.createElement("canvas"));
    c.width = W; c.height = H;
    const g = c.getContext("2d");
    g.imageSmoothingEnabled = false;
    const R = (x, y, w, h) => g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
    // the night sky, a big moon and the stars
    const sky = g.createLinearGradient(0, 0, 0, hz);
    sky.addColorStop(0, "#03020c"); sky.addColorStop(0.55, "#120a32"); sky.addColorStop(0.85, "#2e1546"); sky.addColorStop(1, "#5a2448");
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    g.fillStyle = "#ffffff";
    for (let k = 0; k < 140; k++) { const x = hash(k + 3) * W, y = Math.pow(hash(k + 51), 1.6) * hz * 0.85, s = hash(k + 9) > 0.92 ? 2 : 1; g.globalAlpha = 0.35 + hash(k + 21) * 0.6; R(x, y, s * u * 0.8, s * u * 0.8); }
    g.globalAlpha = 1;
    const mx = W * 0.82, my = Math.max(26 * u, b.y * 0.42), mr = 13 * u;
    const glow = g.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 4);
    glow.addColorStop(0, "rgba(255,240,200,0.35)"); glow.addColorStop(1, "rgba(255,240,200,0)");
    g.fillStyle = glow; g.fillRect(mx - mr * 4, my - mr * 4, mr * 8, mr * 8);
    g.fillStyle = "#fff1c9"; g.beginPath(); g.arc(mx, my, mr, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#e6d3a6"; for (const [dx, dy, r] of [[-4, -3, 3], [3, 4, 2.2], [5, -5, 1.6], [-2, 6, 1.4]]) { g.beginPath(); g.arc(mx + dx * u, my + dy * u, r * u, 0, Math.PI * 2); g.fill(); }
    // wisps of cloud across the moon
    g.fillStyle = "rgba(60,40,110,0.55)";
    for (let k = 0; k < 5; k++) R(mx - 40 * u + k * 17 * u, my + (k % 2 ? 6 : -9) * u, 30 * u, 3 * u);
    // the city on the horizon: blocks with lit windows
    const city = hz - 4 * u;
    for (let x = -4 * u, k = 0; x < W; k++) {
      const bw = (10 + hash(k * 3.1) * 16) * u, bh = (12 + Math.pow(hash(k * 7.7), 2) * 46) * u;
      g.fillStyle = k % 3 ? "#160d2c" : "#1c1236"; R(x, city - bh, bw, bh + 6 * u);
      for (let wy = city - bh + 3 * u; wy < city - 3 * u; wy += 4 * u) for (let wx = x + 2 * u; wx < x + bw - 2 * u; wx += 3.5 * u) {
        const h = hash(wx * 0.37 + wy * 1.13);
        if (h > 0.72) { g.fillStyle = h > 0.93 ? "#9ad8ff" : "#ffd98a"; g.globalAlpha = 0.55 + (h - 0.72) * 2; R(wx, wy, 1.4 * u, 1.6 * u); g.globalAlpha = 1; }
      }
      if (hash(k * 5.3) > 0.8) { g.fillStyle = "#ff3b5c"; R(x + bw / 2 - 0.5 * u, city - bh - 6 * u, u, 6 * u); }
      x += bw + hash(k * 2.3) * 3 * u;
    }
    // hills and a line of trees in front of the city
    g.fillStyle = "#0d0820";
    g.beginPath(); g.moveTo(0, hz + 2 * u);
    for (let x = 0; x <= W + 8 * u; x += 4 * u) g.lineTo(x, hz - 6 * u - Math.abs(Math.sin(x * 0.011 + 1)) * 10 * u - Math.abs(Math.sin(x * 0.05)) * 3 * u);
    g.lineTo(W, hz + 2 * u); g.closePath(); g.fill();
    // the screen's steel scaffolding (behind it), its stilts and the grass bank it stands on
    g.strokeStyle = "#2c2442"; g.lineWidth = Math.max(1, u);
    const sx0 = b.x + b.w * 0.06, sx1 = b.x + b.w * 0.94, sy0 = b.y + b.h * 0.2, sy1 = hz + 2 * u;
    for (let x = sx0; x <= sx1 + 1; x += (sx1 - sx0) / 6) { g.beginPath(); g.moveTo(x, sy0); g.lineTo(x, sy1); g.stroke(); }
    for (let k = 0; k < 6; k++) { const x = sx0 + ((sx1 - sx0) / 6) * k, x2 = x + (sx1 - sx0) / 6; g.beginPath(); g.moveTo(x, b.y + b.h); g.lineTo(x2, sy1); g.moveTo(x2, b.y + b.h); g.lineTo(x, sy1); g.stroke(); }
    g.fillStyle = "#0a1a12"; g.beginPath(); g.ellipse(W / 2, hz + 4 * u, b.w * 0.62, 9 * u, 0, Math.PI, 0); g.fill();
    // the screen's frame: a deep border with a lit rim
    g.fillStyle = "#07040f"; R(b.x - 6 * u, b.y - 6 * u, b.w + 12 * u, b.h + 12 * u);
    g.fillStyle = "#3a2a5c"; R(b.x - 6 * u, b.y - 6 * u, b.w + 12 * u, u); R(b.x - 6 * u, b.y + b.h + 5 * u, b.w + 12 * u, u);
    // the lot: asphalt with a little grit, darker far away
    const lotTop = hz;
    const ground = g.createLinearGradient(0, lotTop, 0, H);
    ground.addColorStop(0, "#15111f"); ground.addColorStop(1, "#2a2433");
    g.fillStyle = ground; g.fillRect(0, lotTop, W, H - lotTop);
    for (let k = 0; k < 600; k++) { const y = lotTop + Math.pow(hash(k * 1.7), 0.7) * (H - lotTop); g.fillStyle = hash(k * 4.1) > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.25)"; R(hash(k * 2.9) * W, y, u, u); }
  }

  draw() {
    const { g, W, H, u } = this;
    this.buildBg();
    g.save();
    g.imageSmoothingEnabled = false;
    if (this.shake > 0 && !this.calm) g.translate((Math.random() - 0.5) * 6 * u * this.shake, (Math.random() - 0.5) * 6 * u * this.shake);
    g.drawImage(this.bg, 0, 0);
    const b = this.screenBox(), hz = b.y + b.h + 30 * u, lotTop = hz, lotH = H - hz;
    const R = (x, y, w, h) => g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
    // a few stars twinkle; a shooting star now and then
    g.fillStyle = "#fff";
    for (const [x, y, p] of this.stars) if (Math.sin(this.time * 3 + p * 20) > 0.7) R(x * W, y * hz * 0.8, u, u);
    const sh = (this.time * 0.13) % 1;
    if (sh < 0.08 && !this.calm) { const k = sh / 0.08; g.globalAlpha = 1 - k; g.fillStyle = "#fff"; for (let j = 0; j < 8; j++) R(W * (0.15 + k * 0.4) - j * 3 * u, hz * (0.1 + k * 0.15) - j * u, u, u); g.globalAlpha = 1; }
    // the screen and its show
    this.drawScreen(g, b);
    // the projector beam, from the booth on top of the snack bar, with dust drifting in it
    const booth = { x: W * 0.84, y: hz - 2 * u };
    const beamA = 0.07 + (this.show ? 0.07 : 0.02);
    const beam = g.createLinearGradient(booth.x, booth.y, b.x + b.w / 2, b.y);
    beam.addColorStop(0, `rgba(255,250,225,${beamA * 2})`); beam.addColorStop(1, `rgba(255,250,225,${beamA * 0.6})`);
    g.fillStyle = beam; g.beginPath(); g.moveTo(booth.x - 2 * u, booth.y - 2 * u); g.lineTo(b.x + b.w * 0.04, b.y + b.h * 0.05); g.lineTo(b.x + b.w * 0.96, b.y + b.h * 0.95); g.lineTo(booth.x + 2 * u, booth.y + 2 * u); g.closePath(); g.fill();
    if (!this.calm) { g.fillStyle = "rgba(255,250,225,0.5)"; for (let k = 0; k < 14; k++) { const f = (hash(k) + this.time * 0.05 * (0.5 + hash(k + 3))) % 1; R(lerp(booth.x, b.x + b.w * (0.2 + hash(k + 8) * 0.6), f), lerp(booth.y, b.y + b.h * (0.2 + hash(k + 4) * 0.6), f) + Math.sin(this.time + k) * 2 * u, u, u); } }
    // strings of lights over the lot
    for (const [y0, sag, n] of [[hz + 4 * u, 10 * u, 22], [hz + lotH * 0.22, 16 * u, 16]]) {
      g.strokeStyle = "rgba(20,14,30,0.9)"; g.lineWidth = Math.max(1, u * 0.6); g.beginPath();
      for (let k = 0; k <= 24; k++) { const f = k / 24, x = lerp(-4 * u, W + 4 * u, f), y = y0 + Math.sin(f * Math.PI) * sag; k ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
      for (let k = 1; k < n; k++) { const f = k / n, x = lerp(-4 * u, W + 4 * u, f), y = y0 + Math.sin(f * Math.PI) * sag + u; const on = this.calm || Math.sin(this.time * 2.5 + k * 1.7) > -0.8; g.fillStyle = on ? ["#ffd98a", "#ff8fb8", "#8fe3ff", "#b8ff8f"][k % 4] : "#3a2f40"; R(x - u * 0.7, y, 1.5 * u, 1.5 * u); }
    }
    // the snack bar (right) and the neon DRIVE-IN sign (left), on the horizon
    this.drawSnackBar(g, booth.x, hz + 6 * u);
    this.drawSign(g, W * 0.12, hz + 6 * u);
    // rows of parked cars either side of the centre aisle, scrolling towards you as you roll up it
    const frac = this.rows % 1, base = Math.floor(this.rows);
    const ROWS = 6;
    for (let k = ROWS; k >= 0; k--) {
      const d = (k + frac) / ROWS; // 0 far .. 1 near
      const y = lotTop + lotH * Math.pow(d, 1.7);
      const sc = 0.3 + d * 1.05;
      const rowId = base - k;
      const aisle = W * (0.1 + d * 0.16);
      // painted bay lines
      g.fillStyle = "rgba(255,255,255,0.10)";
      for (const side of [-1, 1]) for (let c = 0; c <= 3; c++) { const x = W / 2 + side * (aisle + c * 34 * u * sc); R(x, y - 10 * u * sc, Math.max(1, u * sc * 0.8), 10 * u * sc); }
      for (const side of [-1, 1]) for (let c = 0; c < 3; c++) {
        if (hash(rowId * 13 + c * 5 + side) < 0.22) continue;
        const x = W / 2 + side * (aisle + (c + 0.5) * 34 * u * sc);
        if (x < -30 * u || x > W + 30 * u) continue;
        const car = lotCar(Math.floor(hash(rowId * 7 + c * 3 + side) * 40));
        this.drawCar(g, car, x, y, 28 * u * sc, this.lights > 0 && Math.sin(this.time * 20 + c + side) > 0);
        // a speaker post by each bay
        g.fillStyle = "#4a4258"; R(x + side * 16 * u * sc, y - 13 * u * sc, 2 * u * sc, 13 * u * sc);
        g.fillStyle = "#9a92a8"; R(x + side * 16 * u * sc - u * sc, y - 15 * u * sc, 4 * u * sc, 3 * u * sc);
      }
    }
    // the aisle's centre line, moving as you roll
    g.fillStyle = "rgba(255,210,58,0.4)";
    for (let k = 0; k < 12; k++) { const d = ((k + (this.rows * 2) % 1) / 12); const y = lotTop + lotH * Math.pow(d, 1.7); R(W / 2 - u * (0.5 + d), y, u * (1 + d * 2), u * 3 * d); }
    // you
    for (const r of this.racers) {
      const x = r.lane * W, y = this.bottom;
      if (r.roll > 0 || r.honk > 0 || this.show) { // headlights on the asphalt ahead
        const hl = g.createLinearGradient(0, y - 20 * u, 0, y - 120 * u);
        hl.addColorStop(0, "rgba(255,246,200,0.22)"); hl.addColorStop(1, "rgba(255,246,200,0)");
        g.fillStyle = hl; g.beginPath(); g.moveTo(x - 18 * u, y - 18 * u); g.lineTo(x - 50 * u, y - 120 * u); g.lineTo(x + 50 * u, y - 120 * u); g.lineTo(x + 18 * u, y - 18 * u); g.closePath(); g.fill();
      }
      this.drawCar(g, r.car, x, y, (this.racers.length > 1 ? 40 : 56) * u, r.honk > 0 || this.lights > 0, true);
      g.fillStyle = r.color || "#4fd1ff"; R(x - 8 * u, y - 58 * u, 16 * u, 7 * u);
    }
    for (const q of this.particles) { g.globalAlpha = clamp(q.life * 2, 0, 1); g.fillStyle = q.c; const s = Math.max(1, Math.round(q.s * u * 0.7)); R(q.x, q.y, s, s); }
    g.globalAlpha = 1;
    if (this.flash > 0 && !this.calm) { g.globalAlpha = Math.min(0.4, this.flash); g.fillStyle = this.flashColor; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
    g.restore();
    this.drawHi();
  }
  // a little snack bar with a striped awning, lit windows and the projection booth on its roof
  drawSnackBar(g, cx, base) {
    const u = this.u, R = (x, y, w, h) => g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
    const w = 46 * u, h = 16 * u, x = cx - w / 2, y = base - h;
    g.fillStyle = "#2a1c38"; R(x, y, w, h);
    g.fillStyle = "#ffd98a"; for (let k = 0; k < 4; k++) R(x + 4 * u + k * 11 * u, y + 6 * u, 7 * u, 6 * u);
    g.fillStyle = "rgba(255,217,138,0.18)"; R(x - 4 * u, base, w + 8 * u, 5 * u);
    for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? "#f4efe6" : "#d8243c"; R(x - 2 * u + k * ((w + 4 * u) / 8), y - 4 * u, (w + 4 * u) / 8 + 0.5, 4 * u); }
    g.fillStyle = "#1c1228"; R(cx - 7 * u, y - 12 * u, 14 * u, 8 * u); // the projection booth
    g.fillStyle = "#fff6c8"; R(cx - 6 * u, y - 10 * u, 2.5 * u, 2.5 * u);
    // neon "SNACKS"-style tube above (the word is drawn on the sharp layer)
    const on = this.calm || Math.sin(this.time * 7) > -0.95;
    g.fillStyle = on ? "#ff4fd8" : "#5a2050"; R(x + 3 * u, y - 7 * u, w - 6 * u, u * 0.8);
    this.snackAt = { x: cx, y: y + 3 * u, on };
  }
  // the roadside sign: a neon DRIVE-IN board with chasing bulbs and an arrow, on a pole
  drawSign(g, cx, base) {
    const u = this.u, R = (x, y, w, h) => g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
    const w = 44 * u, h = 15 * u, x = cx - w / 2, y = base - 34 * u;
    g.fillStyle = "#2c2442"; R(cx - u, y + h, 2 * u, base - y - h);
    g.fillStyle = "#1a0a14"; R(x, y, w, h);
    g.fillStyle = "#c8102e"; R(x, y, w, u); R(x, y + h - u, w, u);
    const step = Math.floor(this.time * 8);
    for (let k = 0, n = 0; k < w; k += 4 * u, n++) for (const by of [y - u, y + h]) { g.fillStyle = (n + step) % 3 === 0 || this.calm ? "#fff3b0" : "#7a5a20"; R(x + k, by, 1.5 * u, 1.5 * u); }
    // the arrow pointing into the lot
    g.fillStyle = Math.floor(this.time * 2) % 2 || this.calm ? "#ffd23a" : "#8a6a10";
    for (let k = 0; k < 4; k++) R(x + w + 2 * u + k * 2 * u, y + h / 2 - (4 - k) * u, 2 * u, (8 - 2 * k) * u);
    this.signAt = { x: cx, y: y + h / 2, w };
  }
  drawCar(g, car, x, y, width, lightsOn, mine = false) {
    let spr;
    try { spr = rearSprite(car, Math.floor(this.time * 4) % 2); } catch { spr = null; }
    if (!spr) return;
    const res = spr.res || 1, k = width / (spr.width / res), w = Math.round((spr.width / res) * k), h = Math.round((spr.height / res) * k);
    if (mine) { g.globalAlpha = 0.35; g.fillStyle = "#000"; g.beginPath(); g.ellipse(x, y, w * 0.58, h * 0.13, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; }
    g.drawImage(spr, Math.round(x - w / 2), Math.round(y - h), w, h);
    if (lightsOn) { g.globalAlpha = 0.5; g.fillStyle = "#ff3b3b"; g.fillRect(Math.round(x - w * 0.45), Math.round(y - h * 0.45), Math.round(w * 0.9), Math.max(1, Math.round(h * 0.1))); g.globalAlpha = 1; }
  }
  // the big screen: red curtains that open for each trailer; each rarity gets its own picture
  drawScreen(g, b) {
    const s = this.show, u = this.u, t = s ? s.t : 0;
    const R = (x, y, w, h) => g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
    // curtains: open while a trailer plays, closed between
    const want = s || this.fin ? 1 : 0;
    this.curtain = this.curtain ?? 0;
    this.curtain += clamp(want - this.curtain, -this.dtLast * 1.6, this.dtLast * 2.4);
    g.save(); g.beginPath(); g.rect(b.x, b.y, b.w, b.h); g.clip();
    const top = s ? Math.max(...s.cards.map((c) => (c.revealed ? c.fx : 1))) : 0;
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    if (this.fin) { // the end credits: a dark screen (the words roll on the sharp layer)
      const v = g.createRadialGradient(cx, cy, b.h * 0.1, cx, cy, b.w * 0.6); v.addColorStop(0, "#1a1030"); v.addColorStop(1, "#05030c");
      g.fillStyle = v; g.fillRect(b.x, b.y, b.w, b.h);
    } else if (!s) { g.fillStyle = "#e8e2d0"; g.fillRect(b.x, b.y, b.w, b.h); }
    else if (top <= 1) { // an old reel: sepia, grain, a vignette
      g.fillStyle = "#3a2c1c"; g.fillRect(b.x, b.y, b.w, b.h);
      const v = g.createRadialGradient(cx, cy, b.h * 0.1, cx, cy, b.w * 0.6); v.addColorStop(0, "#a8875a"); v.addColorStop(1, "#2a1e10");
      g.fillStyle = v; g.fillRect(b.x, b.y, b.w, b.h);
    } else if (top === 2) { // a sunset over the mountains
      const sk = g.createLinearGradient(0, b.y, 0, b.y + b.h); sk.addColorStop(0, "#2a1250"); sk.addColorStop(0.55, "#ff6a5a"); sk.addColorStop(1, "#ffc861");
      g.fillStyle = sk; g.fillRect(b.x, b.y, b.w, b.h);
      g.fillStyle = "#ffe9a0"; g.beginPath(); g.arc(cx, b.y + b.h * 0.78 - t * u, b.h * 0.2, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#2a1030"; g.beginPath(); g.moveTo(b.x, b.y + b.h);
      for (let x = 0; x <= b.w; x += 4 * u) g.lineTo(b.x + x, b.y + b.h * 0.8 - Math.abs(Math.sin(x * 0.03)) * b.h * 0.25); g.lineTo(b.x + b.w, b.y + b.h); g.fill();
    } else if (top === 3) { // deep space: a ringed planet and a starfield warp
      g.fillStyle = "#060a26"; g.fillRect(b.x, b.y, b.w, b.h);
      g.fillStyle = "#fff";
      for (let k = 0; k < 50; k++) { const a = hash(k) * Math.PI * 2, r = ((t * 0.5 + hash(k + 5)) % 1) * b.w * 0.6; R(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.5, u * (1 + (r / b.w) * 3), u); }
      g.fillStyle = "#4f6dff"; g.beginPath(); g.arc(b.x + b.w * 0.8, b.y + b.h * 0.72, b.h * 0.28, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "#b8c8ff"; g.lineWidth = Math.max(1, u); g.beginPath(); g.ellipse(b.x + b.w * 0.8, b.y + b.h * 0.72, b.h * 0.45, b.h * 0.08, -0.3, 0, Math.PI * 2); g.stroke();
    } else if (top === 4) { // an action movie: a city at night going up in explosions
      const sk = g.createLinearGradient(0, b.y, 0, b.y + b.h); sk.addColorStop(0, "#1a0630"); sk.addColorStop(1, "#7a1a3a");
      g.fillStyle = sk; g.fillRect(b.x, b.y, b.w, b.h);
      for (let k = 0; k < 5; k++) { const ph = (t * 1.1 + k * 0.21) % 1, x = b.x + b.w * (0.1 + k * 0.2), r = ph * b.h * 0.55; g.globalAlpha = 1 - ph; g.fillStyle = k % 2 ? "#ff9a1f" : "#ffd23a"; g.beginPath(); g.arc(x, b.y + b.h * 0.8, r, 0, Math.PI * 2); g.fill(); }
      g.globalAlpha = 1; g.fillStyle = "#0b0618";
      for (let x = b.x, k = 0; x < b.x + b.w; k++) { const bw = (6 + hash(k) * 10) * u, bh = b.h * (0.2 + hash(k * 3) * 0.35); R(x, b.y + b.h - bh, bw, bh); x += bw; }
    } else { // ONE IN A VROOMILLION: a gold premiere, rays turning behind
      g.fillStyle = "#3a2400"; g.fillRect(b.x, b.y, b.w, b.h);
      g.fillStyle = "rgba(255,210,58,0.35)";
      for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2 + t * 0.4; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * b.w, cy + Math.sin(a) * b.w); g.lineTo(cx + Math.cos(a + 0.18) * b.w, cy + Math.sin(a + 0.18) * b.w); g.closePath(); g.fill(); }
      g.fillStyle = "#fff6c8"; for (let k = 0; k < 20; k++) if (hash(k + Math.floor(t * 8)) > 0.6) R(b.x + hash(k * 3) * b.w, b.y + hash(k * 7) * b.h, u, u);
    }
    if (s) {
      // a dark band so the title always reads, and the film's scratches and flicker
      g.fillStyle = "rgba(5,2,12,0.45)"; g.fillRect(b.x, b.y + b.h * 0.26, b.w, b.h * 0.48);
      if (!this.calm) { g.fillStyle = "rgba(255,255,255,0.12)"; for (let k = 0; k < 3; k++) if (hash(Math.floor(t * 12) + k) > 0.6) R(b.x + hash(Math.floor(t * 12) * 3 + k) * b.w, b.y, u, b.h); }
    }
    // the curtains, drawn over the picture: velvet folds and a gold fringe
    const half = b.w / 2 * (1 - ease(clamp(this.curtain, 0, 1)) * 0.92);
    for (const side of [0, 1]) {
      const x0 = side ? b.x + b.w - half : b.x;
      for (let x = 0; x < half; x += 3 * u) { const f = Math.sin((x / u) * 0.9) * 0.5 + 0.5; g.fillStyle = `rgb(${Math.round(110 + f * 60)},${Math.round(10 + f * 12)},${Math.round(24 + f * 16)})`; R(x0 + x, b.y, 3 * u, b.h); }
      g.fillStyle = "#d8a32a"; R(x0, b.y + b.h - 2 * u, half, 2 * u);
    }
    g.restore();
    // the valance across the top, always there
    g.fillStyle = "#7a0d1c"; R(b.x - 6 * u, b.y - 6 * u, b.w + 12 * u, 7 * u);
    g.fillStyle = "#d8a32a"; for (let x = b.x - 6 * u; x < b.x + b.w + 6 * u; x += 4 * u) R(x, b.y + u, 2 * u, 2 * u);
  }
  // ---- the finale: end credits on the big screen, your answers as the cast, then THE END ----
  finale(data) { this.fin = { t: 0, data }; this.show = null; this.cards = []; }
  drawCredits(hg, px) {
    const b = this.screenBox(), t = this.fin.t;
    const log = this.fin.data?.racers?.[0]?.log || [];
    const subject = (q) => String(q || "").replace(/^Name (an?|something|someone|any) /i, "").toUpperCase();
    const lines = [["STARRING", 9, "#ffd23a"]];
    for (const e of log) { if (!e.answer || e.answer === "—") continue; lines.push([e.answer.toUpperCase(), 15, "#ffffff"], ["as " + subject(e.q), 8, "#c9a35a"]); }
    lines.push(["", 10], ["A VROOMILLION PICTURE", 9, "#ff4fd8"]);
    const gap = (n) => px(n * 1.55);
    const total = lines.reduce((a, l) => a + gap(l[1]), 0);
    // roll up through the screen over about 3.6 s, then THE END
    const k = Math.min(1, Math.max(0, (t - 0.6) / 3.1));
    let y = b.y + b.h - k * (total + b.h);
    hg.save(); hg.beginPath(); hg.rect(b.x, b.y, b.w, b.h); hg.clip();
    hg.textAlign = "center"; hg.textBaseline = "middle";
    for (const [text, size, col] of lines) { y += gap(size); if (y > b.y - px(20) && y < b.y + b.h + px(20) && text) { hg.font = `${px(size)}px ${TITLE_FONT}`; hg.fillStyle = col; hg.fillText(text, b.x + b.w / 2, y, b.w * 0.9); } }
    if (t > 3.7) {
      const a = Math.min(1, (t - 3.7) / 0.5);
      hg.globalAlpha = a; hg.font = `${px(30)}px ${TITLE_FONT}`;
      hg.fillStyle = "#000"; hg.fillText("THE END", b.x + b.w / 2 + px(2), b.y + b.h / 2 + px(2), b.w * 0.9);
      hg.fillStyle = "#fff6e0"; hg.fillText("THE END", b.x + b.w / 2, b.y + b.h / 2, b.w * 0.9);
      hg.globalAlpha = 1;
    }
    hg.restore();
  }
  drawHi() {
    const hg = this.hiG; if (!hg) return;
    const R = this.hiScale || 1, css = this.cssPx || 1, px = (n) => n / css;
    hg.setTransform(1, 0, 0, 1, 0, 0); hg.clearRect(0, 0, hg.canvas.width, hg.canvas.height); hg.setTransform(R, 0, 0, R, 0, 0);
    hg.textAlign = "center"; hg.textBaseline = "middle";
    for (const r of this.racers) { hg.font = `${px(9)}px ${TITLE_FONT}`; hg.fillStyle = "#0b0618"; hg.fillText(r.label || "", r.lane * this.W, this.bottom - 54.5 * this.u); }
    // the neon words on the sign and the snack bar
    const neon = (text, x, y, size, col, maxW) => { hg.font = `${size}px ${TITLE_FONT}`; hg.shadowColor = col; hg.shadowBlur = size * 0.6; hg.fillStyle = col; hg.fillText(text, x, y, maxW); hg.shadowBlur = 0; hg.fillStyle = "#fff"; hg.globalAlpha = 0.55; hg.fillText(text, x, y, maxW); hg.globalAlpha = 1; };
    if (this.signAt) neon("DRIVE-IN", this.signAt.x, this.signAt.y + this.u * 0.5, Math.max(px(8), this.u * 7.5), "#ff4f6a", this.signAt.w * 0.86);
    if (this.snackAt?.on) neon("SNACKS", this.snackAt.x, this.snackAt.y - this.u * 9.5, Math.max(px(6), this.u * 4.6), "#ff4fd8", this.u * 40);
    if (this.fin) { this.drawCredits(hg, px); return; }
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
