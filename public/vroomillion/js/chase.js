// Behind-the-car race view: an arcade-style road that curves and rolls over hills,
// drawn segment by segment from the horizon towards the camera on a low-res canvas.
import { rearSprite } from "./cars.js";
import { pixelText } from "./scene.js";

const SEG = 200; // length of one road segment (world units)
const ROAD = 2000; // road width (world units)
const CAM_H = 1000; // camera height above the road
const BASE_DEPTH = 0.84; // ~100° field of view
const DRAW = 150; // segments drawn ahead
const SPR = 38; // world units per pixel of roadside sprites
const LANES = { solo: 0, 0: -0.45, 1: 0.45 }; // x in half-road widths

const hash = (n) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const mod = (a, n) => ((a % n) + n) % n;
const smooth = (t) => t * t * (3 - 2 * t);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

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

// ---- roadside sprites, drawn once as tiny pixel canvases ----
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
let SPRITES = null;
function sprites() {
  if (SPRITES) return SPRITES;
  SPRITES = {
    palm: pixelCanvas([
      ".....GG...GG....",
      "...GGGGG.GGGGG..",
      ".GGGG.GGGGG.GGG.",
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
    ], { G: "#1e7a4f", g: "#2fae6c", T: "#3a2618" }),
    lamp: pixelCanvas([
      "LLLL..",
      "PPPPP.",
      "....P.",
      "....P.",
      "....P.",
      "....P.",
      "....P.",
      "....P.",
      "....P.",
      "....P.",
      "....P.",
      "....P.",
      "....P.",
      "....P.",
      "....P.",
      "....P.",
      "...PPP",
    ], { L: "#fff6a0", P: "#5d5488" }),
    sign: pixelCanvas([
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
    ], { M: "#ff4fd8", W: "#f4f4f4", K: "#12082e", P: "#3b2a78" }),
  };
  return SPRITES;
}

