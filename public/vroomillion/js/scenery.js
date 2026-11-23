// Scenery for the race (used by chase.js): a living sky, sky shows for rare answers, per-area mountains,
// landmarks, ground detail, traffic to overtake, crowds that react and banners that stay for the race.
// Everything here is drawn in "art pixels" (s.u canvas pixels each) to match the rest of the game.
import { CARS, rearSprite } from "./cars.js";

const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const mod = (a, n) => ((a % n) + n) % n;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const TIER_COL = ["#6f6a80", "#c4c1d4", "#5dff8f", "#4f9dff", "#c070ff", "#ffd23f"];

// a small canvas from rows of characters
function art(rows, pal) {
  const cv = document.createElement("canvas");
  cv.width = rows[0].length;
  cv.height = rows.length;
  const g = cv.getContext("2d");
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x, y, 1, 1); } }));
  return cv;
}

// ---------- clouds ----------
// a few puffy pixel clouds in three lights: day, sunset and night
let CLOUDS = null;
function clouds() {
  if (CLOUDS) return CLOUDS;
  const shapes = [[[8, 7, 6], [16, 5, 8], [25, 7, 6], [33, 8, 5]], [[7, 6, 5], [14, 4, 7], [22, 6, 5]], [[9, 6, 7], [19, 5, 9], [30, 6, 7], [40, 8, 5], [47, 9, 4]], [[6, 5, 4], [12, 4, 6], [18, 5, 4]]];
  const lights = { day: ["#ffffff", "#dde6f5"], dusk: ["#ffd0c0", "#e8879a"], night: ["#3a3a66", "#26264a"] };
  CLOUDS = shapes.map((puffs) => {
    const w = Math.max(...puffs.map(([x, , r]) => x + r)) + 2, h = 16;
    const out = {};
    for (const [k, [top, bottom]] of Object.entries(lights)) {
      const cv = document.createElement("canvas");
      cv.width = w; cv.height = h;
      const g = cv.getContext("2d");
      for (const [x, y, r] of puffs) for (let yy = -r; yy <= r; yy++) {
        const half = Math.floor(Math.sqrt(r * r - yy * yy));
        g.fillStyle = y + yy > 9 ? bottom : top;
        g.fillRect(x - half, y + yy, half * 2, 1);
      }
      g.fillStyle = bottom; g.fillRect(2, 10, w - 4, 2); // flat bottom
      out[k] = cv;
    }
    return out;
  });
  return CLOUDS;
}
// how cloudy each area is (0..1) and how high the clouds sit
const CLOUDINESS = { city: 0.5, coast: 0.8, desert: 0.15, alpine: 0.7, neon: 0.25, scrap: 0.6, town: 0.9, beach: 0.7, monaco: 0.45, summit: 0.6, volcano: 0, moon: 0, gold: 0.3 };

export function drawClouds(s, g, zone, tod, near = false) {
  const amt = CLOUDINESS[zone] ?? 0.4;
  if (!amt) return;
  const { W, u } = s;
  const hz = s.horizon;
  const sprites = clouds();
  const n = Math.round((near ? 3 : 6) * amt * (s.lite ? 0.5 : 1));
  // day → sunset → night by the sun's height
  const dusk = clamp(1 - Math.abs(tod.sun - 0.1) * 4, 0, 1), night = clamp(-tod.sun * 4 + 0.2, 0, 1), day = clamp(1 - dusk - night, 0, 1);
  const par = near ? 0.1 : 0.04, drift = near ? 6 : 3;
  const span = W + 120 * u;
  for (let i = 0; i < n; i++) {
    const c = sprites[Math.floor(hash(i * 3.7 + (near ? 50 : 0)) * sprites.length)];
    const sc = (near ? 2 : 1) * u * (0.8 + hash(i * 1.3) * 0.6);
    const x = mod(hash(i * 9.1) * span + s.time * drift * u * (0.5 + hash(i)) + s.bgX * par, span) - 60 * u;
    const y = Math.round(hz * (near ? 0.18 + hash(i * 5.5) * 0.3 : 0.08 + hash(i * 5.5) * 0.42));
    for (const [k, a] of [["day", day], ["dusk", dusk], ["night", night]]) {
      if (a < 0.03) continue;
      g.globalAlpha = a * (near ? 0.95 : 0.8);
      g.drawImage(c[k], Math.round(x), y, Math.round(c[k].width * sc), Math.round(c[k].height * sc));
    }
  }
  g.globalAlpha = 1;
}

