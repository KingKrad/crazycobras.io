// Behind-the-car race view: an arcade-style road that curves and rolls over hills,
// drawn segment by segment from the horizon towards the camera.
//
// The world reacts to the race. Distance driven (the leader's, adjusted for car power)
// moves you through zones (city, coast, desert, mountains, neon strip), from sunrise
// through sunset to night, with weather rolling in. Deep Cuts light the road up and
// a One in a Vroomillion sends you down a rainbow tunnel.
//
// Art is 16-bit arcade: a canvas at twice the old resolution scaled up with hard pixels, smooth
// gradient skies with parallax mountains, and sprites smoothed with Scale2x (rounded diagonals,
// more detail) plus soft shading on the cars.
import { rearSprite } from "./cars.js";
import { drawClouds, drawSkyLife, skyShow, drawSkyShow, drawFireworks, MOUNTAINS, drawLandmark, bits, GROUND, updateTraffic, trafficSprite } from "./scenery.js";
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
// canvas filters (for the glow pass) aren't in every browser
const CAN_FILTER = typeof CanvasRenderingContext2D !== "undefined" && "filter" in CanvasRenderingContext2D.prototype;

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
  // ---- destinations: where a race ends up (see DESTINATIONS in logic.js) ----
  { id: "scrap", name: "THE SCRAPYARD", verge: ["#6b5a45", "#625240"], road: ["#3a3530", "#403a34"], rumble: ["#c9b38a", "#7a5530"], line: "#c9b38a", weather: ["clear"] },
  { id: "town", name: "SLEEPY TOWN", verge: ["#4f9a3c", "#468d35"], road: ["#3a3a46", "#40404c"], rumble: ["#f4f4f4", "#d9363e"], line: "#f4f4f4", weather: ["clear"] },
  { id: "beach", name: "BEACH BOARDWALK", verge: ["#f2dca0", "#ead293"], road: ["#3a3a48", "#41414f"], rumble: ["#f4f4f4", "#ff5e8a"], line: "#ffd23a", weather: ["clear"] },
  { id: "monaco", name: "MONACO HARBOUR", verge: ["#d9d2c0", "#cfc7b3"], road: ["#2f2f3a", "#363642"], rumble: ["#f4f4f4", "#e0201b"], line: "#f4f4f4", weather: ["clear"] },
  { id: "summit", name: "MOUNTAIN SUMMIT", verge: ["#eef3fb", "#e1e8f5"], road: ["#363846", "#3c3e4d"], rumble: ["#f4f4f4", "#3a7bd5"], line: "#ffd23a", weather: ["snow"] },
  { id: "volcano", name: "THE VOLCANO", verge: ["#2b2222", "#332828"], road: ["#1e1a1a", "#241f1f"], rumble: ["#ff6a2e", "#ffd23a"], line: "#ff6a2e", weather: ["ash"] },
  { id: "moon", name: "THE MOON", verge: ["#8a8a94", "#7f7f89"], road: ["#3d3d45", "#44444d"], rumble: ["#f4f4f4", "#8a8a94"], line: "#ffffff", weather: ["clear"] },
  { id: "gold", name: "VROOMILLION CITY", verge: ["#b8860b", "#a87a0a"], road: ["#2a1f05", "#33260a"], rumble: ["#ffd23a", "#fff3a0"], line: "#fff3a0", weather: ["clear"] },
];
const BASE_ZONES = 5; // the ones a race passes through; the rest are destinations
const zoneIndex = (id) => ZONES.findIndex((z) => z.id === id);
// destination id (logic.js) -> zone id
const DEST_ZONE = { scrapyard: "scrap", town: "town", beach: "beach", city: "city", monaco: "monaco", summit: "summit", volcano: "volcano", moon: "moon", vroomcity: "gold" };
// each destination has its own sky; null = the time of day it would be anyway
const DEST_SKY = {
  scrap: { sky: ["#5b6680", "#7f8aa3", "#a9b2c4", "#d0d5df"], tint: ["#8a7a5a", 0.08], stars: 0, sun: 0.35, lamps: 0 },
  town: { sky: ["#2a6ad0", "#4b8fe6", "#8cc4f4", "#d4ecff"], tint: ["#ffffff", 0], stars: 0, sun: 0.7, lamps: 0 },
  beach: { sky: ["#1f7bd8", "#3da0ee", "#7fd0f8", "#d6f4ff"], tint: ["#ffffff", 0], stars: 0, sun: 0.8, lamps: 0 },
  city: { sky: ["#0b0b28", "#1d1648", "#3d2160", "#62305f"], tint: ["#14194a", 0.22], stars: 0.6, sun: -0.3, lamps: 1 },
  monaco: { sky: ["#2b1652", "#7a2b6e", "#ff6a4d", "#ffb35c"], tint: ["#ff6a2e", 0.08], stars: 0.1, sun: 0.12, lamps: 0.6 },
  summit: { sky: ["#1b4fae", "#3f7fd8", "#9cc6f0", "#e8f3ff"], tint: ["#ffffff", 0], stars: 0, sun: 0.85, lamps: 0 },
  volcano: { sky: ["#1a0505", "#4a0f0a", "#a8321a", "#ff7a2e"], tint: ["#ff3b1a", 0.12], stars: 0.15, sun: -0.3, lamps: 0.8 },
  moon: { sky: ["#000000", "#03030a", "#07071a", "#0c0c22"], tint: ["#2a2a50", 0.1], stars: 1, sun: -0.5, lamps: 0.7, noMoon: true },
  gold: { sky: ["#2a0b5e", "#8a1fa8", "#ff4fd8", "#ffd23a"], tint: ["#ffb000", 0.06], stars: 0.6, sun: -0.3, lamps: 1 },
};
function mixTod(a, b, t) {
  return {
    sky: a.sky.map((c, i) => mixC(c, b.sky[i], t)),
    tint: mixC(a.tint, b.tint, t),
    tintA: a.tintA + (b.tintA - a.tintA) * t,
    stars: a.stars + (b.stars - a.stars) * t,
    sun: a.sun + (b.sun - a.sun) * t,
    lamps: a.lamps + (b.lamps - a.lamps) * t,
    noMoon: t > 0.5 ? b.noMoon : a.noMoon,
  };
}
const skyOf = (d) => ({ sky: d.sky.map(rgb), tint: rgb(d.tint[0]), tintA: d.tint[1], stars: d.stars, sun: d.sun, lamps: d.lamps, noMoon: !!d.noMoon });
// A rare answer changes the light for a few seconds: electric blue dusk (rare), a neon night (ultra rare),
// a gold-and-green aurora (legendary).
const RARE_SKY = {
  3: skyOf({ sky: ["#04103a", "#0b2f8a", "#2f7bff", "#9fd0ff"], tint: ["#2f6bff", 0.22], stars: 0.6, sun: -0.3, lamps: 1 }),
  4: skyOf({ sky: ["#12002a", "#3d0a6e", "#9b2fe0", "#ff6ad8"], tint: ["#a040ff", 0.26], stars: 0.9, sun: -0.3, lamps: 1 }),
  5: skyOf({ sky: ["#05140f", "#0f5a3a", "#3fe08a", "#ffd23f"], tint: ["#ffc21a", 0.2], stars: 1, sun: -0.3, lamps: 1 }),
};

// CHRISTMAS (main.js sets it while the event is on): ordinary weather turns to snow (not the desert's
// sand, the volcano's ash or the Moon)
let FESTIVE = false;
export const setFestive = (on) => { FESTIVE = !!on; };
const fest = (w, zone) => (FESTIVE && (w === "clear" || w === "rain") && !["desert", "volcano", "moon"].includes(ZONES[zone]?.id) ? "snow" : w);
const FOG = { clear: "#c8b8d8", fog: "#cfd5e2", rain: "#606a86", snow: "#e6ecf7", sand: "#e3a965", ash: "#5a3a30" };

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

// Scale2x (EPX): doubles a sprite, rounding off stair-step diagonals the way 16-bit era upscalers did.
// Drawn into the same box on screen, it adds detail instead of size. passes = 2 gives Scale4x.
const smoothCache = new Map();
function smooth2x(src, passes = 1) {
  let byPass = smoothCache.get(src);
  if (!byPass) { byPass = []; smoothCache.set(src, byPass); }
  if (byPass[passes]) return byPass[passes];
  let cur = src;
  for (let n = 0; n < passes; n++) {
    const w = cur.width, h = cur.height;
    if (w * h > 160000) break; // big enough already
    const id = cur.getContext("2d").getImageData(0, 0, w, h);
    const a = new Uint32Array(id.data.buffer);
    const out = new ImageData(w * 2, h * 2);
    const o = new Uint32Array(out.data.buffer);
    const at = (x, y) => a[clamp(y, 0, h - 1) * w + clamp(x, 0, w - 1)];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const P = a[y * w + x], A = at(x, y - 1), B = at(x + 1, y), C = at(x - 1, y), D = at(x, y + 1);
        let e0 = P, e1 = P, e2 = P, e3 = P;
        if (A !== D && C !== B) {
          if (C === A) e0 = A;
          if (A === B) e1 = B;
          if (D === C) e2 = C;
          if (B === D) e3 = D;
        }
        const i = y * 2 * w * 2 + x * 2;
        o[i] = e0; o[i + 1] = e1; o[i + w * 2] = e2; o[i + w * 2 + 1] = e3;
      }
    }
    const cv = document.createElement("canvas");
    cv.width = w * 2;
    cv.height = h * 2;
    cv.getContext("2d").putImageData(out, 0, 0);
    cur = cv;
  }
  byPass[passes] = cur;
  return cur;
}

// A car frame, smoothed, with 16-bit style shading: light falls from above, the lower body darkens,
// and a soft glossy band runs across the boot.
const carCache = new Map();
function carArt(frame) {
  if (carCache.has(frame)) return carCache.get(frame);
  const src = smooth2x(frame, 2);
  const cv = document.createElement("canvas");
  cv.width = src.width;
  cv.height = src.height;
  const g = cv.getContext("2d");
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = "source-atop";
  const sh = g.createLinearGradient(0, 0, 0, cv.height);
  sh.addColorStop(0, "rgba(255,255,255,0.16)");
  sh.addColorStop(0.38, "rgba(255,255,255,0.04)");
  sh.addColorStop(0.42, "rgba(255,255,255,0.2)");
  sh.addColorStop(0.47, "rgba(255,255,255,0)");
  sh.addColorStop(0.75, "rgba(0,0,20,0.08)");
  sh.addColorStop(1, "rgba(0,0,20,0.32)");
  g.fillStyle = sh;
  g.fillRect(0, 0, cv.width, cv.height);
  const side = g.createLinearGradient(0, 0, cv.width, 0);
  side.addColorStop(0, "rgba(0,0,20,0.18)");
  side.addColorStop(0.2, "rgba(0,0,20,0)");
  side.addColorStop(0.8, "rgba(0,0,20,0)");
  side.addColorStop(1, "rgba(0,0,20,0.22)");
  g.fillStyle = side;
  g.fillRect(0, 0, cv.width, cv.height);
  carCache.set(frame, cv);
  return cv;
}

