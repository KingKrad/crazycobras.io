// STADIUM RUN's race: a stadium seen from above. A red running track with white lanes round a striped
// grass infield, packed stands, flags and floodlights. Your car laps the track: the rarer the answer, the
// further and faster it goes. From FAST LANE up the crowd does the wave; TURBO adds camera flashes and
// fireworks; ONE IN A VROOMILLION lights a trophy in the middle of the field. The answer card is the
// scoreboard. Same interface as the road (chase.js), WORLD TOUR and the drive-in for main.js.
import { drawCarTop } from "./world.js";

const TIER_COL = ["#6f6a80", "#c4c1d4", "#5dff8f", "#4f9dff", "#c070ff", "#ffd23f"];
const BUILD = [0, 0, 0, 0.75, 1.1, 1.6];
const FONT = '"Bungee", "Space Grotesk", sans-serif';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (t) => t * t * (3 - 2 * t);
const hash = (n) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
// how far round the track each rarity takes you, in laps
const LAPS = [0, 0.18, 0.32, 0.55, 0.85, 1.6];
const CROWD = ["#e04848", "#f0c040", "#3a7bd5", "#f4f4f4", "#2fa65a", "#ff7ac8", "#8a5cd6", "#ff9a3c", "#1d1d28"];

export class StadiumScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.g = canvas.getContext("2d");
    this.W = 320; this.H = 480; this.u = 1;
    this.racers = []; this.time = 0; this.dtLast = 0;
    this.cards = []; this.particles = [];
    this.flash = 0; this.flashColor = "#fff"; this.wave = 0; this.waveA = 0; this.trophy = 0; this.cheer = 0;
    this.shake = 0; this.speed = 0; this.kick = 0; this.stretch = 0;
    this.calm = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.onEvent = null; this.lobby = false;
  }
  // STADIUM RUN's home screen: your car warms up round the track while the scoreboard runs highlights
  lobbyTick(car) {
    const REEL = [["MICHAEL JORDAN", 1], ["SERENA WILLIAMS", 2], ["USAIN BOLT", 3], ["LIONEL MESSI", 2], ["SIMONE BILES", 4], ["WAYNE GRETZKY", 3], ["TOM BRADY", 5]];
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
    this.reelWait = 3.6;
  }
  setHi(canvas, R) { this.hiG = canvas ? canvas.getContext("2d") : null; this.hiScale = R; }
  resize(w, h, carBottom) {
    this.W = w; this.H = h;
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    this.u = Math.max(1, Math.min(w, h * 0.7) / 320);
    this.bottom = carBottom || h * 0.82;
    this.bgKey = null;
  }
  playTop() { return this.H * 0.42; }
  coverTop() { return this.playTop() - 6 * this.u; }
  // the track: an oval in the play area (between the question card and the answer bar)
  track() {
    const top = this.playTop() + 10 * this.u, bot = this.bottom - 8 * this.u;
    const cy = (top + bot) / 2, ry = Math.max(30 * this.u, (bot - top) / 2);
    const rx = Math.min(this.W * 0.44, ry * 2.1);
    return { cx: this.W / 2, cy, rx, ry, lane: 7 * this.u };
  }
  // a point on lane k (0 inside .. 3 outside) at lap position p (0 = the finish line, bottom straight)
  at(p, k) {
    const t = this.track(), a = Math.PI / 2 - p * Math.PI * 2;
    const rx = t.rx - t.lane * (3.5 - k - 0.5), ry = t.ry - t.lane * (3.5 - k - 0.5);
    return { x: t.cx + Math.cos(a) * rx, y: t.cy + Math.sin(a) * ry, heading: Math.atan2(-Math.cos(a) * ry, Math.sin(a) * rx) + Math.PI / 2 };
  }
  setRacers(list) {
    if (!list.some((r) => r.label === "")) this.lobby = false;
    this.racers = list.map((r, i) => ({ ...r, dist: 0, boost: 0, nitro: false, p: 0, lane: list.length > 1 ? (i ? 2.2 : 0.8) : 1.5, roll: 0, rollT: 0, rollSecs: 1, from: 0, stalled: 0 }));
    this.cards = []; this.particles = []; this.wave = 0; this.trophy = 0;
  }
  anchor(i) {
    const r = this.racers[i]; if (!r) return { x: 0.5, y: 0.7 };
    const q = this.at(r.p, r.lane);
    return { x: clamp(q.x / this.W, 0.05, 0.95), y: clamp((q.y - 12 * this.u) / this.H, 0.1, 0.9) };
  }
  smash(cards) {
    return new Promise((resolve) => {
      const n = cards.length;
      this.cards = cards.map((c, i) => ({ ...c, fx: c.fx ?? c.tier, build: BUILD[c.fx ?? c.tier] || 0, i, t: 0, phase: "slam", revealed: !(BUILD[c.fx ?? c.tier] > 0), cx: n > 1 ? (i ? 0.74 : 0.26) : 0.5 }));
      this.cardsDone = resolve;
    });
  }
  launch(i, tier, nitro, secs) {
    const r = this.racers[i]; if (!r) return;
    if (!tier) { r.stalled = 1.2; this.puff(r, 8, "#c9c4d6"); return; }
    r.from = r.p; r.roll = LAPS[tier] * (nitro ? 1.3 : 1); r.rollT = 0; r.rollSecs = Math.max(1, secs);
    this.cheer = Math.max(this.cheer, 0.4 + tier * 0.25);
    if (tier >= 3) { this.wave = 1; this.waveA = Math.PI / 2; }
    if (tier >= 5) this.trophy = 4;
    this.puff(r, 6 + tier * 3, tier >= 4 ? "#ffd23a" : "#ffffff");
  }
  backfire(i) { const r = this.racers[i]; if (r) this.puff(r, 4, "#ff9a1f"); }
  arrive() {}
  rare(tier) { this.flash = 0.3 + tier * 0.07; this.flashColor = TIER_COL[tier] || "#fff"; }
  confetti() {
    const cols = ["#ff4fd8", "#ffd23a", "#5dff8f", "#4fd1ff", "#ffffff"];
    for (let k = 0; k < 90; k++) this.particles.push({ x: this.W * Math.random(), y: -10 - Math.random() * 60, vx: (Math.random() - 0.5) * 40, vy: 60 + Math.random() * 80, life: 2 + Math.random(), c: cols[k % 5], s: 2 + Math.random() * 2 });
  }
  puff(r, n, c) {
    const q = this.at(r.p, r.lane);
    for (let k = 0; k < n; k++) { const a = Math.random() * Math.PI * 2, s = 15 + Math.random() * 40; this.particles.push({ x: q.x, y: q.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.4 + Math.random() * 0.5, c, s: 2 }); }
  }
  firework(x, y, col) {
    for (let k = 0; k < 36; k++) { const a = (k / 36) * Math.PI * 2, s = 60 + Math.random() * 50; this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.9 + Math.random() * 0.4, c: k % 3 ? col : "#fff", s: 2, g: 40 }); }
  }

  update(dt) {
    this.time += dt; this.dtLast = dt;
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 0.8);
    if (this.cheer > 0) this.cheer = Math.max(0, this.cheer - dt * 0.35);
    if (this.trophy > 0) this.trophy = Math.max(0, this.trophy - dt * 0.5);
    if (this.wave > 0) { this.waveA += dt * 2.4; this.wave = Math.max(0, this.wave - dt * 0.22); }
    let pending = false;
    for (const c of this.cards) {
      c.t += dt;
      if (c.phase === "slam" && c.t >= 0.3) { c.phase = "hold"; this.onEvent?.("slam", c); if (!c.build) c.holdFrom = c.t; }
      else if (c.phase === "hold" && !c.revealed && c.t >= 0.3 + c.build) { c.revealed = true; c.holdFrom = c.t; this.onEvent?.("reveal", c); }
      else if (c.phase === "hold" && c.revealed && c.t >= (c.holdFrom ?? 0.3) + 0.9 + c.fx * 0.12) { c.phase = "done"; this.onEvent?.("impact", c); }
      if (c.phase !== "done") pending = true;
    }
    if (this.cards.length && !pending) { this.cards = []; const r = this.cardsDone; this.cardsDone = null; r?.(); }
    for (const r of this.racers) {
      if (r.stalled > 0) r.stalled -= dt;
      if (r.roll > 0) {
        r.rollT += dt;
        const k = clamp(r.rollT / r.rollSecs, 0, 1);
        r.p = r.from + r.roll * ease(k);
        if (!this.calm && Math.random() < dt * 30) { const q = this.at(r.p, r.lane); this.particles.push({ x: q.x, y: q.y, vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10, life: 0.4, c: "rgba(255,255,255,0.6)", s: 1.5 }); }
        if (k >= 1) r.roll = 0;
      }
    }
    if (this.lobby && !this.racers.some((r) => r.roll > 0)) for (const r of this.racers) r.p += dt * 0.03; // warming up
    const t = this.track();
    const top = Math.max(0, ...this.cards.map((c) => (c.revealed ? c.fx : 0)), this.trophy > 0 ? 5 : 0);
    if (top >= 4 && !this.calm && Math.random() < dt * (top === 5 ? 5 : 2)) this.firework(t.cx + (Math.random() - 0.5) * t.rx * 2.4, t.cy - t.ry - 20 * this.u - Math.random() * 30 * this.u, TIER_COL[top]);
    for (const q of this.particles) { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.g) q.vy += q.g * dt; }
    this.particles = this.particles.filter((q) => q.life > 0);
  }

  // the stands, the track and the field: painted once per screen size
  buildBg() {
    const { W, H, u } = this, t = this.track();
    const key = [W, H, Math.round(t.cy), Math.round(t.rx)].join();
    if (this.bgKey === key && this.bg) return;
    this.bgKey = key;
    const c = this.bg || (this.bg = document.createElement("canvas"));
    c.width = W; c.height = H;
    const g = c.getContext("2d");
    g.imageSmoothingEnabled = false;
    const R = (x, y, w, h) => g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
    // the stands: rings of seats packed with fans, darker further back, with aisles
    g.fillStyle = "#1a1630"; g.fillRect(0, 0, W, H);
    const step = Math.max(2, Math.round(2.2 * u));
    for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) {
      const dx = (x - t.cx) / (t.rx + 14 * u), dy = (y - t.cy) / (t.ry + 14 * u), d = Math.hypot(dx, dy);
      if (d < 1) continue;
      const ang = Math.atan2(dy, dx);
      if (Math.abs(Math.sin(ang * 8)) < 0.06) continue; // aisles
      const h = hash(x * 0.73 + y * 1.31);
      g.fillStyle = h < 0.12 ? "#2a2440" : CROWD[Math.floor(h * 97) % CROWD.length];
      g.globalAlpha = clamp(1.25 - (d - 1) * 0.35, 0.45, 1);
      R(x, y, step - Math.max(1, Math.round(u * 0.4)), step - Math.max(1, Math.round(u * 0.4)));
    }
    g.globalAlpha = 1;
    // the stands are a backdrop: dimmed, so the scoreboard and the race's labels read over them
    g.fillStyle = "rgba(14,10,30,0.42)"; g.fillRect(0, 0, W, H);
    const top = g.createLinearGradient(0, 0, 0, this.playTop());
    top.addColorStop(0, "rgba(10,8,24,0.7)"); top.addColorStop(1, "rgba(10,8,24,0.1)");
    g.fillStyle = top; g.fillRect(0, 0, W, this.playTop());
    // the wall round the track
    g.fillStyle = "#3a3450"; g.beginPath(); g.ellipse(t.cx, t.cy, t.rx + 14 * u, t.ry + 14 * u, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#1d6bd6"; g.beginPath(); g.ellipse(t.cx, t.cy, t.rx + 11 * u, t.ry + 11 * u, 0, 0, Math.PI * 2); g.fill();
    // the track
    g.fillStyle = "#c8433a"; g.beginPath(); g.ellipse(t.cx, t.cy, t.rx + 6 * u, t.ry + 6 * u, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "rgba(255,255,255,0.85)"; g.lineWidth = Math.max(1, u * 0.6);
    for (let k = 0; k <= 4; k++) { g.beginPath(); g.ellipse(t.cx, t.cy, t.rx + 6 * u - k * t.lane, t.ry + 6 * u - k * t.lane, 0, 0, Math.PI * 2); g.stroke(); }
    // the field: striped grass with a football pitch marked out
    const fx = t.rx + 6 * u - 4 * t.lane, fy = t.ry + 6 * u - 4 * t.lane;
    g.save(); g.beginPath(); g.ellipse(t.cx, t.cy, fx, fy, 0, 0, Math.PI * 2); g.clip();
    for (let x = t.cx - fx, k = 0; x < t.cx + fx; x += 8 * u, k++) { g.fillStyle = k % 2 ? "#2f9a44" : "#2a8a3d"; g.fillRect(Math.round(x), Math.round(t.cy - fy), Math.ceil(8 * u), Math.ceil(fy * 2)); }
    g.restore();
    const pw = fx * 1.25, ph = fy * 1.2;
    g.strokeStyle = "rgba(255,255,255,0.75)"; g.lineWidth = Math.max(1, u * 0.6);
    g.strokeRect(Math.round(t.cx - pw / 2), Math.round(t.cy - ph / 2), Math.round(pw), Math.round(ph));
    g.beginPath(); g.moveTo(t.cx, t.cy - ph / 2); g.lineTo(t.cx, t.cy + ph / 2); g.stroke();
    g.beginPath(); g.arc(t.cx, t.cy, ph * 0.18, 0, Math.PI * 2); g.stroke();
    for (const s of [-1, 1]) { g.strokeRect(Math.round(t.cx + s * pw / 2 - (s > 0 ? pw * 0.14 : 0)), Math.round(t.cy - ph * 0.28), Math.round(pw * 0.14), Math.round(ph * 0.56)); }
    // the finish line across the bottom straight: a chequered strip
    const fl = this.at(0, 0), fo = this.at(0, 3.6);
    for (let y = fl.y - 2 * u, k = 0; y < fo.y + 2 * u; y += 2 * u, k++) for (let j = 0; j < 2; j++) { g.fillStyle = (k + j) % 2 ? "#111" : "#fff"; R(fl.x - 2 * u + j * 2 * u, y, 2 * u, 2 * u); }
  }

  draw() {
    const { g, W, H, u } = this;
    this.buildBg();
    g.save();
    g.imageSmoothingEnabled = false;
    g.drawImage(this.bg, 0, 0);
    const t = this.track();
    const R = (x, y, w, h) => g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
    // the crowd on its feet: the wave sweeps round the stands; flashes from cameras on the big ones
    if (this.wave > 0 && !this.calm) {
      g.save();
      g.beginPath(); g.rect(0, 0, W, H); g.ellipse(t.cx, t.cy, t.rx + 15 * u, t.ry + 15 * u, 0, 0, Math.PI * 2); g.clip("evenodd");
      g.globalAlpha = 0.35 * Math.min(1, this.wave * 2); g.fillStyle = "#fff6d0";
      const big = Math.max(W, H) * 2;
      g.beginPath(); g.moveTo(t.cx, t.cy); g.arc(t.cx, t.cy, big, this.waveA, this.waveA + 0.5); g.closePath(); g.fill();
      g.restore();
    }
    if (this.cheer > 0.6 && !this.calm) for (let k = 0; k < 14 * this.cheer; k++) {
      const a = Math.random() * Math.PI * 2, d = 1.15 + Math.random() * 0.9;
      g.fillStyle = "#ffffff"; R(t.cx + Math.cos(a) * (t.rx + 14 * u) * d, t.cy + Math.sin(a) * (t.ry + 14 * u) * d, 1.5 * u, 1.5 * u);
    }
    // flags on the rim and four floodlight towers
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2, x = t.cx + Math.cos(a) * (t.rx + 13 * u), y = t.cy + Math.sin(a) * (t.ry + 13 * u);
      const wav = Math.sin(this.time * 4 + k) * 1.2 * u;
      g.fillStyle = "#d8d4e0"; R(x, y - 6 * u, Math.max(1, u * 0.5), 6 * u);
      g.fillStyle = CROWD[k % 6]; R(x + u * 0.5, y - 6 * u + wav * 0.3, 4 * u, 2.5 * u);
    }
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const x = t.cx + sx * (t.rx + 30 * u), y = t.cy + sy * (t.ry + 22 * u);
      const gl = g.createRadialGradient(x, y, 0, x, y, 26 * u);
      gl.addColorStop(0, "rgba(255,250,220,0.55)"); gl.addColorStop(1, "rgba(255,250,220,0)");
      g.fillStyle = gl; g.fillRect(x - 26 * u, y - 26 * u, 52 * u, 52 * u);
      g.fillStyle = "#2a2440"; R(x - 5 * u, y - 3 * u, 10 * u, 6 * u);
      g.fillStyle = "#fffbe0"; for (let j = 0; j < 4; j++) R(x - 4 * u + j * 2.2 * u, y - 2 * u, 1.6 * u, 1.6 * u);
    }
    // the trophy in the middle of the field
    if (this.trophy > 0) {
      const s = 1 + Math.sin(this.time * 6) * 0.05, k = Math.min(1, this.trophy) * 3 * u * s;
      g.fillStyle = "rgba(255,210,58,0.25)"; g.beginPath(); g.arc(t.cx, t.cy, 18 * k / u * u, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#ffd23a";
      R(t.cx - 4 * k, t.cy - 6 * k, 8 * k, 5 * k); R(t.cx - 6 * k, t.cy - 6 * k, 2 * k, 3 * k); R(t.cx + 4 * k, t.cy - 6 * k, 2 * k, 3 * k);
      R(t.cx - k, t.cy - k, 2 * k, 3 * k); R(t.cx - 3 * k, t.cy + 2 * k, 6 * k, 2 * k);
      g.fillStyle = "#fff6c8"; R(t.cx - 3 * k, t.cy - 5 * k, k, 3 * k);
    }
    // the cars
    for (const r of this.racers) {
      const q = this.at(r.p, r.lane);
      g.save(); g.translate(Math.round(q.x), Math.round(q.y)); g.rotate(q.heading);
      if (r.stalled > 0 && !this.calm) g.translate((Math.random() - 0.5) * 2 * u, 0);
      drawCarTop(g, Math.max(1, Math.round(u * 1.5)), r.car?.color || "#4fd1ff", r.car?.accent || "#ffffff");
      g.restore();
      g.fillStyle = r.color || "#4fd1ff"; R(q.x - 8 * u, q.y - 20 * u, 16 * u, 7 * u);
    }
    for (const q of this.particles) { g.globalAlpha = clamp(q.life * 2, 0, 1); g.fillStyle = q.c; const s = Math.max(1, Math.round(q.s * u * 0.7)); R(q.x, q.y, s, s); }
    g.globalAlpha = 1;
    if (this.flash > 0 && !this.calm) { g.globalAlpha = Math.min(0.4, this.flash); g.fillStyle = this.flashColor; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
    g.restore();
    this.drawHi();
  }

  // sharp text: name tags, laps, and the answer on the scoreboard
  drawHi() {
    const hg = this.hiG; if (!hg) return;
    const R = this.hiScale || 1, css = this.cssPx || 1, px = (n) => n / css, u = this.u;
    hg.setTransform(1, 0, 0, 1, 0, 0); hg.clearRect(0, 0, hg.canvas.width, hg.canvas.height); hg.setTransform(R, 0, 0, R, 0, 0);
    hg.textAlign = "center"; hg.textBaseline = "middle";
    for (const r of this.racers) {
      const q = this.at(r.p, r.lane);
      hg.font = `${px(9)}px ${FONT}`; hg.fillStyle = "#0b0618"; hg.fillText(r.label || "", q.x, q.y - 16.5 * u);
    }
    // the lap count in the middle of the field
    const t = this.track(), lead = Math.max(0, ...this.racers.map((r) => r.p));
    if (!this.lobby && lead > 0) { hg.font = `${px(13)}px ${FONT}`; hg.fillStyle = "rgba(255,255,255,0.85)"; hg.fillText(`LAP ${Math.floor(lead) + 1}`, t.cx, t.cy + t.ry * 0.55); }
    for (const c of this.cards) {
      if (c.phase === "done") continue;
      const slam = c.phase === "slam" ? Math.min(1, c.t / 0.3) : 1;
      const sc = 1 + 1.4 * (1 - slam) * (1 - slam);
      const building = !c.revealed;
      const fx = c.revealed ? c.fx : Math.min(c.fx, 1 + Math.floor(Math.min(1, (c.t - 0.3) / (c.build || 1)) * c.fx));
      const col = TIER_COL[fx];
      const ans = (c.answer || "").toUpperCase();
      const big = px(clamp(24 - Math.max(0, ans.length - 12) * 0.9, 13, 24));
      hg.font = `${big}px ${FONT}`;
      const w = Math.min(this.W * (this.cards.length > 1 ? 0.46 : 0.88), Math.max(hg.measureText(ans).width, px(130)) + px(30));
      const h = big + px(58);
      const cx = this.W * c.cx, cy = t.cy - t.ry * 0.15;
      hg.save();
      hg.translate(cx + (building && !this.calm ? (Math.random() - 0.5) * px(4) : 0), cy); hg.scale(sc, sc); hg.globalAlpha = slam;
      // the scoreboard: a dark board, a lit frame, little bulbs along the top
      hg.fillStyle = "#05030c"; hg.fillRect(-w / 2 - px(4), -h / 2 - px(4), w + px(8), h + px(8));
      hg.fillStyle = col; hg.fillRect(-w / 2 - px(2), -h / 2 - px(2), w + px(4), h + px(4));
      hg.fillStyle = "#0b0a14"; hg.fillRect(-w / 2, -h / 2, w, h);
      for (let x = -w / 2 + px(6); x < w / 2 - px(4); x += px(8)) { hg.fillStyle = Math.floor(this.time * 6 + x) % 2 ? "#ffd23a" : "#7a5a10"; hg.fillRect(x, -h / 2 + px(3), px(3), px(3)); }
      hg.font = `${px(9)}px ${FONT}`; hg.fillStyle = "#ffb43a"; hg.fillText(c.revealed ? (c.fx === 5 ? "★ NEW RECORD ★" : "SCOREBOARD") : "INSTANT REPLAY…", 0, -h / 2 + px(15), w - px(12));
      hg.font = `${big}px ${FONT}`; hg.fillStyle = "#000"; hg.fillText(ans, px(1.5), -h / 2 + px(22) + big / 2 + px(1.5), w - px(16));
      hg.fillStyle = c.fx === 5 && c.revealed ? "#ffd23a" : "#ffffff"; hg.fillText(ans, 0, -h / 2 + px(22) + big / 2, w - px(16));
      hg.font = `${px(11)}px ${FONT}`; hg.fillStyle = col; hg.fillText(c.revealed ? c.tierName || "" : ". . .", 0, h / 2 - px(22), w - px(12));
      hg.fillStyle = "#ffd23a"; hg.fillText(c.revealed ? c.gain || "" : "? ? ?", 0, h / 2 - px(9), w - px(12));
      hg.restore();
    }
  }
}
