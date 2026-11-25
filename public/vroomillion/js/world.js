// WORLD TOUR's race: a top-down pixel map of the world. Every answer sends your car to the place you
// named (its coordinates come with the answer files), leaving a dotted route and a pin. Rarer answers
// make longer, flashier trips: a short drive, a road trip, a ferry across the sea, a plane, and for ONE
// IN A VROOMILLION a rocket that laps the planet. It speaks the same language as the road race
// (chase.js) to main.js: setRacers, smash (the answer card, with slam/reveal/impact events), launch,
// racers[i].dist driven by the race, anchor, coverTop, confetti, rare...
export const MW = 2048, MH = 1024; // the map image (img/world.png), equirectangular
const BAND_TOP = MH * 0.04, BAND_BOT = MH * 0.86; // what the camera may show below the card: about 83°N to 65°S
export const TIER_COL = ["#6f6a80", "#c4c1d4", "#5dff8f", "#4f9dff", "#c070ff", "#ffd23f"];
const BUILD = [0, 0, 0, 0.75, 1.1, 1.6];
const CARD_FONT = '"Bungee", "Space Grotesk", sans-serif';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);
export const toWorld = ([lat, lon]) => [((lon + 180) / 360) * MW, ((90 - lat) / 180) * MH];

let MAP = null, LAND = null, mapLoading = null;
export function loadMap(src = "img/world.png") {
  if (mapLoading && (MAP || !src.startsWith(".."))) return mapLoading;
  mapLoading = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      MAP = img;
      // land or sea, for choosing a ferry over a drive (blue = water)
      try {
        const c = document.createElement("canvas"); c.width = MW / 4; c.height = MH / 4;
        const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(img, 0, 0, c.width, c.height);
        const d = g.getImageData(0, 0, c.width, c.height).data;
        LAND = new Uint8Array(c.width * c.height);
        for (let i = 0; i < LAND.length; i++) LAND[i] = d[i * 4 + 2] > d[i * 4] + 40 && d[i * 4 + 2] > d[i * 4 + 1] ? 0 : 1;
      } catch { LAND = null; }
      resolve(img);
    };
    img.onerror = () => { mapLoading = null; resolve(null); }; // try again next time
    img.src = src;
  });
  return mapLoading;
}
export const landAt = (wx, wy) => {
  if (!LAND) return true;
  const x = Math.floor((((wx % MW) + MW) % MW) / 4), y = clamp(Math.floor(wy / 4), 0, MH / 4 - 1);
  return LAND[y * (MW / 4) + x] === 1;
};