// ---------- life in the sky: birds, planes, a blimp, balloons, shooting stars, satellites ----------
const BIRDS = ["coast", "town", "beach", "alpine", "summit", "monaco", "scrap"];
const BLIMP = ["city", "neon", "gold", "monaco"];
const BALLOON = ["town", "summit", "desert"];
export function drawSkyLife(s, g, zone, tod) {
  const { W, u } = s;
  const hz = s.horizon;
  const t = s.time;
  const px = (x, y, w = 1, h = 1) => g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w * u)), Math.max(1, Math.round(h * u)));
  const day = tod.sun > 0.15;
  // a flock of birds crossing now and then, wings flapping
  if (day && BIRDS.includes(zone)) {
    const cycle = 14, k = Math.floor(t / cycle), p = (t % cycle) / cycle;
    if (hash(k * 2.1) < 0.75) {
      const dir = hash(k * 3.3) < 0.5 ? 1 : -1;
      const bx = dir > 0 ? -40 * u + p * (W + 80 * u) : W + 40 * u - p * (W + 80 * u);
      const by = hz * (0.15 + hash(k * 7.7) * 0.35);
      g.fillStyle = zone === "summit" || zone === "alpine" ? "#2a2a44" : "#1e1e30";
      for (let b = 0; b < 4 + Math.floor(hash(k) * 4); b++) {
        const ox = bx - dir * (b % 2 ? b * 6 : b * 7) * u, oy = by + (b % 2 ? b * 3 : -b * 2) * u + Math.sin(t * 3 + b) * 2 * u;
        const flap = Math.floor(t * 8 + b) % 2;
        px(ox - 3 * u, oy - flap * u, 2, 1); px(ox + u, oy - flap * u, 2, 1); px(ox - u, oy, 2, 1);
      }
    }
  }
  // an airliner high up: a white contrail by day, blinking lights at night
  if (zone !== "moon" && zone !== "volcano") {
    const cycle = 22, k = Math.floor(t / cycle + 0.5), p = ((t / cycle + 0.5) % 1);
    if (hash(k * 5.1) < 0.6) {
      const x = -30 * u + p * (W + 60 * u), y = hz * (0.08 + hash(k * 1.7) * 0.12);
      if (day) {
        g.fillStyle = "rgba(255,255,255,0.55)";
        g.fillRect(Math.round(x - 60 * u), Math.round(y + u), Math.round(56 * u), Math.max(1, Math.round(u)));
        g.fillStyle = "#e8ecf4"; px(x - 4 * u, y, 6, 1); px(x - 2 * u, y - u, 2, 1); px(x - 4 * u, y + u, 2, 1);
      } else {
        g.fillStyle = Math.floor(t * 2) % 2 ? "#ff3b3b" : "#ffffff"; px(x, y, 1, 1);
        g.fillStyle = "#5dff8f"; px(x - 3 * u, y, 1, 1);
      }
    }
  }
  // a slow blimp over the city areas, with the game's name on the side
  if (BLIMP.includes(zone)) {
    const x = mod(W * 0.7 + t * 4 * u + s.bgX * 0.06, W + 120 * u) - 60 * u, y = hz * 0.24 + Math.sin(t * 0.7) * 2 * u;
    g.fillStyle = "#c9ced6";
    for (let yy = -5; yy <= 5; yy++) { const half = Math.floor(Math.sqrt(1 - (yy * yy) / 30) * 18); g.fillRect(Math.round(x - half * u), Math.round(y + yy * u), Math.round(half * 2 * u), Math.max(1, Math.round(u))); }
    g.fillStyle = "#9aa0ac"; px(x - 18 * u, y - 4 * u, 3, 8); px(x - 3 * u, y + 5 * u, 6, 2);
    g.fillStyle = zone === "gold" ? "#ffd23a" : "#ff4fd8"; px(x - 10 * u, y - u, 20, 2);
    if (!day) { g.fillStyle = Math.floor(t * 3) % 2 ? "#ffffff" : "#ff4fd8"; px(x + 17 * u, y, 1, 1); }
  }
  // hot-air balloons drifting
  if (day && BALLOON.includes(zone)) {
    for (let b = 0; b < (s.lite ? 1 : 2); b++) {
      const x = mod(W * (0.2 + b * 0.5) + t * (2 + b) * u + s.bgX * 0.08, W + 60 * u) - 30 * u, y = hz * (0.3 + b * 0.18) + Math.sin(t * 0.8 + b) * 3 * u;
      const cols = [["#ff4f5e", "#ffd23a"], ["#4fd1ff", "#ffffff"]][b];
      for (let yy = -6; yy <= 5; yy++) {
        const half = Math.floor(Math.sqrt(1 - (yy * yy) / 40) * 5);
        g.fillStyle = cols[(yy + 6) % 4 < 2 ? 0 : 1];
        g.fillRect(Math.round(x - half * u), Math.round(y + yy * u), Math.round(half * 2 * u), Math.max(1, Math.round(u)));
      }
      g.fillStyle = "#6a4428"; px(x - u, y + 8 * u, 3, 2);
      g.fillStyle = "#3a2a1a"; px(x - 2 * u, y + 6 * u, 1, 2); px(x + 2 * u, y + 6 * u, 1, 2);
    }
  }
  // shooting stars at night
  if (tod.stars > 0.4) {
    const cycle = 3.5, k = Math.floor(t / cycle), p = (t % cycle) / cycle;
    if (hash(k * 4.4) < 0.7 && p < 0.25) {
      const sx = W * (0.1 + hash(k * 2.2) * 0.8), sy = hz * (0.05 + hash(k * 6.6) * 0.3);
      const d = p / 0.25;
      g.globalAlpha = 1 - d;
      g.fillStyle = "#ffffff";
      for (let i = 0; i < 14; i++) px(sx + (d * 40 - i) * u * 1.4, sy + (d * 40 - i) * u * 0.5, 1, 1);
      g.globalAlpha = 1;
    }
  }
  // satellites crossing the black sky on the Moon
  if (zone === "moon") {
    const x = mod(t * 9 * u, W + 40 * u) - 20 * u, y = hz * 0.16;
    g.fillStyle = "#4f9dff"; px(x - 4 * u, y, 3, 1); px(x + 2 * u, y, 3, 1);
    g.fillStyle = "#d8dde6"; px(x - u, y - u, 2, 3);
  }
}