// A city block, drawn straight at full detail, with a matching canvas of lit windows for night.
function building(seed, palette) {
  const w = 14 + Math.floor(hash(seed) * 3) * 4;
  const h = 30 + Math.floor(hash(seed + 1) * 34);
  const body = (palette || ["#7b7f93", "#8a6f6a", "#6a7d8f", "#9a8f7a", "#5f6478", "#7a6a8a"])[seed % 6];
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
  S.buildings = [0, 1, 2, 3, 4, 5].map((n) => building(n));
  S.goldTowers = [0, 1, 2, 3, 4, 5].map((n) => building(n + 11, ["#d4a017", "#e8b923", "#c9971a", "#f0c419", "#b8860b", "#ffd23a"]));
  S.whiteBlocks = [0, 1, 2, 3, 4, 5].map((n) => building(n + 3, ["#f2ede0", "#e8dcc6", "#f7e7d0", "#efe4d6", "#ffffff", "#e6d5bd"]));
  S.tyres = outline(pixelCanvas([
    ".KKKKKK.",
    "KGKKKKGK",
    ".KKKKKK.",
    ".KKKKKK.",
    "KGKKKKGK",
    ".KKKKKK.",
    ".KKKKKK.",
    "KGKKKKGK",
    ".KKKKKK.",
  ], { K: "#1d1d24", G: "#4a4a55" }));
  S.wreck = outline(pixelCanvas([
    "....RRRRRRR.......",
    "...RWWRRRWWR......",
    "..RRRRRRRRRRRRRR..",
    ".RRrRRRRRRrRRRRRR.",
    "RRRRRRRRRRRRRRRRRR",
    "RrRRRRrRRRRRRrRRRR",
    "..KK........KK....",
  ], { R: "#8a4a2a", r: "#5a2e1a", W: "#3a4a5a", K: "#1d1d24" }));
  S.house = outline(pixelCanvas([
    "......RR......",
    ".....RRRR.....",
    "....RRRRRR....",
    "...RRRRRRRR...",
    "..RRRRRRRRRR..",
    ".RRRRRRRRRRRR.",
    "..WWWWWWWWWW..",
    "..WBBWWWWBBW..",
    "..WBBWWWWBBW..",
    "..WWWWDDWWWW..",
    "..WWWWDDWWWW..",
    "..WWWWDDWWWW..",
  ], { R: "#c0392b", W: "#f4ecd8", B: "#5b8fd8", D: "#6a4428" }));
  S.church = outline(pixelCanvas([
    "...Y...",
    "..YYY..",
    "...W...",
    "..WWW..",
    "..WWW..",
    ".RRRRR.",
    "RRRRRRR",
    ".WWWWW.",
    ".WBWBW.",
    ".WWWWW.",
    ".WBWBW.",
    ".WWDWW.",
    ".WWDWW.",
  ], { Y: "#ffd23a", W: "#f4ecd8", R: "#6a6a7a", B: "#5b8fd8", D: "#6a4428" }));
  S.umbrella = outline(pixelCanvas([
    "..RWRWRWR..",
    ".RWRWRWRWR.",
    "RWRWRWRWRWR",
    ".....P.....",
    ".....P.....",
    ".....P.....",
    ".....P.....",
    "....PPP....",
  ], { R: "#ff4f6a", W: "#f4f4f4", P: "#8a6a4a" }));
  S.flag = outline(pixelCanvas([
    "PRRRRRRR",
    "PRWWWWRR",
    "PRRRRRRR",
    "PRWWWWRR",
    "PRRRRRRR",
    "P.......",
    "P.......",
    "P.......",
    "P.......",
    "P.......",
    "PP......",
  ], { P: "#d7d3ea", R: "#ff4fd8", W: "#ffd23a" }));
  S.ember = outline(pixelCanvas([
    "..RRRR..",
    ".RrrRRR.",
    "RRrRRRDR",
    "RRRRDDDD",
    "DRRDDDDD",
  ], { R: "#3a2a2a", r: "#ff6a2e", D: "#221818" }));
  S.goldLamp = outline(pixelCanvas([
    "LLLL..",
    "GGGGG.",
    "....G.", "....G.", "....G.", "....G.", "....G.", "....G.", "....G.",
    "....G.", "....G.", "....G.", "....G.", "....G.", "....G.", "....G.",
    "...GGG",
  ], { L: "#fff3a0", G: "#d4a017" }));
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

// ---- the answer card the car smashes through ----
// rarity colours (style.css --t0..--t5): gray, gray-white, green, blue, purple, gold
const TIER_COL = ["#6f6a80", "#c4c1d4", "#5dff8f", "#4f9dff", "#c070ff", "#ffd23f"];
const CARD_FONT = '"Bungee", "Space Grotesk", sans-serif';
if (typeof document !== "undefined" && document.fonts) document.fonts.load('20px "Bungee"').catch(() => {});

// card: { who, answer, tierName, gain, tier, color }; maxW in canvas pixels; cssPx: screen pixels per
// canvas pixel; R: device pixels per canvas pixel. Returns { lo, hi }: the card at the scene's pixel
// size (for the shards it breaks into) and at full screen resolution, so the lettering is smooth.
function buildCard(card, maxW, cssPx = 1, R = 1) {
  const plain = (t) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7e]/g, "").toUpperCase();
  const m = document.createElement("canvas").getContext("2d");
  const measure = (t, size) => { m.font = `${size}px ${CARD_FONT}`; return m.measureText(t).width; };
  // sizes in canvas pixels: the small rows read at about 13 screen pixels, the answer at about 30
  const small = 13 / cssPx;
  const room = maxW - 16;
  const fit = (text, size) => {
    let t = plain(text);
    while (measure(t, size) > room && t.length > 3) t = t.slice(0, -2).trimEnd() + ".";
    return t;
  };
  const ans = plain(card.answer);
  let big = 30 / cssPx;
  while (big > small * 1.2 && measure(ans, big) > room) big *= 0.92;
  const rows = [];
  if (card.who) rows.push({ t: plain(card.who), size: small, col: card.color });
  rows.push({ t: fit(ans, big), size: big, col: "#ffffff" });
  rows.push({ t: fit(card.tierName, small), size: small, col: TIER_COL[card.tier] });
  rows.push({ t: plain(card.gain), size: small, col: card.tier ? "#ffd23a" : "#a9a4ba" });
  for (const r of rows) { r.w = measure(r.t, r.size); r.h = r.size * 1.05; }
  const pad = Math.round(5 + small * 0.5);
  const gap = Math.round(small * 0.45);
  const w = Math.ceil(Math.max(...rows.map((r) => r.w)) + pad * 2);
  const h = Math.ceil(rows.reduce((a, r) => a + r.h, 0) + gap * (rows.length - 1) + pad * 2);
  const paint = (scale) => {
    const cv = document.createElement("canvas");
    cv.width = Math.round(w * scale);
    cv.height = Math.round(h * scale);
    const g = cv.getContext("2d");
    g.scale(scale, scale);
    g.fillStyle = "#0b0618";
    g.fillRect(0, 0, w, h);
    // tinted with the tier colour, so the shards are colourful when it breaks
    g.fillStyle = card.tier === 5 ? "#3a1068" : css(mixC(rgb(TIER_COL[card.tier]), [16, 9, 36], 0.72));
    g.fillRect(2, 2, w - 4, h - 4);
    if (card.tier === 5) {
      const hues = ["#ff4fd8", "#ffd23a", "#5dff8f", "#4fd1ff", "#b388ff"];
      for (let x = 0; x < w; x += 4) { g.fillStyle = hues[(x / 4) % hues.length]; g.fillRect(x, 0, 4, 2); g.fillRect(x, h - 2, 4, 2); }
      for (let y = 0; y < h; y += 4) { g.fillStyle = hues[(y / 4) % hues.length]; g.fillRect(0, y, 2, 4); g.fillRect(w - 2, y, 2, 4); }
    } else {
      g.fillStyle = TIER_COL[card.tier];
      g.fillRect(0, 0, w, 2); g.fillRect(0, h - 2, w, 2); g.fillRect(0, 0, 2, h); g.fillRect(w - 2, 0, 2, h);
    }
    g.textBaseline = "top";
    g.textAlign = "center";
    let y = pad;
    for (const r of rows) {
      g.font = `${r.size}px ${CARD_FONT}`;
      const off = Math.max(1, r.size * 0.07);
      g.fillStyle = "#05020c";
      g.fillText(r.t, w / 2 + off, y + off);
      g.fillStyle = r.col;
      g.fillText(r.t, w / 2, y);
      y += r.h + gap;
    }
    return cv;
  };
  const hi = paint(Math.max(1, R));
  const lo = document.createElement("canvas");
  lo.width = w;
  lo.height = h;
  const lg = lo.getContext("2d");
  lg.imageSmoothingEnabled = true;
  lg.drawImage(hi, 0, 0, w, h);
  return { lo, hi };
}

// how hard each tier hits: shard size, launch speed, how much shards fly at the camera
// exhaust fire by tier: [outer, middle, core] colours and length as a share of the car's height
const FIRE = [null, null, ["#1f9a4a", "#5dff8f", "#e6ffe9"], ["#1f4fd6", "#4f9dff", "#dceaff"], ["#7a2fd6", "#c070ff", "#f3e3ff"], ["#ff9a1f", "#ffd23f", "#ffffff"]];
const FIRE_LEN = [0, 0, 0.22, 0.4, 0.6, 0.85];
// an electric car (AMELIA'S TESSY) shoots plasma and lasers instead: [outer, middle, core] by tier
const PLASMA = [null, null, ["#0d6b8a", "#2fd8ff", "#e6fdff"], ["#2a3bd6", "#5d8bff", "#e8eeff"], ["#8a1fd6", "#ff4fd8", "#ffe6fb"], ["#00b3ff", "#ff4fd8", "#ffffff"]];
const SPARK = ["#2fd8ff", "#ff4fd8", "#ffffff", "#9d7bff"];
const elec = (r) => r?.car?.electric === true;
// ZIG'S WHIP: red, gold and green exhaust, and music notes that bob up out of the pipes
const RASTA = ["#e0201b", "#ffd23a", "#1fae4a"];
const RASTA_FLAME = ["#1fae4a", "#ffd23a", "#fff2b0"];
const noteParticle = (x, y, u) => ({ x: x + (Math.random() - 0.5) * 8 * u, y, vx: (Math.random() - 0.5) * 50 * u, vy: -(25 + Math.random() * 45) * u, life: 1 + Math.random() * 0.6, size: Math.max(2, 2.2 * u), color: Math.random() < 0.25 ? "#ffffff" : RASTA[Math.floor(Math.random() * 3)], g: -6 * u, note: Math.random() < 0.5 ? 1 : 2, wob: Math.random() * 6 });