// little top-down sprites, drawn pixel by pixel around (0,0) facing up (scale p = pixel size)
export function drawCarTop(g, p, body, accent) {
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x * p, y * p, w * p, h * p); };
  R(-4, -6, 8, 13, "#0b0618");            // outline
  R(-5, -4, 1, 3, "#1a1a22"); R(4, -4, 1, 3, "#1a1a22"); R(-5, 2, 1, 3, "#1a1a22"); R(4, 2, 1, 3, "#1a1a22"); // wheels
  R(-3, -6, 6, 12, body);
  R(-3, -6, 6, 1, accent);                 // bumper
  R(-2, -6, 1, 1, "#fff3c0"); R(1, -6, 1, 1, "#fff3c0"); // headlights
  R(-2, -3, 4, 2, "#9fd8ff");              // windscreen
  R(-2, -1, 4, 3, shadeHex(body, 1.15));   // roof
  R(-2, 2, 4, 1, "#6fa8d8");               // rear window
  R(-3, 5, 1, 1, "#ff3b3b"); R(2, 5, 1, 1, "#ff3b3b"); // tail lights
}
export function drawPlane(g, p) {
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x * p, y * p, w * p, h * p); };
  R(-1, -7, 2, 14, "#f4f6fb"); R(-7, -1, 14, 2, "#f4f6fb"); R(-3, 5, 6, 1, "#f4f6fb");
  R(-1, -7, 2, 1, "#4fd1ff"); R(-7, -1, 1, 2, "#ff4fd8"); R(6, -1, 1, 2, "#ff4fd8"); R(-1, -4, 2, 1, "#2b3a55");
}
export function drawBoat(g, p, t) {
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x * p, y * p, w * p, h * p); };
  R(-3, -6, 6, 12, "#0b0618"); R(-2, -7, 4, 1, "#0b0618");
  R(-2, -5, 4, 10, "#f2f2f2"); R(-1, -6, 2, 1, "#f2f2f2");
  R(-2, -1, 4, 3, "#ff4f4f"); R(-1, 1, 2, 2, "#2b3a55");
  for (let k = 0; k < 3; k++) { const o = ((t * 6 + k) % 3) * 3; R(-3 - k, 6 + o, 1, 1, "#d8f0ff"); R(2 + k, 6 + o, 1, 1, "#d8f0ff"); }
}
export function drawRocket(g, p, t) {
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x * p, y * p, w * p, h * p); };
  const f = Math.floor(t * 20) % 2;
  R(-1, 6, 2, 3 + f * 2, "#ffd23a"); R(0, 6, 1, 2 + f, "#ffffff");
  R(-2, -6, 4, 12, "#f4f6fb"); R(-1, -8, 2, 2, "#ff3b3b"); R(-3, 3, 1, 3, "#ff3b3b"); R(2, 3, 1, 3, "#ff3b3b");
  R(-1, -3, 2, 2, "#4fd1ff");
}
function shadeHex(hex, k) {
  const n = parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => clamp(Math.round(v * k), 0, 255));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

// the trip style for a rarity, given whether the way is over water
export const tripKind = (tier, wet) => (tier >= 5 ? "rocket" : tier >= 4 ? "plane" : wet ? "boat" : "car");

