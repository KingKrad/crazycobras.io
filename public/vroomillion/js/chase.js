// Behind-the-car race view: an arcade-style road that curves and rolls over hills,
// drawn segment by segment from the horizon towards the camera.
//
// The world reacts to the race. Distance driven (the leader's, adjusted for car power)
// moves you through zones (city, coast, desert, mountains, neon strip), from sunrise
// through sunset to night, with weather rolling in. Deep Cuts light the road up and
// a One in a Vroomillion sends you down a rainbow tunnel.
//
// Art stays chunky 8-bit: a low-res canvas scaled up with hard pixels, flat bold colours,
// and scenery with a one-pixel dark outline.
import { rearSprite } from "./cars.js";
import { pixelText } from "./scene.js";

const SEG = 200; // length of one road segment (world units)
const ROAD = 2000; // road width (world units)
const CAM_H = 1000; // camera height above the road
const BASE_DEPTH = 0.84; // ~100° field of view
const DRAW = 150; // segments drawn ahead
const SPR = 38; // world units per pixel of roadside sprites
const LANES = { solo: 0, 0: -0.45, 1: 0.45 }; // x in half-road widths
const ZONE_M = 700; // power-adjusted metres per zone
const DAY_M = 3000; // power-adjusted metres from sunrise to night

const hash = (n) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const mod = (a, n) => ((a % n) + n) % n;
const smooth = (t) => t * t * (3 - 2 * t);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ---- colour helpers ----
const rgbCache = new Map();
function rgb(hex) {
  let c = rgbCache.get(hex);
  if (!c) {
    const n = parseInt(hex.slice(1), 16);
    c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    rgbCache.set(hex, c);
  }
  return c;
}
const css = (c, a = 1) => (a >= 1 ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`);
const mixC = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const mix = (a, b, t) => css(mixC(rgb(a), rgb(b), t));

// The track is endless and the same every time: bends come in sections that ease
// in and out, with straights between; hills are two slow waves.
const SECTION = 70;
function curveAt(i) {
  const s = Math.floor(i / SECTION);
  const t = mod(i, SECTION) / SECTION;
  const c = (hash(s * 1.37) - 0.5) * 2;
  if (Math.abs(c) < 0.3) return 0;
  const ease = t < 0.25 ? smooth(t / 0.25) : t > 0.75 ? smooth((1 - t) / 0.25) : 1;
  return c * 4.2 * ease;
}
const hillAt = (i) => Math.sin(i * 0.012) * 1500 + Math.sin(i * 0.029 + 1.7) * 650;

// ---- zones: what's beside the road, what's on the skyline and what the weather can do ----
const ZONES = [
  { id: "city", name: "DOWNTOWN", verge: ["#575b6b", "#606476"], road: ["#33333f", "#393946"], rumble: ["#e8e8ee", "#d9363e"], line: "#f4f4f4", weather: ["rain", "clear", "rain"] },
  { id: "coast", name: "COAST ROAD", verge: ["#e6cf92", "#dcc486"], road: ["#3a3a48", "#41414f"], rumble: ["#f4f4f4", "#2f8fd8"], line: "#ffd23a", weather: ["clear", "fog", "clear"] },
  { id: "desert", name: "THE DESERT", verge: ["#d9955a", "#cd8a50"], road: ["#3d3434", "#443a3a"], rumble: ["#f4f4f4", "#e0582c"], line: "#ffd23a", weather: ["sand", "clear", "sand"] },
  { id: "alpine", name: "MOUNTAIN PASS", verge: ["#e9eef9", "#dbe2f2"], road: ["#363846", "#3c3e4d"], rumble: ["#f4f4f4", "#3a7bd5"], line: "#ffd23a", weather: ["snow", "snow", "fog"] },
  { id: "neon", name: "NEON STRIP", verge: ["#1a0d38", "#211046"], road: ["#2a2a3c", "#303046"], rumble: ["#f4f4f4", "#ff3b5c"], line: "#ffd23a", weather: ["clear", "rain", "clear"] },
];
const FOG = { clear: "#c8b8d8", fog: "#cfd5e2", rain: "#606a86", snow: "#e6ecf7", sand: "#e3a965" };

// Time of day keyframes along the race: sunrise → day → sunset → night (→ sunrise again on very long runs).
// sky: four gradient stops top→horizon · tint: colour laid over the world and how strongly
const TOD = [
  { t: 0.0, sky: ["#232156", "#5a3d7e", "#e3787e", "#ffc28a"], tint: ["#4a2f70", 0.12], stars: 0.35, sun: 0.08, lamps: 0.5 },
  { t: 0.22, sky: ["#2a6ad0", "#4b8fe6", "#8cc4f4", "#d4ecff"], tint: ["#ffffff", 0], stars: 0, sun: 0.75, lamps: 0 },
  { t: 0.5, sky: ["#2864c6", "#4a88de", "#93c2ee", "#e0eeff"], tint: ["#ffffff", 0], stars: 0, sun: 0.6, lamps: 0 },
  { t: 0.72, sky: ["#2b1652", "#7a2b6e", "#ff6a4d", "#ffb35c"], tint: ["#ff6a2e", 0.1], stars: 0.1, sun: 0.1, lamps: 0.45 },
  { t: 0.9, sky: ["#0b0b28", "#1d1648", "#3d2160", "#62305f"], tint: ["#14194a", 0.3], stars: 0.8, sun: -0.2, lamps: 1 },
  { t: 1.05, sky: ["#05061a", "#0c0d30", "#1a1846", "#2c2358"], tint: ["#0d1240", 0.36], stars: 1, sun: -0.4, lamps: 1 },
  { t: 1.25, sky: ["#05061a", "#0c0d30", "#1a1846", "#2c2358"], tint: ["#0d1240", 0.36], stars: 1, sun: -0.4, lamps: 1 },
  { t: 1.45, sky: ["#232156", "#5a3d7e", "#e3787e", "#ffc28a"], tint: ["#4a2f70", 0.12], stars: 0.35, sun: 0.08, lamps: 0.5 },
];
function timeOfDay(phase) {
  const p = mod(phase, 1.45); // the last keyframe is sunrise again, so very long runs keep cycling
  let a = TOD[0];
  let b = TOD[TOD.length - 1];
  for (let i = 0; i < TOD.length - 1; i++) {
    if (p >= TOD[i].t && p <= TOD[i + 1].t) { a = TOD[i]; b = TOD[i + 1]; break; }
  }
  const t = b.t === a.t ? 0 : smooth((p - a.t) / (b.t - a.t));
  return {
    sky: a.sky.map((c, i) => mixC(rgb(c), rgb(b.sky[i]), t)),
    tint: mixC(rgb(a.tint[0]), rgb(b.tint[0]), t),
    tintA: a.tint[1] + (b.tint[1] - a.tint[1]) * t,
    stars: a.stars + (b.stars - a.stars) * t,
    sun: a.sun + (b.sun - a.sun) * t,
    lamps: a.lamps + (b.lamps - a.lamps) * t,
  };
}

// ---- sprites ----
function pixelCanvas(rows, pal) {
  const cv = document.createElement("canvas");
  cv.width = rows[0].length;
  cv.height = rows.length;
  const g = cv.getContext("2d");
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (!pal[ch]) return;
    g.fillStyle = pal[ch];
    g.fillRect(x, y, 1, 1);
  }));
  return cv;
}

// A one-pixel dark outline round a sprite, at its own resolution (no smoothing or upscaling).
const outlineCache = new WeakMap();
function outline(src) {
  if (outlineCache.has(src)) return outlineCache.get(src);
  const w = src.width;
  const h = src.height;
  const d = src.getContext("2d").getImageData(0, 0, w, h).data;
  const out = document.createElement("canvas");
  out.width = w + 2;
  out.height = h + 2;
  const g = out.getContext("2d");
  const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0;
  g.fillStyle = "#0b0618";
  for (let y = -1; y <= h; y++) {
    for (let x = -1; x <= w; x++) {
      if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) g.fillRect(x + 1, y + 1, 1, 1);
    }
  }
  g.drawImage(src, 1, 1);
  outlineCache.set(src, out);
  return out;
}

// A city block, drawn straight at full detail, with a matching canvas of lit windows for night.
function building(seed) {
  const w = 14 + Math.floor(hash(seed) * 3) * 4;
  const h = 30 + Math.floor(hash(seed + 1) * 34);
  const body = ["#7b7f93", "#8a6f6a", "#6a7d8f", "#9a8f7a", "#5f6478", "#7a6a8a"][seed % 6];
  const cv = document.createElement("canvas");
  const lit = document.createElement("canvas");
  cv.width = lit.width = w + 2;
  cv.height = lit.height = h + 2;
  const g = cv.getContext("2d");
  const l = lit.getContext("2d");
  g.fillStyle = "#0b0618";
  g.fillRect(0, 0, w + 2, h + 2);
  g.fillStyle = body;
  g.fillRect(1, 1, w, h);
  g.fillStyle = css(mixC(rgb(body), [255, 255, 255], 0.25));
  g.fillRect(1, 1, w, 2); // roof ledge
  g.fillStyle = css(mixC(rgb(body), [0, 0, 0], 0.25));
  g.fillRect(w - 2, 3, 3, h - 2); // shaded side
  for (let y = 5; y < h - 6; y += 5) {
    for (let x = 3; x < w - 4; x += 4) {
      g.fillStyle = "#26304a";
      g.fillRect(x, y, 2, 3);
      if (hash(seed * 13 + x * 7 + y) > 0.6) {
        l.fillStyle = hash(seed + x + y * 3) > 0.25 ? "#ffd98a" : "#9fe3ff";
        l.fillRect(x, y, 2, 3);
      }
    }
  }
  g.fillStyle = "#2a2433";
  g.fillRect(Math.floor(w / 2) - 2, h - 5, 4, 6); // door
  return { img: cv, lit };
}

let SPRITES = null;
function sprites() {
  if (SPRITES) return SPRITES;
  const S = {};
  S.palm = outline(pixelCanvas([
    ".....GG...GG....",
    "...GGGGG.GGGGG..",
    ".GGGG.GGgGG.GGG.",
    "GG...GGgGGG...GG",
    "G...GG.T..GG...G",
    "...GG..T...GG...",
    "..G....T.....G..",
    ".......T........",
    ".......TT.......",
    "........T.......",
    "........T.......",
    "........T.......",
    "........TT......",
    ".........T......",
    ".........T......",
    ".........T......",
    ".........T......",
    "........TTT.....",
  ], { G: "#1e7a4f", g: "#2fae6c", T: "#6a4428" }));
  S.lamp = outline(pixelCanvas([
    "LLLL..",
    "PPPPP.",
    "....P.", "....P.", "....P.", "....P.", "....P.", "....P.", "....P.",
    "....P.", "....P.", "....P.", "....P.", "....P.", "....P.", "....P.",
    "...PPP",
  ], { L: "#fff6a0", P: "#5d5488" }));
  S.sign = outline(pixelCanvas([
    "MMMMMMMMMMMMMMMMMMMM",
    "MWWKKWWKKWWKKWWKKWWM",
    "MWWKKWWKKWWKKWWKKWWM",
    "MKKWWKKWWKKWWKKWWKKM",
    "MKKWWKKWWKKWWKKWWKKM",
    "MWWKKWWKKWWKKWWKKWWM",
    "MWWKKWWKKWWKKWWKKWWM",
    "MMMMMMMMMMMMMMMMMMMM",
    "......P......P......",
    "......P......P......",
    "......P......P......",
    "......P......P......",
    ".....PPP....PPP.....",
  ], { M: "#ff4fd8", W: "#f4f4f4", K: "#12082e", P: "#3b2a78" }));
  S.cactus = outline(pixelCanvas([
    "....GG....",
    "...GGgG...",
    "...GGgG...",
    "G..GGgG...",
    "GG.GGgG.G.",
    "GG.GGgG.GG",
    "GGGGGgG.GG",
    ".GGGGgGGGG",
    "...GGgGGG.",
    "...GGgG...",
    "...GGgG...",
    "...GGgG...",
    "...GGgG...",
    "..dddddd..",
  ], { G: "#3f8f4a", g: "#6cc46a", d: "#a8743f" }));
  S.rock = outline(pixelCanvas([
    "...RRRR...",
    "..RRrrRRR.",
    ".RRrrRRRRR",
    "RRRRRRRRRD",
    "RRRRRRRDDD",
    "DRRRRDDDDD",
  ], { R: "#9a6a52", r: "#c48d6c", D: "#6e4a3c" }));
  S.boulder = outline(pixelCanvas([
    "...RRRR...",
    "..RRrrRRR.",
    ".RRrrRRRRR",
    "RRRRRRRRRD",
    "RRRRRRRDDD",
    "DRRRRDDDDD",
  ], { R: "#7d8496", r: "#f2f6ff", D: "#596073" }));
  S.pine = outline(pixelCanvas([
    ".....S.....",
    "....SPS....",
    "....PPP....",
    "...SPPPS...",
    "...PPPPP...",
    "..SSPPPSS..",
    "..PPPPPPP..",
    ".SPPPPPpPS.",
    ".PPPPPPpPP.",
    "SSPPPPPpPSS",
    "PPPPPPPpPPP",
    "....TT.....",
    "....TT.....",
  ], { S: "#f4f8ff", P: "#1f5c45", p: "#173f33", T: "#5a3a22" }));
  S.bush = outline(pixelCanvas([
    "..GGGG..",
    ".GGgGGG.",
    "GGgGGGGG",
    "GGGGGGdG",
    ".dGGGdd.",
  ], { G: "#2c8c4c", g: "#5cc46a", d: "#1d6638" }));
  S.billboard = outline(pixelCanvas([
    "YYYYYYYYYYYYYYYYYY",
    "YRRRRRRRRRRRRRRRRY",
    "YRWWWRRWWWRRWWWRRY",
    "YRWRRRRWRWRRWRRRRY",
    "YRWWWRRWWWRRWWWRRY",
    "YRRRWRRWRRRRWRRRRY",
    "YRWWWRRWRRRRWWWRRY",
    "YRRRRRRRRRRRRRRRRY",
    "YYYYYYYYYYYYYYYYYY",
    ".....P......P.....",
    ".....P......P.....",
    ".....P......P.....",
    "....PPP....PPP....",
  ], { Y: "#ffd23a", R: "#e0582c", W: "#fff4d6", P: "#5a3a22" }));
  S.buildings = [0, 1, 2, 3, 4, 5].map(building);
  SPRITES = S;
  return S;
}

// a banner with the zone's name, hung over the road where each new zone begins
const gantryCache = new Map();
function gantryText(name) {
  if (gantryCache.has(name)) return gantryCache.get(name);
  const cv = document.createElement("canvas");
  cv.width = name.length * 4 + 5;
  cv.height = 9;
  const g = cv.getContext("2d");
  g.fillStyle = "#ffd23a";
  g.fillRect(0, 0, cv.width, cv.height);
  g.fillStyle = "#0b0618";
  g.fillRect(0, 0, cv.width, 1);
  g.fillRect(0, cv.height - 1, cv.width, 1);
  pixelText(g, name, 3, 2);
  gantryCache.set(name, cv);
  return cv;
}

export class ChaseScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.g = canvas.getContext("2d");
    this.layer = document.createElement("canvas");
    this.wg = this.layer.getContext("2d");
    this.racers = [];
    this.camZ = 0;
    this.bgX = 0;
    this.speed = 0.3; // 0..1 overall sense of speed, set by the race
    this.shake = 0;
    this.flash = 0;
    this.flashColor = "#ffffff";
    this.kick = 0;
    this.warp = 0;
    this.glow = 0; // Deep Cut and up: the road lights up
    this.tunnel = 0; // One in a Vroomillion: rainbow tunnel
    this.revT = 0;
    this.time = 0;
    this.particles = [];
    this.calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.resetWorld();
    this.resize(400, 250, 220);
  }

  // carBottom: canvas y where the nearest car's tyres should sit (above the answer bar).
  resize(w, h, carBottom = h - 12) {
    w = Math.max(160, Math.round(w));
    h = Math.max(110, Math.round(h));
    this.W = w;
    this.H = h;
    this.u = 1; // canvas pixels per art pixel (the canvas itself is low-res and scaled up)
    this.horizon = Math.round(Math.min(h * 0.42, carBottom - h * 0.3));
    this.carBottom = Math.round(carBottom);
    this.carPx = Math.max(2, Math.round((w * 0.2) / 28)); // canvas px per sprite px for the nearest car (~20% of the width)
    this.canvas.width = w;
    this.canvas.height = h;
    this.layer.width = w;
    this.layer.height = h;
    this.g.imageSmoothingEnabled = false;
    this.wg.imageSmoothingEnabled = false;
  }

  resetWorld() {
    this.seed = Math.random() * 1000;
    const first = Math.floor(hash(this.seed) * ZONES.length);
    this.zones = [{ zone: first, start: -Infinity, weather: "clear" }]; // the first stretch is always dry
    this.progress = 0;
    this.shown = 0; // the zone entry the camera is in
    this.fade = 1; // 0→1 crossfade of skyline into the camera's zone
    this.prevZone = first;
    this.wx = { rain: 0, snow: 0, sand: 0, fog: 0 };
    this.drops = [];
    this.tod = timeOfDay(0);
  }

  setRacers(list) {
    this.racers = list.map((r, i) => ({
      ...r,
      frames: [rearSprite(r.car, 0), rearSprite(r.car, 1)],
      lane: list.length === 1 ? LANES.solo : LANES[i],
      dist: 0, boost: 0, nitro: false, gap: 0, wheel: 0, lift: 0, drift: 0,
      trail: [], tier: 0, launchT: 0, box: null,
    }));
    this.kick = 0;
    this.warp = 0;
    this.glow = 0;
    this.tunnel = 0;
    this.particles = [];
    this.resetWorld();
  }

  rev(seconds) {
    this.revT = seconds;
  }

  launch(i, tier, nitro) {
    const r = this.racers[i];
    if (!r || !r.box) return;
    const { x, y, w } = r.box;
    const u = this.u;
    r.tier = tier;
    r.launchT = 0.7;
    if (tier === 0) {
      for (let k = 0; k < 14; k++) {
        this.particles.push({ x: x + w * 0.2 + Math.random() * w * 0.6, y: y - 4 * u, vx: (Math.random() - 0.5) * 30 * u, vy: (-10 - Math.random() * 20) * u, life: 1.2, size: 3 * u, grow: 5 * u, color: "#2b2633", g: 0 });
      }
      return;
    }
    const power = [0, 0.25, 0.4, 0.6, 0.85, 1.2][tier] + (nitro ? 0.35 : 0);
    this.kick = Math.max(this.kick, power);
    r.lift = Math.min(1, 0.4 + power * 0.5);
    if (!this.calm) this.shake = Math.max(this.shake, power * 0.7);
    // tyre smoke billows back towards the camera
    for (let k = 0; k < 10 + tier * 7; k++) {
      const side = k % 2 ? x + w * 0.12 : x + w * 0.88;
      this.particles.push({ x: side + (Math.random() - 0.5) * 6 * u, y: y - 2 * u, vx: (side < x + w / 2 ? -1 : 1) * (20 + Math.random() * 60 * power) * u, vy: (10 + Math.random() * 40) * u, life: 0.8 + Math.random() * 0.7, size: 3 * u, grow: 9 * u, color: k % 3 ? "#d9d6e8" : "#a9a4c0", g: 0, soft: true });
    }
    // sparks off the underside on fast lanes and up
    if (tier >= 3) {
      for (let k = 0; k < tier * 12; k++) {
        this.particles.push({ x: x + w * (0.25 + Math.random() * 0.5), y, vx: (Math.random() - 0.5) * 260 * u, vy: (30 + Math.random() * 120) * u, life: 0.5 + Math.random() * 0.4, size: Math.max(1, u * 0.75), color: Math.random() < 0.5 ? "#ffd23a" : "#ff8a2e", g: 220 * u, hot: true });
      }
    }
    if (tier >= 4) {
      this.flash = Math.max(this.flash, tier === 5 ? 0.7 : 0.35);
      this.flashColor = tier === 5 ? "rainbow" : "#ffb02e";
      this.glow = Math.max(this.glow, tier === 5 ? 3.2 : 2.2);
    }
    if (tier === 5) this.tunnel = Math.max(this.tunnel, 2.8);
    if (tier === 5 || nitro) this.warp = Math.max(this.warp, tier === 5 ? 1.6 : 0.9);
  }

  confetti() {
    const u = this.u;
    for (let i = 0; i < 140; i++) {
      this.particles.push({
        x: Math.random() * this.W, y: -Math.random() * 40 * u, vx: (Math.random() - 0.5) * 30 * u, vy: (30 + Math.random() * 60) * u,
        life: 3, size: 2 * u, color: ["#ff4fd8", "#ffd23a", "#4fd1ff", "#5dff8f", "#ffffff"][i % 5], g: 0, spin: Math.random() * 6,
      });
    }
    if (!this.calm) this.shake = 0.5;
    this.flash = 0.35;
    this.flashColor = "#ffffff";
  }

  // Where a racer is on screen (fractions of the canvas), for the "+720 M" pop-ups.
  anchor(i) {
    const b = this.racers[i]?.box;
    return b ? { x: (b.x + b.w / 2) / this.W, y: (b.y - b.h - 8 * this.u) / this.H } : { x: 0.5, y: 0.6 };
  }

  // Highest canvas y covered by a car or its name tag, so UI can stay above it.
  coverTop() {
    // the nearest car (lowest on screen); a leader far up the road may pass behind the card
    const near = this.racers.filter((r) => r.box).sort((a, b) => b.box.y - a.box.y)[0];
    return near ? near.box.y - near.box.h - 14 * this.u : this.carBottom - this.carPx * 18;
  }

  zoneAt(i) {
    for (let k = this.zones.length - 1; k >= 0; k--) if (this.zones[k].start <= i) return k;
    return 0;
  }

  update(dt) {
    const u = this.u;
    this.time += dt;
    this.shake = Math.max(0, this.shake - dt);
    this.flash = Math.max(0, this.flash - dt);
    this.kick = Math.max(0, this.kick - dt * 0.9);
    this.warp = Math.max(0, this.warp - dt * 0.8);
    this.glow = Math.max(0, this.glow - dt * 0.7);
    this.tunnel = Math.max(0, this.tunnel - dt * 0.75);
    this.revT = Math.max(0, this.revT - dt);
    const segsPerSec = 4 + this.speed * 46;
    this.camZ += SEG * segsPerSec * dt;
    const camSeg = Math.floor(this.camZ / SEG);
    const bend = curveAt(camSeg + 8);
    this.bgX -= bend * segsPerSec * dt * 0.9 * u;

    // ---- the world moves on with the leader ----
    if (this.racers.length) {
      this.progress = Math.max(...this.racers.map((r) => r.dist / (r.car?.power || 1)));
    }
    const want = Math.floor(this.progress / ZONE_M);
    while (this.zones.length - 1 < want) {
      const prev = this.zones[this.zones.length - 1];
      const n = this.zones.length;
      const zone = (this.zones[0].zone + n) % ZONES.length;
      const opts = ZONES[zone].weather;
      // new zones appear at the horizon and you drive into them
      this.zones.push({ zone, start: Math.max(camSeg + DRAW - 4, prev.start + 40), weather: opts[Math.floor(hash(this.seed + n * 3.3) * opts.length)] });
    }
    const here = this.zoneAt(camSeg + 3);
    if (here !== this.shown) {
      this.prevZone = this.zones[this.shown].zone;
      this.shown = here;
      this.fade = 0;
    }
    this.fade = Math.min(1, this.fade + dt * 0.9);
    const weather = this.zones[this.shown].weather;
    for (const k of Object.keys(this.wx)) {
      const target = k === weather ? 1 : 0;
      this.wx[k] += clamp(target - this.wx[k], -dt * 0.45, dt * 0.45);
    }
    const goal = timeOfDay(this.progress / DAY_M);
    this.tod = goal;
    // lightning in a night storm
    if (!this.calm && this.wx.rain > 0.7 && this.tod.lamps > 0.6 && Math.random() < dt * 0.12) {
      this.flash = Math.max(this.flash, 0.3);
      this.flashColor = "#d4dcff";
    }
    this.updateWeather(dt);

    if (this.racers.length) {
      const back = Math.min(...this.racers.map((r) => r.dist));
      for (const r of this.racers) {
        // the leader drives further up the road; big leads are squeezed so they stay on screen,
        // between the question card and the car behind
        const target = clamp(Math.sqrt(Math.max(0, r.dist - back)) * 0.35, 0, 10);
        r.gap += (target - r.gap) * Math.min(1, dt * 3);
        r.wheel += dt * (4 + this.speed * 26 + r.boost * 20);
        r.lift = Math.max(0, r.lift - dt * 1.6);
        r.launchT = Math.max(0, r.launchT - dt);
        r.drift += (clamp(-bend * 0.012, -0.04, 0.04) - r.drift) * Math.min(1, dt * 2);
        if (r.box && r.boost > 0.6 && !this.calm) r.trail.unshift({ ...r.box });
        else if (r.trail.length) r.trail.pop();
        if (r.trail.length > 5) r.trail.length = 5;
        if (r.box) {
          // exhaust: rev puffs and boost smoke
          const ex = [r.box.x + r.box.w * 0.18, r.box.x + r.box.w * 0.82];
          const ey = r.box.y - r.box.h * 0.25;
          if (this.revT > 0 && Math.random() < 0.6) {
            const sx = ex[Math.random() < 0.5 ? 0 : 1];
            this.particles.push({ x: sx, y: ey, vx: (Math.random() - 0.5) * 20 * u, vy: (10 + Math.random() * 15) * u, life: 0.5, size: 2 * u, grow: 5 * u, color: "#8f8aa8", g: 0, soft: true });
          }
          if (r.boost > 0.05 && Math.random() < r.boost * 0.8) {
            const sx = ex[Math.random() < 0.5 ? 0 : 1];
            this.particles.push({ x: sx, y: ey, vx: (Math.random() - 0.5) * 40 * u, vy: (30 + r.boost * 60) * u, life: 0.45, size: 2 * u, grow: 7 * u, color: "#cfd3e6", g: 0, soft: true });
          }
          // spray off the tyres on a wet road, powder on snow, dust in the desert
          const kick = this.wx.rain > 0.3 ? "#b9c4e6" : this.wx.snow > 0.3 ? "#f4f8ff" : this.wx.sand > 0.3 ? "#e8b878" : null;
          if (kick && Math.random() < 0.12 + this.speed * 0.3) {
            const sx = ex[Math.random() < 0.5 ? 0 : 1];
            this.particles.push({ x: sx + (Math.random() - 0.5) * r.box.w * 0.2, y: r.box.y - 2 * u, vx: (sx < r.box.x + r.box.w / 2 ? -1 : 1) * (20 + Math.random() * 50) * u, vy: (20 + Math.random() * 30) * u, life: 0.5, size: 1.5 * u, grow: 4 * u, color: kick, g: 0, soft: true });
          }
        }
      }
    }
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += (p.g || 0) * dt;
      if (p.grow) p.size += p.grow * dt;
      if (p.spin !== undefined) p.spin += dt * 8;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0 && p.y < this.H + 20 * u && p.y > -60 * u);
  }

  // rain, snow and blowing sand, in screen space
  updateWeather(dt) {
    const { W, H, u } = this;
    const area = (W * H) / (u * u * 420 * 260);
    const target = {
      rain: Math.round(this.wx.rain * 80 * area),
      snow: Math.round(this.wx.snow * 70 * area),
      sand: Math.round(this.wx.sand * 40 * area),
    };
    const count = { rain: 0, snow: 0, sand: 0 };
    for (const d of this.drops) count[d.type]++;
    const spawn = (type, anywhere) => {
      const d = { type, x: Math.random() * W, y: anywhere ? Math.random() * H : -10 * u, s: 0.6 + Math.random() * 0.8 };
      if (type === "sand") { d.x = anywhere ? Math.random() * W : W + 10 * u; d.y = Math.random() * H; }
      this.drops.push(d);
      count[type]++;
    };
    for (const t of Object.keys(target)) {
      let n = 0;
      while (count[t] < target[t] && n++ < 40) spawn(t, true);
    }
    const speed = this.speed;
    const vx0 = W / 2;
    this.drops = this.drops.filter((d) => {
      if (d.type === "rain") {
        d.x += (-50 - speed * 90) * u * dt * d.s;
        d.y += (420 + speed * 380) * u * dt * d.s;
      } else if (d.type === "snow") {
        d.x += (Math.sin(this.time * 2 + d.s * 9) * 18 + ((d.x - vx0) / W) * speed * 320) * u * dt;
        d.y += (24 + speed * 110) * u * dt * d.s;
      } else {
        d.x -= (240 + speed * 320) * u * dt * d.s;
        d.y += Math.sin(this.time * 3 + d.s * 7) * 20 * u * dt;
      }
      const off = d.y > H + 10 * u || d.x < -20 * u || d.x > W + 20 * u;
      if (!off) return true;
      if (count[d.type] > target[d.type]) { count[d.type]--; return false; }
      if (d.type === "sand") { d.x = W + 10 * u; d.y = Math.random() * H; } else { d.x = Math.random() * W * 1.2; d.y = -10 * u; }
      return true;
    });
  }

  draw() {
    const { W, H, g, u } = this;
    const wg = this.wg;
    const tod = this.tod;
    g.save();
    if (this.shake > 0 && !this.calm) {
      g.translate(Math.round((Math.random() - 0.5) * 8 * u * this.shake), Math.round((Math.random() - 0.5) * 8 * u * this.shake));
    }

    // launches widen the field of view so the road stretches away
    const depth = BASE_DEPTH * (this.calm ? 1 : 1 - Math.min(0.22, this.kick * 0.16));
    const k = W / 2;
    const playerZ = (depth * CAM_H * k) / Math.max(20, this.carBottom - this.horizon);

    this.drawSky(g);

    // the world goes on its own layer so time of day and haze can be laid over it without touching the sky
    wg.setTransform(1, 0, 0, 1, 0, 0);
    wg.globalCompositeOperation = "source-over";
    wg.globalAlpha = 1;
    wg.clearRect(0, 0, W, H);
    this.drawSkyline(wg);

    // ---- project the road ----
    const base = Math.floor(this.camZ / SEG);
    const off = this.camZ - base * SEG;
    const camY = hillAt(base) + (hillAt(base + 1) - hillAt(base)) * (off / SEG) + CAM_H;
    const pts = [];
    let x = 0;
    let dx = -curveAt(base) * (off / SEG);
    for (let n = 0; n <= DRAW + 1; n++) {
      const i = base + n;
      const z = Math.max(1, n * SEG - off);
      const scale = depth / z;
      pts.push({ i, z, scale, sx: W / 2 + scale * x * k, sy: this.horizon - scale * (hillAt(i) - camY) * k, sw: scale * (ROAD / 2) * k, hidden: false });
      x += dx;
      dx += curveAt(i);
    }

    // per-zone colours, with the weather mixed in
    const pal = ZONES.map((z) => {
      const ground = (c) => {
        let v = rgb(c);
        if (this.wx.snow > 0) v = mixC(v, [242, 246, 255], this.wx.snow * 0.75);
        if (this.wx.sand > 0) v = mixC(v, [227, 176, 112], this.wx.sand * 0.4);
        if (this.wx.rain > 0) v = mixC(v, [30, 34, 52], this.wx.rain * 0.12);
        return css(v);
      };
      const tar = (c) => {
        let v = rgb(c);
        if (this.wx.rain > 0) v = mixC(v, [20, 22, 34], this.wx.rain * 0.2);
        if (this.wx.sand > 0) v = mixC(v, [150, 110, 80], this.wx.sand * 0.25);
        return css(v);
      };
      return { verge: z.verge.map(ground), road: z.road.map(tar), rumble: z.rumble, line: z.line };
    });

    // ground under the far road, so a hill crest never shows sky beneath the horizon
    wg.fillStyle = pal[this.zones[this.zoneAt(base + DRAW)].zone].verge[0];
    wg.fillRect(0, this.horizon, W, H - this.horizon);

    // ---- road, near to far; a segment hidden behind a hill crest is skipped ----
    let maxY = H;
    const shine = this.wx.rain;
    for (let n = 1; n <= DRAW; n++) {
      const a = pts[n - 1];
      const b = pts[n];
      if (b.sy >= maxY || b.z <= 1) { b.hidden = true; continue; }
      const P = pal[this.zones[this.zoneAt(b.i)].zone];
      const band = Math.floor(b.i / 3) % 2;
      const yTop = Math.round(b.sy);
      const yBot = Math.min(Math.round(a.sy), Math.round(maxY));
      // verge
      wg.fillStyle = P.verge[band];
      wg.fillRect(0, yTop, W, yBot - yTop + 1);
      // rumble strips and tarmac
      quad(wg, a.sx, a.sy, a.sw * 1.14, b.sx, b.sy, b.sw * 1.14, P.rumble[band]);
      quad(wg, a.sx, a.sy, a.sw, b.sx, b.sy, b.sw, P.road[band]);
      // a soft centre band so the tarmac has some shading
      quad(wg, a.sx, a.sy, a.sw * 0.55, b.sx, b.sy, b.sw * 0.55, band ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.04)");
      // wet road: reflections streak down the lanes
      if (shine > 0.05 && Math.floor(b.i / 2) % 3 === 0) {
        for (const lx of [-0.45, 0.45]) {
          quadAt(wg, a.sx + a.sw * lx, a.sy, a.sw * 0.08, b.sx + b.sw * lx, b.sy, b.sw * 0.08, `rgba(190,205,255,${(0.18 * shine).toFixed(3)})`);
        }
      }
      // lane dashes
      if (Math.floor(b.i / 4) % 2) quad(wg, a.sx, a.sy, a.sw * 0.025, b.sx, b.sy, b.sw * 0.025, P.line);
      maxY = b.sy;
    }

    // ---- roadside scenery and cars, far to near ----
    const items = [];
    const spr = sprites();
    const push = (p, img, offX, extra) => items.push({ z: p.z, p, img, off: offX, ...extra });
    for (let n = DRAW; n >= 2; n--) {
      const p = pts[n];
      if (p.hidden) continue;
      const i = p.i;
      const zi = this.zoneAt(i);
      const zone = ZONES[this.zones[zi].zone].id;
      if (this.zones[zi].start === i && zi > 0) items.push({ z: p.z, p, gantry: ZONES[this.zones[zi].zone].name });
      const side = hash(i * 7.7) < 0.5 ? -1 : 1;
      const far = hash(i * 5.3);
      const roll = hash(i * 3.1);
      if (zone === "city") {
        if (i % 4 === 0) {
          const bi = Math.floor(hash(i * 1.9) * 6);
          push(p, spr.buildings[bi].img, -(1.9 + far * 0.6), { lit: spr.buildings[bi].lit });
        }
        if (i % 4 === 2) {
          const bj = Math.floor(hash(i * 2.9) * 6);
          push(p, spr.buildings[bj].img, 1.9 + hash(i * 6.1) * 0.6, { lit: spr.buildings[bj].lit });
        }
        if (i % 8 === 0) { push(p, spr.lamp, -1.2, { lamp: true }); push(p, spr.lamp, 1.2, { lamp: true, flip: true }); }
      } else if (zone === "coast") {
        if (roll < 0.28) push(p, spr.palm, side * (1.35 + far * 1.1));
        else if (roll < 0.42) push(p, spr.bush, side * (1.3 + far * 1.5));
        if (i % 12 === 0) { push(p, spr.lamp, -1.2, { lamp: true }); push(p, spr.lamp, 1.2, { lamp: true, flip: true }); }
      } else if (zone === "desert") {
        if (roll < 0.16) push(p, spr.cactus, side * (1.4 + far * 1.8));
        else if (roll < 0.27) push(p, spr.rock, side * (1.3 + far * 1.4));
        if (i % 61 === 0) push(p, spr.billboard, hash(i) < 0.5 ? -1.9 : 1.9);
      } else if (zone === "alpine") {
        if (roll < 0.5) push(p, spr.pine, side * (1.3 + far * 1.9));
        if (hash(i * 9.1) < 0.12) push(p, spr.pine, -side * (1.5 + hash(i * 4.4) * 1.6));
        else if (roll > 0.92) push(p, spr.boulder, side * (1.3 + far));
      } else {
        if (roll < 0.2) push(p, spr.palm, side * (1.35 + far * 1.1));
        if (i % 10 === 0) { push(p, spr.lamp, -1.2, { lamp: true }); push(p, spr.lamp, 1.2, { lamp: true, flip: true }); }
        if (i % 47 === 0) push(p, spr.sign, hash(i) < 0.5 ? -1.9 : 1.9, { neon: true });
      }
    }
    this.racers.forEach((r, idx) => {
      const lunge = Math.min(7, r.boost * 2.2);
      items.push({ z: playerZ + (r.gap + lunge) * SEG, car: true, r, idx });
    });
    items.sort((p, q) => q.z - p.z);

    const interp = (z) => {
      const f = (z + off) / SEG;
      const n = Math.floor(f);
      if (n < 1 || n >= DRAW) return null;
      const a = pts[n];
      const b = pts[n + 1];
      const t = f - n;
      return { sx: a.sx + (b.sx - a.sx) * t, sy: a.sy + (b.sy - a.sy) * t, sw: a.sw + (b.sw - a.sw) * t, hidden: a.hidden && b.hidden, i: a.i };
    };

    const glows = []; // things that light up at night, drawn after the world is darkened
    const lights = [];
    for (const it of items) {
      if (it.car) { this.drawCar(wg, it.r, interp(it.z), playerZ / it.z, lights); continue; }
      if (it.gantry) { this.drawGantry(wg, it.p, it.gantry); continue; }
      const sprite = it.img;
      const ps = it.p.scale * k * SPR;
      if (ps < 0.12) continue;
      const w = sprite.width * ps;
      const h = sprite.height * ps;
      const bx = it.p.sx + it.p.sw * it.off;
      if (bx + w < -10 || bx - w > W + 10) continue;
      const left = Math.round(bx - w / 2);
      const top = Math.round(it.p.sy - h);
      if (it.flip) {
        wg.save();
        wg.translate(Math.round(bx + w / 2), 0);
        wg.scale(-1, 1);
        wg.drawImage(sprite, 0, top, Math.round(w), Math.round(h));
        wg.restore();
      } else {
        wg.drawImage(sprite, left, top, Math.round(w), Math.round(h));
      }
      if (it.lit && h > 14) glows.push({ img: it.lit, x: left, y: top, w: Math.round(w), h: Math.round(h) });
      if (it.neon) glows.push({ img: sprite, x: left, y: top, w: Math.round(w), h: Math.round(h), a: 0.7 });
      if (it.lamp) glows.push({ halo: true, x: it.flip ? bx + w * 0.25 : bx - w * 0.25, y: top + h * 0.04, r: Math.max(2, w * 1.4) });
    }

    // ---- haze, time of day, then lights ----
    wg.globalCompositeOperation = "source-atop";
    const fogC = this.fogColour();
    const haze = clamp(this.wx.fog * 0.55 + this.wx.sand * 0.3 + this.wx.rain * 0.1 + this.wx.snow * 0.12, 0, 0.65);
    const hz = this.horizon;
    const fog = wg.createLinearGradient(0, hz - 70 * u, 0, hz + (this.carBottom - hz) * (0.55 + this.wx.fog * 0.35));
    fog.addColorStop(0, css(fogC, haze * 0.8));
    fog.addColorStop(0.35, css(fogC, haze));
    fog.addColorStop(1, css(fogC, 0));
    wg.fillStyle = fog;
    wg.fillRect(0, 0, W, H);
    if (tod.tintA > 0.01) {
      wg.save();
      wg.beginPath();
      wg.rect(0, 0, W, H);
      for (const L of lights) wg.rect(L.cx - L.w / 2, L.bottom - L.h, L.w, L.h);
      wg.clip("evenodd");
      wg.fillStyle = css(tod.tint, tod.tintA);
      wg.fillRect(0, 0, W, H);
      wg.restore();
      wg.fillStyle = css(tod.tint, tod.tintA * 0.35);
      for (const L of lights) wg.fillRect(L.cx - L.w / 2, L.bottom - L.h, L.w, L.h);
    }
    if (this.tunnel > 0 && !this.calm) {
      wg.fillStyle = `hsla(${Math.floor(this.time * 300) % 360},100%,60%,${Math.min(0.3, this.tunnel * 0.15).toFixed(3)})`;
      wg.fillRect(0, 0, W, H);
    }
    wg.globalCompositeOperation = "lighter";
    const night = tod.lamps;
    if (night > 0.05) {
      this.drawSkyline(wg, night);
      for (const gl of glows) {
        if (gl.halo) {
          // a small pool of light round the bulb
          const rad = Math.round(gl.r * 0.22);
          if (rad < 2) continue;
          wg.fillStyle = `rgba(255,236,160,${(0.35 * night).toFixed(3)})`;
          wg.fillRect(Math.round(gl.x - rad), Math.round(gl.y - rad / 2), rad * 2, rad);
          wg.fillRect(Math.round(gl.x - rad / 2), Math.round(gl.y - rad), rad, rad * 2);
        } else {
          // windows only really come on once it's properly dark
          wg.globalAlpha = (gl.a ? night * gl.a : clamp((night - 0.35) / 0.65, 0, 1));
          wg.drawImage(gl.img, gl.x, gl.y, gl.w, gl.h);
          wg.globalAlpha = 1;
        }
      }
    }
    this.drawLights(wg, lights, night);
    if (this.glow > 0) this.drawRoadGlow(wg, pts);
    wg.globalCompositeOperation = "source-over";
    if (this.tunnel > 0 && !this.calm) this.drawTunnel(wg, pts);

    g.drawImage(this.layer, 0, 0);

    this.drawWeather(g);
    this.drawStreaks(g);

    for (const p of this.particles) {
      g.globalAlpha = Math.min(1, p.life * 3) * (p.soft ? 0.85 : 1);
      g.fillStyle = p.color;
      if (p.spin !== undefined) {
        const w = Math.max(1, Math.abs(Math.cos(p.spin)) * p.size);
        g.fillRect(Math.round(p.x - w / 2), Math.round(p.y - p.size / 2), Math.ceil(w), Math.ceil(p.size));
      } else {
        g.fillRect(Math.round(p.x - p.size / 2), Math.round(p.y - p.size / 2), Math.ceil(p.size), Math.ceil(p.size));
      }
    }
    g.globalAlpha = 1;

    if (this.flash > 0 && !this.calm) {
      g.globalAlpha = Math.min(1, this.flash);
      g.fillStyle = this.flashColor === "rainbow" ? `hsl(${Math.floor(this.time * 720) % 360},100%,65%)` : this.flashColor;
      g.fillRect(-W, -H, W * 3, H * 3);
      g.globalAlpha = 1;
    }
    g.restore();
  }

  fogColour() {
    const w = this.wx;
    const total = w.fog + w.rain + w.snow + w.sand;
    const horizonSky = this.tod.sky[3];
    if (total < 0.01) return horizonSky;
    let c = [0, 0, 0];
    for (const k of ["fog", "rain", "snow", "sand"]) {
      const v = rgb(FOG[k]);
      c = [c[0] + v[0] * w[k], c[1] + v[1] * w[k], c[2] + v[2] * w[k]];
    }
    c = c.map((v) => v / total);
    return mixC(horizonSky, c, Math.min(1, total));
  }

  drawSky(g) {
    const { W, u } = this;
    const hz = this.horizon;
    const tod = this.tod;
    const stops = tod.sky;
    // 8-bit style: a few hard colour bands
    const bands = 10;
    const bh = (hz + 4 * u) / bands;
    for (let i = 0; i < bands; i++) {
      const t = i / (bands - 1);
      const s = t * (stops.length - 1);
      const j = Math.min(stops.length - 2, Math.floor(s));
      let c = mixC(stops[j], stops[j + 1], s - j);
      if (this.tunnel > 0 && !this.calm) {
        const hue = (i * 14 + this.time * 400) % 360;
        c = mixC(c, hsl(hue, 1, 0.55), Math.min(0.75, this.tunnel * 0.4));
      }
      g.fillStyle = css(c);
      g.fillRect(0, Math.floor(i * bh), W, Math.ceil(bh) + 1);
    }
    g.fillStyle = css(stops[3]);
    g.fillRect(0, Math.floor(bands * bh) - 1, W, this.H);

    // stars come out as night falls
    if (tod.stars > 0.02) {
      const n = Math.round((W * hz) / (380 * u));
      for (let i = 0; i < n; i++) {
        const tw = Math.sin(this.time * 2 + i * 1.7);
        g.globalAlpha = tod.stars * (tw > 0.2 ? 1 : 0.5);
        g.fillStyle = tw > 0.6 ? "#ffffff" : "#bfb4ff";
        const sz = hash(i + 31) > 0.9 ? Math.max(1, Math.round(u)) : 1;
        g.fillRect(Math.floor(hash(i) * W), Math.floor(hash(i + 99) * hz * 0.65), sz, sz);
      }
      g.globalAlpha = 1;
    }

    // sun by day, moon by night; both slide with the bends
    const R = Math.round(Math.min(W, hz) * 0.11);
    const sx = Math.round(mod(W * 0.5 + this.bgX * 0.15, W + 200 * u) - 100 * u);
    if (tod.sun > -0.15) {
      const sy = Math.round(hz - 6 * u - tod.sun * hz * 0.7);
      const warm = clamp(1 - tod.sun * 1.6, 0, 1); // low sun is big, orange and striped
      for (let y = -R; y <= R; y++) {
        if (sy + y > hz) break;
        if (warm > 0.5 && y > -R * 0.3 && mod(y + Math.floor(this.time * 3 * u), Math.round(6 * u)) < 2 * u) continue;
        const half = Math.floor(Math.sqrt(R * R - y * y));
        const t = (y + R) / (2 * R);
        g.fillStyle = mix(warm > 0.5 ? "#fff07a" : "#fffbe0", warm > 0.5 ? "#ff5e8a" : "#ffe07a", t * (0.4 + warm * 0.6));
        g.fillRect(sx - half, sy + y, half * 2, 1);
      }
    }
    if (tod.stars > 0.3) {
      const mx = Math.round(W - sx * 0.6 - W * 0.15);
      const my = Math.round(hz * 0.28);
      const mr = Math.round(R * 0.7);
      g.globalAlpha = clamp((tod.stars - 0.3) * 2, 0, 1);
      g.fillStyle = "#f1eedc";
      for (let y = -mr; y <= mr; y++) {
        const half = Math.floor(Math.sqrt(mr * mr - y * y));
        g.fillRect(mx - half, my + y, half * 2, 1);
      }
      g.fillStyle = "#d3cdb4";
      g.fillRect(mx - Math.round(mr * 0.4), my - Math.round(mr * 0.2), Math.max(1, Math.round(mr * 0.3)), Math.max(1, Math.round(mr * 0.3)));
      g.fillRect(mx + Math.round(mr * 0.15), my + Math.round(mr * 0.25), Math.max(1, Math.round(mr * 0.22)), Math.max(1, Math.round(mr * 0.22)));
      g.globalAlpha = 1;
    }

    // heavy weather greys the sky out
    const grey = this.wx.fog * 0.45 + this.wx.rain * 0.3 + this.wx.snow * 0.2 + this.wx.sand * 0.3;
    if (grey > 0.01) {
      g.fillStyle = css(this.fogColour(), Math.min(0.5, grey));
      g.fillRect(0, 0, W, hz + 4 * u);
    }
  }

  // The skyline behind the road: whichever zone the camera is in, crossfading as you cross into a new one.
  // lit > 0 draws only the night lights (windows, neon), in additive mode.
  drawSkyline(g, lit = 0) {
    const cur = this.zones[this.shown].zone;
    if (this.fade < 1) {
      g.globalAlpha = 1 - this.fade;
      this.skyline(g, ZONES[this.prevZone].id, lit);
    }
    g.globalAlpha = this.fade;
    this.skyline(g, ZONES[cur].id, lit);
    g.globalAlpha = 1;
  }

  skyline(g, id, lit) {
    const { W, u } = this;
    const hz = this.horizon;
    const a = g.globalAlpha;
    if (lit) g.globalAlpha = a * lit;
    const ridge = (par, colour, h1, f1, h2, f2, step = 2) => {
      if (lit) return;
      g.fillStyle = colour;
      for (let x = 0; x < W; x += step) {
        const wx = (x - this.bgX * par) / u;
        const h = (h1 + Math.sin(wx * f1) * h1 * 0.5 + Math.sin(wx * f2 + 2) * h2) * u;
        g.fillRect(x, Math.round(hz - h), step, Math.round(h) + 2);
      }
    };
    if (id === "city") {
      const blocks = (par, bw, hMax, colour, winA, seed) => {
        const cs = (-this.bgX * par) / u;
        for (let i = Math.floor(cs / bw) - 1; i < Math.floor(cs / bw) + W / u / bw + 2; i++) {
          if (hash(i + seed) < 0.2) continue;
          const h = Math.round((8 + hash(i * 1.3 + seed) * hMax) * u);
          const x = Math.round((i * bw - cs) * u);
          const bwPx = Math.round((bw - 2) * u);
          if (!lit) {
            g.fillStyle = colour;
            g.fillRect(x, hz - h, bwPx, h + 2);
            g.fillStyle = "rgba(255,255,255,0.08)";
            g.fillRect(x, hz - h, Math.max(1, Math.round(u)), h);
          }
          g.fillStyle = winA;
          for (let wy = 3 * u; wy < h - 2 * u; wy += 3 * u) {
            for (let wx = 2 * u; wx < bwPx - 2 * u; wx += 3 * u) {
              if (hash(i * 31 + wy * 7 + wx) > (lit ? 0.55 : 0.75)) g.fillRect(Math.round(x + wx), Math.round(hz - h + wy), Math.max(1, Math.round(u)), Math.max(1, Math.round(u)));
            }
          }
        }
      };
      blocks(0.25, 12, 34, "#59607a", lit ? "#ffd98a" : "#7c86a3", 50);
      blocks(0.6, 16, 22, "#3d4258", lit ? "#ffe9a8" : "#666f8c", 500);
    } else if (id === "coast") {
      ridge(0.2, "#6e8fae", 10, 0.018, 4, 0.05);
      if (!lit) {
        // the sea runs along the horizon, with glints
        const top = hz - Math.round(6 * u);
        g.fillStyle = "#2f6fb0";
        g.fillRect(0, top, W, hz - top + 2);
        g.fillStyle = "#8fd0ff";
        for (let i = 0; i < W / (6 * u); i++) {
          if (hash(i + Math.floor(this.time * 3)) > 0.7) g.fillRect(Math.round(mod(i * 6 * u - this.bgX * 0.3, W)), top + Math.round(hash(i * 3) * (hz - top)), Math.round(3 * u), 1);
        }
      }
    } else if (id === "desert") {
      if (!lit) {
        // flat-topped mesas, lit from one side
        const cs = (-this.bgX * 0.3) / u;
        const span = 70;
        for (let i = Math.floor(cs / span) - 1; i < Math.floor(cs / span) + W / u / span + 2; i++) {
          if (hash(i + 7) < 0.35) continue;
          const mw = (18 + hash(i) * 30) * u;
          const mh = (10 + hash(i + 3) * 20) * u;
          const x = Math.round((i * span - cs) * u);
          g.fillStyle = "#b8553a";
          g.beginPath();
          g.moveTo(x - mw * 0.2, hz + 2);
          g.lineTo(x + mw * 0.1, hz - mh);
          g.lineTo(x + mw * 0.9, hz - mh);
          g.lineTo(x + mw * 1.2, hz + 2);
          g.fill();
          g.fillStyle = "#8a3a2e";
          g.fillRect(Math.round(x + mw * 0.6), Math.round(hz - mh), Math.round(mw * 0.3), Math.round(mh) + 2);
          g.fillStyle = "#e0805a";
          g.fillRect(Math.round(x + mw * 0.1), Math.round(hz - mh), Math.round(mw * 0.8), Math.max(1, Math.round(u)));
        }
        ridge(0.55, "#d98f5c", 4, 0.03, 2, 0.08);
      }
    } else if (id === "alpine") {
      if (!lit) {
        const peaks = (par, span, hMax, rock, snow, seed) => {
          const cs = (-this.bgX * par) / u;
          for (let i = Math.floor(cs / span) - 1; i < Math.floor(cs / span) + W / u / span + 2; i++) {
            const ph = (hMax * 0.5 + hash(i + seed) * hMax * 0.5) * u;
            const pw = span * (0.8 + hash(i * 2 + seed) * 0.6) * u;
            const x = Math.round((i * span - cs) * u);
            g.fillStyle = rock;
            g.beginPath();
            g.moveTo(x - pw / 2, hz + 2);
            g.lineTo(x, hz - ph);
            g.lineTo(x + pw / 2, hz + 2);
            g.fill();
            g.fillStyle = snow;
            g.beginPath();
            g.moveTo(x - pw * 0.14, hz - ph * 0.72);
            g.lineTo(x, hz - ph);
            g.lineTo(x + pw * 0.14, hz - ph * 0.72);
            g.lineTo(x + pw * 0.05, hz - ph * 0.66);
            g.lineTo(x - pw * 0.04, hz - ph * 0.74);
            g.fill();
          }
        };
        peaks(0.15, 60, 46, "#6c7aa0", "#f4f7ff", 3);
        peaks(0.4, 40, 26, "#4d5a7e", "#e2e9f7", 11);
        ridge(0.7, "#2d5a4a", 4, 0.05, 2, 0.13);
      }
    } else {
      // neon strip: purple ridges and a lit-up skyline
      ridge(0.4, "#2a0f4e", 12, 0.021, 4, 0.057);
      const bw = 16;
      const cs = (-this.bgX * 0.9) / u;
      for (let i = Math.floor(cs / bw) - 1; i < Math.floor(cs / bw) + W / u / bw + 2; i++) {
        if (hash(i + 500) < 0.3) continue;
        const h = Math.round((5 + Math.floor(hash(i) * 20)) * u);
        const x = Math.round((i * bw - cs) * u);
        if (!lit) {
          g.fillStyle = "#150a2c";
          g.fillRect(x, hz - h, Math.round((bw - 3) * u), h + 2);
        }
        g.fillStyle = hash(i + 7) > 0.5 ? "#ffd23a" : "#ff4fd8";
        for (let wy = 2 * u; wy < h - u; wy += 4 * u) if (hash(i * 31 + wy) > 0.5) g.fillRect(Math.round(x + 3 * u), Math.round(hz - h + wy), Math.round(2 * u), Math.max(1, Math.round(u)));
      }
    }
    g.globalAlpha = a;
  }

  drawGantry(g, p, name) {
    const sw = p.sw;
    if (sw < 3) return;
    const post = Math.max(1, Math.round(sw * 0.05));
    const hgt = sw * 1.05;
    const left = p.sx - sw * 1.3;
    const right = p.sx + sw * 1.3;
    const top = p.sy - hgt;
    g.fillStyle = "#2a2433";
    g.fillRect(Math.round(left), Math.round(top), post, Math.round(hgt));
    g.fillRect(Math.round(right - post), Math.round(top), post, Math.round(hgt));
    const txt = gantryText(name);
    const bw = Math.min(right - left, sw * 2);
    const bh = (bw * txt.height) / txt.width;
    g.fillStyle = "#0b0618";
    g.fillRect(Math.round(left), Math.round(top), Math.round(right - left), Math.max(1, Math.round(bh * 0.25)));
    g.drawImage(txt, Math.round(p.sx - bw / 2), Math.round(top), Math.round(bw), Math.round(bh));
  }

  drawCar(g, r, p, rel, lights) {
    const { u } = this;
    if (!p || p.hidden) { r.box = null; return; }
    const frame = r.frames[Math.abs(Math.floor(r.wheel || 0)) % 2];
    const s = Math.max(0.25, this.carPx * rel);
    const w = frame.width * s;
    const h = frame.height * s;
    const bounce = Math.sin(this.time * 24 + r.lane * 5) > 0.6 && this.speed > 0.1 ? Math.round(u) : 0;
    const lift = this.calm ? 0 : Math.sin((1 - r.lift) * Math.PI) * r.lift * h * 0.25;
    const jitter = this.revT > 0 && !this.calm ? Math.round((Math.random() - 0.5) * 2 * u) : 0;
    const cx = p.sx + p.sw * r.lane + r.drift * this.W * rel;
    const bottom = Math.round(p.sy - lift - bounce + jitter);
    const left = Math.round(cx - w / 2);
    r.box = { x: left, y: bottom, w, h };

    // afterimages, closer to the camera than the car as it shoots up the road
    r.trail.forEach((b, i) => {
      g.globalAlpha = 0.2 - i * 0.035;
      g.drawImage(frame, b.x - (i + 1) * 2 * u, b.y - b.h + (i + 1) * 5 * u, b.w + (i + 1) * 4 * u, b.h + (i + 1) * 3 * u);
    });
    g.globalAlpha = 1;

    // shadow
    g.fillStyle = "rgba(0,0,0,0.4)";
    g.fillRect(left + Math.round(w * 0.06), bottom - Math.max(1, Math.round(s)), Math.round(w * 0.88), Math.max(2, Math.round(s * 2)));

    // nitro flames out of both exhausts, towards the camera
    if (r.nitro && r.boost > 0.05) {
      const fl = (6 + Math.random() * 8 + r.boost * 6) * rel;
      for (const fx of [left + w * 0.2, left + w * 0.8]) {
        const fy = bottom - h * 0.2;
        const fw = Math.max(2, s * 2.4);
        g.fillStyle = "#ff8a2e";
        g.fillRect(Math.round(fx - fw / 2), Math.round(fy), Math.round(fw), Math.round(fl));
        g.fillStyle = "#4fd1ff";
        g.fillRect(Math.round(fx - fw / 3), Math.round(fy), Math.round((fw * 2) / 3), Math.round(fl * 0.7));
        g.fillStyle = "#ffffff";
        g.fillRect(Math.round(fx - fw / 6), Math.round(fy), Math.max(1, Math.round(fw / 3)), Math.round(fl * 0.35));
      }
    }

    // lean into bends
    const roll = this.calm ? 0 : clamp(-curveAt(p.i) * 0.016, -0.07, 0.07);
    g.save();
    g.translate(cx, bottom);
    g.rotate(roll);
    g.drawImage(frame, Math.round(-w / 2), Math.round(-h), Math.round(w), Math.round(h));
    g.restore();
    lights.push({ r, cx, bottom, w, h, s, roll });

    // name tag, in the chunky pixel font
    const ts = Math.max(1, Math.round(u));
    const tw = (r.label.length * 4 + 3) * ts;
    const tx = Math.round(cx - tw / 2);
    const ty = Math.round(bottom - h - 10 * ts);
    g.fillStyle = r.color;
    g.fillRect(tx, ty, tw, 7 * ts);
    g.fillRect(tx + (tw >> 1) - ts, ty + 7 * ts, 2 * ts, 2 * ts);
    g.save();
    g.translate(tx + 2 * ts, ty + ts);
    g.scale(ts, ts);
    pixelText(g, r.label, 0, 0);
    g.restore();
  }

  // headlight beams up the road at night, tail lights that glow when boosting or in the dark
  drawLights(g, lights, night) {
    const { u } = this;
    for (const L of lights) {
      const { r, cx, bottom, w, h, s } = L;
      if (night > 0.2 || this.wx.fog > 0.3) {
        const amt = Math.max(night, this.wx.fog * 0.7);
        const nearY = bottom - h * 0.5;
        const farY = Math.max(this.horizon, bottom - (bottom - this.horizon) * 0.62);
        g.save();
        g.beginPath();
        g.rect(0, 0, this.W, this.H);
        for (const o of lights) g.rect(o.cx - o.w / 2, o.bottom - o.h, o.w, o.h); // not over the cars themselves
        g.clip("evenodd");
        g.fillStyle = `rgba(255,244,200,${(0.14 * amt).toFixed(3)})`;
        g.beginPath();
        g.moveTo(cx - w * 0.42, nearY);
        g.lineTo(cx + w * 0.42, nearY);
        g.lineTo(cx + w * 0.9, farY);
        g.lineTo(cx - w * 0.9, farY);
        g.fill();
        g.restore();
      }
      const tail = Math.max(night * 0.8, r.boost > 0.3 ? 0.6 : 0, this.wx.fog * 0.5, this.wx.rain * 0.5);
      if (tail > 0.05) {
        const ty = bottom - h * 0.52;
        g.fillStyle = `rgba(255,59,59,${(0.35 * tail).toFixed(3)})`;
        for (const tx of [cx - w * 0.4, cx + w * 0.4]) {
          const rad = Math.max(1 * u, Math.round(s * 1.5));
          g.fillRect(Math.round(tx - rad), Math.round(ty - rad), rad * 2, rad * 2);
        }
      }
    }
  }

  // Deep Cut and up: a wave of neon races down the rumble strips and lane lines
  drawRoadGlow(g, pts) {
    const a = Math.min(1, this.glow);
    for (let n = 1; n < DRAW; n++) {
      const p = pts[n - 1];
      const q = pts[n];
      if (q.hidden || p.hidden) continue;
      const wave = 0.5 + 0.5 * Math.sin(q.i * 0.5 - this.time * 18);
      const hue = this.calm ? 300 : (q.i * 9 - this.time * 360) % 360;
      g.fillStyle = `hsla(${mod(hue, 360).toFixed(0)},100%,60%,${(a * (0.25 + wave * 0.55)).toFixed(3)})`;
      for (const sgn of [-1, 1]) {
        quadAt(g, p.sx + sgn * p.sw * 1.07, p.sy, p.sw * 0.07, q.sx + sgn * q.sw * 1.07, q.sy, q.sw * 0.07);
      }
      if (Math.floor(q.i / 4) % 2) quadAt(g, p.sx, p.sy, p.sw * 0.03, q.sx, q.sy, q.sw * 0.03);
    }
  }

  // One in a Vroomillion: rainbow rings rush out of the horizon around the road
  drawTunnel(g, pts) {
    const a = Math.min(1, this.tunnel);
    for (let ring = 0; ring < 6; ring++) {
      const n = Math.floor(mod(ring * 13 - this.time * 30, 78)) + 10;
      const p = pts[n];
      if (!p || p.hidden) continue;
      const wHalf = p.sw * 1.6;
      const hgt = p.sw * 1.9;
      const th = Math.max(1, p.sw * 0.06);
      // rings fade in at the horizon and out again before they reach the cars
      const fadeIn = clamp((90 - n) / 20, 0, 1) * clamp((n - 10) / 14, 0, 1);
      g.strokeStyle = `hsla(${((p.i * 36) % 360).toFixed(0)},100%,62%,${(a * fadeIn * 0.85).toFixed(3)})`;
      g.lineWidth = th;
      g.strokeRect(Math.round(p.sx - wHalf), Math.round(p.sy - hgt), Math.round(wHalf * 2), Math.round(hgt));
    }
  }

  drawWeather(g) {
    const { u } = this;
    if (!this.drops.length) return;
    const speed = this.speed;
    // rain as short pixel dashes
    g.fillStyle = "rgba(200,212,255,0.6)";
    for (const d of this.drops) {
      if (d.type !== "rain") continue;
      g.fillRect(Math.round(d.x), Math.round(d.y), 1, Math.round((3 + speed * 4) * d.s));
    }
    for (const d of this.drops) {
      if (d.type === "snow") {
        const sz = Math.max(1, Math.round(u * d.s * 1.4));
        g.fillStyle = d.s > 1 ? "#ffffff" : "#dfe6f5";
        g.fillRect(Math.round(d.x), Math.round(d.y), sz, sz);
      } else if (d.type === "sand") {
        g.fillStyle = d.s > 1 ? "rgba(246,206,140,0.7)" : "rgba(214,150,90,0.5)";
        g.fillRect(Math.round(d.x), Math.round(d.y), Math.round((6 + speed * 14) * u * d.s), Math.max(1, Math.round(u * 0.6)));
      }
    }
  }

  // speed lines and warp streaks rushing out from the horizon
  drawStreaks(g) {
    if (this.calm) return;
    const { W, H, u } = this;
    const vx = W / 2;
    const vy = this.horizon;
    const maxR = Math.hypot(W, H);
    const draw = (count, alpha, colours, lenScale, rate) => {
      for (let i = 0; i < count; i++) {
        const ang = hash(i * 2.3) * Math.PI * 2;
        const t = mod(this.time * rate * (0.6 + hash(i * 4.1)) + hash(i * 9.7), 1);
        const d0 = t * t * maxR;
        const len = (8 + t * 60) * lenScale * u;
        g.fillStyle = colours[i % colours.length];
        g.globalAlpha = alpha * Math.min(1, t * 3);
        const cos = Math.cos(ang);
        const sin = Math.sin(ang) * 0.8;
        for (let k = 0; k < len; k += 2) g.fillRect(Math.round(vx + cos * (d0 + k)), Math.round(vy + sin * (d0 + k)), 1, 1);
      }
      g.globalAlpha = 1;
    };
    if (this.speed > 0.45) draw(Math.round(10 + this.speed * 24), 0.55, ["#ffffff"], this.speed, 0.8 + this.speed);
    if (this.warp > 0) draw(40, Math.min(1, this.warp) * 0.85, ["#ff4fd8", "#4fd1ff", "#ffd23a", "#ffffff", "#5dff8f"], 1.6, 1.8);
  }
}

function hsl(h, s, l) {
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

function quad(g, x1, y1, w1, x2, y2, w2, colour) {
  g.fillStyle = colour;
  quadAt(g, x1, y1, w1, x2, y2, w2);
}

// fills with the current fillStyle (or sets it first when given one)
function quadAt(g, x1, y1, w1, x2, y2, w2, colour) {
  if (colour) g.fillStyle = colour;
  g.beginPath();
  g.moveTo(Math.round(x1 - w1), Math.round(y1));
  g.lineTo(Math.round(x1 + w1), Math.round(y1));
  g.lineTo(Math.round(x2 + w2), Math.round(y2));
  g.lineTo(Math.round(x2 - w2), Math.round(y2));
  g.closePath();
  g.fill();
}