// ---------- sky shows for rare answers: fireworks, an aurora, a comet ----------
export function skyShow(s, tier) {
  if (s.calm || tier < 3) return;
  s.fireworks = s.fireworks || [];
  const bursts = [0, 0, 0, 3, 6, 12][tier];
  for (let b = 0; b < bursts; b++) s.fireworks.push({ t: -b * 0.28 - Math.random() * 0.2, x: 0.12 + Math.random() * 0.76, y: 0.15 + Math.random() * 0.45, col: Math.random() < 0.5 ? TIER_COL[tier] : ["#ff4fd8", "#ffd23a", "#4fd1ff", "#5dff8f", "#ffffff"][b % 5], sparks: null });
  if (tier >= 4) s.aurora = Math.max(s.aurora || 0, tier === 5 ? 6 : 4);
  if (tier === 5) s.comet = 3.2;
}
export function drawSkyShow(s, g) {
  const { W, u } = s;
  const hz = s.horizon;
  // aurora: ribbons waving over the mountains
  if (s.aurora > 0) {
    const a = Math.min(1, s.aurora / 1.5);
    for (const [k, col] of [[0, "93,255,143"], [1, "192,112,255"], [2, "79,209,255"]]) {
      g.fillStyle = `rgba(${col},${(0.18 * a).toFixed(3)})`;
      for (let x = 0; x < W; x += 2 * u) {
        const y = hz * (0.18 + k * 0.08) + Math.sin(x / (30 * u) + s.time * (1 + k * 0.3) + k) * 10 * u;
        const h = (18 + Math.sin(x / (17 * u) + s.time * 2 + k) * 8) * u;
        g.fillRect(x, Math.round(y), 2 * u, Math.round(h));
      }
    }
  }
  // a comet streaking across with a long glowing tail
  if (s.comet > 0) {
    const p = 1 - s.comet / 3.2;
    const cx = W * (1.1 - p * 1.3), cy = hz * (0.12 + p * 0.25);
    for (let i = 0; i < 60; i++) {
      g.globalAlpha = (1 - i / 60) * 0.8;
      g.fillStyle = i < 4 ? "#ffffff" : i % 3 ? "#9fe3ff" : "#ff4fd8";
      const sz = Math.max(1, Math.round((3 - i / 25) * u));
      g.fillRect(Math.round(cx + i * 2.2 * u), Math.round(cy - i * 0.7 * u), sz, sz);
    }
    g.globalAlpha = 1;
  }
  // fireworks: a rocket climbs, bursts into a ring of sparks that fall and fade
  for (const f of s.fireworks || []) {
    if (f.t < 0) continue;
    const x = f.x * W, y = f.y * hz;
    if (f.t < 0.5) {
      g.fillStyle = "#fff6c2";
      g.fillRect(Math.round(x), Math.round(hz - (hz - y) * (f.t / 0.5)), Math.max(1, u), Math.max(2, 2 * u));
      continue;
    }
    const k = f.t - 0.5;
    g.globalAlpha = clamp(1 - k / 1.4, 0, 1);
    g.fillStyle = f.col;
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const r = (8 + k * 40) * u;
      g.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r + k * k * 14 * u), Math.max(1, Math.round(u * 1.5)), Math.max(1, Math.round(u * 1.5)));
    }
    if (k < 0.15) { g.fillStyle = "#ffffff"; g.fillRect(Math.round(x - 3 * u), Math.round(y - 3 * u), Math.round(6 * u), Math.round(6 * u)); }
    g.globalAlpha = 1;
  }
}

