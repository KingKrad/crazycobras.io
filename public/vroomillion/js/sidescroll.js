// A side-on, scrolling race scene: the base of ON TOUR (a tour bus on a night highway, js/tour.js) and
// CHRISTMAS (Santa's sleigh over the rooftops, js/sleigh.js). Same interface as the road (chase.js), the
// WORLD TOUR map and the stadium for main.js: racers move right along a world line, each answer is a
// trip to a stop (a real city), the camera follows the leader, the answer card slams in like everywhere
// else. A theme draws the world (drawWorld), its vehicles and its stops, and can add a finale.
// Also here: pixel skylines of real cities, each with its landmark, for both themes.

export const TIER_COL = ["#6f6a80", "#c4c1d4", "#5dff8f", "#4f9dff", "#c070ff", "#ffd23f"];
const BUILD = [0, 0, 0, 0.75, 1.1, 1.6];
export const FONT = '"Bungee", "Space Grotesk", sans-serif';
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = (t) => t * t * (3 - 2 * t);
export const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
export const strHash = (s) => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
// how far one trip goes, by rarity (world units: screen pixels at u = 1)
const STEP = [0, 170, 250, 370, 540, 820];

// ---- skylines ----
// a city's skyline, centred on cx, standing on base; s: pixel size. col: the buildings, win: lit windows,
// snow: snow on the roofs. Real cities get their landmark in the middle of generic towers.
export function skyline(g, name, cx, base, s, { col = "#1a1030", win = "#ffcf5a", snow = false, lit = 0.35, t = 0 } = {}) {
  const R = (x, y, w, h) => g.fillRect(Math.round(cx + x * s), Math.round(base - y * s - h * s), Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s)));
  const seed = strHash(name);
  // generic towers either side
  g.fillStyle = col;
  const towers = [];
  for (let k = 0; k < 14; k++) {
    const w = 6 + Math.floor(hash(seed + k) * 9), h = 10 + Math.floor(hash(seed + k * 7.3) * 34);
    const x = -64 + k * 9.4 + hash(seed + k * 3.1) * 3;
    if (Math.abs(x + w / 2) < 14) continue; // room for the landmark
    towers.push([x, w, h]);
  }
  for (const [x, w, h] of towers) {
    g.fillStyle = col; R(x, 0, w, h);
    if (snow) { g.fillStyle = "#e8f0ff"; R(x, h - 1, w, 1.2); }
    g.fillStyle = win;
    for (let yy = 3; yy < h - 3; yy += 4) for (let xx = 1.5; xx < w - 2; xx += 3) if (hash(seed + x * 13 + yy * 7 + xx) < lit) R(x + xx, yy, 1.2, 1.6);
  }
  g.fillStyle = col;
  const L = LANDMARK[name];
  if (L) L(R, g, col, win, s, t); else { R(-6, 0, 12, 52); R(-3, 52, 6, 6); R(-0.5, 58, 1, 8); } // a tall tower and its mast
  drawLandmarkExtras(g, name, cx, base, s, col);
}
const LANDMARK = {
  LONDON: (R, g, col, win) => { R(-4, 0, 8, 48); R(-5, 44, 10, 4); g.fillStyle = win; R(-2.5, 38, 5, 5); g.fillStyle = col; R(-3, 48, 6, 4); R(-2, 52, 4, 3); R(-1, 55, 2, 4); R(-0.4, 59, 0.8, 3); R(8, 0, 16, 18); R(10, 18, 3, 6); R(19, 18, 3, 6); },
  PARIS: (R) => { for (let y = 0; y < 60; y += 2) { const w = y < 14 ? 26 - y * 1.1 : y < 30 ? 12 - (y - 14) * 0.35 : 6 - (y - 30) * 0.17; R(-w / 2, y, Math.max(1, y < 14 ? 3 : w), 2); R(w / 2 - (y < 14 ? 3 : w), y, Math.max(1, y < 14 ? 3 : w), 2); } R(-9, 12, 18, 2); R(-5, 28, 10, 1.6); R(-0.5, 60, 1, 6); },
  "NEW YORK": (R) => { R(-7, 0, 14, 40); R(-5, 40, 10, 8); R(-3, 48, 6, 6); R(-1.5, 54, 3, 5); R(-0.5, 59, 1, 9); R(14, 0, 10, 50); R(16, 50, 6, 4); R(18, 54, 2, 6); },
  SYDNEY: (R, g, col) => { for (const [x, h, w] of [[-14, 16, 10], [-6, 20, 11], [3, 18, 10], [11, 13, 8]]) for (let y = 0; y < h; y++) R(x + y * 0.35, 4 + y, Math.max(1, w * (1 - y / h)), 1); R(-18, 0, 34, 4); g.fillStyle = col; for (let k = 0; k <= 20; k++) { const a = Math.PI * (k / 20); R(22 + k * 1.6, 6 + Math.sin(a) * 14, 1.6, 1.2); } R(22, 0, 2, 8); R(54, 0, 2, 8); R(22, 6, 34, 1); },
  TOKYO: (R, g, col) => { g.fillStyle = "#d8402a"; for (let y = 0; y < 56; y += 2) { const w = y < 20 ? 18 - y * 0.6 : 6 - (y - 20) * 0.12; R(-w / 2, y, 1.5, 2); R(w / 2 - 1.5, y, 1.5, 2); } R(-5, 18, 10, 3); R(-3, 36, 6, 2.4); R(-0.5, 56, 1, 8); g.fillStyle = col; },
  SEATTLE: (R) => { R(-1, 0, 2, 46); R(-2.5, 0, 1, 24); R(1.5, 0, 1, 24); R(-8, 44, 16, 3); R(-6, 47, 12, 2); R(-0.5, 49, 1, 7); },
  TORONTO: (R) => { R(-2, 0, 4, 46); R(-1, 46, 2, 14); R(-4.5, 40, 9, 4); R(-3, 52, 6, 2); R(-0.4, 60, 0.8, 8); },
  DUBAI: (R) => { R(-6, 0, 12, 20); R(-4.5, 20, 9, 16); R(-3, 36, 6, 14); R(-1.8, 50, 3.6, 10); R(-0.8, 60, 1.6, 8); R(-0.3, 68, 0.6, 6); },
  "RIO DE JANEIRO": (R) => { for (let y = 0; y < 26; y++) R(-20 + y * 0.5, y, 40 - y * 1.4, 1); R(-0.8, 26, 1.6, 9); R(-5, 32, 10, 1.4); R(-1.5, 35, 3, 2); },
  MOSCOW: (R) => { R(-12, 0, 24, 14); for (const [x, h] of [[-8, 14], [0, 22], [8, 14]]) { R(x - 2, h, 4, 4); R(x - 3, h + 4, 6, 3); R(x - 2, h + 7, 4, 2); R(x - 0.5, h + 9, 1, 3); } },
  CAIRO: (R) => { for (const [x, h] of [[-18, 22], [4, 28], [22, 14]]) for (let y = 0; y < h; y++) R(x - (h - y) * 0.9, y, (h - y) * 1.8, 1); },
  ROME: (R, g, col, win) => { R(-22, 0, 44, 22); g.fillStyle = win; for (let row = 0; row < 3; row++) for (let k = 0; k < 9; k++) R(-20 + k * 4.8, 2 + row * 7, 2.4, 4); g.fillStyle = col; R(-22, 22, 30, 3); },
  BERLIN: (R) => { R(-1.5, 0, 3, 40); }, // (the sphere: drawLandmarkExtras)
  "LAS VEGAS": (R, g, col, win, s, t) => { R(-2, 0, 4, 40); R(-5, 36, 10, 5); R(-1, 41, 2, 12); g.fillStyle = ["#ff4fd8", "#4fd1ff", "#ffd23a"][Math.floor(t * 2) % 3]; R(10, 0, 18, 18); R(12, 18, 14, 3); g.fillStyle = col; },
  NASHVILLE: (R) => { R(-8, 0, 16, 36); R(-6, 36, 12, 6); R(-6, 42, 2.4, 10); R(3.6, 42, 2.4, 10); R(-2, 42, 4, 3); },
  CHICAGO: (R) => { R(-9, 0, 18, 40); R(-9, 40, 12, 10); R(-9, 50, 6, 6); R(-8, 56, 1, 8); R(-5, 56, 1, 8); R(14, 0, 9, 46); },
  "LOS ANGELES": (R, g, col) => { R(-14, 0, 10, 26); R(-2, 0, 12, 32); for (const x of [16, 24, 32]) { R(x, 0, 1.2, 20); for (let k = -2; k <= 2; k++) R(x + k * 1.6 - 0.6, 20 + Math.abs(k) * -0.8, 1.6, 1); } },
  BETHLEHEM: (R, g, col, win) => { R(-14, 0, 28, 12); R(-5, 12, 10, 8); R(-3, 20, 6, 3); g.fillStyle = "#ffd23a"; R(-1, 26, 2, 6); R(-3, 28, 6, 2); g.fillStyle = col; },
  REYKJAVIK: (R) => { for (let k = 0; k < 6; k++) R(-12 + k * 2, 0, 24 - k * 4, 12 + k * 7); R(-1.5, 54, 3, 6); R(-0.4, 60, 0.8, 4); },
  MUMBAI: (R, g, col, win) => { R(-12, 0, 24, 26); g.fillStyle = win; R(-4, 0, 8, 14); g.fillStyle = col; for (const x of [-10, 8]) R(x, 26, 2, 6); },
  SINGAPORE: (R) => { for (const x of [-12, -2, 8]) R(x, 0, 5, 36); R(-14, 36, 30, 3); },
  BEIJING: (R) => { R(-14, 0, 28, 10); R(-18, 10, 36, 2); R(-10, 12, 20, 6); R(-14, 18, 28, 2); R(-6, 20, 12, 4); },
  SEOUL: (R) => { R(-1.5, 0, 3, 30); R(-4, 30, 8, 5); R(-0.5, 35, 1, 8); R(-14, 0, 8, 22); R(8, 0, 9, 18); },
  ISTANBUL: (R) => { R(-12, 0, 24, 12); for (let k = 0; k < 7; k++) R(-8 + k * 0.4, 12 + k, 16 - k * 0.8 * 2, 1); for (const x of [-16, 15]) { R(x, 0, 1.6, 34); R(x - 0.2, 34, 2, 3); } },
  "MEXICO CITY": (R) => { R(-1.5, 0, 3, 22); R(-3, 22, 6, 4); R(-1, 26, 2, 5); R(-14, 0, 9, 30); R(8, 0, 8, 24); },
  AMSTERDAM: (R) => { for (let k = 0; k < 6; k++) { const x = -18 + k * 6.4; R(x, 0, 6, 18 + (k % 2) * 4); for (let y = 0; y < 4; y++) R(x + y * 0.7, 18 + (k % 2) * 4 + y, 6 - y * 1.4, 1); } },
};
// Berlin's TV tower has a sphere; drawn here so the shape is round
export function drawLandmarkExtras(g, name, cx, base, s, col) {
  if (name === "BERLIN") { g.fillStyle = col; g.beginPath(); g.arc(cx, base - 42 * s, 5 * s, 0, Math.PI * 2); g.fill(); g.fillRect(Math.round(cx - 0.5 * s), Math.round(base - 58 * s), Math.max(1, Math.round(s)), Math.round(12 * s)); }
}