// rare answers build up before they're revealed: the card hides its tier, shakes and glows up the
// rarity colours (seconds, by effect tier)
const BUILD = [0, 0, 0, 0.75, 1.1, 1.6];
// sparks in the tier colour when the car smashes through
const BURST = [0, 0, 26, 44, 70, 110];
const SMASH = [
  null,
  { tile: 9, speed: 55, grow: 0, accel: 30 },
  { tile: 7, speed: 95, grow: 0.25, accel: 38 },
  { tile: 5, speed: 150, grow: 0.55, accel: 50 },
  { tile: 5, speed: 230, grow: 0.95, accel: 64 },
  { tile: 4, speed: 340, grow: 1.5, accel: 85 },
];

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
    this.parked = false; // the title screen: the car waits on the line, the road doesn't move
    this.todBase = 0; // where in the day the sky starts (the title screen follows the real clock)
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
    this.smashes = [];
    this.shards = [];
    this.slowmo = 0;
    this.rareFx = null; // { tier, t, dur }: tint, light, zoom and rays for a rare answer
    this.zoom = 0;
    this.onEvent = null;
    this.calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.resetWorld();
    this.resize(400, 250, 220);
  }

  // carBottom: canvas y where the nearest car's tyres should sit (above the answer bar).
  // glide: same size, new car position: ease there over a moment instead of jumping (title -> race)
  resize(w, h, carBottom = h - 12, glide = false) {
    w = Math.max(160, Math.round(w));
    h = Math.max(110, Math.round(h));
    if (glide && w === this.W && h === this.H && this.carBottom) { this.glideTo = Math.round(carBottom); return; }
    const same = w === this.W && h === this.H;
    if (same && Math.round(carBottom) === this.carBottom) return;
    this.glideTo = null;
    this.W = w;
    this.H = h;
    this.u = w >= 400 ? 2 : 1; // canvas pixels per art pixel: race canvases run at twice the art resolution
    this.horizon = Math.round(Math.min(h * 0.42, carBottom - h * 0.3));
    this.carBottom = Math.round(carBottom);
    // canvas px per sprite px for the nearest car: about 15% of the width, a quarter to two fifths
    // smaller than before, so you see more road around it
    this.carPx = Math.max(1, (w * 0.15) / 40);
    if (same) return;
    this.canvas.width = w;
    this.canvas.height = h;
    this.layer.width = w;
    this.layer.height = h;
    this.g.imageSmoothingEnabled = false;
    this.wg.imageSmoothingEnabled = false;
  }

  resetWorld() {
    this.seed = Math.random() * 1000;
    const first = FESTIVE ? zoneIndex("alpine") : Math.floor(hash(this.seed) * BASE_ZONES); // at Christmas the title waits on the snowy Mountain Pass
    this.zones = [{ zone: first, start: -Infinity, weather: fest("clear", first) }]; // the first stretch is always dry (or snowy, at Christmas)
    this.progress = 0;
    this.shown = 0; // the zone entry the camera is in
    this.fade = 1; // 0→1 crossfade of skyline into the camera's zone
    this.prevZone = first;
    this.wx = { rain: 0, snow: 0, sand: 0, fog: 0, ash: 0 };
    this.arrival = null; // { zone, t }: the race is over and the road becomes its destination
    this.drops = [];
    this.tod = timeOfDay(0);
    // scenery: banners left by rare answers stay for the race; traffic, crowds, sky shows
    this.banners = [];
    this.traffic = [];
    this.fireworks = [];
    this.aurora = 0;
    this.comet = 0;
    this.cheer = 0;
    this.cheerTier = 0;
    this.worldFx = null;
  }

  // keepWorld: the race starts right where the title screen's car was waiting (same road, same sky)
  setRacers(list, keepWorld = false) {
    this.racers = list.map((r, i) => ({
      ...r,
      frames: [rearSprite(r.car, 0), rearSprite(r.car, 1)],
      lane: list.length === 1 ? LANES.solo : LANES[i],
      dist: 0, boost: 0, nitro: false, gap: 0, wheel: 0, lift: 0, drift: 0,
      trail: [], tier: 0, launchT: 0, box: null, charge: 0, chargeV: 0, fireTier: 0, fireT: 0, fireMax: 0, popT: 0, sputterT: 0,
    }));
    this.kick = 0;
    this.warp = 0;
    this.stretch = 0;
    this.glow = 0;
    this.tunnel = 0;
    this.particles = [];
    this.smashes = [];
    this.shards = [];
    this.slowmo = 0;
    this.rareFx = null;
    this.zoom = 0;
    if (this.smashDone) { this.smashDone(); this.smashDone = null; }
    if (keepWorld) { this.progress = 0; this.arrival = null; } else this.resetWorld();
  }

  rev(seconds) {
    this.revT = seconds;
  }

  // seconds: how long the boost lasts, so the exhaust fire burns for the whole run
  launch(i, tier, nitro, seconds = 2.5) {
    const r = this.racers[i];
    if (!r || !r.box) return;
    const { x, y, w } = r.box;
    const u = this.u;
    r.tier = tier;
    r.launchT = 0.7;
    if (tier === 0) {
      this.cheer = Math.max(this.cheer, 2); this.cheerTier = Math.max(i === 0 ? 0 : this.cheerTier, 0); // the crowd goes quiet
      // STALLED: the engine coughs black smoke out of the exhausts
      r.sputterT = 0.9;
      for (let k = 0; k < 14; k++) {
        this.particles.push({ x: x + w * 0.2 + Math.random() * w * 0.6, y: y - 4 * u, vx: (Math.random() - 0.5) * 30 * u, vy: (-10 - Math.random() * 20) * u, life: 1.2, size: 3 * u, grow: 5 * u, color: "#2b2633", g: 0 });
      }
      return;
    }
    // the world reacts: crowds cheer (or shrug), the sky puts on a show, and a rare answer leaves a banner
    this.cheer = Math.max(this.cheer, 2.4);
    this.cheerTier = Math.max(i === 0 ? 0 : this.cheerTier, tier);
    skyShow(this, tier);
    if (tier >= 3 && this.banners.length < 12) this.banners.push(tier);
    if (tier >= 2 && (!this.worldFx || this.worldFx.tier <= tier)) this.worldFx = { tier, t: seconds };
    if (tier === 3) this.glow = Math.max(this.glow, 1.3); // FAST LANE: the road edges light up
    // exhaust fire: none for TRAFFIC, a flicker for CRUISING, up to a huge blast for ONE IN A VROOMILLION
    if (tier >= 2) { r.fireTier = tier; r.fireT = seconds; r.fireMax = seconds; }
    const power = [0, 0.25, 0.4, 0.6, 0.85, 1.2][tier] + (nitro ? 0.35 : 0);
    this.kick = Math.max(this.kick, power);
    r.lift = Math.min(1, 0.4 + power * 0.5);
    if (!this.calm) this.shake = Math.max(this.shake, power * 0.7);
    // tyre smoke billows back towards the camera
    for (let k = 0; k < (tier >= 2 ? 6 + tier * 2 : 10 + tier * 7); k++) {
      const side = k % 2 ? x + w * 0.12 : x + w * 0.88;
      this.particles.push({ x: side + (Math.random() - 0.5) * 6 * u, y: y - 2 * u, vx: (side < x + w / 2 ? -1 : 1) * (20 + Math.random() * 60 * power) * u, vy: (10 + Math.random() * 40) * u, life: 0.8 + Math.random() * 0.7, size: 3 * u, grow: 9 * u, color: k % 3 ? "#d9d6e8" : "#a9a4c0", g: 0, soft: true });
    }
    // sparks off the underside on fast lanes and up, in the rarity colour
    if (tier >= 3) {
      for (let k = 0; k < tier * 12; k++) {
        this.particles.push({ x: x + w * (0.25 + Math.random() * 0.5), y, vx: (Math.random() - 0.5) * 260 * u, vy: (30 + Math.random() * 120) * u, life: 0.5 + Math.random() * 0.4, size: Math.max(1, u * 0.75), color: Math.random() < 0.5 ? TIER_COL[tier] : "#ffffff", g: 220 * u, hot: true });
      }
    }
    if (tier >= 4) {
      this.flash = Math.max(this.flash, tier === 5 ? 0.7 : 0.35);
      this.flashColor = tier === 5 ? "rainbow" : TIER_COL[4];
      this.glow = Math.max(this.glow, tier === 5 ? 3.2 : 2.2);
    }
    if (tier === 5) this.tunnel = Math.max(this.tunnel, 2.8);
    if (tier === 5 || nitro) this.warp = Math.max(this.warp, tier === 5 ? 1.6 : 0.9);
  }

  // A backfire on a gear shift: the flame flares and spits sparks.
  // The big moment for a rare answer (tier 3 FAST LANE, 4 TURBO, 5 ONE IN A VROOMILLION): the world tints
  // and relights in the rarity colour, time slows and the camera pushes in. Reduced motion keeps the colour.
  rare(tier) {
    if (tier < 3) return;
    const dur = [0, 0, 0, 2.6, 3.4, 4.6][tier];
    this.rareFx = { tier, t: 0, dur, amt: 0 };
    if (this.calm) return;
    this.slowmo = Math.max(this.slowmo, [0, 0, 0, 0.2, 0.3, 0.45][tier]); // short: a long slow-motion reads as lag
    this.zoom = Math.max(this.zoom, [0, 0, 0, 0.5, 0.75, 1][tier]);
    this.shake = Math.max(this.shake, [0, 0, 0, 0.35, 0.55, 0.8][tier]);
    this.flash = Math.max(this.flash, tier === 5 ? 0.8 : 0.35);
    this.flashColor = TIER_COL[tier];
  }

  backfire(i) {
    const r = this.racers[i];
    if (!r?.box || (r.fireT <= 0 && !r.car?.v12 && !r.car?.reggae && !r.car?.megaFire)) return;
    if (r.car?.megaFire) { r.fireTier = Math.max(4, r.fireTier || 0); if (!this.calm) this.shake = Math.max(this.shake, 0.25); } // AUDI 5000: every shift is a fireball
    if (r.car?.v12 && !r.fireTier) r.fireTier = 3; // the crazy car spits flames on every shift
    if (r.car?.reggae && !r.fireTier) r.fireTier = 2; // ZIG'S WHIP puffs red, gold and green on every shift
    const u = this.u;
    r.popT = 0.14;
    if (elec(r)) r.zapT = 0.18; // a laser blast instead of a backfire
    const { x, y, w, h } = r.box;
    for (const ex of [x + w * 0.2, x + w * 0.8]) {
      for (let k = 0; k < 6 + r.fireTier * 2; k++) {
        this.particles.push({ x: ex, y: y - h * 0.15, vx: (Math.random() - 0.5) * 90 * u, vy: (40 + Math.random() * 110) * u, life: 0.25 + Math.random() * 0.25, size: Math.max(1, u), color: elec(r) ? SPARK[k % 4] : r.car?.reggae ? RASTA[k % 3] : FIRE[r.fireTier][Math.floor(Math.random() * 3)], g: elec(r) ? 0 : 160 * u, hot: true });
      }
      if (r.car?.reggae) for (let k = 0; k < 2; k++) this.particles.push(noteParticle(ex, y - h * 0.15, u));
      // AUDI 5000: a huge ball of fire rolls out of each pipe
      if (r.car?.megaFire) for (let k = 0; k < 26; k++) {
        const a = Math.random() * Math.PI, sp = (60 + Math.random() * 220) * u;
        this.particles.push({ x: ex, y: y - h * 0.15, vx: Math.cos(a) * sp * 0.8, vy: Math.sin(a) * sp, life: 0.35 + Math.random() * 0.45, size: (2 + Math.random() * 4) * u, grow: 10 * u, color: ["#ff3b1f", "#ff8a1f", "#ffd23a", "#fff4c0"][k % 4], g: -40 * u, soft: true });
      }
    }
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
    return near ? near.box.y - near.box.h - 14 * this.u : this.carBottom - this.carPx * 26;
  }

  // The race is over: the road turns into its destination (a DESTINATIONS id from logic.js).
  arrive(destId) {
    const zone = zoneIndex(DEST_ZONE[destId] || "city");
    const camSeg = Math.floor(this.camZ / SEG);
    this.zones.push({ zone, start: camSeg + 45, weather: fest(ZONES[zone].weather[0], zone) });
    this.arrival = { zone, t: 0 };
  }

  // A still of a destination, for the passport.
  preview(destId) {
    const zone = zoneIndex(DEST_ZONE[destId] || "city");
    this.zones = [{ zone, start: -Infinity, weather: fest(ZONES[zone].weather[0], zone) }];
    this.shown = 0;
    this.prevZone = zone;
    this.fade = 1;
    this.arrival = { zone, t: 10 };
    const w = fest(ZONES[zone].weather[0], zone);
    for (const k of Object.keys(this.wx)) this.wx[k] = k === w ? 1 : 0;
    this.speed = 0.4;
    for (let i = 0; i < 40; i++) this.update(1 / 30);
    this.draw();
  }

  // The answer slams in, then each car charges up the road and smashes through its card.
  // Resolves once every card has been hit; the shards keep flying after that.
  smash(cards) {
    return new Promise((resolve) => {
      const n = cards.length;
      const maxW = Math.round(this.W * (n > 1 ? 0.46 : 0.88));
      const top = this.horizon + (this.carBottom - this.horizon) * 0.08;
      this.smashes = cards.map((c, i) => {
        const card = buildCard(c, maxW, this.cssPx, this.hiScale || 1);
        const img = card.lo;
        const cx = n > 1 ? this.W * (i ? 0.74 : 0.26) : this.W / 2;
        // sit above the car (and its name tag) so it's clear the car has to drive into it
        const cy = Math.round(Math.min(top + img.height / 2, this.coverTop() - 10 - img.height / 2));
        const fx = c.fx ?? c.tier;
        const build = BUILD[fx] || 0;
        // the hidden face: the answer, but no tier yet
        const hiddenCard = build ? buildCard({ ...c, tier: 1, tierName: ". . .", gain: "? ? ?" }, maxW, this.cssPx, this.hiScale || 1) : null;
        const hidden = hiddenCard?.lo || null;
        return { ...c, fx, build, i, img, hidden, hiImg: card.hi, hiHidden: hiddenCard?.hi || null, cx, cy, t: 0, phase: "slam", dy: 0, vy: 0, alpha: 1, cracks: [], hitT: 0, revealed: !build, pop: 0 };
      });
      this.smashDone = resolve;
    });
  }

  updateSmash(dt) {
    if (!this.smashes.length) return;
    let pending = false;
    for (const s of this.smashes) {
      s.t += dt;
      const r = this.racers[s.i];
      const bottom = s.cy + s.img.height / 2 + s.dy;
      if (s.phase === "slam" && s.t >= 0.28) {
        s.phase = "hold";
        if (!this.calm) this.shake = Math.max(this.shake, 0.25 + s.tier * 0.05);
        this.onEvent?.("slam", s);
      } else if (s.phase === "hold" && !s.revealed && s.t >= 0.28 + s.build) {
        // the reveal: the tier lands with a pop, a flash and a ring of sparks in its colour
        s.revealed = true;
        s.pop = 0.35;
        const u = this.u;
        const col = TIER_COL[s.fx];
        const n = 18 + s.fx * 8;
        for (let q = 0; q < n; q++) {
          const a = (q / n) * Math.PI * 2;
          const sp = (90 + Math.random() * 90) * u * (s.fx - 1);
          this.particles.push({ x: s.cx, y: s.cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.6 + Math.random() * 0.3, size: Math.max(1, u), color: s.fx === 5 ? ["#ff4fd8", "#ffd23a", "#5dff8f", "#4fd1ff"][q % 4] : q % 3 ? col : "#ffffff", g: 60 * u, hot: true });
        }
        if (!this.calm) { this.shake = Math.max(this.shake, 0.3 + s.fx * 0.08); this.flash = Math.max(this.flash, 0.25 + (s.fx - 3) * 0.12); this.flashColor = col; }
        this.onEvent?.("reveal", s);
      } else if (s.phase === "hold" && s.revealed && s.t >= 1.15 + s.build + s.i * 0.15) {
        s.phase = "charge";
        if (r) { r.chargeV = 0; r.charging = true; }
      } else if (s.phase === "charge") {
        if (r) {
          const accel = s.tier ? SMASH[s.tier].accel : 20;
          r.chargeV += accel * dt;
          r.charge += r.chargeV * dt;
          r.boost = Math.min(2, r.chargeV / 12);
          this.speed = Math.max(this.speed, Math.min(0.85, 0.3 + r.boost * 0.25));
          // the card is on the road ahead: it rushes at the car as the car charges at it
          s.vy += (40 + accel * 9) * this.u * dt;
          s.dy += s.vy * dt;
        }
        const hit = r?.box && r.box.y - r.box.h * 0.75 <= bottom;
        if (hit || s.t > 3.2) { s.vy = 0; this.impact(s, r); }
      } else if (s.phase === "broken") {
        s.hitT += dt;
        if (r && s.hitT > 0.35) r.charging = false;
      } else if (s.phase === "cracked") {
        s.hitT += dt;
        if (s.hitT > 0.55) { s.vy += 420 * dt; s.dy += s.vy * dt; s.alpha = Math.max(0, 1 - (s.hitT - 0.55) * 2.4); }
      }
      if (s.phase === "slam" || s.phase === "hold" || s.phase === "charge" || (s.phase === "broken" && s.hitT < 0.45) || (s.phase === "cracked" && s.hitT < 0.95)) pending = true;
    }
    if (!pending && this.smashDone) {
      const done = this.smashDone;
      this.smashDone = null;
      for (const r of this.racers) r.charging = false;
      done();
    }
    if (!pending && this.smashes.every((s) => s.phase === "broken" || s.alpha <= 0)) this.smashes = this.smashes.filter((s) => s.phase !== "broken" && s.alpha > 0);
  }

  impact(s, r) {
    const u = this.u;
    const k = 1;
    const w = s.img.width * k;
    const h = s.img.height * k;
    const left = s.cx - w / 2;
    const top = s.cy - h / 2 + s.dy;
    const hx = r?.box ? r.box.x + r.box.w / 2 : s.cx; // where the car hit
    const hy = top + h;
    s.hitT = 0;
    if (!s.tier) {
      // STALLED: the card only cracks and the car bounces off it
      s.phase = "cracked";
      for (let c = 0; c < 5; c++) {
        const pts = [[hx - left, h]];
        let ang = -Math.PI / 2 + (c - 2) * 0.5;
        for (let j = 0; j < 4; j++) {
          const [px, py] = pts[pts.length - 1];
          ang += (Math.random() - 0.5) * 0.8;
          pts.push([px + Math.cos(ang) * (6 + Math.random() * 10), py + Math.sin(ang) * (6 + Math.random() * 10)]);
        }
        s.cracks.push(pts);
      }
      if (r) { r.chargeV = -16; r.charge = Math.max(r.charge, 0); r.charging = true; setTimeout(() => { r.charging = false; }, 700); }
      for (let q = 0; q < 16; q++) this.particles.push({ x: hx + (Math.random() - 0.5) * 30 * u, y: hy, vx: (Math.random() - 0.5) * 60 * u, vy: (Math.random() - 0.8) * 40 * u, life: 1, size: 3 * u, grow: 7 * u, color: q % 2 ? "#7d778f" : "#4e4960", g: 0 });
      if (!this.calm) this.shake = Math.max(this.shake, 0.35);
      this.onEvent?.("bonk", s);
      return;
    }
    // shatter into tiles that fly away from where the car hit
    s.phase = "broken";
    const P = SMASH[s.tier];
    // tiles sized so a card never breaks into more than a few hundred pieces (a big card in 4px tiles
    // was thousands of shards, each drawn every frame: the lag on phones after a rare answer)
    const MAX_SHARDS = [50, 70, 100, 130, 170, 220][s.tier] || 100;
    const tile = Math.max(P.tile, Math.ceil(Math.sqrt((s.img.width * s.img.height) / MAX_SHARDS)));
    for (let y = 0; y < s.img.height; y += tile) {
      for (let x = 0; x < s.img.width; x += tile) {
        const sw = Math.min(tile, s.img.width - x);
        const sh = Math.min(tile, s.img.height - y);
        const px = left + (x + sw / 2) * k;
        const py = top + (y + sh / 2) * k;
        let dx = px - hx;
        let dy = py - hy - h * 0.6;
        const d = Math.hypot(dx, dy) || 1;
        dx /= d; dy /= d;
        const sp = P.speed * u * (0.55 + Math.random() * 0.9) * (1.3 - Math.min(1, d / (w * 0.8)) * 0.5);
        this.shards.push({ img: s.img, sx: x, sy: y, sw, sh, x: px, y: py, vx: dx * sp, vy: dy * sp - P.speed * 0.35 * u, rot: 0, vr: (Math.random() - 0.5) * (2 + s.tier * 3), scale: k, vs: P.grow * (0.4 + Math.random()), life: 1.1 + Math.random() * 0.6 + s.tier * 0.12 });
      }
    }
    if (r) r.chargeV *= 0.7;
    if (!this.calm) this.shake = Math.max(this.shake, 0.3 + s.tier * 0.18);
    this.kick = Math.max(this.kick, 0.2 + s.tier * 0.18);
    // sparks in the tier colour, from CRUISING up: more, faster and bigger the rarer it is
    const fx = s.fx ?? s.tier;
    const rainbow = ["#ff4fd8", "#ffd23a", "#5dff8f", "#4fd1ff", "#b388ff"];
    for (let q = 0; q < (BURST[fx] || 0); q++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4;
      const sp = (120 + Math.random() * (140 + fx * 60)) * u;
      this.particles.push({ x: hx, y: hy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.5 + Math.random() * (0.3 + fx * 0.12), size: Math.max(1, u * (fx >= 4 ? 1.5 : 1)), color: fx === 5 ? rainbow[q % 5] : q % 4 ? TIER_COL[fx] : "#ffffff", g: 300 * u, hot: true });
    }
    if (s.tier >= 4) { this.flash = Math.max(this.flash, s.tier === 5 ? 0.6 : 0.3); this.flashColor = s.tier === 5 ? "rainbow" : "#ffb02e"; this.glow = Math.max(this.glow, 2); }
    if (s.tier === 5) { this.slowmo = 0.45; this.warp = Math.max(this.warp, 1.6); this.tunnel = Math.max(this.tunnel, 2.4); }
    this.onEvent?.("impact", s);
  }

  drawSmash(g, hi = false) {
    const u = this.u;
    for (const s of this.smashes) {
      if (s.phase === "broken" || s.alpha <= 0) continue;
      let sc = 1;
      if (s.phase === "slam") { const t = Math.min(1, s.t / 0.28); sc = 1 + 1.6 * (1 - t) * (1 - t); }
      if (s.pop > 0) { s.pop = Math.max(0, s.pop - 1 / 60); sc *= 1 + s.pop * 0.6; }
      let jx = 0;
      let jy = 0;
      // the build-up: shaking harder and harder until the reveal
      const building = s.phase === "hold" && !s.revealed;
      const k = building ? Math.min(1, (s.t - 0.28) / s.build) : 0;
      if (building) {
        sc *= 1 + 0.03 * Math.sin(s.t * (14 + k * 30)) * k;
        if (!this.calm) { const a = (0.5 + k * k * (s.fx - 1.5)) * u; jx = Math.round((Math.random() - 0.5) * 2 * a); jy = Math.round((Math.random() - 0.5) * 2 * a); }
      } else if (s.phase === "hold" && s.fx >= 4 && !this.calm) { jx = Math.round((Math.random() - 0.5) * (s.fx - 3) * 2 * u); jy = Math.round((Math.random() - 0.5) * (s.fx - 3) * 2 * u); }
      if (s.phase === "charge" && !this.calm) jx = Math.round(Math.sin(s.t * 60) * u);
      const w = Math.round(s.img.width * sc);
      const h = Math.round(s.img.height * sc);
      const x = Math.round(s.cx - w / 2) + jx;
      const y = Math.round(s.cy - h / 2 + s.dy) + jy;
      g.globalAlpha = s.phase === "slam" ? Math.min(1, s.t / 0.12) : s.alpha;
      g.fillStyle = "rgba(0,0,0,0.45)";
      g.fillRect(x + 3, y + 4, w, h);
      if (building) {
        // a glow climbing the rarity colours: TRAFFIC JAM, CRUISING, FAST LANE... up to this card's tier
        const lvl = Math.min(s.fx, 1 + Math.floor(k * s.fx));
        const pulse = 0.5 + 0.5 * Math.sin(s.t * (10 + k * 25));
        g.fillStyle = lvl === 5 ? `hsl(${Math.floor(this.time * 600) % 360},100%,60%)` : TIER_COL[lvl];
        for (let ring = 1; ring <= 3; ring++) {
          g.globalAlpha = (0.25 + 0.5 * k) * (0.4 + 0.6 * pulse) / ring;
          const p = Math.round(ring * (2 + k * 4) * u);
          g.fillRect(x - p, y - p, w + p * 2, h + p * 2);
        }
        g.globalAlpha = 1;
      }
      g.drawImage(hi ? (s.revealed ? s.hiImg : s.hiHidden) : s.revealed ? s.img : s.hidden, x, y, w, h);
      if (s.tier === 5 && s.phase !== "slam") {
        g.strokeStyle = `hsl(${Math.floor(this.time * 600) % 360},100%,65%)`;
        g.lineWidth = 2;
        g.strokeRect(x - 2, y - 2, w + 4, h + 4);
      }
      if (s.cracks.length) {
        g.strokeStyle = "#0b0618";
        g.lineWidth = 2;
        for (const pts of s.cracks) {
          g.beginPath();
          pts.forEach(([px, py], j) => (j ? g.lineTo(x + px, y + py) : g.moveTo(x + px, y + py)));
          g.stroke();
        }
        g.strokeStyle = "#d7d3ea";
        g.lineWidth = 1;
        for (const pts of s.cracks) {
          g.beginPath();
          pts.forEach(([px, py], j) => (j ? g.lineTo(x + px + 1, y + py) : g.moveTo(x + px + 1, y + py)));
          g.stroke();
        }
      }
      g.globalAlpha = 1;
    }
    g.globalAlpha = 1;
  }
  // the pieces of a smashed card fly on the scene canvas (cheap), not the full-resolution layer
  drawShards(g) {
    for (const p of this.shards) {
      g.globalAlpha = Math.min(1, p.life * 2);
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.rot);
      g.scale(p.scale, p.scale);
      g.drawImage(p.img, p.sx, p.sy, p.sw, p.sh, -p.sw / 2, -p.sh / 2, p.sw, p.sh);
      g.restore();
    }
    g.globalAlpha = 1;
  }

  zoneAt(i) {
    for (let k = this.zones.length - 1; k >= 0; k--) if (this.zones[k].start <= i) return k;
    return 0;
  }

  update(dt) {
    const u = this.u;
    if (this.glideTo != null) {
      this.carBottom += (this.glideTo - this.carBottom) * Math.min(1, dt * 3.5);
      if (Math.abs(this.glideTo - this.carBottom) < 0.5) { this.carBottom = this.glideTo; this.glideTo = null; }
      this.horizon = Math.round(Math.min(this.H * 0.42, this.carBottom - this.H * 0.3));
    }
    // a One in a Vroomillion smash plays in slow motion for a moment
    if (this.slowmo > 0) { this.slowmo -= dt; dt *= this.calm ? 1 : 0.6; }
    this.updateSmash(dt);
    for (const p of this.shards) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 380 * u * dt;
      p.rot += p.vr * dt;
      p.scale += p.vs * dt;
      p.life -= dt;
    }
    this.shards = this.shards.filter((p) => p.life > 0 && p.y < this.H + 80 && p.x > -80 && p.x < this.W + 80);
    this.time += dt;
    this.shake = Math.max(0, this.shake - dt);
    this.flash = Math.max(0, this.flash - dt);
    this.kick = Math.max(0, this.kick - dt * 0.9);
    this.warp = Math.max(0, this.warp - dt * 0.8);
    this.stretch = Math.max(0, this.stretch - dt * 0.6);
    this.glow = Math.max(0, this.glow - dt * 0.7);
    this.tunnel = Math.max(0, this.tunnel - dt * 0.75);
    this.revT = Math.max(0, this.revT - dt);
    // scenery timers
    for (const f of this.fireworks || []) f.t += dt;
    this.fireworks = (this.fireworks || []).filter((f) => f.t < 2.3);
    this.aurora = Math.max(0, (this.aurora || 0) - dt);
    this.comet = Math.max(0, (this.comet || 0) - dt);
    this.cheer = Math.max(0, (this.cheer || 0) - dt);
    if (this.worldFx) { this.worldFx.t -= dt; if (this.worldFx.t <= 0) this.worldFx = null; }
    // CRUISING and up: sparkles drift up off the roadside while you boost
    if (this.worldFx && this.worldFx.tier >= 2 && !this.calm && Math.random() < (this.lite ? 0.3 : 0.7)) {
      const side = Math.random() < 0.5 ? Math.random() * this.W * 0.22 : this.W * (0.78 + Math.random() * 0.22);
      this.particles.push({ x: side, y: this.horizon + Math.random() * (this.H - this.horizon) * 0.7, vx: 0, vy: -(20 + Math.random() * 40) * u, life: 0.9, size: Math.max(1, u), color: Math.random() < 0.6 ? TIER_COL[this.worldFx.tier] : "#ffffff", g: 0 });
    }
    updateTraffic(this, dt, this.camZ, SEG, DRAW, ZONES[this.zones[this.shown]?.zone]?.id);
    this.steer(dt);
    const segsPerSec = this.parked ? 0 : 4 + this.speed * 46;
    this.camZ += SEG * segsPerSec * dt;
    const camSeg = Math.floor(this.camZ / SEG);
    const bend = curveAt(camSeg + 8);
    this.bgX -= bend * segsPerSec * dt * 0.9 * u;

    // ---- the world moves on with the leader ----
    if (this.racers.length) {
      this.progress = Math.max(...this.racers.map((r) => r.dist / (r.car?.power || 1)));
    }
    const want = Math.floor(this.progress / ZONE_M);
    while (!this.arrival && this.zones.length - 1 < want) {
      const prev = this.zones[this.zones.length - 1];
      const n = this.zones.length;
      const zone = (this.zones[0].zone + n) % BASE_ZONES;
      const opts = FESTIVE ? ["snow", "snow", "clear"] : ZONES[zone].weather; // at Christmas it snows in every zone, the desert too
      // new zones appear at the horizon and you drive into them
      this.zones.push({ zone, start: Math.max(camSeg + DRAW - 4, prev.start + 40), weather: fest(opts[Math.floor(hash(this.seed + n * 3.3) * opts.length)], zone) });
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
    let goal = timeOfDay(this.todBase + this.progress / DAY_M);
    if (this.arrival) {
      this.arrival.t += dt;
      const sky = DEST_SKY[ZONES[this.arrival.zone].id];
      if (sky) goal = mixTod(goal, skyOf(sky), smooth(Math.min(1, this.arrival.t / 2)));
      if (ZONES[this.arrival.zone].id === "gold") {
        this.glow = Math.max(this.glow, 1.2); // the gold city's road is always lit
        if (Math.random() < dt * 30) this.particles.push({ x: Math.random() * this.W, y: Math.random() * this.horizon, vx: 0, vy: 8 * u, life: 0.8, size: Math.max(1, u), color: Math.random() < 0.5 ? "#fff3a0" : "#ffd23a", g: 0 });
      }
    }
    if (this.rareFx) {
      const fx = this.rareFx;
      fx.t += dt;
      // fade in fast, hold, fade out over the last second
      fx.amt = Math.min(1, fx.t / 0.25) * Math.min(1, Math.max(0, (fx.dur - fx.t) / 1));
      if (fx.t >= fx.dur) this.rareFx = null;
      else goal = mixTod(goal, RARE_SKY[fx.tier], fx.amt * 0.85);
    }
    this.zoom = Math.max(0, this.zoom - dt * 0.9);
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
        if (r.charging && r.chargeV < 0) { r.charge += r.chargeV * dt; r.chargeV += 40 * dt; if (r.chargeV > 0) r.chargeV = 0; r.charge = Math.max(-1.2, r.charge); }
        else if (!r.charging) { r.charge += (0 - r.charge) * Math.min(1, dt * 2.5); r.chargeV = 0; }
        r.wheel += dt * (4 + this.speed * 26 + r.boost * 20);
        r.lift = Math.max(0, r.lift - dt * 1.6);
        r.launchT = Math.max(0, r.launchT - dt);
        r.fireT = Math.max(0, r.fireT - dt);
        r.popT = Math.max(0, r.popT - dt);
        r.zapT = Math.max(0, (r.zapT || 0) - dt);
        r.drift += (clamp(-bend * 0.012, -0.04, 0.04) - r.drift) * Math.min(1, dt * 2);
        if (r.box && r.boost > 0.6 && !this.calm) r.trail.unshift({ ...r.box });
        else if (r.trail.length) r.trail.pop();
        if (r.trail.length > 5) r.trail.length = 5;
        if (r.box) {
          // exhaust: rev puffs and boost smoke
          const ex = [r.box.x + r.box.w * 0.18, r.box.x + r.box.w * 0.82];
          const ey = r.box.y - r.box.h * 0.25;
          if (this.revT > 0 && Math.random() < 0.6 && !elec(r)) {
            const sx = ex[Math.random() < 0.5 ? 0 : 1];
            this.particles.push({ x: sx, y: ey, vx: (Math.random() - 0.5) * 20 * u, vy: (10 + Math.random() * 15) * u, life: 0.5, size: 2 * u, grow: 5 * u, color: "#8f8aa8", g: 0, soft: true });
          }
          // STALLED: black smoke coughs out of the exhausts
          if (r.sputterT > 0 && elec(r)) {
            // an electric car fizzles: a few dying sparks instead of smoke
            r.sputterT -= dt;
            if (Math.random() < 0.4) this.particles.push({ x: ex[Math.random() < 0.5 ? 0 : 1], y: ey, vx: (Math.random() - 0.5) * 60 * u, vy: (Math.random() - 0.3) * 50 * u, life: 0.25, size: Math.max(1, u), color: SPARK[Math.floor(Math.random() * 3)], g: 120 * u, hot: true });
          } else if (r.sputterT > 0) {
            r.sputterT -= dt;
            if (Math.random() < 0.55) {
              const sx = ex[Math.random() < 0.5 ? 0 : 1];
              this.particles.push({ x: sx, y: ey, vx: (Math.random() - 0.5) * 30 * u, vy: (5 + Math.random() * 25) * u, life: 0.9, size: 3 * u, grow: 9 * u, color: Math.random() < 0.5 ? "#1a1622" : "#2b2633", g: -12 * u, soft: true });
            }
          }
          // embers off the end of the exhaust fire, Fast Lane and up
          if (r.fireT > 0 && r.fireTier >= 3 && Math.random() < 0.25 + r.fireTier * 0.1) {
            const sx = ex[Math.random() < 0.5 ? 0 : 1];
            this.particles.push({ x: sx + (Math.random() - 0.5) * 4 * u, y: ey + r.box.h * FIRE_LEN[r.fireTier] * 0.8, vx: (Math.random() - 0.5) * 50 * u, vy: (60 + Math.random() * 90) * u, life: 0.3 + Math.random() * 0.3, size: Math.max(1, u * 0.75), color: elec(r) ? SPARK[Math.floor(Math.random() * 4)] : FIRE[r.fireTier][Math.floor(Math.random() * 3)], g: elec(r) ? -20 * u : 60 * u, hot: true });
          }
          if (r.boost > 0.05 && r.fireT <= 0 && Math.random() < r.boost * 0.8 && !elec(r)) {
            const sx = ex[Math.random() < 0.5 ? 0 : 1];
            this.particles.push({ x: sx, y: ey, vx: (Math.random() - 0.5) * 40 * u, vy: (30 + r.boost * 60) * u, life: 0.45, size: 2 * u, grow: 7 * u, color: r.car?.reggae ? RASTA[Math.floor(Math.random() * 3)] : "#cfd3e6", g: 0, soft: true });
          }
          // AUDI 5000: a shower of embers off the giant flames
          if (r.car?.megaFire && (r.boost > 0.05 || r.fireT > 0)) for (let k = 0; k < 3; k++) {
            const sx = ex[k % 2];
            this.particles.push({ x: sx + (Math.random() - 0.5) * 14 * u, y: ey + r.box.h * (0.4 + Math.random() * 1.4), vx: (Math.random() - 0.5) * 120 * u, vy: (40 + Math.random() * 160) * u, life: 0.3 + Math.random() * 0.4, size: Math.max(1, u * (1 + Math.random())), color: ["#ff5a1f", "#ffd23a", "#fff4c0"][k], g: 80 * u, hot: true });
          }
          // ZIG'S WHIP: music notes drift up out of the pipes while it moves
          if (r.car?.reggae && Math.random() < 0.04 + Math.min(0.35, r.boost * 0.25 + (r.fireT > 0 ? 0.12 : 0))) this.particles.push(noteParticle(ex[Math.random() < 0.5 ? 0 : 1], ey, u));
          // the exclusive gold car (and sparkle premium cars) leave a sparkle trail in their own colours
          if ((r.car?.exclusive || r.car?.fx === "sparkle") && Math.random() < 0.5 + r.boost) {
            this.particles.push({ x: r.box.x + Math.random() * r.box.w, y: r.box.y - Math.random() * r.box.h, vx: (Math.random() - 0.5) * 30 * u, vy: (20 + Math.random() * 40) * u, life: 0.6, size: Math.max(1, u), color: Math.random() < 0.6 ? (r.car.exclusive ? "#fff3a0" : r.car.accent) : "#ffffff", g: 0 });
          }
          // rainbow premium cars paint a rainbow trail behind them
          if (r.car?.fx === "rainbow" && Math.random() < 0.6 + r.boost) {
            const hue = Math.floor((this.time * 400 + Math.random() * 60) % 360);
            this.particles.push({ x: r.box.x + r.box.w * (0.2 + Math.random() * 0.6), y: r.box.y - r.box.h * 0.15, vx: (Math.random() - 0.5) * 20 * u, vy: (40 + Math.random() * 50 + r.boost * 60) * u, life: 0.7, size: Math.max(1, u * 1.5), color: `hsl(${hue},100%,60%)`, g: 0 });
          }
          // the Hondeezy's rocket leaves a big white smoke trail
          if (r.car?.rocket && r.boost > 0.1 && Math.random() < 0.8) {
            this.particles.push({ x: r.box.x + r.box.w * (0.4 + Math.random() * 0.2), y: r.box.y - r.box.h * 0.8, vx: (Math.random() - 0.5) * 60 * u, vy: (60 + Math.random() * 80 + r.boost * 80) * u, life: 0.8, size: 4 * u, grow: 14 * u, color: Math.random() < 0.5 ? "#e8ecf4" : "#c9ced6", g: 0, soft: true });
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
      ash: Math.round(this.wx.ash * 70 * area),
    };
    const count = { rain: 0, snow: 0, sand: 0, ash: 0 };
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
      } else if (d.type === "snow" || d.type === "ash") {
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
    // slow phone? quietly drop the extra scenery (fewer clouds, no ground detail, less traffic)
    const nowMs = performance.now();
    // Two steps: under ~48 fps for two seconds, drop the two costliest effects (glow and speed blur,
    // see post()); under ~33 fps for a second and a half, go fully lite. (Skipped while a menu draws
    // this scene at a slower pace on purpose: see places.js.)
    if (this.lastDraw && !this.lite && !this.paced) {
      const ms = nowMs - this.lastDraw;
      if (ms < 250) {
        this.frameMs = (this.frameMs || 16) * 0.95 + ms * 0.05;
        this.slowFrames = this.frameMs > 30 ? (this.slowFrames || 0) + 1 : 0;
        if (this.slowFrames > 90) this.lite = true;
        this.busyFrames = this.frameMs > 21 ? (this.busyFrames || 0) + 1 : 0;
        if (this.busyFrames > 120) this.trim = true;
      }
    }
    this.lastDraw = nowMs;
    const { W, H, g, u } = this;
    const wg = this.wg;
    const tod = this.tod;
    g.save();
    if (this.shake > 0 && !this.calm) {
      g.translate(Math.round((Math.random() - 0.5) * 8 * u * this.shake), Math.round((Math.random() - 0.5) * 8 * u * this.shake));
    }

    // a rare answer: the camera pushes in on the cars for a moment
    if (this.zoom > 0 && !this.calm) {
      const z = 1 + 0.16 * smooth(Math.min(1, this.zoom));
      g.translate(W / 2, this.carBottom);
      g.scale(z, z);
      g.translate(-W / 2, -this.carBottom);
    }
    // launches widen the field of view so the road stretches away
    const depth = BASE_DEPTH * (this.calm ? 1 : 1 - Math.min(0.22, this.kick * 0.16));
    const k = W / 2;
    const playerZ = (depth * CAM_H * k) / Math.max(20, this.carBottom - this.horizon);
    this.playerZ = playerZ;

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
      wg.fillRect(0, yTop, W, Math.max(1, yBot - yTop)); // not over the row the nearer segment already drew
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
      // ground detail on the verge (tufts, shells, cones...) so it's never just a flat colour
      const B = bits();
      if (!this.lite && i % 2 === 0 && GROUND[zone]) {
        const pick = GROUND[zone][Math.floor(hash(i * 6.7) * GROUND[zone].length)];
        push(p, B[pick], (hash(i * 8.3) < 0.5 ? -1 : 1) * (1.18 + hash(i * 2.7) * 1.6));
      }
      // crowds by the road, thicker where a new area starts; they react to your answers
      const nearGate = this.zones[zi].start > -Infinity && Math.abs(i - this.zones[zi].start) < 8;
      if ((nearGate && i % 2 === 0) || i % 31 === 0) push(p, B.crowd[0], (hash(i * 4.9) < 0.5 ? -1 : 1) * (1.32 + hash(i) * 0.25), { crowd: true, seed: i });
      // banners left by this race's rare answers line the road
      if (this.banners.length && i % 5 === 0) {
        const k = Math.floor(i / 5);
        push(p, B.banner[this.banners[k % this.banners.length]][0], k % 2 ? -1.17 : 1.17, { banner: this.banners[k % this.banners.length], flip: k % 2 === 1 });
      }
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
      } else if (zone === "scrap") {
        if (roll < 0.22) push(p, spr.tyres, side * (1.3 + far * 1.4));
        else if (roll < 0.36) push(p, spr.wreck, side * (1.4 + far * 1.6));
        else if (roll < 0.44) push(p, spr.rock, side * (1.3 + far));
      } else if (zone === "town") {
        if (i % 5 === 0) push(p, spr.house, side * (1.6 + far * 0.8));
        if (i % 37 === 0) push(p, spr.church, -side * 1.9);
        if (roll > 0.8) push(p, spr.bush, -side * (1.3 + far));
        if (i % 9 === 0) { push(p, spr.lamp, -1.2, { lamp: true }); push(p, spr.lamp, 1.2, { lamp: true, flip: true }); }
      } else if (zone === "beach") {
        if (roll < 0.22) push(p, spr.umbrella, side * (1.4 + far * 1.6));
        else if (roll < 0.4) push(p, spr.palm, side * (1.35 + far * 1.1));
      } else if (zone === "monaco") {
        if (i % 4 === 0) { const b = Math.floor(hash(i * 1.9) * 6); push(p, spr.whiteBlocks[b].img, -(1.9 + far * 0.5), { lit: spr.whiteBlocks[b].lit }); }
        if (roll < 0.25) push(p, spr.palm, 1.4 + far * 0.8);
        if (i % 8 === 0) { push(p, spr.lamp, -1.2, { lamp: true }); push(p, spr.lamp, 1.2, { lamp: true, flip: true }); }
      } else if (zone === "summit") {
        if (roll < 0.35) push(p, spr.pine, side * (1.3 + far * 1.9));
        else if (roll > 0.85) push(p, spr.boulder, side * (1.3 + far));
      } else if (zone === "volcano") {
        if (roll < 0.3) push(p, spr.ember, side * (1.3 + far * 1.8));
        else if (roll < 0.4) push(p, spr.rock, side * (1.3 + far * 1.4));
      } else if (zone === "moon") {
        if (roll < 0.25) push(p, spr.boulder, side * (1.3 + far * 2));
        if (i % 53 === 0) push(p, spr.flag, hash(i) < 0.5 ? -1.6 : 1.6);
      } else if (zone === "gold") {
        if (i % 3 === 0) { const b = Math.floor(hash(i * 1.9) * 6); push(p, spr.goldTowers[b].img, side * (1.8 + far * 0.6), { lit: spr.goldTowers[b].lit }); }
        if (i % 6 === 0) { push(p, spr.goldLamp, -1.2, { lamp: true }); push(p, spr.goldLamp, 1.2, { lamp: true, flip: true }); }
        if (i % 23 === 0) push(p, spr.sign, -side * 1.9, { neon: true });
      } else {
        if (roll < 0.2) push(p, spr.palm, side * (1.35 + far * 1.1));
        if (i % 10 === 0) { push(p, spr.lamp, -1.2, { lamp: true }); push(p, spr.lamp, 1.2, { lamp: true, flip: true }); }
        if (i % 47 === 0) push(p, spr.sign, hash(i) < 0.5 ? -1.9 : 1.9, { neon: true });
      }
    }
    // traffic to overtake
    for (const t of this.traffic) {
      const rel = t.z - this.camZ;
      if (rel > SEG * 1.5 && rel < SEG * DRAW) items.push({ z: rel, traffic: t });
    }
    this.racers.forEach((r, idx) => {
      const lunge = Math.min(7, r.boost * 2.2);
      items.push({ z: playerZ + (r.gap + lunge + r.charge) * SEG, car: true, r, idx });
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
      if (it.traffic) { this.drawTraffic(wg, it.traffic, interp(it.z), playerZ / it.z); continue; }
      if (it.gantry) { this.drawGantry(wg, it.p, it.gantry); continue; }
      let sprite = it.img;
      let hop = 0;
      if (it.crowd) {
        // rare answer: they jump and cheer; common answer: they just stand there; otherwise a little sway
        const B = bits();
        if (this.cheer > 0 && this.cheerTier >= 2) { sprite = B.crowd[Math.floor(this.time * 8 + it.seed) % 2]; hop = Math.abs(Math.sin(this.time * 14 + it.seed)) * (this.cheerTier >= 4 ? 2.2 : 1.2); }
        else if (this.cheer > 0) sprite = B.crowd[0];
        else sprite = B.crowd[Math.floor(this.time * 1.5 + it.seed) % 7 === 0 ? 1 : 0];
      }
      if (it.banner !== undefined) sprite = bits().banner[it.banner][Math.floor(this.time * 4 + it.p.i) % 2];
      const ps = it.p.scale * k * SPR;
      if (ps < 0.12) continue;
      const w = sprite.width * ps;
      const h = sprite.height * ps;
      const bx = it.p.sx + it.p.sw * it.off;
      if (bx + w < -10 || bx - w > W + 10) continue;
      const left = Math.round(bx - w / 2);
      const top = Math.round(it.p.sy - h - hop * ps);
      if (it.flip) {
        wg.save();
        wg.translate(Math.round(bx + w / 2), 0);
        wg.scale(-1, 1);
        wg.drawImage(ps > 1.5 ? smooth2x(sprite) : sprite, 0, top, Math.round(w), Math.round(h));
        wg.restore();
      } else {
        wg.drawImage(ps > 1.5 ? smooth2x(sprite) : sprite, left, top, Math.round(w), Math.round(h));
      }
      if (it.lit && h > 14) glows.push({ img: it.lit, x: left, y: top, w: Math.round(w), h: Math.round(h) });
      if (it.neon) glows.push({ img: sprite, x: left, y: top, w: Math.round(w), h: Math.round(h), a: 0.7 });
      if (it.lamp) glows.push({ halo: true, x: it.flip ? bx + w * 0.25 : bx - w * 0.25, y: top + h * 0.04, r: Math.max(2, w * 1.4) });
    }

    // ---- haze, time of day, then lights ----
    wg.globalCompositeOperation = "source-atop";
    const fogC = this.fogColour();
    const haze = clamp(this.wx.fog * 0.55 + this.wx.sand * 0.3 + this.wx.rain * 0.1 + this.wx.snow * 0.12 + this.wx.ash * 0.2, 0, 0.65);
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
    if (this.rareFx) {
      // the whole world washes over in the rarity colour
      wg.globalCompositeOperation = "color";
      wg.globalAlpha = 0.55 * this.rareFx.amt;
      wg.fillStyle = TIER_COL[this.rareFx.tier];
      wg.fillRect(0, 0, W, H);
      wg.globalAlpha = 1;
    }
    wg.globalCompositeOperation = "lighter";
    const night = Math.max(tod.lamps, this.worldFx && this.worldFx.tier >= 3 ? 0.9 : 0);
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
    // the title screen: an empty stretch of sky behind the neon sign, so nothing shows through the letters
    if (this.clearTop > 0) this.drawClearSky(g, this.clearTop);
    if (!this.calm) drawFireworks(this, g); // in front of the mountains, buildings and rarity tint
    this.drawStreaks(g);
    this.drawShards(g);

    for (const p of this.particles) {
      g.globalAlpha = Math.min(1, p.life * 3) * (p.soft ? 0.85 : 1);
      g.fillStyle = p.color;
      if (p.note) {
        // a pixel music note: a round head, a stem, and a flag (or a beam joining two)
        const z = Math.max(1, Math.round(p.size / 2)), x = Math.round(p.x + Math.sin(this.time * 5 + p.wob) * 2 * z), y = Math.round(p.y);
        g.fillRect(x, y, z * 3, z * 2);
        g.fillRect(x + z * 2, y - z * 5, z, z * 5);
        if (p.note === 1) { g.fillRect(x + z * 3, y - z * 5, z, z); g.fillRect(x + z * 4, y - z * 4, z, z * 2); }
        else { g.fillRect(x + z * 5, y + z, z * 3, z * 2); g.fillRect(x + z * 7, y - z * 4, z, z * 5); g.fillRect(x + z * 2, y - z * 5, z * 6, z); }
      } else if (p.spin !== undefined) {
        const w = Math.max(1, Math.abs(Math.cos(p.spin)) * p.size);
        g.fillRect(Math.round(p.x - w / 2), Math.round(p.y - p.size / 2), Math.ceil(w), Math.ceil(p.size));
      } else {
        g.fillRect(Math.round(p.x - p.size / 2), Math.round(p.y - p.size / 2), Math.ceil(p.size), Math.ceil(p.size));
      }
    }
    g.globalAlpha = 1;

    if (this.rareFx && this.rareFx.tier === 5 && !this.calm) this.drawRays(g, this.rareFx.amt);
    if (this.flash > 0 && !this.calm) {
      g.globalAlpha = Math.min(1, this.flash);
      g.fillStyle = this.flashColor === "rainbow" ? `hsl(${Math.floor(this.time * 720) % 360},100%,65%)` : this.flashColor;
      g.fillRect(-W, -H, W * 3, H * 3);
      g.globalAlpha = 1;
    }
    const camera = g.getTransform();
    g.restore();
    this.post(g);
    // the answer cards go on top of the glow and blur, on the full-resolution layer when there is one,
    // so their lettering is smooth and sharp
    const hg = this.hiG;
    this.clearHi();
    if (this.smashes.length) {
      const R = this.hiScale || 1;
      const tg = hg || g;
      tg.save();
      tg.setTransform(hg ? new DOMMatrix([R, 0, 0, R, 0, 0]).multiply(camera) : camera);
      this.drawSmash(tg, !!hg);
      tg.restore();
      if (hg) {
        this.hiUsed = true;
        // next frame clears just the cards' area (in device pixels), not the whole layer
        const m = new DOMMatrix([R, 0, 0, R, 0, 0]).multiply(camera);
        let box = null;
        for (const sm of this.smashes) {
          const w = sm.img.width * 3, h = sm.img.height * 3; // room for the slam-in and the build-up glow
          const p0 = m.transformPoint({ x: sm.cx - w / 2, y: sm.cy + (sm.dy || 0) - h / 2 }), p1 = m.transformPoint({ x: sm.cx + w / 2, y: sm.cy + (sm.dy || 0) + h / 2 });
          const b = [Math.min(p0.x, p1.x), Math.min(p0.y, p1.y), Math.max(p0.x, p1.x), Math.max(p0.y, p1.y)];
          box = box ? [Math.min(box[0], b[0]), Math.min(box[1], b[1]), Math.max(box[2], b[2]), Math.max(box[3], b[3])] : b;
        }
        this.hiDirty = box;
      }
    }
  }

  // the full-resolution layer over the scene canvas (main.js sizes it): R device pixels per scene pixel
  setHi(canvas, R) {
    this.hiG = canvas ? canvas.getContext("2d") : null;
    this.hiScale = R;
    if (this.hiG) this.hiG.imageSmoothingEnabled = false;
    this.hiUsed = true;
  }
  clearHi() {
    if (!this.hiG || !this.hiUsed) return;
    this.hiG.setTransform(1, 0, 0, 1, 0, 0);
    const d = this.hiDirty;
    if (d) this.hiG.clearRect(Math.floor(d[0]) - 4, Math.floor(d[1]) - 4, Math.ceil(d[2] - d[0]) + 8, Math.ceil(d[3] - d[1]) + 8);
    else this.hiG.clearRect(0, 0, this.hiG.canvas.width, this.hiG.canvas.height);
    this.hiDirty = null;
    this.hiUsed = false;
  }

  // ---- the look on top: a glossy road, haze, glow, speed blur and a vignette ----
  // A glossy road mirrors the world above the horizon and each car (much more in rain and at night),
  // with red streaks under tail lights; haze softens the distance; bright lights glow; the edges blur
  // at speed. Cheap blits of the finished frame; glow and speed blur are skipped in auto-lite and on
  // devices that can't hold ~48 fps with them (this.trim).
  post(g) {
    const { W, H, canvas: cv, tod } = this, hz = this.horizon;
    if (!W || hz <= 0 || hz >= H) return;
    const rain = this.wx.rain || 0, night = tod.lamps || 0;
    const wet = clamp(0.08 + rain * 0.32 + night * 0.07, 0, 0.42);
    g.save();
    g.imageSmoothingEnabled = false;
    // 1. the world above the horizon, mirrored softly into the road
    const band = Math.min(hz, H - hz, Math.round(H * 0.3));
    g.save();
    g.beginPath(); g.rect(0, hz, W, H - hz); g.clip();
    g.globalAlpha = wet;
    g.translate(0, hz * 2); g.scale(1, -1);
    g.drawImage(cv, 0, hz - band, W, band, 0, hz - band, W, band);
    g.restore();
    // 2. each car mirrored under itself, and red streaks from its tail lights
    for (const r of this.racers) {
      const b = r.box;
      if (!b || b.w < 4) continue;
      g.save();
      g.globalAlpha = 0.18 + wet * 0.45;
      g.beginPath(); g.rect(b.x - 2, b.y, b.w + 4, b.h * 0.65); g.clip();
      g.translate(0, b.y * 2); g.scale(1, -1);
      g.drawImage(cv, b.x - 2, b.y - b.h, b.w + 4, b.h, b.x - 2, b.y - b.h, b.w + 4, b.h);
      g.restore();
      const glow = clamp(night * 0.6 + rain * 0.4, 0, 0.7);
      if (glow > 0.05) {
        g.save(); g.globalCompositeOperation = "lighter";
        for (const fx of [b.x + b.w * 0.2, b.x + b.w * 0.8]) {
          const len = b.h * (1.2 + rain);
          const gr = g.createLinearGradient(0, b.y, 0, b.y + len);
          gr.addColorStop(0, `rgba(255,50,50,${glow})`); gr.addColorStop(1, "rgba(255,50,50,0)");
          g.fillStyle = gr; g.fillRect(Math.round(fx - b.w * 0.035), Math.round(b.y), Math.max(2, Math.round(b.w * 0.07)), Math.round(len));
        }
        g.restore();
      }
    }
    // 3. haze: the far road and scenery fade into the colour of the horizon
    const hc = tod.sky[tod.sky.length - 1].map(Math.round);
    const haze = g.createLinearGradient(0, hz - H * 0.1, 0, hz + H * 0.16);
    haze.addColorStop(0, `rgba(${hc[0]},${hc[1]},${hc[2]},0)`);
    haze.addColorStop(0.45, `rgba(${hc[0]},${hc[1]},${hc[2]},${(this.rareFx ? 0.06 : 0.14) + (this.wx.fog || 0) * 0.25})`);
    haze.addColorStop(1, `rgba(${hc[0]},${hc[1]},${hc[2]},0)`);
    g.fillStyle = haze; g.fillRect(0, hz - H * 0.1, W, H * 0.26);
    if (!this.lite && !this.trim) {
      // 4. glow: a tiny, high-contrast copy of the frame, stretched back over it softly
      if (CAN_FILTER) {
        const bw = Math.max(32, Math.round(W / 6)), bh = Math.max(18, Math.round(H / 6));
        const bl = this.bloomCv || (this.bloomCv = document.createElement("canvas"));
        if (bl.width !== bw || bl.height !== bh) { bl.width = bw; bl.height = bh; bl.dataset.fresh = ""; }
        // it's a soft blur, so refreshing it every other frame looks the same and halves its cost
        this.bloomTick = (this.bloomTick || 0) + 1;
        if (this.bloomTick % 2 || bl.dataset.fresh !== "1") {
          const bg = bl.getContext("2d");
          bg.filter = "brightness(0.85) contrast(2.6) saturate(1.3)";
          bg.clearRect(0, 0, bw, bh); bg.drawImage(cv, 0, 0, bw, bh);
          bl.dataset.fresh = "1";
        }
        g.save(); g.globalCompositeOperation = "screen"; g.globalAlpha = 0.2 + night * 0.1; g.imageSmoothingEnabled = true;
        g.drawImage(bl, 0, 0, W, H); g.restore();
      }
      // 5. speed: the frame zooms a touch at the edges while you fly
      const k = this.calm ? 0 : clamp((this.speed - 0.45) * 1.8, 0, 1);
      if (k > 0.02) {
        g.save();
        for (let i = 1; i <= 2; i++) {
          const sc = 1 + i * 0.009 * k;
          g.globalAlpha = 0.11 * k;
          g.drawImage(cv, (W - W * sc) / 2, hz - hz * sc, W * sc, H * sc);
        }
        g.restore();
      }
    }
    // 6. a soft vignette, painted once per screen size and reused
    if (!this.vig || this.vig.width !== W || this.vig.height !== H) {
      const v = this.vig || document.createElement("canvas");
      v.width = W; v.height = H;
      const vx = v.getContext("2d");
      const vg = vx.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.45, W / 2, H * 0.55, Math.max(W, H) * 0.75);
      vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.38)");
      vx.fillStyle = vg; vx.fillRect(0, 0, W, H);
      this.vig = v;
    }
    g.drawImage(this.vig, 0, 0);
    g.restore();
  }

  // ONE IN A VROOMILLION: gold rays turning round the horizon
  drawRays(g, amt) {
    const { W, H } = this;
    const cx = W / 2, cy = this.horizon;
    const R = Math.hypot(W, H);
    g.save();
    g.globalCompositeOperation = "lighter";
    g.globalAlpha = 0.35 * amt;
    g.fillStyle = "#ffd23f";
    const n = 14;
    for (let i = 0; i < n; i++) {
      const a0 = this.time * 0.6 + (i / n) * Math.PI * 2;
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(a0) * R, cy + Math.sin(a0) * R);
      g.lineTo(cx + Math.cos(a0 + 0.12) * R, cy + Math.sin(a0 + 0.12) * R);
      g.closePath();
      g.fill();
    }
    g.restore();
  }

  fogColour() {
    const w = this.wx;
    const total = w.fog + w.rain + w.snow + w.sand + w.ash;
    const horizonSky = this.tod.sky[3];
    if (total < 0.01) return horizonSky;
    let c = [0, 0, 0];
    for (const k of ["fog", "rain", "snow", "sand", "ash"]) {
      const v = rgb(FOG[k]);
      c = [c[0] + v[0] * w[k], c[1] + v[1] * w[k], c[2] + v[2] * w[k]];
    }
    c = c.map((v) => v / total);
    return mixC(horizonSky, c, Math.min(1, total));
  }

  // repaint plain sky (no buildings, clouds or sun) from the top down to y, fading out at the bottom
  drawClearSky(g, y) {
    const stops = this.tod.sky, span = this.horizon + 4 * this.u;
    const at = (f) => { // the sky's colour a fraction f of the way down to the horizon
      const x = clamp(f, 0, 1) * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(x));
      return mixC(stops[i], stops[i + 1], x - i);
    };
    const grad = g.createLinearGradient(0, 0, 0, y);
    for (let k = 0; k <= 8; k++) {
      const t = k / 8, c = at((t * y) / span).map(Math.round);
      const a = t < 0.72 ? 1 : Math.max(0, 1 - (t - 0.72) / 0.28);
      grad.addColorStop(t, `rgba(${c[0]},${c[1]},${c[2]},${a})`);
    }
    g.fillStyle = grad;
    g.fillRect(0, 0, this.W, y);
  }

  drawSky(g) {
    const { W, u } = this;
    const hz = this.horizon;
    const tod = this.tod;
    const stops = tod.sky;
    // 16-bit style: a smooth gradient sky
    const grad = g.createLinearGradient(0, 0, 0, hz + 4 * u);
    for (let i = 0; i < stops.length; i++) {
      let c = stops[i];
      if (this.tunnel > 0 && !this.calm) c = mixC(c, hsl((i * 50 + this.time * 400) % 360, 1, 0.55), Math.min(0.75, this.tunnel * 0.4));
      grad.addColorStop(i / (stops.length - 1), css(c));
    }
    g.fillStyle = grad;
    g.fillRect(0, 0, W, hz + 4 * u);
    g.fillStyle = css(stops[stops.length - 1]);
    g.fillRect(0, hz + 4 * u - 1, W, this.H);

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
    if (tod.stars > 0.3 && !tod.noMoon) {
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

    // a soft glow round the sun, then two ranges of distant mountains sliding at their own speeds
    if (tod.sun > -0.15) {
      const sy = hz - 6 * u - tod.sun * hz * 0.7;
      const glow = g.createRadialGradient(sx, sy, R * 0.6, sx, sy, R * 3.2);
      glow.addColorStop(0, "rgba(255,226,150,0.45)");
      glow.addColorStop(1, "rgba(255,170,120,0)");
      g.fillStyle = glow;
      g.fillRect(sx - R * 3.2, sy - R * 3.2, R * 6.4, R * 6.4);
    }
    const zid = ZONES[this.zones[this.shown]?.zone]?.id || "city";
    drawClouds(this, g, zid, tod);
    this.drawMountains(g, stops);
    drawSkyLife(this, g, zid, tod);
    drawClouds(this, g, zid, tod, true);
    drawSkyShow(this, g);

    // heavy weather greys the sky out
    const grey = this.wx.fog * 0.45 + this.wx.rain * 0.3 + this.wx.snow * 0.2 + this.wx.sand * 0.3;
    if (grey > 0.01) {
      g.fillStyle = css(this.fogColour(), Math.min(0.5, grey));
      g.fillRect(0, 0, W, hz + 4 * u);
    }
  }

  // Distant mountains: each area has its own range (scenery.js MOUNTAINS), crossfading between areas.
  drawMountains(g, stops) {
    const cur = ZONES[this.zones[this.shown]?.zone]?.id || "city";
    if (this.fade < 1) { g.globalAlpha = 1 - this.fade; this.mountainRange(g, stops, ZONES[this.prevZone].id); }
    g.globalAlpha = this.fade < 1 ? this.fade : 1;
    this.mountainRange(g, stops, cur);
    g.globalAlpha = 1;
  }

  mountainRange(g, stops, zone) {
    const { W, u } = this;
    const hz = this.horizon;
    const low = stops[stops.length - 1];
    for (const m of MOUNTAINS[zone] || []) {
      const off = this.bgX * m.par;
      const step = 2 * u;
      const col = mixC(low, rgb(m.tone), m.mix);
      const peak = (x) => {
        const v = ((x + off) * m.f) / u;
        const soft = 0.45 + 0.35 * Math.abs(Math.sin(v)) + 0.2 * Math.abs(Math.sin(v * 2.7 + 1.3));
        const sharp = 0.3 + 0.7 * Math.abs(((v / Math.PI) % 2) - 1) * (0.6 + 0.4 * Math.abs(Math.sin(v * 0.37)));
        let h = m.h * (soft * (1 - m.jag) + sharp * m.jag);
        if (m.islands) h *= Math.max(0, Math.sin(v * 0.5) - 0.2) * 1.6; // separate islands with sea between
        return hz - hz * h;
      };
      g.fillStyle = css(col);
      g.beginPath();
      g.moveTo(0, hz + u);
      for (let x = 0; x <= W + step; x += step) g.lineTo(x, Math.round(peak(x) / u) * u);
      g.lineTo(W, hz + u);
      g.fill();
      // a lit edge on the slopes, snow on the high peaks, or a neon outline on the strip
      const edge = m.neon || css(mixC(col, rgb("#ffffff"), 0.18));
      for (let x = 0; x <= W; x += step) {
        const y = Math.round(peak(x) / u) * u, yn = Math.round(peak(x + step) / u) * u;
        if (y >= hz) continue;
        g.fillStyle = edge;
        if (m.neon || yn > y) g.fillRect(x, y, step, u);
        if (m.snow && y < hz - hz * m.h * 0.72) { g.fillStyle = "rgba(240,244,255,0.75)"; g.fillRect(x, y, step, 3 * u); }
      }
    }
  }

  // The skyline behind the road: whichever zone the camera is in, crossfading as you cross into a new one.
  // lit > 0 draws only the night lights (windows, neon), in additive mode.
  drawSkyline(g, lit = 0) {
    const cur = this.zones[this.shown].zone;
    if (this.fade < 1) {
      g.globalAlpha = 1 - this.fade;
      this.skyline(g, ZONES[this.prevZone].id, lit);
      g.globalAlpha = (1 - this.fade) * (lit || 1);
      drawLandmark(this, g, ZONES[this.prevZone].id, lit);
    }
    g.globalAlpha = this.fade;
    this.skyline(g, ZONES[cur].id, lit);
    g.globalAlpha = this.fade * (lit || 1);
    drawLandmark(this, g, ZONES[cur].id, lit);
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
    } else if (id === "beach") {
      g.globalAlpha = a;
      this.skyline(g, "coast", lit);
    } else if (id === "summit") {
      g.globalAlpha = a;
      this.skyline(g, "alpine", lit);
    } else if (id === "scrap") {
      if (!lit) {
        // junk heaps and a crane
        g.fillStyle = "#4a4038";
        for (let x = 0; x < W; x += 2) {
          const wx = (x - this.bgX * 0.3) / u;
          const h = (10 + Math.abs(Math.sin(wx * 0.05)) * 14 + (hash(Math.floor(wx / 3)) * 4)) * u;
          g.fillRect(x, Math.round(hz - h), 2, Math.round(h) + 2);
        }
        const cx = Math.round(mod(W * 0.7 - this.bgX * 0.3, W + 80 * u) - 40 * u);
        g.fillStyle = "#c9a227";
        g.fillRect(cx, hz - Math.round(46 * u), Math.round(3 * u), Math.round(46 * u));
        g.fillRect(cx - Math.round(26 * u), hz - Math.round(46 * u), Math.round(40 * u), Math.round(3 * u));
        g.fillStyle = "#2a2a30";
        g.fillRect(cx - Math.round(24 * u), hz - Math.round(43 * u), Math.max(1, Math.round(u)), Math.round(14 * u));
        g.fillRect(cx - Math.round(28 * u), hz - Math.round(29 * u), Math.round(9 * u), Math.round(4 * u));
        ridge(0.6, "#5a4a3c", 4, 0.07, 2, 0.15);
      }
    } else if (id === "town") {
      if (!lit) ridge(0.2, "#3f7a35", 10, 0.015, 4, 0.04);
      const cs = (-this.bgX * 0.45) / u;
      for (let i = Math.floor(cs / 14) - 1; i < Math.floor(cs / 14) + W / u / 14 + 2; i++) {
        if (hash(i + 70) < 0.4) continue;
        const x = Math.round((i * 14 - cs) * u);
        const hw = Math.round(10 * u);
        const hh = Math.round((5 + hash(i) * 4) * u);
        if (!lit) {
          g.fillStyle = hash(i + 3) > 0.5 ? "#e8dcc6" : "#d6c7a8";
          g.fillRect(x, hz - hh, hw, hh + 2);
          g.fillStyle = "#9a3a2a";
          for (let k = 0; k < Math.round(4 * u); k++) g.fillRect(x - Math.round(u) + k, hz - hh - k, hw + 2 * Math.round(u) - 2 * k, 1);
        }
        g.fillStyle = "#ffd98a";
        if (lit || hash(i * 5) > 0.5) g.fillRect(x + Math.round(3 * u), hz - Math.round(hh * 0.6), Math.max(1, Math.round(2 * u)), Math.max(1, Math.round(2 * u)));
      }
    } else if (id === "monaco") {
      if (!lit) {
        ridge(0.15, "#5a6a5a", 26, 0.012, 6, 0.03);
        const top = hz - Math.round(5 * u);
        g.fillStyle = "#1f5fa0";
        g.fillRect(0, top, W, hz - top + 2);
      }
      // white buildings stacked up the hillside
      const cs = (-this.bgX * 0.3) / u;
      for (let i = Math.floor(cs / 9) - 1; i < Math.floor(cs / 9) + W / u / 9 + 2; i++) {
        const x = Math.round((i * 9 - cs) * u);
        const h = Math.round((8 + hash(i * 2.1) * 16) * u);
        const y0 = hz - Math.round(5 * u) - h;
        if (!lit) { g.fillStyle = hash(i) > 0.5 ? "#f2ede0" : "#e8c9a8"; g.fillRect(x, y0, Math.round(7 * u), h); }
        g.fillStyle = "#ffe9a8";
        for (let wy = 2 * u; wy < h - u; wy += 3 * u) if (hash(i * 13 + wy) > (lit ? 0.4 : 0.85)) g.fillRect(x + Math.round(2 * u), Math.round(y0 + wy), Math.max(1, Math.round(u)), Math.max(1, Math.round(u)));
      }
      if (!lit) {
        // yachts in the harbour
        for (let i = 0; i < 5; i++) {
          const x = Math.round(mod(i * 97 * u - this.bgX * 0.35, W + 40 * u) - 20 * u);
          g.fillStyle = "#ffffff";
          g.fillRect(x, hz - Math.round(3 * u), Math.round(14 * u), Math.round(2 * u));
          g.fillRect(x + Math.round(3 * u), hz - Math.round(5 * u), Math.round(7 * u), Math.round(2 * u));
          g.fillStyle = "#2a3a5a";
          g.fillRect(x + Math.round(4 * u), hz - Math.round(5 * u), Math.round(5 * u), Math.max(1, Math.round(u)));
        }
      }
    } else if (id === "volcano") {
      if (!lit) ridge(0.3, "#2a1a18", 8, 0.03, 3, 0.07);
      // the volcano itself, with a lava glow and a smoking crater
      const vx = Math.round(mod(W * 0.55 - this.bgX * 0.12, W + 200 * u) - 100 * u);
      const vh = Math.round(Math.min(hz * 0.75, 70 * u));
      const vw = Math.round(vh * 1.4);
      if (!lit) {
        g.fillStyle = "#3a2420";
        g.beginPath();
        g.moveTo(vx - vw, hz + 2);
        g.lineTo(vx - vw * 0.18, hz - vh);
        g.lineTo(vx + vw * 0.18, hz - vh);
        g.lineTo(vx + vw, hz + 2);
        g.fill();
      }
      g.fillStyle = "#ff6a2e";
      g.fillRect(vx - Math.round(vw * 0.17), hz - vh, Math.round(vw * 0.34), Math.max(2, Math.round(2 * u)));
      for (let k = 0; k < 5; k++) {
        const lx = vx + Math.round((hash(k * 3.3) - 0.5) * vw * 0.3);
        const len = Math.round(vh * (0.3 + hash(k * 7.1) * 0.5));
        g.fillStyle = k % 2 ? "#ff3b1a" : "#ffb02e";
        g.fillRect(lx, hz - vh, Math.max(1, Math.round(u)), len);
      }
      if (!lit) {
        for (let k = 0; k < 8; k++) {
          const t = mod(this.time * 0.15 + k / 8, 1);
          const r = Math.round((4 + t * 18) * u);
          g.globalAlpha = a * (1 - t) * 0.6;
          g.fillStyle = "#4a4040";
          g.fillRect(vx - r + Math.round(Math.sin(k * 2 + this.time) * 6 * u), hz - vh - Math.round(t * 50 * u) - r, r * 2, r * 2);
        }
        g.globalAlpha = a;
      }
    } else if (id === "moon") {
      if (!lit) {
        // Earth hangs in the black sky
        const ex = Math.round(mod(W * 0.75 - this.bgX * 0.05, W + 60 * u) - 30 * u);
        const ey = Math.round(hz * 0.3);
        const er = Math.round(Math.min(W, hz) * 0.09);
        for (let y = -er; y <= er; y++) {
          const half = Math.floor(Math.sqrt(er * er - y * y));
          g.fillStyle = "#2f6fd0";
          g.fillRect(ex - half, ey + y, half * 2, 1);
          g.fillStyle = "#3fae5a";
          if (hash(y * 3.1) > 0.45) g.fillRect(ex - Math.round(half * 0.5), ey + y, Math.round(half * (0.4 + hash(y) * 0.6)), 1);
          g.fillStyle = "#f4f4f4";
          if (Math.abs(y) > er * 0.8) g.fillRect(ex - half, ey + y, half * 2, 1);
        }
        ridge(0.25, "#5a5a64", 10, 0.02, 5, 0.06);
        // craters along the ridge
        g.fillStyle = "#43434c";
        for (let i = 0; i < 6; i++) g.fillRect(Math.round(mod(i * 71 * u - this.bgX * 0.25, W)), hz - Math.round((3 + hash(i) * 6) * u), Math.round(8 * u), Math.max(1, Math.round(2 * u)));
      }
    } else if (id === "gold") {
      // golden towers with spires
      const tower = (par, bw, hMax, colour, seed) => {
        const cs = (-this.bgX * par) / u;
        for (let i = Math.floor(cs / bw) - 1; i < Math.floor(cs / bw) + W / u / bw + 2; i++) {
          if (hash(i + seed) < 0.15) continue;
          const h = Math.round((14 + hash(i * 1.7 + seed) * hMax) * u);
          const x = Math.round((i * bw - cs) * u);
          const w = Math.round((bw - 3) * u);
          if (!lit) {
            g.fillStyle = colour;
            g.fillRect(x, hz - h, w, h + 2);
            g.fillRect(x + Math.round(w / 2) - Math.round(u / 2), hz - h - Math.round(8 * u), Math.max(1, Math.round(u)), Math.round(8 * u));
            g.fillStyle = "rgba(255,255,255,0.25)";
            g.fillRect(x, hz - h, Math.max(1, Math.round(u)), h);
          }
          g.fillStyle = lit ? "#fff3a0" : "#fff8d0";
          for (let wy = 3 * u; wy < h - 2 * u; wy += 3 * u) for (let wx = 2 * u; wx < w - u; wx += 3 * u) if (hash(i * 31 + wy * 7 + wx) > 0.55) g.fillRect(Math.round(x + wx), Math.round(hz - h + wy), Math.max(1, Math.round(u)), Math.max(1, Math.round(u)));
        }
      };
      tower(0.2, 13, 40, "#b8860b", 3);
      tower(0.5, 17, 26, "#d4a017", 41);
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

  // An electric car's lasers: thin bright beams from the back of the car down past the camera,
  // more of them (and wider apart) for rarer answers, flaring on every gear change.
  drawLasers(g, r, pipes, y, h, fade) {
    const n = Math.max(1, r.fireTier - 1);
    const step = Math.max(1, Math.round(this.u));
    const flare = r.zapT > 0 ? 2.2 : 1;
    const cols = PLASMA[r.fireTier];
    g.save();
    g.globalCompositeOperation = "lighter";
    for (const [k, px] of pipes.entries()) {
      for (let b = 0; b < n; b++) {
        const spread = (b - (n - 1) / 2) * 0.35 + (k ? 0.12 : -0.12);
        const len = this.H - y + 20;
        const x2 = px + spread * len;
        const flick = 0.55 + Math.random() * 0.45;
        for (const [wd, col, a] of [[5, cols[0], 0.35], [3, cols[1], 0.7], [1, cols[2], 1]]) {
          g.globalAlpha = a * flick * Math.min(1, fade);
          g.strokeStyle = col;
          g.lineWidth = Math.max(1, wd * step * flare * (0.6 + r.fireTier * 0.12));
          g.beginPath(); g.moveTo(px, y); g.lineTo(x2, y + len); g.stroke();
        }
      }
    }
    g.restore();
  }

  // Crackling plasma arcs: jagged lightning from each emitter, and across between them for TURBO and up.
  drawArcs(g, pipes, y, len, tier) {
    const step = Math.max(1, Math.round(this.u));
    const bolt = (x1, y1, x2, y2, segs) => {
      g.beginPath(); g.moveTo(x1, y1);
      for (let i = 1; i < segs; i++) {
        const t = i / segs;
        g.lineTo(x1 + (x2 - x1) * t + (Math.random() - 0.5) * 8 * step, y1 + (y2 - y1) * t + (Math.random() - 0.5) * 6 * step);
      }
      g.lineTo(x2, y2); g.stroke();
    };
    g.save();
    g.globalCompositeOperation = "lighter";
    g.lineWidth = step;
    g.strokeStyle = Math.random() < 0.5 ? "#e6fdff" : "#ff9df0";
    for (const px of pipes) if (Math.random() < 0.6) bolt(px, y, px + (Math.random() - 0.5) * len * 0.6, y + len * (0.4 + Math.random() * 0.5), 5);
    if (tier >= 4 && Math.random() < 0.7) bolt(pipes[0], y + 2 * step, pipes[1], y + 2 * step, 8);
    g.restore();
  }

  // A flickering pixel flame from (x, y) towards the camera: outer, middle and core layers that taper.
  drawFlame(g, x, y, width, len, colours, glow = false) {
    if (len < 1) return;
    const step = Math.max(1, Math.round(this.u));
    if (glow) {
      // a soft light around the flame so it reads at a distance and lights up the road
      const r = Math.max(width * 2.2, len * 0.7);
      const cy = y + len * 0.35;
      const grad = g.createRadialGradient(x, cy, 0, x, cy, r);
      grad.addColorStop(0, colours[1]);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      g.save();
      g.globalCompositeOperation = "lighter";
      g.globalAlpha = 0.6;
      g.fillStyle = grad;
      g.fillRect(x - r, cy - r, r * 2, r * 2);
      g.restore();
    }
    [[1, 1], [0.66, 0.72], [0.33, 0.42]].forEach(([wk, lk], layer) => {
      const l = len * lk * (0.85 + Math.random() * 0.3);
      g.fillStyle = colours[layer];
      for (let d = 0; d < l; d += step) {
        const taper = 1 - d / l;
        const fw = Math.max(step, Math.round(width * wk * (0.35 + 0.65 * taper)));
        const wob = layer < 2 ? Math.round((Math.random() - 0.5) * step * 2 * (1 - taper)) : 0;
        g.fillRect(Math.round(x - fw / 2) + wob, Math.round(y + d), fw, step);
      }
    });
  }

  // Swerving round traffic, staying on the road: each racer looks ahead; a traffic car that would
  // overlap it pushes it to whichever side has room on the tarmac, and the traffic car moves over the
  // other way to make the gap if it has to. If two cars can't fit side by side on this screen at all,
  // there's no traffic (s.trafficOff). Positions are in half-road widths: the road is -1..1.
  steer(dt) {
    if (!this.playerZ) return;
    const half = Math.max(...this.racers.map((r) => r.halfW || 0.2));
    const tHalf = half * 0.92;
    const need = half + tHalf + 0.05; // centre-to-centre gap for two cars to pass cleanly
    const edge = 1 - half - 0.03, tEdge = 1 - tHalf - 0.03; // furthest a centre can go and stay on the road
    // room on this road for a racer and a traffic car side by side (2P: a car on each side of one in the middle)
    this.trafficOff = this.racers.length > 1 ? edge < need : edge + tEdge < need;
    for (const r of this.racers) {
      r.dodge = r.dodge || 0;
      const rz = this.playerZ + ((r.gap || 0) + Math.min(7, (r.boost || 0) * 2.2) + (r.charge || 0)) * SEG;
      const x = r.lane + r.dodge;
      let target = 0;
      let threat = null;
      for (const t of this.traffic || []) {
        const ahead = t.z - this.camZ - rz;
        if (ahead < -SEG * 1.2 || ahead > SEG * 15) continue; // look about fifteen segments ahead
        const tx = t.lane + (t.shift || 0);
        if (Math.abs(tx - x) < need && (!threat || ahead < threat.ahead)) threat = { t, ahead, tx };
      }
      if (threat) {
        const { t, tx } = threat;
        // pass on a side that keeps the whole car on the road; if neither has room, take the side
        // away from the traffic car and it moves over to make the gap
        const left = tx - need, right = tx + need;
        const okL = left >= -edge, okR = right <= edge;
        let side;
        if (okL && okR) side = Math.abs(left - x) <= Math.abs(right - x) ? -1 : 1;
        else if (okL || okR) side = okL ? -1 : 1;
        else side = tx >= 0 ? -1 : 1;
        const want = side < 0 ? Math.max(-edge, Math.min(left, x)) : Math.min(edge, Math.max(right, x));
        target = clamp(want, -edge, edge) - r.lane;
        // the traffic car keeps at least `need` away on the other side, inside the road
        const tWant = clamp((r.lane + target) - side * need, -tEdge, tEdge);
        const cur = t.lane + (t.shift || 0);
        t.shift = (t.shift || 0) + clamp(tWant - cur, -dt * 1.6, dt * 1.6) * (Math.abs(tWant - cur) > 0.01 ? 1 : 0);
        r.swerve = side;
      } else r.swerve = 0;
      // ease towards it: quick to dodge, gentler coming back; never past the edge of the road
      const rate = threat ? 11 : 2.5;
      const before = r.dodge;
      r.dodge += (target - r.dodge) * Math.min(1, dt * rate);
      r.dodge = clamp(r.lane + r.dodge, -edge, edge) - r.lane;
      r.steerV = (r.dodge - before) / Math.max(dt, 1e-3);
    }
    // traffic drifts back to its lane once nobody needs the room, and always stays on the road
    for (const t of this.traffic || []) {
      if (t.shift) t.shift *= Math.max(0, 1 - dt * 0.3);
      t.shift = clamp(t.lane + (t.shift || 0), -tEdge, tEdge) - t.lane;
    }
  }

  // a slow car on the road ahead, drawn like the racers but plainer
  drawTraffic(g, t, p, rel) {
    if (!p || p.hidden) return;
    const frame = trafficSprite(t.car, Math.floor(this.time * 6) % 2);
    const s = Math.max(0.2, this.carPx * rel * 0.92);
    const w = (frame.width * s) / (frame.res || 1), h = (frame.height * s) / (frame.res || 1);
    const cx = p.sx + p.sw * (t.lane + (t.shift || 0));
    const bottom = Math.round(p.sy);
    g.fillStyle = "rgba(0,0,10,0.35)";
    g.fillRect(Math.round(cx - w * 0.5), bottom - Math.max(1, Math.round(h * 0.06)), Math.round(w), Math.max(1, Math.round(h * 0.1)));
    g.drawImage(frame, Math.round(cx - w / 2), Math.round(bottom - h), Math.round(w), Math.round(h));
  }

  drawCar(g, r, p, rel, lights) {
    const { u } = this;
    if (!p || p.hidden) { r.box = null; return; }
    const frame = r.frames[Math.abs(Math.floor(r.wheel || 0)) % 2];
    const s = Math.max(0.25, this.carPx * rel);
    const w = (frame.width * s) / (frame.res || 1); // a detailed car has twice the pixels, drawn at half size
    const h = (frame.height * s) / (frame.res || 1);
    const bounce = Math.sin(this.time * 24 + r.lane * 5) > 0.6 && this.speed > 0.1 ? Math.round(u) : 0;
    const lift = this.calm ? 0 : Math.sin((1 - r.lift) * Math.PI) * r.lift * h * 0.25;
    const jitter = this.revT > 0 && !this.calm ? Math.round((Math.random() - 0.5) * 2 * u) : 0;
    const cx = p.sx + p.sw * (r.lane + (r.dodge || 0)) + r.drift * this.W * rel;
    r.halfW = p.sw > 0 ? w / 2 / p.sw : 0.2;
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
    const shadow = g.createRadialGradient(cx, bottom, 0, cx, bottom, w * 0.6);
    shadow.addColorStop(0, "rgba(0,0,10,0.55)");
    shadow.addColorStop(0.7, "rgba(0,0,10,0.3)");
    shadow.addColorStop(1, "rgba(0,0,10,0)");
    g.fillStyle = shadow;
    g.save();
    g.translate(cx, bottom);
    g.scale(1, 0.12);
    g.translate(-cx, -bottom);
    g.fillRect(cx - w * 0.6, bottom - w * 0.6, w * 1.2, w * 1.2);
    g.restore();

    // neon premium cars: a pulsing underglow on the road
    if (r.car?.fx === "neon" && !this.calm) {
      const glow = g.createRadialGradient(cx, bottom, 0, cx, bottom, w * 0.75);
      glow.addColorStop(0, r.car.accent);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      g.save();
      g.globalCompositeOperation = "lighter";
      g.globalAlpha = 0.45 + 0.25 * Math.sin(this.time * 6) + Math.min(0.3, r.boost * 0.2);
      g.translate(cx, bottom); g.scale(1, 0.22); g.translate(-cx, -bottom);
      g.fillStyle = glow;
      g.fillRect(cx - w, bottom - w, w * 2, w * 2);
      g.restore();
    }
    // exhaust fire out of both pipes, towards the camera: longer and hotter for rarer answers
    if (r.fireT > 0 && !this.calm && elec(r)) {
      const fade = Math.min(1, r.fireT / 0.6) * (r.popT > 0 ? 1.5 : 1);
      const len = h * FIRE_LEN[r.fireTier] * fade;
      const pipes = [left + w * 0.22, left + w * 0.78];
      this.drawLasers(g, r, pipes, bottom - h * 0.2, h, fade);
      for (const fx of pipes) this.drawFlame(g, fx, bottom - h * 0.2, Math.max(3, s * (2.6 + r.fireTier * 0.5)), len * 0.8, PLASMA[r.fireTier], true);
      this.drawArcs(g, pipes, bottom - h * 0.2, len, r.fireTier);
    } else if (r.car?.megaFire && !this.calm && (r.fireT > 0 || r.boost > 0.05 || r.popT > 0)) {
      // AUDI 5000: insanely large flames out of both tips, always on while it moves, enormous on a pop
      const tier = Math.max(3, r.fireTier || 0);
      const fade = (r.fireT > 0 ? Math.min(1, r.fireT / 0.6) : Math.min(0.75, 0.35 + r.boost * 0.4)) * (r.popT > 0 ? 1.8 : 1);
      const len = h * (2.9 + tier * 0.6) * fade * (0.9 + Math.random() * 0.2);
      const fw = Math.max(12, s * (20 + tier * 4)) * (r.popT > 0 ? 1.5 : 1);
      const rgb = (hue, l) => `rgb(${hsl(mod(hue, 360), 1, l).map(Math.round).join(",")})`;
      const cols = tier === 5 ? [rgb(this.time * 540, 0.55), rgb(this.time * 540 + 90, 0.65), "#ffffff"] : ["#ff3b1f", "#ffa41f", "#fff6d0"];
      // the fire lights up the road around the car
      g.save();
      g.globalCompositeOperation = "lighter";
      const glow = g.createRadialGradient(cx, bottom, 0, cx, bottom, w * 1.6);
      glow.addColorStop(0, `rgba(255,140,40,${Math.min(0.55, 0.25 + fade * 0.25)})`);
      glow.addColorStop(1, "rgba(255,60,0,0)");
      g.fillStyle = glow;
      g.fillRect(cx - w * 1.6, bottom - w * 1.6, w * 3.2, w * 3.2);
      g.restore();
      for (const fx of [left + w * 0.2, left + w * 0.8]) {
        this.drawFlame(g, fx, bottom - h * 0.18, fw * 1.25, len * 1.1, ["#b01a0a", "#ff5a1f", "#ffb84a"], true); // the outer roar
        this.drawFlame(g, fx, bottom - h * 0.18, fw, len, cols, true);
      }
    } else if (r.car?.reggae && !this.calm && (r.fireT > 0 || r.popT > 0)) {
      // ZIG'S WHIP: green, gold and white-hot flames, swelling on every rimshot
      const tier = Math.max(2, r.fireTier || 0);
      const fade = (r.fireT > 0 ? Math.min(1, r.fireT / 0.6) : 0.6) * (r.popT > 0 ? 1.8 : 1);
      const len = h * Math.max(0.3, FIRE_LEN[tier]) * 1.3 * fade;
      for (const fx of [left + w * 0.2, left + w * 0.8]) this.drawFlame(g, fx, bottom - h * 0.16, Math.max(3, s * (3.4 + tier * 0.6)), len, r.popT > 0 ? ["#e0201b", "#ffd23a", "#ffffff"] : RASTA_FLAME, true);
    } else if (r.car?.v12 && !this.calm && (r.fireT > 0 || r.boost > 0.05 || r.popT > 0)) {
      // NICO'S CRAZY CAR: giant flames out of both huge tips, even on a common answer, flaring on every pop
      const tier = Math.max(2, r.fireTier || 0);
      const fade = (r.fireT > 0 ? Math.min(1, r.fireT / 0.6) : Math.min(0.7, 0.3 + r.boost * 0.4)) * (r.popT > 0 ? 2.1 : 1);
      const len = h * Math.max(0.35, FIRE_LEN[tier]) * 1.8 * fade;
      const rgb = (hue, l) => `rgb(${hsl(mod(hue, 360), 1, l).map(Math.round).join(",")})`;
      const cols = tier === 5 ? [rgb(this.time * 540, 0.55), rgb(this.time * 540 + 90, 0.65), "#ffffff"] : r.popT > 0 ? ["#ff5a1f", "#ffd23a", "#ffffff"] : FIRE[tier];
      for (const fx of [left + w * 0.167, left + w * 0.833]) this.drawFlame(g, fx, bottom - h * 0.18, Math.max(4, s * (4.6 + tier * 0.8)), len, cols, true);
    } else if (r.fireT > 0 && !this.calm) {
      const fade = Math.min(1, r.fireT / 0.6) * (r.popT > 0 ? 1.7 : 1);
      const len = h * FIRE_LEN[r.fireTier] * fade;
      const rgb = (hue, l) => `rgb(${hsl(mod(hue, 360), 1, l).map(Math.round).join(",")})`;
      const cols = r.fireTier === 5 ? [rgb(this.time * 540, 0.55), rgb(this.time * 540 + 90, 0.65), "#ffffff"] : FIRE[r.fireTier];
      for (const fx of [left + w * 0.2, left + w * 0.8]) this.drawFlame(g, fx, bottom - h * 0.2, Math.max(3, s * (3.2 + r.fireTier * 0.6)), len, cols, true);
    }
    // nitro: long blue jets on top of the fire
    if (r.nitro && r.boost > 0.05 && !this.calm) {
      const len = h * (0.35 + Math.min(1.5, r.boost) * 0.2);
      for (const fx of [left + w * 0.2, left + w * 0.8]) this.drawFlame(g, fx, bottom - h * 0.18, Math.max(2, s * 1.8), len, elec(r) ? ["#8a1fd6", "#ff4fd8", "#ffffff"] : ["#2f6bff", "#4fd1ff", "#ffffff"]);
    }

    // lean into bends
    const roll = this.calm ? 0 : clamp(-curveAt(p.i) * 0.016 + clamp((r.steerV || 0) * 0.05, -0.12, 0.12), -0.16, 0.16);
    g.save();
    g.translate(cx, bottom);
    g.rotate(roll);
    g.drawImage(s >= 1.5 ? carArt(frame) : frame, Math.round(-w / 2), Math.round(-h), Math.round(w), Math.round(h));
    g.restore();
    // A-DOG'S HONDEEZY: the rocket booster fires straight at the camera while it boosts
    if (r.car?.rocket && !this.calm && (r.boost > 0.05 || r.fireT > 0)) {
      const power = Math.min(1.6, Math.max(r.boost, r.fireT > 0 ? 0.6 + r.fireTier * 0.15 : 0));
      const nx = cx, ny = bottom - h + h * 0.2;
      const R = w * (0.22 + power * 0.14) * (0.9 + Math.random() * 0.2);
      g.save();
      g.globalCompositeOperation = "lighter";
      const glow = g.createRadialGradient(nx, ny, 0, nx, ny, R * 2.4);
      glow.addColorStop(0, "rgba(255,255,240,0.95)");
      glow.addColorStop(0.25, "rgba(255,210,80,0.8)");
      glow.addColorStop(0.6, "rgba(255,110,30,0.35)");
      glow.addColorStop(1, "rgba(255,60,0,0)");
      g.fillStyle = glow;
      g.fillRect(nx - R * 2.4, ny - R * 2.4, R * 4.8, R * 4.8);
      g.restore();
      this.drawFlame(g, nx, ny, Math.max(4, R * 1.5), h * (0.5 + power * 0.6), ["#ff7a1f", "#ffd23a", "#ffffff"], false);
      // shock diamonds in the plume
      g.fillStyle = "rgba(200,230,255,0.9)";
      for (let k = 1; k <= 3; k++) { const d = Math.max(1, Math.round(R * (0.5 - k * 0.1))); g.fillRect(Math.round(nx - d / 2), Math.round(ny + k * R * 0.55), d, d); }
    }
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
        g.rect(0, 0, this.W, Math.min(...lights.map((o) => o.bottom - o.h * 0.92))); // beams shine ahead, never over the cars
        g.clip();
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
      if (d.type === "ash") {
        g.fillStyle = d.s > 1.1 ? "#ff8a2e" : d.s > 0.9 ? "#ffd23a" : "#6a5a5a";
        g.fillRect(Math.round(d.x), Math.round(d.y), Math.max(1, Math.round(u)), Math.max(1, Math.round(u)));
      } else if (d.type === "snow") {
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
    // the boost stretches the lines out and adds more of them
    if (this.speed > 0.45 || this.stretch > 0.1) draw(Math.round(10 + this.speed * 24 + this.stretch * 26), 0.55 + Math.min(0.3, this.stretch * 0.2), ["#ffffff"], this.speed * (1 + this.stretch), 0.8 + this.speed + this.stretch * 0.5);
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