// ---------- mountains: each area has its own range ----------
// h: height (share of the sky), f: how wide the peaks are, jag: sharpness, snow, tone: colour mixed in
export const MOUNTAINS = {
  city: [{ par: 0.04, h: 0.14, f: 0.02, jag: 0, tone: "#20183a", mix: 0.6 }],
  coast: [{ par: 0.03, h: 0.1, f: 0.006, jag: 0, tone: "#3a6a8a", mix: 0.35, islands: true }],
  desert: [{ par: 0.04, h: 0.16, f: 0.005, jag: 0, tone: "#8a4a3a", mix: 0.45 }, { par: 0.1, h: 0.08, f: 0.012, jag: 0, tone: "#b0603a", mix: 0.5 }],
  alpine: [{ par: 0.05, h: 0.42, f: 0.013, jag: 1, snow: true, tone: "#2a3a6a", mix: 0.35 }, { par: 0.12, h: 0.24, f: 0.026, jag: 0.6, tone: "#1a2a4a", mix: 0.55 }],
  neon: [{ par: 0.05, h: 0.26, f: 0.018, jag: 1, tone: "#120626", mix: 0.8, neon: "#ff4fd8" }, { par: 0.11, h: 0.14, f: 0.03, jag: 1, tone: "#0a0418", mix: 0.85, neon: "#4fd1ff" }],
  scrap: [{ par: 0.05, h: 0.2, f: 0.01, jag: 0.2, tone: "#4a4038", mix: 0.5 }],
  town: [{ par: 0.04, h: 0.2, f: 0.008, jag: 0, tone: "#3a7a4a", mix: 0.4 }, { par: 0.1, h: 0.11, f: 0.016, jag: 0, tone: "#2e6a34", mix: 0.5 }],
  beach: [{ par: 0.03, h: 0.09, f: 0.005, jag: 0, tone: "#3a6a8a", mix: 0.35, islands: true }],
  monaco: [{ par: 0.04, h: 0.3, f: 0.009, jag: 0.4, tone: "#4a5a4a", mix: 0.4 }],
  summit: [{ par: 0.05, h: 0.46, f: 0.012, jag: 1, snow: true, tone: "#2a3a6a", mix: 0.3 }, { par: 0.12, h: 0.26, f: 0.024, jag: 0.8, snow: true, tone: "#22325a", mix: 0.45 }],
  volcano: [{ par: 0.05, h: 0.24, f: 0.016, jag: 1, tone: "#1a0806", mix: 0.7 }],
  moon: [],
  gold: [{ par: 0.04, h: 0.12, f: 0.02, jag: 0, tone: "#5a2a6a", mix: 0.5 }],
};