export class SideScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.g = canvas.getContext("2d");
    this.W = 320; this.H = 480; this.u = 1;
    this.racers = []; this.time = 0;
    this.cards = []; this.particles = [];
    this.stops = []; this.cam = 0;
    this.flash = 0; this.flashColor = "#fff"; this.shake = 0; this.cheer = 0;
    this.speed = 0; this.kick = 0; this.stretch = 0;
    this.calm = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.onEvent = null; this.lobby = false;
  }
  setHi(canvas, R) { this.hiG = canvas ? canvas.getContext("2d") : null; this.hiScale = R; }
  resize(w, h, carBottom) {
    this.W = w; this.H = h;
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    this.u = Math.max(1, Math.min(w, h * 0.7) / 320);
    this.bottom = carBottom || h * 0.82;
  }
  playTop() { return this.H * 0.42; }
  coverTop() { return this.playTop() - 6 * this.u; }
  // where the leader sits on the screen, and screen x of a world x seen at parallax p (1 = the road,
  // smaller = further away; lined up so a stop's far skyline is behind it when you get there)
  get anchorX() { return this.W * 0.36; }
  sx(wx, p = 1) { return this.anchorX + (wx - this.cam) * this.u * p; }
  // the cities a trip can go to: the theme gives the list (with names); the first is where it starts
  cityList() { return [{ name: "HOME" }]; }
  startCity() { const l = this.cityList(); return l[Math.floor(Math.random() * l.length)]; }
  setRacers(list) {
    if (!list.some((r) => r.label === "")) this.lobby = false;
    const start = this.startCity();
    this.racers = list.map((r, i) => ({ ...r, dist: 0, boost: 0, nitro: false, wx: i ? -26 : 0, lane: i, leg: null, pending: null, pins: [], visited: [start.name], stalled: 0, alt: 0 }));
    this.stops = [{ wx: 0, city: start, tier: 0, i: -1 }];
    this.cam = 0; this.cards = []; this.particles = []; this.fin = null; this.answers = 0;
    this.onSetRacers?.();
  }
  anchor(i) {
    const r = this.racers[i];
    if (!r) return { x: 0.5, y: 0.6 };
    const [x, y] = this.vehicleAt(r);
    return { x: clamp(x / this.W, 0.05, 0.95), y: clamp((y - 16 * this.u) / this.H, 0.1, 0.9) };
  }
  // where a racer's vehicle is drawn (the theme says how high above the ground)
  vehicleAt(r) { return [this.sx(r.wx), this.groundY() - this.vehicleLift(r)]; }
  groundY() { return this.bottom - 14 * this.u; }
  vehicleLift(r) { return r.lane * 7 * this.u; }

  smash(cards) {
    return new Promise((resolve) => {
      const n = cards.length;
      this.cards = cards.map((c, i) => { const fx = c.fx ?? c.tier; return { ...c, fx, build: BUILD[fx] || 0, i, t: 0, phase: "slam", revealed: !(BUILD[fx] > 0), cx: n > 1 ? (i ? 0.74 : 0.26) : 0.5 }; });
      this.cardsDone = resolve;
      for (const c of this.cards) this.planLeg(c);
    });
  }
  // the next stop: a city not visited lately (a rarer answer, a bigger venue / a longer flight)
  planLeg(c) {
    const r = this.racers[c.i];
    if (!r) return;
    if (!c.tier) { r.pending = null; return; }
    const list = this.cityList().filter((x) => !r.visited.includes(x.name));
    const city = (list.length ? list : this.cityList())[Math.floor(Math.random() * (list.length || this.cityList().length))];
    r.visited = [...r.visited, city.name].slice(-10);
    r.pending = { city, tier: c.tier, label: city.name };
  }
  launch(i, tier, nitro, secs) {
    const r = this.racers[i];
    if (!r) return;
    if (!tier || !r.pending) { r.stalled = 1.2; this.puffAt(r, 8, "#c9c4d6"); this.onStall?.(r); return; }
    const to = r.wx + STEP[tier] * (nitro ? 1.25 : 1);
    r.leg = { ...r.pending, from: r.wx, to, t: 0, secs: Math.max(1, secs), nitro };
    r.pending = null;
    this.stops.push({ wx: to, city: r.leg.city, tier, i, label: r.leg.label, arrived: false });
    if (this.stops.length > 40) this.stops.splice(1, this.stops.length - 40);
    this.puffAt(r, 6 + tier * 3, tier >= 4 ? "#ffd23a" : "#ffffff");
    this.onLaunch?.(r, tier);
  }
  backfire(i) { const r = this.racers[i]; if (r) this.puffAt(r, 4, "#ff9a1f"); }
  arrive() {}
  rare(tier) { this.flash = 0.3 + tier * 0.07; this.flashColor = TIER_COL[tier] || "#fff"; }
  confetti() {
    const cols = ["#ff4fd8", "#ffd23a", "#5dff8f", "#4fd1ff", "#ffffff"];
    for (let k = 0; k < 90; k++) this.particles.push({ x: this.W * Math.random(), y: -10 - Math.random() * 60, vx: (Math.random() - 0.5) * 40, vy: 60 + Math.random() * 80, life: 2 + Math.random(), c: cols[k % 5], s: 2 + Math.random() * 2, screen: true });
  }
  puffAt(r, n, c) {
    const [x, y] = this.vehicleAt(r);
    for (let k = 0; k < n; k++) { const a = Math.random() * Math.PI * 2, s = 15 + Math.random() * 40; this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.4 + Math.random() * 0.5, c, s: 2, screen: true }); }
  }
  firework(x, y, col) {
    for (let k = 0; k < 36; k++) { const a = (k / 36) * Math.PI * 2, s = 60 + Math.random() * 50; this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.9 + Math.random() * 0.4, c: k % 3 ? col : "#fff", s: 2, g: 40, screen: true }); }
  }
  finale(data) { this.fin = { t: 0, data }; }

  update(dt) {
    this.time += dt;
    if (this.fin) this.fin.t += dt;
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 0.8);
    if (this.cheer > 0) this.cheer = Math.max(0, this.cheer - dt * 0.3);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt);
    let pending = false;
    for (const c of this.cards) {
      c.t += dt;
      if (c.phase === "slam" && c.t >= 0.28) { c.phase = "hold"; this.onEvent?.("slam", c); if (!c.build) c.holdFrom = c.t; }
      else if (c.phase === "hold" && !c.revealed && c.t >= 0.28 + c.build) { c.revealed = true; c.holdFrom = c.t; this.onEvent?.("reveal", c); }
      else if (c.phase === "hold" && c.revealed && c.t >= (c.holdFrom ?? 0.28) + 0.6) { c.phase = "go"; c.goT = 0; this.onEvent?.("impact", c); }
      else if (c.phase === "go") { c.goT += dt; if (c.goT > 0.4) { c.phase = "gone"; c.done = true; } }
      if (!c.done) pending = true;
    }
    if (this.cards.length && !pending) { this.cards = []; const r = this.cardsDone; this.cardsDone = null; r?.(); }
    for (const r of this.racers) {
      if (r.stalled > 0) r.stalled -= dt;
      const L = r.leg;
      if (!L) continue;
      L.t += dt;
      const k = clamp(L.t / L.secs, 0, 1);
      r.wx = lerp(L.from, L.to, ease(k));
      r.legK = k;
      if (k >= 1) {
        r.wx = L.to; r.leg = null; r.legK = 0;
        r.pins.push({ label: L.label, tier: L.tier, city: L.city, t: this.time });
        const st = this.stops.find((s) => s.wx === L.to && s.i === this.racers.indexOf(r));
        if (st) st.arrived = this.time;
        this.answers++;
        this.cheer = Math.max(this.cheer, 0.3 + L.tier * 0.18);
        this.onArrive?.(r, L, st);
      }
    }
    // the camera follows the leader (in the lobby it drifts on)
    const lead = this.racers.reduce((a, b) => (b.wx > (a?.wx ?? -Infinity) ? b : a), null);
    if (lead) { const to = lead.wx; this.cam += (to - this.cam) * Math.min(1, dt * 3.2); }
    for (const q of this.particles) { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.g) q.vy += q.g * dt; }
    this.particles = this.particles.filter((q) => q.life > 0);
    this.tick?.(dt);
  }

  draw() {
    const { g, W, H, u } = this;
    if (this.fin && this.drawFinale) { this.drawFinale(); this.drawHi(); return; }
    g.save();
    g.imageSmoothingEnabled = false;
    if (this.shake > 0 && !this.calm) g.translate((Math.random() - 0.5) * 5 * u * this.shake, (Math.random() - 0.5) * 5 * u * this.shake);
    this.drawWorld(g);
    for (const q of this.particles) {
      g.globalAlpha = clamp(q.life * 2, 0, 1); g.fillStyle = q.c;
      const s = Math.max(1, Math.round(q.s * u * 0.6)); g.fillRect(Math.round(q.x), Math.round(q.y), s, s);
    }
    g.globalAlpha = 1;
    if (this.flash > 0 && !this.calm) { g.globalAlpha = Math.min(0.4, this.flash); g.fillStyle = this.flashColor; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
    if (!this.vig || this.vig.width !== W || this.vig.height !== H) {
      const v = this.vig || document.createElement("canvas"); v.width = W; v.height = H;
      const vx = v.getContext("2d"); const vg = vx.createRadialGradient(W / 2, H * 0.6, Math.min(W, H) * 0.42, W / 2, H * 0.6, Math.max(W, H) * 0.8);
      vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.4)"); vx.fillStyle = vg; vx.fillRect(0, 0, W, H); this.vig = v;
    }
    g.drawImage(this.vig, 0, 0);
    g.restore();
    this.drawHi();
  }

  // sharp text: name tags, stop signs and the answer cards
  drawHi() {
    const hg = this.hiG;
    if (!hg) return;
    const R = this.hiScale || 1, u = this.u;
    hg.setTransform(1, 0, 0, 1, 0, 0); hg.clearRect(0, 0, hg.canvas.width, hg.canvas.height); hg.setTransform(R, 0, 0, R, 0, 0);
    hg.textAlign = "center"; hg.textBaseline = "middle";
    const px = (n) => n / (this.cssPx || 1);
    if (this.fin) { this.drawFinaleHi?.(hg, px); return; }
    this.drawStopsHi?.(hg, px);
    for (const r of this.racers) {
      if (!r.label) continue;
      const [x, y] = this.vehicleAt(r);
      hg.font = `${px(9)}px ${FONT}`;
      const w = hg.measureText(r.label).width + px(8);
      hg.fillStyle = r.color || "#4fd1ff"; hg.fillRect(x - w / 2, y - this.tagUp() - px(7), w, px(13));
      hg.fillStyle = "#0b0618"; hg.fillText(r.label, x, y - this.tagUp());
    }
    for (const c of this.cards) {
      if (c.phase === "gone") continue;
      let sc = 1, a = 1, jx = 0, jy = 0;
      if (c.phase === "slam") { const t = Math.min(1, c.t / 0.28); sc = 1 + 1.6 * (1 - t) * (1 - t); a = Math.min(1, c.t / 0.12); }
      if (c.phase === "hold" && !c.revealed && !this.calm) { const k = Math.min(1, (c.t - 0.28) / c.build); jx = (Math.random() - 0.5) * px(6) * k; jy = (Math.random() - 0.5) * px(6) * k; }
      let cx = this.W * c.cx, cy = this.playTop() + (this.bottom - this.playTop()) * 0.2;
      if (c.phase === "go") {
        const r = this.racers[c.i], k = ease(Math.min(1, c.goT / 0.4));
        const [tx, ty] = r ? this.vehicleAt(r) : [cx, cy];
        cx = lerp(cx, tx, k); cy = lerp(cy, ty, k); sc = 1 - 0.8 * k; a = 1 - k;
      }
      const col = c.revealed ? TIER_COL[c.fx] : TIER_COL[Math.min(c.fx, 1 + Math.floor(Math.min(1, (c.t - 0.28) / (c.build || 1)) * c.fx))];
      const ans = (c.answer || "").toUpperCase();
      const big = px(clamp(26 - Math.max(0, ans.length - 12) * 0.9, 14, 26));
      hg.font = `${big}px ${FONT}`;
      const wA = hg.measureText(ans).width;
      hg.font = `${px(12)}px ${FONT}`;
      const sub = c.revealed ? (c.tierName || "") : ". . .";
      const gain = c.revealed ? (c.gain || "") : "? ? ?";
      const w = Math.min(this.W * (this.cards.length > 1 ? 0.46 : 0.9), Math.max(wA, hg.measureText(sub).width, px(120)) + px(28));
      const h = big + px(48);
      hg.save();
      hg.globalAlpha = a;
      hg.translate(cx + jx, cy + jy); hg.scale(sc, sc);
      hg.fillStyle = "#0b0618"; hg.fillRect(-w / 2 - px(3), -h / 2 - px(3), w + px(6), h + px(6));
      hg.fillStyle = col; hg.fillRect(-w / 2 - px(1), -h / 2 - px(1), w + px(2), h + px(2));
      hg.fillStyle = this.cardBg || "#1c1236"; hg.fillRect(-w / 2 + px(2), -h / 2 + px(2), w - px(4), h - px(4));
      this.drawCardMark?.(hg, w, h, col, px);
      hg.font = `${big}px ${FONT}`; hg.fillStyle = "#05020c"; hg.fillText(ans, px(1.5), -h / 2 + px(8) + big / 2 + px(1.5), w - px(16));
      hg.fillStyle = "#ffffff"; hg.fillText(ans, 0, -h / 2 + px(8) + big / 2, w - px(16));
      hg.font = `${px(12)}px ${FONT}`; hg.fillStyle = col; hg.fillText(sub, 0, h / 2 - px(26), w - px(12));
      hg.fillStyle = c.revealed && c.tier ? "#ffd23a" : "#8a8499"; hg.fillText(gain, 0, h / 2 - px(11), w - px(12));
      hg.restore();
    }
  }
  tagUp() { return 26 * this.u; }
}
