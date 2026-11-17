// The pixel-art race scene drawn on a low-res canvas and scaled up by CSS.
import { carSprite } from "./cars.js";

const W = 384;
const H = 150;
const HORIZON = 80;
const ROAD_TOP = 92;
const LANES = [112, 146]; // y of the bottom of the tyres per lane
const SCALE = 3;

const hash = (n) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const mod = (a, n) => ((a % n) + n) % n;

export class Scene {
  constructor(canvas) {
    canvas.width = W;
    canvas.height = H;
    this.g = canvas.getContext("2d");
    this.g.imageSmoothingEnabled = false;
    this.racers = [];
    this.scroll = 0;
    this.speed = 0.3; // 0..1 overall sense of speed
    this.shake = 0;
    this.flash = 0;
    this.time = 0;
    this.particles = [];
    this.banner = null;
    this.calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // racers: [{ car, label, color }]
  setRacers(list) {
    this.racers = list.map((r, i) => ({ ...r, sprite: carSprite(r.car), dist: 0, lane: i, boost: 0, nitro: false, x: 0 }));
  }

  confetti() {
    for (let i = 0; i < 90; i++) {
      this.particles.push({
        x: Math.random() * W, y: -Math.random() * 40, vx: (Math.random() - 0.5) * 30, vy: 30 + Math.random() * 60,
        life: 3, size: 2, color: ["#ff4fd8", "#ffd23a", "#4fd1ff", "#5dff8f", "#ffffff"][i % 5], g: 0,
      });
    }
    if (!this.calm) this.shake = 0.5;
    this.flash = 0.35;
  }

  update(dt) {
    this.time += dt;
    this.scroll += (40 + this.speed * 520) * dt;
    this.shake = Math.max(0, this.shake - dt);
    this.flash = Math.max(0, this.flash - dt);

    if (this.racers.length) {
      const cam = this.racers.reduce((s, r) => s + r.dist, 0) / this.racers.length;
      const half = Math.max(...this.racers.map((r) => Math.abs(r.dist - cam)), 1);
      const scale = Math.min(0.14, 125 / half);
      for (const r of this.racers) {
        const w = r.sprite.width * SCALE;
        const target = W * 0.5 + (r.dist - cam) * scale - w / 2;
        r.x += (Math.max(4, Math.min(W - w - 4, target)) - r.x) * Math.min(1, dt * 6);
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
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0 && p.y < H + 4);
  }

  draw() {
    const g = this.g;
    g.save();
    if (this.shake > 0) g.translate(Math.round((Math.random() - 0.5) * 6 * this.shake), Math.round((Math.random() - 0.5) * 6 * this.shake));

    // sky in chunky bands
    const sky = ["#12082e", "#1d0c42", "#2f1158", "#4a1668", "#701c72", "#a52a72", "#d9486a", "#f9735b", "#ffa45a", "#ffc866"];
    const band = HORIZON / sky.length;
    sky.forEach((c, i) => {
      g.fillStyle = c;
      g.fillRect(0, Math.floor(i * band), W, Math.ceil(band) + 1);
    });

    // stars
    for (let i = 0; i < 46; i++) {
      const x = Math.floor(hash(i) * W);
      const y = Math.floor(hash(i + 99) * 36);
      const tw = Math.sin(this.time * 2 + i * 1.7) > 0.2;
      g.fillStyle = tw ? "#ffffff" : "#8f7fc4";
      g.fillRect(x, y, 1, 1);
    }

    // striped retro sun
    const sx = 276;
    const sy = 62;
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
    g.fillRect(0, ROAD_TOP, W, H - ROAD_TOP);
    g.fillStyle = "#33334a";
    for (let i = 0; i < 40; i++) g.fillRect(mod(hash(i + 7) * 900 - this.scroll, W + 20) - 10, ROAD_TOP + 6 + Math.floor(hash(i + 3) * 50), 6, 1);

    // rumble strip + lane dashes
    const rs = 12;
    for (let x = -mod(this.scroll, rs * 2); x < W; x += rs) {
      const odd = Math.round((x + mod(this.scroll, rs * 2)) / rs) % 2;
      g.fillStyle = odd ? "#ff3b5c" : "#f4f4f4";
      g.fillRect(Math.round(x), ROAD_TOP, rs, 3);
      g.fillRect(Math.round(x), H - 3, rs, 3);
    }
    g.fillStyle = "#ffd23a";
    for (let x = -mod(this.scroll, 40); x < W; x += 40) g.fillRect(Math.round(x), 121, 20, 2);

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

    // speed lines
    if (this.speed > 0.45 && !this.calm) {
      g.fillStyle = "rgba(255,255,255,0.5)";
      for (let i = 0; i < 14; i++) {
        const len = 20 + hash(i) * 50 * this.speed;
        const x = W - mod(this.scroll * (2 + hash(i + 40)) + hash(i) * 700, W + 80);
        g.fillRect(Math.round(x), ROAD_TOP + 4 + Math.floor(hash(i + 20) * 52), Math.round(len), 1);
      }
    }

    // cars, far lane first
    for (const r of this.racers) {
      const sw = r.sprite.width * SCALE;
      const sh = r.sprite.height * SCALE;
      const bob = Math.sin(this.time * (18 + r.lane * 3) + r.lane) > 0.3 && this.speed > 0.1 ? 1 : 0;
      const x = Math.round(r.x);
      const y = LANES[r.lane] - sh + bob;
      g.fillStyle = "rgba(0,0,0,0.35)";
      g.fillRect(x + 4, LANES[r.lane] - 2, sw - 8, 3);
      g.drawImage(r.sprite, x, y, sw, sh);
      // name tag
      g.fillStyle = r.color;
      const tw = r.label.length * 4 + 3;
      const tx = Math.round(x + sw / 2 - tw / 2);
      g.fillRect(tx, y - 11, tw, 7);
      g.fillRect(tx + (tw >> 1) - 1, y - 4, 2, 2);
      pixelText(g, r.label, tx + 2, y - 10);
    }

    for (const p of this.particles) {
      g.globalAlpha = Math.min(1, p.life * 3);
      g.fillStyle = p.color;
      g.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    g.globalAlpha = 1;

    if (this.flash > 0) {
      g.fillStyle = `rgba(255,255,255,${this.flash})`;
      g.fillRect(-10, -10, W + 20, H + 20);
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