// ---------- landmarks: each area's big thing on the skyline, now and then ----------
// drawn on the world layer behind the road. lit > 0: only the lights, for night.
export function drawLandmark(s, g, zone, lit) {
  const { W, u } = s;
  const hz = s.horizon;
  const span = W * 2.2;
  const x0 = mod(W * 0.75 + s.bgX * 0.09, span) - W * 0.3;
  if (x0 < -80 * u || x0 > W + 80 * u) return;
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x0 + x * u), Math.round(hz - y * u), Math.max(1, Math.round(w * u)), Math.max(1, Math.round(h * u))); };
  const blink = Math.floor(s.time * 2) % 2;
  if (lit) {
    if (zone === "city") R(0, 92, 1, 1, blink ? "#ff3b3b" : "#3b0b0b");
    if (zone === "coast") { const a0 = g.globalAlpha; g.globalAlpha = a0 * 0.5; for (let k = 0; k < 3; k++) R(1 + (Math.sin(s.time * 2) * 18 + k * 6), 47, 6, 1, "#fff6a0"); g.globalAlpha = a0; R(-1, 48, 3, 3, "#fff6a0"); }
    if (zone === "neon") { R(-24, 46, 48, 1, "#ff4fd8"); R(-24, 33, 48, 1, "#ff4fd8"); }
    if (zone === "beach") for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + s.time * 0.5; R(30 + Math.cos(a) * 14, 26 + Math.sin(a) * 14, 1, 1, ["#ff4fd8", "#ffd23a", "#4fd1ff"][k % 3]); }
    if (zone === "gold") R(-1, 70, 2, 2, "#fff6a0");
    return;
  }
  if (zone === "city") {
    // a needle tower with a pod near the top
    R(-1, 90, 2, 90, "#2a2440"); R(-6, 70, 12, 5, "#3a3256"); R(-4, 65, 8, 2, "#2a2440"); R(-3, 40, 6, 40, "#2a2440");
  } else if (zone === "coast") {
    // a lighthouse on a rock
    R(-6, 6, 12, 6, "#3a3a4a"); R(-3, 44, 6, 38, "#f4f4f4"); for (let k = 0; k < 3; k++) R(-3, 36 - k * 12, 6, 5, "#d9363e"); R(-4, 50, 8, 6, "#2a2a3a"); R(-2, 49, 4, 3, "#fff6a0");
  } else if (zone === "desert") {
    // a giant radio telescope dish
    R(-2, 30, 4, 30, "#8a7a6a"); R(-14, 42, 28, 3, "#d9d2c0"); R(-11, 45, 22, 3, "#e8e2d0"); R(-7, 48, 14, 3, "#f4f0e0"); R(-1, 56, 2, 8, "#8a7a6a");
  } else if (zone === "alpine" || zone === "summit") {
    // a cable car line, and an observatory dome on the summit
    g.fillStyle = "#1a1a2a";
    for (let x = -60; x < 60; x += 1) g.fillRect(Math.round(x0 + x * u), Math.round(hz - (30 + x * 0.35) * u), Math.max(1, Math.round(u)), Math.max(1, Math.round(u)));
    const cx = mod(s.time * 6, 120) - 60;
    R(cx - 3, 30 + cx * 0.35 - 2, 6, 5, "#d9363e"); R(cx - 2, 30 + cx * 0.35 - 3, 4, 2, "#9fe3ff");
    if (zone === "summit") { R(30, 40, 16, 8, "#e8ecf4"); R(32, 46, 12, 4, "#d8dde6"); R(36, 48, 4, 2, "#8a8a9a"); }
  } else if (zone === "neon") {
    // a giant neon sign on a frame
    R(-26, 48, 52, 18, "#1a0a2e"); R(-1, 30, 2, 30, "#2a1a40"); R(-20, 44, 3, 10, "#ff4fd8"); R(-14, 44, 3, 10, "#4fd1ff"); R(-8, 44, 3, 10, "#ffd23a"); R(-2, 44, 3, 10, "#5dff8f"); R(4, 44, 3, 10, "#ff4fd8"); R(10, 44, 3, 10, "#4fd1ff"); R(16, 44, 3, 10, "#ffd23a");
  } else if (zone === "town") {
    // a water tower on legs
    R(-8, 44, 16, 10, "#c9ced6"); R(-7, 46, 14, 2, "#e8ecf4"); R(-9, 34, 18, 2, "#9aa0ac");
    for (const lx of [-7, -2, 3, 7]) R(lx, 32, 1, 32, "#6a7080");
    R(-6, 40, 12, 2, "#d9363e");
  } else if (zone === "beach") {
    // the pier and a ferris wheel
    R(-40, 6, 90, 2, "#8a6a4a"); for (let k = -38; k < 50; k += 8) R(k, 6, 1, 6, "#6a4a2a");
    g.fillStyle = "#e8ecf4";
    for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2; g.fillRect(Math.round(x0 + (30 + Math.cos(a) * 14) * u), Math.round(hz - (26 + Math.sin(a) * 14) * u), Math.max(1, Math.round(u)), Math.max(1, Math.round(u))); }
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + s.time * 0.5; R(29 + Math.cos(a) * 14, 27 + Math.sin(a) * 14, 3, 3, ["#ff4f5e", "#ffd23a", "#4fd1ff", "#5dff8f"][k % 4]); }
    R(23, 12, 2, 14, "#c9ced6"); R(35, 12, 2, 14, "#c9ced6");
  } else if (zone === "monaco") {
    // the casino dome
    R(-16, 20, 32, 20, "#ece0c8"); R(-12, 30, 24, 10, "#f4ecd8"); R(-6, 36, 12, 6, "#7aa0a0"); R(-1, 40, 2, 4, "#d9b25a"); for (let k = -14; k < 16; k += 5) R(k, 18, 2, 14, "#d8ccb0");
  } else if (zone === "scrap") {
    // a car crusher with a squashed car stack
    R(-14, 24, 28, 24, "#5a4a3a"); R(-12, 22, 24, 6, "#d9a03a"); for (let k = 0; k < 4; k++) R(-10, 14 - k * 3, 20, 3, ["#8a3a3a", "#3a5a8a", "#6a6a3a", "#5a3a6a"][k]);
  } else if (zone === "gold") {
    // a giant golden trophy
    R(-3, 20, 6, 20, "#b8860b"); R(-10, 4, 20, 4, "#8a6a0a"); R(-12, 60, 24, 4, "#ffd23a"); R(-10, 56, 20, 24, "#ffd23a"); R(-8, 34, 16, 4, "#e8b820"); R(-16, 54, 4, 10, "#e8b820"); R(12, 54, 4, 10, "#e8b820"); R(-2, 50, 4, 6, "#fff3a0");
  }
}