export class WorldScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.g = canvas.getContext("2d");
    this.W = 320; this.H = 480; this.u = 1;
    this.racers = [];
    this.time = 0;
    this.cam = { x: MW * 0.5, y: MH * 0.42, z: 1 };
    this.camTo = { x: MW * 0.5, y: MH * 0.42, z: 1 };
    this.cards = [];
    this.particles = [];
    this.flash = 0; this.flashColor = "#fff";
    this.shake = 0; this.speed = 0; this.kick = 0; this.stretch = 0;
    this.calm = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.onEvent = null;
    this.lobby = false; // the WORLD TOUR home screen: a slow pan with your car parked
    loadMap();
  }
  // WORLD TOUR's home screen: your car tours famous places on its own, showing off each kind of trip
  lobbyTick(car) {
    const TOUR = [["PARIS", [48.86, 2.35], 1], ["ROME", [41.9, 12.5], 2], ["CAIRO", [30.04, 31.24], 3], ["DUBAI", [25.2, 55.27], 2], ["MUMBAI", [19.08, 72.88], 3], ["TOKYO", [35.68, 139.7], 4], ["SYDNEY", [-33.87, 151.2], 4], ["RIO DE JANEIRO", [-22.9, -43.2], 4], ["NEW YORK", [40.71, -74.0], 3], ["LONDON", [51.5, -0.13], 4]];
    if (!this.lobby || !this.racers.length || this.racers[0].car?.id !== car?.id) {
      this.lobby = true;
      this.setRacers([{ car, label: "", color: "#4fd1ff" }]);
      const [x, y] = toWorld(TOUR[TOUR.length - 1][1]);
      Object.assign(this.racers[0], { x, y });
      this.cam = { x, y, z: this.fitZ(520) };
      this.tourI = 0; this.tourWait = 1.5;
    }
    const r = this.racers[0];
    if (r.leg || r.pending) return;
    this.tourWait -= 1 / 30;
    if (this.tourWait > 0) return;
    const [name, at, tier] = TOUR[this.tourI++ % TOUR.length];
    this.planLeg({ i: 0, tier, at, answer: name, color: "#4fd1ff" });
    this.launch(0, tier, false, 3.2 + tier * 0.4);
    if (r.pins.length > 5) r.pins.shift();
    if (r.trail.length > 600) r.trail.splice(0, r.trail.length - 600);
    this.tourWait = 2.2;
  }
  setHi(canvas, R) { this.hiG = canvas ? canvas.getContext("2d") : null; this.hiScale = R; }
  // carBottom: where the nearest car sits on the road scene: here, the top of the answer bar
  resize(w, h, carBottom) {
    this.W = w; this.H = h;
    // the shared canvas follows (with the phone keyboard up the screen is much shorter): a part left
    // over from the old size would never be redrawn and smears into streaks
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; } this.u = Math.max(1, Math.min(w, h * 0.7) / 320); // wide screens: sized by height too
    this.bottom = carBottom || h * 0.82;
  }
  // the area the cars stay in: below the question card, above the answer bar
  playTop() { return this.H * 0.42; }
  coverTop() { return this.playTop() - 6 * this.u; }
  setRacers(list) {
    if (!list.some((r) => r.label === "")) this.lobby = false;
    // start somewhere different every race: a famous start city
    const STARTS = [[51.5, -0.13], [40.71, -74.0], [35.68, 139.7], [48.86, 2.35], [-33.87, 151.2], [19.43, -99.13], [-22.9, -43.2], [30.04, 31.24], [1.35, 103.8], [55.75, 37.62], [-1.29, 36.82], [41.9, 12.5]];
    const s = STARTS[Math.floor(Math.random() * STARTS.length)];
    this.racers = list.map((r, i) => {
      const [x, y] = toWorld(s);
      return { ...r, dist: 0, boost: 0, nitro: false, x: x + (i ? 6 : 0), y: y + (i ? 4 : 0), heading: Math.PI / 2, leg: null, trail: [], pins: [], kind: "car", stalled: 0 };
    });
    const r0 = this.racers[0];
    this.cam = { x: r0.x, y: r0.y, z: this.fitZ(260) };
    this.camTo = { ...this.cam };
    this.cards = []; this.particles = [];
  }
  // zoom to fit a span of the map; never so far out that the map stops filling the screen top to bottom
  fitZ(spanWorld) { return clamp(Math.min(this.W * 0.7, (this.bottom - this.playTop()) * 1.4) / Math.max(30, spanWorld), Math.max(this.W / MW, this.H / (BAND_BOT - BAND_TOP) * 1.02), 4.5); }
  // where racer i is on the screen, as fractions (for "+720 M" pops)
  anchor(i) {
    const r = this.racers[i];
    if (!r) return { x: 0.5, y: 0.6 };
    const [sx, sy] = this.toScreen(r.x, r.y);
    return { x: clamp(sx / this.W, 0.05, 0.95), y: clamp((sy - 10 * this.u) / this.H, 0.1, 0.9) };
  }
  toScreen(wx, wy) {
    const c = this.cam;
    // the map wraps round: use the copy of the point nearest the camera
    let dx = wx - c.x; dx -= Math.round(dx / MW) * MW;
    const cy = (this.playTop() + this.bottom) / 2;
    return [this.W / 2 + dx * c.z, cy + (wy - c.y) * c.z];
  }

  // ---- the answer card: slam in, (build up), reveal, then off the car goes ----
  smash(cards) {
    return new Promise((resolve) => {
      const n = cards.length;
      this.cards = cards.map((c, i) => {
        const fx = c.fx ?? c.tier;
        return { ...c, fx, build: BUILD[fx] || 0, i, t: 0, phase: "slam", revealed: !(BUILD[fx] > 0), cx: n > 1 ? (i ? 0.74 : 0.26) : 0.5, done: false };
      });
      this.cardsDone = resolve;
      // where each racer heads: the place they named (or, without coordinates, a hop east by rarity)
      for (const c of this.cards) this.planLeg(c);
    });
  }
  planLeg(c) {
    const r = this.racers[c.i];
    if (!r) return;
    if (!c.tier) { r.leg = null; return; }
    let tx, ty;
    if (c.at) {
      [tx, ty] = toWorld(c.at);
      let dx = tx - r.x; dx -= Math.round(dx / MW) * MW; tx = r.x + dx; // the short way round
    } else {
      const hop = [0, 60, 120, 220, 380, 600][c.tier];
      const a = -0.35 + Math.random() * 0.7; // mostly east: it's a world tour
      tx = r.x + Math.cos(a) * hop; ty = clamp(r.y + Math.sin(a) * hop, MH * 0.12, MH * 0.82);
    }
    // ONE IN A VROOMILLION: once round the whole planet on the way
    if (c.tier >= 5) tx += tx >= r.x ? MW : -MW;
    // over the sea?
    let wet = false;
    for (let k = 1; k < 24 && !wet; k++) if (!landAt(lerp(r.x, tx, k / 24), lerp(r.y, ty, k / 24))) wet = true;
    // a place we can't find on the map still makes a trip, but no labelled pin in the wrong spot
    r.pending = { x0: r.x, y0: r.y, x1: tx, y1: ty, kind: tripKind(c.tier, wet), tier: c.tier, label: c.at ? (c.answer || "").toUpperCase() : "", color: c.color };
  }
  // the race starts racer i's run: from here its distance climbs from d0 to d0 + gain
  launch(i, tier, nitro, secs) {
    const r = this.racers[i];
    if (!r) return;
    if (!tier || !r.pending) { r.stalled = 1.2; this.puff(r, 10, "#c9c4d6"); return; }
    r.leg = { ...r.pending, d0: r.dist, t: 0, secs: Math.max(1, secs), nitro };
    r.pending = null;
    r.kind = r.leg.kind;
    this.puff(r, 8 + tier * 4, tier >= 4 ? "#ffd23a" : "#ffffff");
  }
  backfire(i) { const r = this.racers[i]; if (r) this.puff(r, 4, "#ff9a1f"); }
  arrive() {}
  rare(tier) { this.flash = 0.35 + tier * 0.08; this.flashColor = TIER_COL[tier] || "#fff"; }
  confetti() {
    const cols = ["#ff4fd8", "#ffd23a", "#5dff8f", "#4fd1ff", "#ffffff"];
    for (let k = 0; k < 90; k++) this.particles.push({ sx: this.W * Math.random(), sy: -10 - Math.random() * 60, vx: (Math.random() - 0.5) * 40, vy: 60 + Math.random() * 80, life: 2 + Math.random(), c: cols[k % cols.length], screen: true, size: 2 + Math.random() * 2 });
  }
  puff(r, n, color) {
    for (let k = 0; k < n; k++) { const a = Math.random() * Math.PI * 2, s = 10 + Math.random() * 40; this.particles.push({ wx: r.x, wy: r.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5 + Math.random() * 0.5, c: color, size: 2 }); }
  }

  update(dt) {
    this.time += dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 0.8);
    // cards
    let pending = false;
    for (const c of this.cards) {
      c.t += dt;
      if (c.phase === "slam" && c.t >= 0.28) { c.phase = "hold"; this.onEvent?.("slam", c); if (!c.build) c.holdFrom = c.t; }
      else if (c.phase === "hold" && !c.revealed && c.t >= 0.28 + c.build) { c.revealed = true; c.holdFrom = c.t; this.onEvent?.("reveal", c); }
      else if (c.phase === "hold" && c.revealed && c.t >= (c.holdFrom ?? 0.28) + 0.55) { c.phase = "go"; c.goT = 0; this.onEvent?.("impact", c); }
      else if (c.phase === "go") { c.goT += dt; if (c.goT > 0.4) { c.phase = "gone"; c.done = true; } }
      if (!c.done) pending = true;
    }
    if (this.cards.length && !pending) { this.cards = []; const r = this.cardsDone; this.cardsDone = null; r?.(); }
    // racers follow their distance along the leg
    for (const r of this.racers) {
      if (r.stalled > 0) r.stalled -= dt;
      const L = r.leg;
      if (!L) continue;
      L.t += dt;
      // progress: the race's distance where it's moving, never slower than the leg's own clock
      const p = clamp(L.t / L.secs, 0, 1);
      const k = ease(p);
      const nx = lerp(L.x0, L.x1, k), ny = lerp(L.y0, L.y1, k);
      const vx = nx - r.x, vy = ny - r.y;
      if (Math.hypot(vx, vy) > 0.01) r.heading = Math.atan2(vy, vx) + Math.PI / 2;
      r.x = nx; r.y = ny;
      r.alt = L.kind === "plane" ? Math.sin(Math.PI * p) : L.kind === "rocket" ? Math.sin(Math.PI * p) * 1.8 : 0;
      // a dotted trail behind
      if (!r.lastDot || Math.hypot(r.x - r.lastDot[0], r.y - r.lastDot[1]) * this.cam.z > 3 * this.u) { r.trail.push([r.x, r.y, L.kind]); r.lastDot = [r.x, r.y]; if (r.trail.length > 1400) r.trail.shift(); }
      if (L.kind === "rocket" && Math.random() < 0.6) this.particles.push({ wx: r.x, wy: r.y, vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20, life: 0.6, c: Math.random() < 0.5 ? "#ffd23a" : "#ff4fd8", size: 2 });
      if (p >= 1) {
        r.x = ((L.x1 % MW) + MW) % MW; r.y = L.y1; r.lastDot = null; r.alt = 0;
        r.pins.push({ x: r.x, y: r.y, label: L.label, tier: L.tier, color: r.color, t: this.time });
        if (L.tier >= 3) this.puff(r, 12, TIER_COL[L.tier]);
        r.leg = null; r.kind = "car";
      }
    }
    // camera: fit the trips in progress (or the next ones), else follow the leader
    const pts = [];
    for (const r of this.racers) { pts.push([r.x, r.y]); const L = r.leg || r.pending; if (L) pts.push([L.x1, L.y1], [L.x0, L.y0]); }
    if (pts.length) {
      const ref = pts[0][0];
      const xs = pts.map(([x]) => { let d = x - ref; d -= Math.round(d / MW) * MW; return ref + d; }), ys = pts.map(([, y]) => y);
      const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
      const rocket = this.racers.some((r) => r.leg?.kind === "rocket");
      const span = rocket ? MW : Math.max(maxx - minx, (maxy - miny) * (this.W / Math.max(1, this.bottom - this.playTop())), this.lobby ? 520 : 200);
      this.camTo = { x: (minx + maxx) / 2, y: (miny + maxy) / 2, z: this.fitZ(span * 1.25) };
      if (rocket) { const r = this.racers.find((q) => q.leg?.kind === "rocket"); this.camTo.x = r.x; this.camTo.y = MH * 0.45; }
    }
    // between trips (and on the results screen): every pin of the tour in view
    if (!this.lobby && !this.cards.length && this.racers.every((r) => !r.leg && !r.pending)) {
      const all = this.racers.flatMap((r) => [[r.x, r.y], ...r.pins.map((p) => [p.x, p.y])]);
      if (all.length > 1) {
        const ref = all[0][0];
        const xs = all.map(([x]) => { let d = x - ref; d -= Math.round(d / MW) * MW; return ref + d; }), ys = all.map(([, y]) => y);
        const span = Math.max(Math.max(...xs) - Math.min(...xs), (Math.max(...ys) - Math.min(...ys)) * (this.W / Math.max(1, this.bottom - this.playTop())), 200);
        this.camTo = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2, z: this.fitZ(span * 1.3) };
      }
    }
    if (this.lobby) this.camTo.x += dt * 8; // the home screen drifts slowly east
    const kz = Math.min(1, dt * 2.2);
    let dx = this.camTo.x - this.cam.x; dx -= Math.round(dx / MW) * MW;
    this.cam.x = (((this.cam.x + dx * kz) % MW) + MW) % MW;
    this.cam.y = lerp(this.cam.y, this.camTo.y, kz);
    this.cam.z = lerp(this.cam.z, this.camTo.z, kz);
    // keep the polar strips off the screen: an equirectangular map smears the Arctic and Antarctica into
    // streaks, and a short screen (a phone with the keyboard up) would otherwise scroll right down to them
    this.cam.z = Math.max(this.cam.z, (this.H / (BAND_BOT - BAND_TOP)) * 1.02);
    const cyS = (this.playTop() + this.bottom) / 2;
    // (the top may go up behind the question card: what shows below it is always map, and a northern city
    // like Paris or London can still sit in the middle of the play area)
    const lo = BAND_TOP + (cyS - this.playTop()) / this.cam.z, hi = BAND_BOT - (this.H - cyS) / this.cam.z;
    this.cam.y = lo <= hi ? clamp(this.cam.y, lo, hi) : (BAND_TOP + BAND_BOT) / 2;
    for (const q of this.particles) { q.life -= dt; if (q.screen) { q.sx += q.vx * dt; q.sy += q.vy * dt; } else { q.wx += (q.vx * dt) / Math.max(0.5, this.cam.z); q.wy += (q.vy * dt) / Math.max(0.5, this.cam.z); } }
    this.particles = this.particles.filter((q) => q.life > 0);
  }

  draw() {
    const { g, W, H, u } = this;
    g.save();
    g.imageSmoothingEnabled = false;
    if (this.shake > 0 && !this.calm) g.translate((Math.random() - 0.5) * 6 * u * this.shake, (Math.random() - 0.5) * 6 * u * this.shake);
    // the sea, then the map (three copies side by side: it wraps round)
    g.fillStyle = "#122a5c"; g.fillRect(-10, -10, W + 20, H + 20);
    const z = this.cam.z;
    const [ox, oy] = this.toScreen(0, 0);
    if (MAP) {
      const base = ox - Math.round((ox - W / 2) / (MW * z)) * MW * z; // the copy nearest the middle
      for (const k of [-1, 0, 1]) {
        const x0 = base + k * MW * z;
        if (x0 > W || x0 + MW * z < 0) continue;
        g.drawImage(MAP, Math.round(x0), Math.round(oy), Math.round(MW * z), Math.round(MH * z));
      }
    }
    this.drawOverlay?.(g); // a themed version's own layer over the map (ON TOUR: night and city lights)
    // drifting cloud shadows, for a bit of life
    g.globalAlpha = 0.12;
    g.fillStyle = "#0b0618";
    for (let k = 0; k < 7; k++) {
      const wx = ((k * 331 + this.time * 6) % MW), wy = 160 + ((k * 197) % 640);
      const [sx, sy] = this.toScreen(wx, wy);
      const s = (40 + (k % 3) * 18) * z;
      g.beginPath(); g.ellipse(sx, sy, s, s * 0.45, 0, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
    // routes: dotted, in each racer's colour
    for (const r of this.racers) {
      g.fillStyle = r.color || "#4fd1ff";
      const d = Math.max(1, Math.round(u * 1.2));
      for (const [wx, wy] of r.trail) { const [sx, sy] = this.toScreen(wx, wy); g.fillRect(Math.round(sx) - (d >> 1), Math.round(sy) - (d >> 1), d, d); }
    }
    // pins at the places named
    for (const r of this.racers) for (const p of r.pins) {
      const [sx, sy] = this.toScreen(p.x, p.y);
      const pop = clamp((this.time - p.t) * 4, 0, 1);
      const s = Math.max(1, Math.round(u * (0.8 + 0.4 * pop)));
      g.fillStyle = "#0b0618"; g.fillRect(sx - s * 2, sy - s * 7, s * 4, s * 4); g.fillRect(sx - s * 0.5, sy - s * 3, s, s * 3);
      g.fillStyle = TIER_COL[p.tier] || "#fff"; g.fillRect(sx - s * 1.5, sy - s * 6.5, s * 3, s * 3);
    }
    // the travellers
    for (const r of this.racers) {
      const [sx, sy] = this.toScreen(r.x, r.y);
      const lift = (r.alt || 0) * 22 * u;
      if (lift > 0) { g.globalAlpha = 0.3; g.fillStyle = "#000"; g.beginPath(); g.ellipse(sx, sy, 5 * u, 3 * u, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; }
      g.save();
      g.translate(Math.round(sx), Math.round(sy - lift));
      g.rotate(r.heading);
      const px = Math.max(1, Math.round(u * (r.kind === "plane" || r.kind === "rocket" ? 1.9 : 1.6)));
      if (r.stalled > 0 && !this.calm) g.translate((Math.random() - 0.5) * 2 * u, 0);
      if (r.kind === "plane") drawPlane(g, px);
      else if (r.kind === "boat") drawBoat(g, px, this.time);
      else if (r.kind === "rocket") drawRocket(g, px, this.time);
      else if (this.drawVehicle) this.drawVehicle(g, px, r);
      else drawCarTop(g, px, r.car?.color || "#4fd1ff", r.car?.accent || "#ffffff");
      g.restore();
      // name tag
      g.fillStyle = r.color || "#4fd1ff";
      g.fillRect(Math.round(sx - 8 * u), Math.round(sy - lift - 22 * u), Math.round(16 * u), Math.round(7 * u));
    }
    // particles
    for (const q of this.particles) {
      g.globalAlpha = clamp(q.life * 2, 0, 1);
      g.fillStyle = q.c;
      const [sx, sy] = q.screen ? [q.sx, q.sy] : this.toScreen(q.wx, q.wy);
      const s = Math.max(1, Math.round(q.size * u * 0.6));
      g.fillRect(Math.round(sx), Math.round(sy), s, s);
    }
    g.globalAlpha = 1;
    if (this.flash > 0 && !this.calm) { g.globalAlpha = Math.min(0.45, this.flash); g.fillStyle = this.flashColor; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
    // a soft vignette
    if (!this.vig || this.vig.width !== W || this.vig.height !== H) {
      const v = this.vig || document.createElement("canvas"); v.width = W; v.height = H;
      const vx = v.getContext("2d"); const vg = vx.createRadialGradient(W / 2, H * 0.6, Math.min(W, H) * 0.4, W / 2, H * 0.6, Math.max(W, H) * 0.78);
      vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.42)"); vx.fillStyle = vg; vx.fillRect(0, 0, W, H); this.vig = v;
    }
    g.drawImage(this.vig, 0, 0);
    g.restore();
    this.drawHi();
  }

  // sharp text on the full-resolution layer: pin labels, name tags and the answer cards
  drawHi() {
    const hg = this.hiG;
    if (!hg) return;
    const R = this.hiScale || 1, u = this.u;
    hg.setTransform(1, 0, 0, 1, 0, 0);
    hg.clearRect(0, 0, hg.canvas.width, hg.canvas.height);
    hg.setTransform(R, 0, 0, R, 0, 0);
    hg.textAlign = "center"; hg.textBaseline = "middle";
    const css = (this.cssPx || 1);
    const px = (n) => n / css; // a size in screen pixels, in canvas units
    // labels on the pins (the latest few)
    for (const r of this.racers) for (const p of r.pins.slice(-6).filter((q) => q.label)) {
      const [sx, sy] = this.toScreen(p.x, p.y);
      hg.font = `${px(10)}px ${CARD_FONT}`;
      const t = p.label.length > 22 ? p.label.slice(0, 21) + "." : p.label;
      const w = hg.measureText(t).width + px(8);
      // under the pin (a car parked there wears its own tag above it)
      hg.fillStyle = "rgba(11,6,24,0.82)"; hg.fillRect(sx - w / 2, sy + 2 * u, w, px(14));
      hg.fillStyle = TIER_COL[p.tier] || "#fff"; hg.fillText(t, sx, sy + 2 * u + px(7));
    }
    for (const r of this.racers) {
      const [sx, sy] = this.toScreen(r.x, r.y);
      hg.font = `${px(9)}px ${CARD_FONT}`; hg.fillStyle = "#0b0618";
      hg.fillText(r.label || "", sx, sy - (r.alt || 0) * 22 * u - 18.5 * u);
    }
    // the answer cards
    for (const c of this.cards) {
      if (c.phase === "gone") continue;
      let sc = 1, a = 1, jx = 0, jy = 0;
      if (c.phase === "slam") { const t = Math.min(1, c.t / 0.28); sc = 1 + 1.6 * (1 - t) * (1 - t); a = Math.min(1, c.t / 0.12); }
      const building = c.phase === "hold" && !c.revealed;
      if (building && !this.calm) { const k = Math.min(1, (c.t - 0.28) / c.build); jx = (Math.random() - 0.5) * px(6) * k; jy = (Math.random() - 0.5) * px(6) * k; }
      let cx = this.W * c.cx, cy = this.playTop() + (this.bottom - this.playTop()) * 0.22;
      if (c.phase === "go") {
        const r = this.racers[c.i], k = ease(Math.min(1, c.goT / 0.4));
        const [tx, ty] = r ? this.toScreen(r.x, r.y) : [cx, cy];
        cx = lerp(cx, tx, k); cy = lerp(cy, ty, k); sc = 1 - 0.8 * k; a = 1 - k;
      }
      const tier = c.revealed ? c.tier : 1;
      const col = c.revealed ? TIER_COL[c.fx] : TIER_COL[Math.min(c.fx, 1 + Math.floor(Math.min(1, (c.t - 0.28) / (c.build || 1)) * c.fx))];
      const ans = (c.answer || "").toUpperCase();
      const big = px(clamp(26 - Math.max(0, ans.length - 12) * 0.9, 14, 26));
      hg.font = `${big}px ${CARD_FONT}`;
      const wA = hg.measureText(ans).width;
      hg.font = `${px(12)}px ${CARD_FONT}`;
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
      if (this.drawCardMark) this.drawCardMark(hg, w, h, col, px);
      else { // a postmark in the corner: it's a postcard from the place you named
        hg.strokeStyle = col; hg.lineWidth = px(1.5); hg.beginPath(); hg.arc(w / 2 - px(16), -h / 2 + px(14), px(9), 0, Math.PI * 2); hg.stroke();
      }
      hg.font = `${big}px ${CARD_FONT}`; hg.fillStyle = "#05020c"; hg.fillText(ans, px(1.5), -h / 2 + px(8) + big / 2 + px(1.5), w - px(16));
      hg.fillStyle = "#ffffff"; hg.fillText(ans, 0, -h / 2 + px(8) + big / 2, w - px(16));
      hg.font = `${px(12)}px ${CARD_FONT}`; hg.fillStyle = col; hg.fillText(sub, 0, h / 2 - px(26), w - px(12));
      hg.fillStyle = tier ? "#ffd23a" : "#8a8499"; hg.fillText(gain, 0, h / 2 - px(11), w - px(12));
      hg.restore();
    }
  }
}