export class ChaseScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.g = canvas.getContext("2d");
    this.racers = [];
    this.camZ = 0;
    this.bgX = 0;
    this.speed = 0.3; // 0..1 overall sense of speed, set by the race
    this.shake = 0;
    this.flash = 0;
    this.flashColor = "#ffffff";
    this.kick = 0;
    this.warp = 0;
    this.revT = 0;
    this.time = 0;
    this.particles = [];
    this.calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.resize(400, 250, 220);
  }

  // carBottom: canvas y where the nearest car's tyres should sit (above the answer bar).
  resize(w, h, carBottom = h - 12) {
    w = Math.max(160, Math.round(w));
    h = Math.max(110, Math.round(h));
    this.W = w;
    this.H = h;
    this.horizon = Math.round(Math.min(h * 0.42, carBottom - h * 0.3));
    this.carBottom = Math.round(carBottom);
    this.carPx = Math.max(2, Math.round((w * 0.2) / 28)); // canvas px per sprite px for the nearest car (~20% of the width)
    this.canvas.width = w;
    this.canvas.height = h;
    this.g.imageSmoothingEnabled = false;
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
    this.particles = [];
  }

  rev(seconds) {
    this.revT = seconds;
  }

  launch(i, tier, nitro) {
    const r = this.racers[i];
    if (!r || !r.box) return;
    const { x, y, w } = r.box;
    r.tier = tier;
    r.launchT = 0.7;
    if (tier === 0) {
      for (let k = 0; k < 14; k++) {
        this.particles.push({ x: x + w * 0.2 + Math.random() * w * 0.6, y: y - 4, vx: (Math.random() - 0.5) * 30, vy: -10 - Math.random() * 20, life: 1.2, size: 3, grow: 5, color: "#2b2633", g: 0 });
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
      this.particles.push({ x: side + (Math.random() - 0.5) * 6, y: y - 2, vx: (side < x + w / 2 ? -1 : 1) * (20 + Math.random() * 60 * power), vy: 10 + Math.random() * 40, life: 0.8 + Math.random() * 0.7, size: 3, grow: 9, color: k % 3 ? "#d9d6e8" : "#a9a4c0", g: 0 });
    }
    // sparks off the underside on deep cuts and up
    if (tier >= 3) {
      for (let k = 0; k < tier * 12; k++) {
        this.particles.push({ x: x + w * (0.25 + Math.random() * 0.5), y, vx: (Math.random() - 0.5) * 260, vy: 30 + Math.random() * 120, life: 0.5 + Math.random() * 0.4, size: 1, color: Math.random() < 0.5 ? "#ffd23a" : "#ff8a2e", g: 220 });
      }
    }
    if (tier >= 4) {
      this.flash = Math.max(this.flash, tier === 5 ? 0.7 : 0.35);
      this.flashColor = tier === 5 ? "rainbow" : "#ffb02e";
    }
    if (tier === 5 || nitro) this.warp = Math.max(this.warp, tier === 5 ? 1.6 : 0.9);
  }

  confetti() {
    for (let i = 0; i < 110; i++) {
      this.particles.push({
        x: Math.random() * this.W, y: -Math.random() * 40, vx: (Math.random() - 0.5) * 30, vy: 30 + Math.random() * 60,
        life: 3, size: 2, color: ["#ff4fd8", "#ffd23a", "#4fd1ff", "#5dff8f", "#ffffff"][i % 5], g: 0,
      });
    }
    if (!this.calm) this.shake = 0.5;
    this.flash = 0.35;
    this.flashColor = "#ffffff";
  }

  // Where a racer is on screen (fractions of the canvas), for the "+720 M" pop-ups.
  anchor(i) {
    const b = this.racers[i]?.box;
    return b ? { x: (b.x + b.w / 2) / this.W, y: (b.y - b.h - 8) / this.H } : { x: 0.5, y: 0.6 };
  }

  // Highest canvas y covered by a car or its name tag, so UI can stay above it.
  coverTop() {
    // the nearest car (lowest on screen); a leader far up the road may pass behind the card
    const near = this.racers.filter((r) => r.box).sort((a, b) => b.box.y - a.box.y)[0];
    return near ? near.box.y - near.box.h - 14 : this.carBottom - this.carPx * 18;
  }

  update(dt) {
    this.time += dt;
    this.shake = Math.max(0, this.shake - dt);
    this.flash = Math.max(0, this.flash - dt);
    this.kick = Math.max(0, this.kick - dt * 0.9);
    this.warp = Math.max(0, this.warp - dt * 0.8);
    this.revT = Math.max(0, this.revT - dt);
    const segsPerSec = 4 + this.speed * 46;
    this.camZ += SEG * segsPerSec * dt;
    const bend = curveAt(Math.floor(this.camZ / SEG) + 8);
    this.bgX -= bend * segsPerSec * dt * 0.9;

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
            this.particles.push({ x: sx, y: ey, vx: (Math.random() - 0.5) * 20, vy: 10 + Math.random() * 15, life: 0.5, size: 2, grow: 5, color: "#8f8aa8", g: 0 });
          }
          if (r.boost > 0.05 && Math.random() < r.boost * 0.8) {
            const sx = ex[Math.random() < 0.5 ? 0 : 1];
            this.particles.push({ x: sx, y: ey, vx: (Math.random() - 0.5) * 40, vy: 30 + r.boost * 60, life: 0.45, size: 2, grow: 7, color: "#cfd3e6", g: 0 });
          }
        }
      }
    }
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += (p.g || 0) * dt;
      if (p.grow) p.size += p.grow * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0 && p.y < this.H + 20 && p.y > -60);
  }

  draw() {
    const { W, H, g } = this;
    g.save();
    if (this.shake > 0 && !this.calm) {
      g.translate(Math.round((Math.random() - 0.5) * 8 * this.shake), Math.round((Math.random() - 0.5) * 8 * this.shake));
    }

    // launches widen the field of view so the road stretches away
    const depth = BASE_DEPTH * (this.calm ? 1 : 1 - Math.min(0.22, this.kick * 0.16));
    const k = W / 2;
    const playerZ = (depth * CAM_H * k) / Math.max(20, this.carBottom - this.horizon);

    this.drawSky();

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

    // ---- road, near to far; a segment hidden behind a hill crest is skipped ----
    let maxY = H;
    for (let n = 1; n <= DRAW; n++) {
      const a = pts[n - 1];
      const b = pts[n];
      if (b.sy >= maxY || b.z <= 1) { b.hidden = true; continue; }
      const band = Math.floor(b.i / 3) % 2;
      const yTop = Math.round(b.sy);
      const yBot = Math.min(Math.round(a.sy), Math.round(maxY));
      // verge
      g.fillStyle = band ? "#1a0d38" : "#211046";
      g.fillRect(0, yTop, W, yBot - yTop + 1);
      // rumble strips and tarmac
      quad(g, a.sx, a.sy, a.sw * 1.14, b.sx, b.sy, b.sw * 1.14, band ? "#ff3b5c" : "#f4f4f4");
      quad(g, a.sx, a.sy, a.sw, b.sx, b.sy, b.sw, band ? "#2a2a3c" : "#303046");
      // lane dashes
      if (Math.floor(b.i / 4) % 2) quad(g, a.sx, a.sy, a.sw * 0.025, b.sx, b.sy, b.sw * 0.025, "#ffd23a");
      maxY = b.sy;
    }

    // ---- roadside scenery and cars, far to near ----
    const items = [];
    const spr = sprites();
    for (let n = DRAW; n >= 2; n--) {
      const p = pts[n];
      if (p.hidden) continue;
      const i = p.i;
      if (hash(i * 3.1) < 0.2) items.push({ z: p.z, kind: "palm", p, off: (hash(i * 7.7) < 0.5 ? -1 : 1) * (1.35 + hash(i * 5.3) * 1.1) });
      if (i % 10 === 0) { items.push({ z: p.z, kind: "lamp", p, off: -1.2 }); items.push({ z: p.z, kind: "lampR", p, off: 1.2 }); }
      if (i % 47 === 0) items.push({ z: p.z, kind: "sign", p, off: hash(i) < 0.5 ? -1.9 : 1.9 });
    }
    this.racers.forEach((r, idx) => {
      const lunge = Math.min(7, r.boost * 2.2);
      items.push({ z: playerZ + (r.gap + lunge) * SEG, kind: "car", r, idx });
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

    for (const it of items) {
      if (it.kind === "car") { this.drawCar(it.r, interp(it.z), playerZ / it.z); continue; }
      const sprite = it.kind === "palm" ? spr.palm : it.kind === "sign" ? spr.sign : spr.lamp;
      const ps = it.p.scale * k * SPR;
      if (ps < 0.12) continue;
      const w = sprite.width * ps;
      const h = sprite.height * ps;
      const bx = it.p.sx + it.p.sw * it.off;
      if (bx + w < -10 || bx - w > W + 10) continue;
      if (it.kind === "lampR") {
        g.save();
        g.translate(Math.round(bx + w / 2), 0);
        g.scale(-1, 1);
        g.drawImage(sprite, 0, Math.round(it.p.sy - h), Math.round(w), Math.round(h));
        g.restore();
      } else {
        g.drawImage(sprite, Math.round(bx - w / 2), Math.round(it.p.sy - h), Math.round(w), Math.round(h));
      }
    }

    this.drawStreaks();

    for (const p of this.particles) {
      g.globalAlpha = Math.min(1, p.life * 3);
      g.fillStyle = p.color;
      g.fillRect(Math.round(p.x - p.size / 2), Math.round(p.y - p.size / 2), Math.ceil(p.size), Math.ceil(p.size));
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

  drawSky() {
    const { W, g } = this;
    const hz = this.horizon;
    const sky = ["#12082e", "#1d0c42", "#2f1158", "#4a1668", "#701c72", "#a52a72", "#d9486a", "#f9735b", "#ffa45a", "#ffc866"];
    const band = (hz + 30) / sky.length;
    sky.forEach((c, i) => {
      g.fillStyle = c;
      g.fillRect(0, Math.floor(i * band), W, Math.ceil(band) + 1);
    });
    g.fillStyle = "#ffc866";
    g.fillRect(0, Math.floor(sky.length * band), W, this.H);
    for (let i = 0; i < Math.round((W * hz) / 500); i++) {
      g.fillStyle = Math.sin(this.time * 2 + i * 1.7) > 0.2 ? "#ffffff" : "#8f7fc4";
      g.fillRect(Math.floor(hash(i) * W), Math.floor(hash(i + 99) * hz * 0.5), 1, 1);
    }
    // striped sun, slides with the bends
    const sx = Math.round(mod(W * 0.5 + this.bgX * 0.15, W + 120) - 60);
    const sy = hz - 8;
    const R = Math.round(Math.min(W, hz) * 0.16);
    for (let y = -R; y <= 0; y++) {
      if (y > -R * 0.4 && mod(y + Math.floor(this.time * 3), 6) < 2) continue;
      const half = Math.floor(Math.sqrt(R * R - y * y));
      g.fillStyle = y < -R * 0.6 ? "#fff07a" : y < -R * 0.25 ? "#ffb347" : "#ff5e8a";
      g.fillRect(sx - half, sy + y, half * 2, 1);
    }
    // mountains and skyline, sliding sideways as the road bends
    g.fillStyle = "#2a0f4e";
    for (let x = 0; x < W; x += 2) {
      const wx = x - this.bgX * 0.4;
      const h = 12 + Math.sin(wx * 0.021) * 8 + Math.sin(wx * 0.057 + 2) * 4;
      g.fillRect(x, hz - Math.round(h), 2, Math.round(h) + 2);
    }
    const bw = 16;
    const cs = -this.bgX * 0.9;
    for (let i = Math.floor(cs / bw) - 1; i < Math.floor(cs / bw) + W / bw + 2; i++) {
      if (hash(i + 500) < 0.3) continue;
      const h = 5 + Math.floor(hash(i) * 20);
      const x = Math.round(i * bw - cs);
      g.fillStyle = "#150a2c";
      g.fillRect(x, hz - h, bw - 3, h + 2);
      g.fillStyle = hash(i + 7) > 0.5 ? "#ffd23a" : "#ff4fd8";
      for (let wy = 2; wy < h - 1; wy += 4) if (hash(i * 31 + wy) > 0.5) g.fillRect(x + 3, hz - h + wy, 2, 1);
    }
  }

  drawCar(r, p, rel) {
    const { g } = this;
    if (!p || p.hidden) { r.box = null; return; }
    const frame = r.frames[Math.abs(Math.floor(r.wheel || 0)) % 2];
    const s = Math.max(0.5, this.carPx * rel);
    const w = frame.width * s;
    const h = frame.height * s;
    const bounce = Math.sin(this.time * 24 + r.lane * 5) > 0.6 && this.speed > 0.1 ? 1 : 0;
    const lift = this.calm ? 0 : Math.sin((1 - r.lift) * Math.PI) * r.lift * h * 0.25;
    const jitter = this.revT > 0 && !this.calm ? Math.round((Math.random() - 0.5) * 2) : 0;
    const cx = p.sx + p.sw * r.lane + r.drift * this.W * rel;
    const bottom = Math.round(p.sy - lift - bounce + jitter);
    const left = Math.round(cx - w / 2);
    r.box = { x: left, y: bottom, w, h };

    // afterimages, closer to the camera than the car as it shoots up the road
    r.trail.forEach((b, i) => {
      g.globalAlpha = 0.2 - i * 0.035;
      g.drawImage(frame, b.x - (i + 1) * 2, b.y - b.h + (i + 1) * 5, b.w + (i + 1) * 4, b.h + (i + 1) * 3);
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
    // brake/tail light glow when boosting
    if (r.boost > 0.3) {
      g.fillStyle = "rgba(255,59,59,0.35)";
      g.fillRect(Math.round(-w / 2) - 2, Math.round(-h * 0.55), 3 + Math.round(s * 3), Math.round(s * 2) + 2);
      g.fillRect(Math.round(w / 2) - 1 - Math.round(s * 3), Math.round(-h * 0.55), 3 + Math.round(s * 3), Math.round(s * 2) + 2);
    }
    g.restore();

    // name tag
    const tw = r.label.length * 4 + 3;
    const tx = Math.round(cx - tw / 2);
    const ty = Math.round(bottom - h - 10);
    g.fillStyle = r.color;
    g.fillRect(tx, ty, tw, 7);
    g.fillRect(tx + (tw >> 1) - 1, ty + 7, 2, 2);
    pixelText(g, r.label, tx + 2, ty + 1);
  }

  // speed lines and warp streaks rushing out from the horizon
  drawStreaks() {
    if (this.calm) return;
    const { W, H, g } = this;
    const vx = W / 2;
    const vy = this.horizon;
    const maxR = Math.hypot(W, H);
    const draw = (count, alpha, colours, lenScale, rate) => {
      for (let i = 0; i < count; i++) {
        const ang = hash(i * 2.3) * Math.PI * 2;
        const t = mod(this.time * rate * (0.6 + hash(i * 4.1)) + hash(i * 9.7), 1);
        const d0 = t * t * maxR;
        const len = (8 + t * 60) * lenScale;
        g.fillStyle = colours[i % colours.length];
        g.globalAlpha = alpha * Math.min(1, t * 3);
        const cos = Math.cos(ang);
        const sin = Math.sin(ang);
        for (let s = 0; s < len; s += 2) {
          const d = d0 + s;
          g.fillRect(Math.round(vx + cos * d), Math.round(vy + sin * d * 0.8), 1, 1);
        }
      }
      g.globalAlpha = 1;
    };
    if (this.speed > 0.45) draw(Math.round(10 + this.speed * 24), 0.55, ["#ffffff"], this.speed, 0.8 + this.speed);
    if (this.warp > 0) draw(40, Math.min(1, this.warp) * 0.85, ["#ff4fd8", "#4fd1ff", "#ffd23a", "#ffffff", "#5dff8f"], 1.6, 1.8);
  }
}

function quad(g, x1, y1, w1, x2, y2, w2, colour) {
  g.fillStyle = colour;
  g.beginPath();
  g.moveTo(Math.round(x1 - w1), Math.round(y1));
  g.lineTo(Math.round(x1 + w1), Math.round(y1));
  g.lineTo(Math.round(x2 + w2), Math.round(y2));
  g.lineTo(Math.round(x2 - w2), Math.round(y2));
  g.closePath();
  g.fill();
}