// ---------- ground detail and roadside life ----------
let BITS = null;
export function bits() {
  if (BITS) return BITS;
  const B = {};
  B.tuft = art(["..G.G..", ".GgGgG.", "GgGGGgG"], { G: "#2e7a34", g: "#4fae3c" });
  B.flowers = art([".R...Y.", "RGR.YGY", ".G...G.", "GGG.GGG"], { R: "#ff4f5e", Y: "#ffd23a", G: "#2e7a34" });
  B.shrub = art(["..b.b..", ".bbbbb.", "bb.b.bb", "..b.b.."], { b: "#8a6a3a" });
  B.skull = art([".WWW.", "WKWKW", ".WWW.", ".W.W."], { W: "#f0e8d8", K: "#3a2a2a" });
  B.drift = art(["..WWWW..", ".WWWWWWW", "WWWwwWWW"], { W: "#f4f8ff", w: "#d8e2f4" });
  B.shell = art([".PP.", "PpPp", ".PP."], { P: "#ffb3c8", p: "#ffd6e0" });
  B.towel = art(["RWRWRWRW", "WRWRWRWR", "RWRWRWRW"], { R: "#ff4f5e", W: "#ffffff" });
  B.cone = art(["..O..", ".OWO.", ".OOO.", "OWWWO", "KKKKK"], { O: "#ff7a1f", W: "#ffffff", K: "#2a2a2a" });
  B.hydrant = art([".RR.", "RRRR", ".RR.", ".RR.", "RRRR"], { R: "#d9363e" });
  B.barrel = art(["BBBB", "bbbb", "BBBB", "bbbb", "BBBB"], { B: "#3a5a8a", b: "#2a4a6a" });
  B.vent = art(["..s..", ".s.s.", "..s..", "KKKKK"], { s: "#9a8a8a", K: "#3a2222" });
  B.crack = art(["O..O..O", ".OOOOO.", "..O.O.."], { O: "#ff6a2e" });
  B.pebble = art([".gg.", "gGGg"], { g: "#9a9aa4", G: "#7a7a84" });
  B.coins = art(["..Y..", ".YyY.", "YyYyY"], { Y: "#ffd23a", y: "#fff3a0" });
  B.planter = art(["GGGG", "gGgG", "WWWW", "WWWW"], { G: "#2e7a34", g: "#4fae3c", W: "#e8e2d0" });
  B.fence = art(["W.W.W.W", "WWWWWWW", "W.W.W.W", "W.W.W.W"], { W: "#f4f4f4" });
  // a crowd of six people, two frames: arms down, arms up (cheering)
  B.crowd = [0, 1].map((up) => {
    const cv = document.createElement("canvas");
    cv.width = 26; cv.height = 12;
    const g = cv.getContext("2d");
    const shirts = ["#ff4f5e", "#4fd1ff", "#ffd23a", "#5dff8f", "#c070ff", "#ff7a1f"], skin = ["#f2c8a0", "#c88a5a", "#8a5a3a", "#f2d8b8"];
    for (let p = 0; p < 6; p++) {
      const x = 1 + p * 4, h = p % 2 ? 0 : 1;
      g.fillStyle = skin[p % 4]; g.fillRect(x + 1, 1 + h, 2, 2);
      g.fillStyle = shirts[p]; g.fillRect(x, 3 + h, 4, 4);
      g.fillStyle = "#2a2a40"; g.fillRect(x, 7 + h, 1, 4 - h); g.fillRect(x + 3, 7 + h, 1, 4 - h);
      g.fillStyle = skin[p % 4];
      if (up) { g.fillRect(x - 1, h, 1, 3); g.fillRect(x + 4, h, 1, 3); } else { g.fillRect(x - 1, 4 + h, 1, 3); g.fillRect(x + 4, 4 + h, 1, 3); }
    }
    return cv;
  });
  // a waving banner on a pole, one per rarity colour, two frames
  B.banner = TIER_COL.map((col) => [0, 1].map((f) => art([
    "P" + (f ? "CCCCC." : "CCCC.."),
    "P" + (f ? "CCCCCC" : "CCCCC."),
    "P" + (f ? "CWWCCC" : "CWWCC."),
    "P" + (f ? "CCCCC." : "CCCCCC"),
    "P" + (f ? "CCCC.." : "CCCCC."),
    "P.....", "P.....", "P.....", "P.....", "P.....", "P.....", "PP....",
  ], { P: "#5d5488", C: col, W: "#ffffff" })));
  BITS = B;
  return BITS;
}
// what lies on the ground beside the road in each area
export const GROUND = {
  city: ["hydrant", "cone"], coast: ["tuft", "flowers", "tuft"], desert: ["shrub", "shrub", "skull"], alpine: ["drift", "tuft"],
  neon: ["cone", "hydrant"], scrap: ["barrel", "pebble", "tuft"], town: ["flowers", "tuft", "fence"], beach: ["shell", "towel", "shell"],
  monaco: ["planter"], summit: ["drift", "pebble"], volcano: ["vent", "crack", "pebble"], moon: ["pebble"], gold: ["coins", "planter"],
};

