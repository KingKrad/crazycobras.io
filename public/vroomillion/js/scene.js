// The pixel-art race scene drawn on a low-res canvas and scaled up by CSS.
import { carSprite } from "./cars.js";

// Sizes are in canvas pixels; CSS scales the canvas up with crisp pixels.
const ROAD_DEPTH = 58; // two lanes of tarmac

const hash = (n) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const mod = (a, n) => ((a % n) + n) % n;

export class Scene {
  constructor(canvas) {
    this.canvas = canvas;
    this.g = canvas.getContext("2d");
    this.resize(384, 150);
    this.racers = [];
    this.scroll = 0;
    this.speed = 0.3; // 0..1 overall sense of speed
    this.shake = 0;
    this.flash = 0;
    this.time = 0;
    this.particles = [];
    this.kick = 0; // launch intensity, drives zoom / shake
    this.zoom = 1;
    this.revT = 0;
    this.flashColor = "#ffffff";
    this.warp = 0;
    this.calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // Set the canvas size. roadTop is where the tarmac starts; by default the road
  // fills the bottom of the canvas (the menu banner).
  resize(w, h, roadTop = h - ROAD_DEPTH) {
    w = Math.max(160, Math.round(w));
    h = Math.max(110, Math.round(h));
    if (w === this.W && h === this.H && roadTop === this.ROAD_TOP) return;
    this.W = w;
    this.H = h;
    this.ROAD_TOP = Math.round(roadTop);
    this.ROAD_BOT = this.ROAD_TOP + ROAD_DEPTH;
    this.HORIZON = this.ROAD_TOP - 12;
    this.LANES = [this.ROAD_TOP + 20, this.ROAD_TOP + 54]; // bottom of the tyres per lane
    this.SCALE = w < 300 ? 2 : 3; // car sprite size
    this.canvas.width = w;
    this.canvas.height = h;
    this.g.imageSmoothingEnabled = false; // resizing a canvas resets this
  }

  // racers: [{ car, label, color }]
  setRacers(list) {
    this.racers = list.map((r, i) => ({
      ...r, sprite: carSprite(r.car, 0), frames: [carSprite(r.car, 0), carSprite(r.car, 1)], wheel: 0,
      dist: 0, lane: r.lane ?? i, boost: 0, nitro: false, x: 0, trail: [], launchT: 0, tilt: 0, tier: 0,
    }));
    this.kick = 0;
    this.warp = 0;
  }

  // Engine rev before a launch: cars shudder and puff smoke.
  rev(seconds) {
    this.revT = seconds;
  }

  // Fire a racer off the line. Bigger tiers get bigger effects.
  launch(i, tier, nitro) {
    const { W, H, HORIZON, ROAD_TOP, ROAD_BOT, LANES, SCALE } = this; // eslint-disable-line no-unused-vars
    const r = this.racers[i];
    if (!r) return;
    const w = r.sprite.width * SCALE;
    const ground = LANES[r.lane] - 2;
    r.tier = tier;
    r.launchT = 0.7;
    if (tier === 0) {
      // stalled: a sad black cough
      for (let k = 0; k < 14; k++) this.particles.push({ x: r.x + 2, y: ground - 8, vx: -20 - Math.random() * 30, vy: -10 - Math.random() * 15, life: 1.2, size: 3, grow: 4, color: "#2b2633", g: 0 });
      return;
    }
    const power = [0, 0.25, 0.4, 0.6, 0.85, 1.2][tier] + (nitro ? 0.35 : 0);
    this.kick = Math.max(this.kick, power);
    if (!this.calm) this.shake = Math.max(this.shake, power * 0.7);
    // tyre smoke off the rear wheel
    for (let k = 0; k < 8 + tier * 6; k++) {
      this.particles.push({ x: r.x + 4 + Math.random() * 10, y: ground - Math.random() * 4, vx: -30 - Math.random() * 90 * power, vy: -8 - Math.random() * 20, life: 0.8 + Math.random() * 0.6, size: 3, grow: 6, color: k % 3 ? "#d9d6e8" : "#a9a4c0", g: 0 });
    }
    // sparks from the underside on deep cuts and up
    if (tier >= 3) {
      for (let k = 0; k < tier * 10; k++) {
        this.particles.push({ x: r.x + Math.random() * w, y: ground, vx: -120 - Math.random() * 220, vy: -30 - Math.random() * 60, life: 0.5 + Math.random() * 0.4, size: 1, color: Math.random() < 0.5 ? "#ffd23a" : "#ff8a2e", g: 260 });
      }
    }
    if (tier >= 4) {
      this.flash = Math.max(this.flash, tier === 5 ? 0.7 : 0.35);
      this.flashColor = tier === 5 ? "rainbow" : "#ffb02e";
    }
    if (tier === 5 || nitro) this.warp = Math.max(this.warp, tier === 5 ? 1.6 : 0.9);
  }

  // Where a racer is on screen, as fractions of the canvas, for DOM pop-ups.
  anchor(i) {
    const { W, H, HORIZON, ROAD_TOP, ROAD_BOT, LANES, SCALE } = this; // eslint-disable-line no-unused-vars
    const r = this.racers[i];
    if (!r) return { x: 0.5, y: 0.5 };
    const sw = r.sprite.width * SCALE;
    const sh = r.sprite.height * SCALE;
    return { x: (r.x + sw / 2) / W, y: (LANES[r.lane] - sh - 6) / H };
  }

  confetti() {
    const { W, H, HORIZON, ROAD_TOP, ROAD_BOT, LANES, SCALE } = this; // eslint-disable-line no-unused-vars
    for (let i = 0; i < 90; i++) {
      this.particles.push({
        x: Math.random() * W, y: -Math.random() * 40, vx: (Math.random() - 0.5) * 30, vy: 30 + Math.random() * 60,
        life: 3, size: 2, color: ["#ff4fd8", "#ffd23a", "#4fd1ff", "#5dff8f", "#ffffff"][i % 5], g: 0,
      });
    }
    if (!this.calm) this.shake = 0.5;
    this.flash = 0.35;
    this.flashColor = "#ffffff";
  }

  update(dt) {
    const { W, H, HORIZON, ROAD_TOP, ROAD_BOT, LANES, SCALE } = this; // eslint-disable-line no-unused-vars
    this.time += dt;
    this.scroll += (40 + this.speed * 520) * dt;
    this.shake = Math.max(0, this.shake - dt);
    this.flash = Math.max(0, this.flash - dt);
    this.kick = Math.max(0, this.kick - dt * 0.9);
    this.warp = Math.max(0, this.warp - dt * 0.8);
    this.revT = Math.max(0, this.revT - dt);
    const zoomTarget = this.calm ? 1 : 1 + Math.min(0.16, this.kick * 0.13);
    this.zoom += (zoomTarget - this.zoom) * Math.min(1, dt * 8);

    if (this.racers.length) {
      const cam = this.racers.reduce((s, r) => s + r.dist, 0) / this.racers.length;
      const half = Math.max(...this.racers.map((r) => Math.abs(r.dist - cam)), 1);
      const scale = Math.min(0.14, 125 / half);
      this.cam = cam;
      this.camScale = scale;
      for (const r of this.racers) {
        const w = r.sprite.width * SCALE;
        const target = W * 0.5 + (r.dist - cam) * scale - w / 2;
        r.x += (Math.max(4, Math.min(W - w - 4, target)) - r.x) * Math.min(1, dt * 6);
        r.wheel += dt * (3 + this.speed * 30 + r.boost * 25);
        r.launchT = Math.max(0, r.launchT - dt);
        // nose-up wheelie on big launches, settling back down
        const want = this.calm ? 0 : r.launchT > 0 ? [0, 0, 0.02, 0.04, 0.07, 0.1][r.tier] * (r.launchT / 0.7) : 0;
        r.tilt += (want - r.tilt) * Math.min(1, dt * 12);
        // afterimage ghosts at high boost
        if (r.boost > 0.7 && !this.calm) r.trail.unshift(r.x);
        else if (r.trail.length) r.trail.pop();
        if (r.trail.length > 5) r.trail.length = 5;
        if (this.revT > 0 && Math.random() < 0.5) {
          this.particles.push({ x: r.x + 1, y: LANES[r.lane] - 9, vx: -20 - Math.random() * 20, vy: -6 - Math.random() * 8, life: 0.5, size: 2, grow: 3, color: "#8f8aa8", g: 0 });
        }
        // exhaust + nitro flames
        const y = LANES[r.lane] - 8;
        if (r.boost > 0.05 && Math.random() < r.boost * 0.9) {
          this.particles.push({ x: r.x + 2, y: y + Math.random() * 4, vx: -60 - r.boost * 140, vy: -6 - Math.random() * 10, life: 0.5, size: 2 + (Math.random() * 2 | 0), color: "#cfd3e6", g: 0 });
        }
        if (r.nitro && r.boost > 0.05) {
          for (let i = 0; i < 2; i++) {
            this.particles.push({ x: r.x + 3, y: y + 1 + Math.random() * 4, vx: -160 - Math.random() * 120, vy: (Math.random() - 0.5) * 20, life: 0.22, size: 3, color: Math.random() < 0.5 ? "#4fd1ff" : "#ffb02e", g: 0 });
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
    this.particles = this.particles.filter((p) => p.life > 0 && p.y < H + 4);
  }

  draw() {
    const { W, H, HORIZON, ROAD_TOP, ROAD_BOT, LANES, SCALE } = this; // eslint-disable-line no-unused-vars
    const g = this.g;
    g.save();
    if (this.shake > 0) g.translate(Math.round((Math.random() - 0.5) * 8 * this.shake), Math.round((Math.random() - 0.5) * 8 * this.shake));
    if (this.zoom > 1.001 && this.racers.length) {
      // punch the camera in on the cars
      const fx = this.racers.reduce((s, r) => s + r.x + (r.sprite.width * SCALE) / 2, 0) / this.racers.length;
      const fy = LANES[this.racers[0].lane] - 16;
      g.translate(fx, fy);
      g.scale(this.zoom, this.zoom);
      g.translate(-fx, -fy);
    }

    // sky in chunky bands
    const sky = ["#12082e", "#1d0c42", "#2f1158", "#4a1668", "#701c72", "#a52a72", "#d9486a", "#f9735b", "#ffa45a", "#ffc866"];
    const band = HORIZON / sky.length;
    sky.forEach((c, i) => {
      g.fillStyle = c;
      g.fillRect(0, Math.floor(i * band), W, Math.ceil(band) + 1);
    });

    // stars
    for (let i = 0; i < Math.round((W * HORIZON) / 670); i++) {
      const x = Math.floor(hash(i) * W);
      const y = Math.floor(hash(i + 99) * HORIZON * 0.55);
      const tw = Math.sin(this.time * 2 + i * 1.7) > 0.2;
      g.fillStyle = tw ? "#ffffff" : "#8f7fc4";
      g.fillRect(x, y, 1, 1);
    }

    // striped retro sun
    const sx = Math.round(W * 0.72);
    const sy = HORIZON - 18;
    for (let y = -26; y <= 18; y++) {
      const half = Math.floor(Math.sqrt(26 * 26 - y * y));
      const gap = y > -4 && mod(y + Math.floor(this.time * 3), 6) < 2;
      if (gap) continue;
      g.fillStyle = y < -8 ? "#fff07a" : y < 4 ? "#ffb347" : "#ff5e8a";
      g.fillRect(sx - half, sy + y, half * 2, 1);
    }

    // mountains (slow parallax)
    g.fillStyle = "#2a0f4e";
    for (let x = 0; x < W; x += 2) {
      const wx = x + this.scroll * 0.04;
      const hgt = 14 + Math.sin(wx * 0.021) * 9 + Math.sin(wx * 0.057 + 2) * 5 + Math.sin(wx * 0.13) * 2;
      g.fillRect(x, HORIZON - Math.round(hgt), 2, Math.round(hgt));
    }

    // skyline (medium parallax)
    const cs = this.scroll * 0.14;
    const bw = 18;
    for (let i = Math.floor(cs / bw) - 1; i < Math.floor(cs / bw) + W / bw + 2; i++) {
      const hgt = 8 + Math.floor(hash(i) * 26);
      if (hash(i + 500) < 0.25) continue;
      const x = Math.round(i * bw - cs);
      g.fillStyle = "#150a2c";
      g.fillRect(x, HORIZON - hgt, bw - 3, hgt);
      for (let wy = 2; wy < hgt - 2; wy += 4) {
        for (let wxx = 2; wxx < bw - 6; wxx += 4) {
          if (hash(i * 31 + wy * 7 + wxx) > 0.55) {
            g.fillStyle = hash(i + wy) > 0.5 ? "#ffd23a" : "#ff4fd8";
            g.fillRect(x + wxx, HORIZON - hgt + wy, 2, 2);
          }
        }
      }
    }

    // verge + road
    g.fillStyle = "#1b1036";
    g.fillRect(0, HORIZON, W, ROAD_TOP - HORIZON);
    g.fillStyle = "#2a2a3c";
    g.fillRect(0, ROAD_TOP, W, ROAD_BOT - ROAD_TOP);
    g.fillStyle = "#33334a";
    for (let i = 0; i < 40; i++) g.fillRect(mod(hash(i + 7) * 900 - this.scroll, W + 20) - 10, ROAD_TOP + 6 + Math.floor(hash(i + 3) * 50), 6, 1);

    // rumble strip + lane dashes
    const rs = 12;
    for (let x = -mod(this.scroll, rs * 2); x < W; x += rs) {
      const odd = Math.round((x + mod(this.scroll, rs * 2)) / rs) % 2;
      g.fillStyle = odd ? "#ff3b5c" : "#f4f4f4";
      g.fillRect(Math.round(x), ROAD_TOP, rs, 3);
      g.fillRect(Math.round(x), ROAD_BOT - 3, rs, 3);
    }
    g.fillStyle = "#ffd23a";
    for (let x = -mod(this.scroll, 40); x < W; x += 40) g.fillRect(Math.round(x), ROAD_TOP + 29, 20, 2);

    // palms along the verge
    for (let i = Math.floor(this.scroll * 0.7 / 110) - 1; i < Math.floor(this.scroll * 0.7 / 110) + 5; i++) {
      const x = Math.round(i * 110 + hash(i) * 30 - this.scroll * 0.7);
      g.fillStyle = "#0c0620";
      g.fillRect(x, ROAD_TOP - 22, 2, 22);
      g.fillRect(x - 7, ROAD_TOP - 24, 16, 2);
      g.fillRect(x - 5, ROAD_TOP - 26, 12, 2);
      g.fillRect(x - 9, ROAD_TOP - 21, 4, 2);
      g.fillRect(x + 7, ROAD_TOP - 21, 4, 2);
    }

    // warp streaks across the whole sky on huge launches
    if (this.warp > 0 && !this.calm) {
      const cols = ["#ff4fd8", "#4fd1ff", "#ffd23a", "#ffffff", "#5dff8f"];
      for (let i = 0; i < 26; i++) {
        g.globalAlpha = Math.min(1, this.warp) * 0.8;
        g.fillStyle = cols[i % cols.length];
        const len = 30 + hash(i + 3) * 120 * Math.min(1, this.warp);
        const x = W - mod(this.scroll * (3 + hash(i + 80) * 2) + hash(i) * 900, W + 160);
        g.fillRect(Math.round(x), Math.floor(hash(i + 60) * (H - 4)), Math.round(len), 1);
      }
      g.globalAlpha = 1;
    }

    // speed lines
    if (this.speed > 0.45 && !this.calm) {
      g.fillStyle = "rgba(255,255,255,0.5)";
      const count = 14 + Math.round(this.speed * 20);
      for (let i = 0; i < count; i++) {
        const len = 20 + hash(i) * 70 * this.speed;
        const x = W - mod(this.scroll * (2 + hash(i + 40)) + hash(i) * 700, W + 80);
        g.fillRect(Math.round(x), ROAD_TOP + 4 + Math.floor(hash(i + 20) * 52), Math.round(len), 1);
      }
    }

    // verge below the road with a fast guardrail, for full-screen races
    if (H > ROAD_BOT) {
      g.fillStyle = "#140a2c";
      g.fillRect(0, ROAD_BOT, W, H - ROAD_BOT);
      g.fillStyle = "#1c1040";
      for (let y = ROAD_BOT + 14; y < H; y += 6) g.fillRect(0, y, W, 2);
      g.fillStyle = "#4a3896";
      g.fillRect(0, ROAD_BOT + 6, W, 2);
      for (let x = -mod(this.scroll * 1.4, 26); x < W; x += 26) g.fillRect(Math.round(x), ROAD_BOT + 3, 3, 9);
    }

    // cars, far lane first
    for (const r of this.racers) {
      const sw = r.sprite.width * SCALE;
      const sh = r.sprite.height * SCALE;
      const bob = Math.sin(this.time * (18 + r.lane * 3) + r.lane) > 0.3 && this.speed > 0.1 ? 1 : 0;
      const x = Math.round(r.x);
      const y = LANES[r.lane] - sh + bob;
      const lunge = Math.min(40, r.boost * 16);
      const jitter = this.revT > 0 && !this.calm ? Math.round((Math.random() - 0.5) * 2) : 0;
      const cx = Math.round(Math.min(W - sw - 2, x + lunge));
      const frame = r.frames[Math.floor(r.wheel) % 2];
      g.fillStyle = "rgba(0,0,0,0.35)";
      g.fillRect(cx + 4, LANES[r.lane] - 2, sw - 8, 3);
      // ghost trail
      r.trail.forEach((tx, k) => {
        g.globalAlpha = 0.18 - k * 0.03;
        g.drawImage(frame, Math.round(tx + lunge * 0.5 - (k + 1) * 10), y, sw, sh);
      });
      g.globalAlpha = 1;
      // nitro flame out the back
      if (r.nitro && r.boost > 0.05) {
        const fl = 8 + Math.random() * 10 + r.boost * 10;
        const fy = LANES[r.lane] - 10;
        g.fillStyle = "#ff8a2e";
        g.fillRect(cx - fl, fy, fl, 5);
        g.fillStyle = "#4fd1ff";
        g.fillRect(cx - fl * 0.7, fy + 1, fl * 0.7, 3);
        g.fillStyle = "#ffffff";
        g.fillRect(cx - fl * 0.35, fy + 2, fl * 0.35, 1);
      }
      g.save();
      if (r.tilt > 0.001) {
        // pivot on the rear tyre
        g.translate(cx + 8, LANES[r.lane]);
        g.rotate(-r.tilt);
        g.translate(-(cx + 8), -LANES[r.lane]);
      }
      g.drawImage(frame, cx, y + jitter, sw, sh);
      g.restore();
      // name tag
      g.fillStyle = r.color;
      const tw = r.label.length * 4 + 3;
      const tx = Math.round(cx + sw / 2 - tw / 2);
      const ty = y + jitter;
      g.fillRect(tx, ty - 11, tw, 7);
      g.fillRect(tx + (tw >> 1) - 1, ty - 4, 2, 2);
      pixelText(g, r.label, tx + 2, ty - 10);
    }

    for (const p of this.particles) {
      g.globalAlpha = Math.min(1, p.life * 3);
      g.fillStyle = p.color;
      g.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    g.globalAlpha = 1;

    if (this.flash > 0) {
      g.globalAlpha = Math.min(1, this.flash);
      g.fillStyle = this.flashColor === "rainbow" ? `hsl(${Math.floor(this.time * 720) % 360},100%,65%)` : this.flashColor;
      g.fillRect(-W, -H, W * 3, H * 3);
      g.globalAlpha = 1;
    }
    g.restore();
  }
}

// Tiny 3x5 font for the "P1"/"P2"/"CPU" tags above cars.
const FONT = {
  P: ["111", "101", "111", "100", "100"], C: ["111", "100", "100", "100", "111"], U: ["101", "101", "101", "101", "111"],
  1: ["010", "110", "010", "010", "111"], 2: ["111", "001", "111", "100", "111"],
};
function pixelText(g, text, x, y) {
  g.fillStyle = "#0b0618";
  [...text].forEach((ch, i) => {
    const glyph = FONT[ch];
    if (!glyph) return;
    glyph.forEach((row, ry) => [...row].forEach((bit, rx) => {
      if (bit === "1") g.fillRect(x + i * 4 + rx, y + ry - 0, 1, 1);
    }));
  });
}