// ---------- traffic: slow cars you overtake (just for show) ----------
const TRAFFIC_CARS = CARS.filter((c) => ["D", "C"].includes(c.cls) && !c.premium && !c.giftOnly && !c.hiRes).map((c) => c.id);
export function updateTraffic(s, dt, camZ, SEG, DRAW, zone) {
  if (!s.traffic) s.traffic = [];
  const want = zone === "moon" || zone === "volcano" || s.arrival ? 0 : s.lite ? 2 : 4;
  // traffic drives at a steady pace; you go faster, and much faster on a boost
  for (const t of s.traffic) t.z += SEG * 11 * dt;
  s.traffic = s.traffic.filter((t) => t.z - camZ > -SEG * 2 && t.z - camZ < SEG * (DRAW + 40));
  while (s.traffic.length < want) {
    const lanes = s.racers.length > 1 ? [0, -0.86, 0.86] : [-0.62, 0.62];
    const ahead = s.traffic.length ? Math.max(...s.traffic.map((t) => t.z)) + SEG * (14 + Math.random() * 20) : camZ + SEG * (30 + Math.random() * 40);
    s.traffic.push({ z: Math.max(ahead, camZ + SEG * (DRAW * 0.7)), lane: lanes[Math.floor(Math.random() * lanes.length)], car: TRAFFIC_CARS[Math.floor(Math.random() * TRAFFIC_CARS.length)] });
  }
}
export const trafficSprite = (id, frame) => rearSprite(CARS.find((c) => c.id === id), frame);
