// CHRISTMAS's race: the world map on Christmas Eve, snowing, and Santa's sleigh delivering presents to the
// world's best-known cities. Every answer is a delivery: the rarer it is, the further the next city (and
// the more presents: a stocking, a sackful... or the whole world in one night). The sleigh flies the
// whole way, reindeer in front, Rudolph leading. The answer card is a gift tag.
// It's WorldScene (world.js) with its own map layer, vehicle, trips, card and finale.
import { WorldScene, toWorld, MW } from "./world.js";

// famous cities Santa calls at (and his own home)
const HOME = (() => { const [x, y] = toWorld([66.5, 25.7]); return { name: "SANTA'S VILLAGE", x, y }; })();
const CITIES = [
  ["NEW YORK", 40.71, -74.0], ["LOS ANGELES", 34.05, -118.24], ["CHICAGO", 41.88, -87.63], ["MIAMI", 25.76, -80.19],
  ["TORONTO", 43.65, -79.38], ["VANCOUVER", 49.28, -123.12], ["MEXICO CITY", 19.43, -99.13], ["HAVANA", 23.11, -82.37],
  ["RIO DE JANEIRO", -22.9, -43.2], ["BUENOS AIRES", -34.6, -58.38], ["LIMA", -12.05, -77.04], ["LONDON", 51.5, -0.13],
  ["PARIS", 48.86, 2.35], ["ROME", 41.9, 12.5], ["BERLIN", 52.52, 13.4], ["MADRID", 40.42, -3.7], ["AMSTERDAM", 52.37, 4.9],
  ["VIENNA", 48.21, 16.37], ["PRAGUE", 50.08, 14.44], ["STOCKHOLM", 59.33, 18.07], ["OSLO", 59.91, 10.75], ["DUBLIN", 53.35, -6.26],
  ["REYKJAVIK", 64.15, -21.94], ["MOSCOW", 55.76, 37.62], ["ISTANBUL", 41.01, 28.98], ["BETHLEHEM", 31.7, 35.2], ["CAIRO", 30.04, 31.24],
  ["NAIROBI", -1.29, 36.82], ["CAPE TOWN", -33.92, 18.42], ["LAGOS", 6.52, 3.38], ["DUBAI", 25.2, 55.27], ["MUMBAI", 19.08, 72.88],
  ["BEIJING", 39.9, 116.4], ["TOKYO", 35.68, 139.7], ["SEOUL", 37.57, 126.98], ["MANILA", 14.6, 120.98], ["SINGAPORE", 1.35, 103.82],
  ["HONG KONG", 22.32, 114.17], ["SYDNEY", -33.87, 151.2], ["AUCKLAND", -36.85, 174.76], ["HONOLULU", 21.31, -157.86], ["ANCHORAGE", 61.22, -149.9],
].map(([name, lat, lon]) => { const [x, y] = toWorld([lat, lon]); return { name, x, y }; });
const LIGHTS = ["#ffd23a", "#ff5a4f", "#5dff8f", "#fff6e0"];

// the sleigh from above, facing up: four reindeer in pairs on the reins, Rudolph's red nose out front,
// then the sleigh (red, gold trim) with Santa and the sack of presents
function drawSleighTop(g, p, t, body) {
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x * p, y * p, w * p, h * p); };
  const step = Math.sin(t * 14) > 0 ? 1 : 0; // the reindeer's legs, galloping
  // reins
  R(-3, -18, 1, 14, "#6a3a1a"); R(2, -18, 1, 14, "#6a3a1a");
  // the reindeer: two pairs
  for (const [y, lead] of [[-20, true], [-13, false]]) for (const x of [-5, 2]) {
    R(x, y, 3, 5, "#8a5a32");                         // body
    R(x + (step ? 0 : 2), y + 4, 1, 1, "#5a3a1e"); R(x + (step ? 2 : 0), y - 1, 1, 1, "#5a3a1e"); // legs
    R(x + 1, y - 2, 1, 2, "#a8743e");                 // head
    R(x, y - 3, 1, 1, "#d9c08a"); R(x + 2, y - 3, 1, 1, "#d9c08a"); // antlers
    if (lead && x < 0) R(x + 1, y - 3, 1, 1, "#ff2020"); // Rudolph
  }
  // the sleigh
  R(-5, -4, 1, 14, "#d8dde6"); R(4, -4, 1, 14, "#d8dde6"); // runners
  R(-5, -5, 1, 1, "#d8dde6"); R(4, -5, 1, 1, "#d8dde6");
  R(-4, -3, 8, 12, "#3a0a0e");
  R(-3, -3, 6, 11, body);
  R(-3, -3, 6, 1, "#ffd23a"); R(-3, 7, 6, 1, "#ffd23a"); // gold trim
  R(-2, -1, 4, 3, "#c8202a"); R(-1, -1, 2, 2, "#f4f4f4"); // Santa: his red coat and white hat bobble
  R(-2, 3, 4, 4, "#7a4a22"); R(-1, 3, 2, 1, "#a86a34");   // the sack
  R(-2, 2, 1, 1, "#5dff8f"); R(1, 2, 1, 1, "#4fd1ff");     // presents poking out
}

export class SleighScene extends WorldScene {
  constructor(canvas) {
    super(canvas);
    this.cardBg = "#0e2a1a";
    this.flakes = Array.from({ length: 70 }, (_, k) => ({ x: (k * 0.6180339) % 1, y: (k * 0.4142) % 1, s: 0.6 + ((k * 7) % 5) / 5, v: 0.04 + ((k * 13) % 7) / 120 }));
  }
  setRacers(list) {
    super.setRacers(list);
    // every trip starts at home, in Lapland
    this.racers.forEach((r, i) => { r.x = HOME.x + (i ? 6 : 0); r.y = HOME.y + (i ? 4 : 0); r.visited = []; });
    if (this.racers[0]) this.cam = { x: this.racers[0].x, y: this.racers[0].y, z: this.fitZ(300) };
    this.camTo = { ...this.cam };
  }
  // the home screen: the sleigh doing a round of deliveries on its own
  lobbyTick(car) {
    if (!this.lobby || !this.racers.length || this.racers[0].car?.id !== car?.id) {
      this.lobby = true;
      this.setRacers([{ car, label: "", color: "#ff3b3b" }]);
      this.cam.z = this.fitZ(520);
      this.tourI = 0; this.tourWait = 1.2;
    }
    const r = this.racers[0];
    if (r.leg || r.pending) return;
    this.tourWait -= 1 / 30;
    if (this.tourWait > 0) return;
    const tier = [1, 2, 3, 2, 4, 3, 4][this.tourI++ % 7];
    this.planLeg({ i: 0, tier, color: "#ff3b3b" });
    this.launch(0, tier, false, 3 + tier * 0.4);
    if (r.pins.length > 5) r.pins.shift();
    if (r.trail.length > 600) r.trail.splice(0, r.trail.length - 600);
    this.tourWait = 2.2;
  }
  // the next delivery: a city about as far as the answer is rare, not one visited this trip
  planLeg(c) {
    const r = this.racers[c.i];
    if (!r) return;
    if (!c.tier) { r.leg = null; return; }
    const want = [0, 90, 170, 290, 470, 700][c.tier];
    let best = null, score = Infinity;
    for (const city of CITIES) {
      if ((r.visited || []).includes(city.name)) continue;
      let dx = city.x - r.x; dx -= Math.round(dx / MW) * MW;
      const d = Math.hypot(dx, city.y - r.y);
      const s = Math.abs(d - want) + Math.random() * 40;
      if (s < score) { score = s; best = { city, tx: r.x + dx, ty: city.y }; }
    }
    if (!best) { r.visited = []; return this.planLeg(c); }
    r.visited = [...(r.visited || []), best.city.name].slice(-12);
    let { tx } = best; const { ty } = best;
    if (c.tier >= 5) tx += tx >= r.x ? MW : -MW; // round the whole world in one go
    r.pending = { x0: r.x, y0: r.y, x1: tx, y1: ty, kind: "sleigh", tier: c.tier, label: best.city.name, color: c.color };
  }
  // Christmas Eve: the map at night, cities twinkling with coloured lights, snow falling
  drawOverlay(g) {
    const { W, H, u } = this;
    g.fillStyle = "rgba(8,14,46,0.55)"; g.fillRect(-10, -10, W + 20, H + 20);
    for (const [k, c] of CITIES.entries()) {
      const [sx, sy] = this.toScreen(c.x, c.y);
      if (sx < -40 || sx > W + 40 || sy < -40 || sy > H + 40) continue;
      const tw = this.calm ? 1 : 0.7 + 0.3 * Math.sin(this.time * 3 + k * 1.7);
      const rad = 8 * u * tw, col = LIGHTS[k % LIGHTS.length];
      const gl = g.createRadialGradient(sx, sy, 0, sx, sy, rad);
      gl.addColorStop(0, col); gl.addColorStop(1, "rgba(0,0,0,0)");
      g.globalAlpha = 0.5; g.fillStyle = gl; g.fillRect(sx - rad, sy - rad, rad * 2, rad * 2); g.globalAlpha = 1;
      g.fillStyle = "#fff6e0"; g.fillRect(Math.round(sx - u / 2), Math.round(sy - u / 2), Math.max(1, Math.round(u)), Math.max(1, Math.round(u)));
    }
    // Santa's village: a little gold star
    const [hx, hy] = this.toScreen(HOME.x, HOME.y);
    g.fillStyle = "#ffd23a";
    const s = Math.max(1, Math.round(u));
    g.fillRect(hx - s, hy - 3 * s, 2 * s, 6 * s); g.fillRect(hx - 3 * s, hy - s, 6 * s, 2 * s);
    // the snow
    if (!this.calm) {
      g.fillStyle = "rgba(255,255,255,0.8)";
      for (const f of this.flakes) {
        const x = ((f.x + Math.sin(this.time * 0.7 + f.y * 9) * 0.02) % 1) * W;
        const y = ((f.y + this.time * f.v) % 1) * H;
        const d = Math.max(1, Math.round(u * f.s * 1.3));
        g.fillRect(Math.round(x), Math.round(y), d, d);
      }
    }
  }
  drawVehicle(g, px, r) { drawSleighTop(g, Math.max(1, Math.round(px * 0.8)), this.calm ? 0 : this.time, r.car?.color || "#c8202a"); }
  // the card is a gift tag: a string hole and a red ribbon across the corner
  drawCardMark(hg, w, h, col, px) {
    hg.fillStyle = "#c8202a"; hg.fillRect(-w / 2 + px(2), -h / 2 + px(2), px(5), h - px(4));
    hg.fillStyle = "#ffd23a"; hg.fillRect(-w / 2 + px(3.5), -h / 2 + px(2), px(2), h - px(4));
    hg.strokeStyle = col; hg.lineWidth = px(1.5);
    hg.beginPath(); hg.arc(w / 2 - px(13), 0, px(4), 0, Math.PI * 2); hg.stroke();
  }

  // ---- the finale: over the rooftops on Christmas Eve, the sleigh flies across a huge full moon, and
  // the moon becomes the delivery list: every city you called at ----
  moonBox() {
    const { W, H } = this, r = Math.min(W * 0.36, H * 0.3);
    return { x: W / 2, y: H * 0.36, r };
  }
  drawFinale() {
    const { g, W, H, u } = this, t = this.fin.t, m = this.moonBox();
    const R = (x, y, w, h) => g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
    g.save(); g.imageSmoothingEnabled = false;
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#040a24"); bg.addColorStop(0.7, "#14204a"); bg.addColorStop(1, "#0a1030");
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    // stars
    for (let k = 0; k < 60; k++) {
      const on = this.calm || Math.sin(t * 3 + k * 2.3) > -0.5;
      g.fillStyle = on ? "#fff6e0" : "#5a6490";
      R(((k * 0.6180339) % 1) * W, ((k * 0.3819) % 1) * H * 0.75, u, u);
    }
    // the moon
    const glow = g.createRadialGradient(m.x, m.y, m.r * 0.8, m.x, m.y, m.r * 1.6);
    glow.addColorStop(0, "rgba(255,246,200,0.35)"); glow.addColorStop(1, "rgba(255,246,200,0)");
    g.fillStyle = glow; g.fillRect(m.x - m.r * 2, m.y - m.r * 2, m.r * 4, m.r * 4);
    g.fillStyle = "#fff3c4"; g.beginPath(); g.arc(m.x, m.y, m.r, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#efe0a4";
    for (const [dx, dy, rr] of [[-0.4, -0.3, 0.14], [0.3, 0.2, 0.1], [0.1, -0.45, 0.07], [-0.2, 0.42, 0.09]]) { g.beginPath(); g.arc(m.x + dx * m.r, m.y + dy * m.r, rr * m.r, 0, Math.PI * 2); g.fill(); }
    // the sleigh and reindeer, in silhouette, flying across the moon
    const k = Math.min(1, t / 3.2);
    const sx = -W * 0.2 + k * W * 1.3, sy = m.y + m.r * 1.15 - Math.sin(k * Math.PI) * m.r * 0.42; // across the bottom of the moon, under the list
    const p = Math.max(1, Math.round(u * 1.4));
    g.fillStyle = "#0a0e22";
    for (let d = 0; d < 4; d++) { // reindeer
      const rx = sx + (14 + d * 9) * p, ry = sy - d * 2 * p + (this.calm ? 0 : Math.sin(t * 12 + d) * p);
      R(rx, ry, 7 * p, 3 * p); R(rx + 6 * p, ry - 3 * p, 2 * p, 3 * p); R(rx + 7 * p, ry - 5 * p, p, 2 * p); R(rx + 5 * p, ry - 5 * p, p, 2 * p);
      R(rx, ry + 3 * p, p, 2 * p); R(rx + 6 * p, ry + 3 * p, p, 2 * p);
      if (d === 3) { g.fillStyle = "#ff2020"; R(rx + 8 * p, ry - 3 * p, p, p); g.fillStyle = "#0a0e22"; }
    }
    R(sx + 9 * p, sy + 1 * p, 24 * p, p); // reins
    R(sx, sy - 2 * p, 11 * p, 6 * p); R(sx - p, sy - 5 * p, 4 * p, 4 * p); R(sx + 3 * p, sy - 6 * p, 4 * p, 4 * p); // sleigh, sack, Santa
    R(sx - 2 * p, sy + 5 * p, 15 * p, p); R(sx + 12 * p, sy + 3 * p, p, 2 * p); // runner
    // a trail of sparkles behind the sleigh
    if (!this.calm) for (let q = 0; q < 14; q++) { g.fillStyle = LIGHTS[q % LIGHTS.length]; R(sx - (4 + q * 5) * p, sy + 2 * p + Math.sin(t * 9 + q) * 3 * p, p, p); }
    // rooftops, chimneys and lit windows, with snow on top
    const base = H * 0.8;
    for (let x = 0, n = 0; x < W; n++) {
      const w = (26 + ((n * 37) % 30)) * u, h = (18 + ((n * 53) % 34)) * u;
      g.fillStyle = "#0c1230"; R(x, base - h, w, H - base + h);
      g.beginPath(); g.moveTo(x - 2 * u, base - h); g.lineTo(x + w / 2, base - h - 14 * u); g.lineTo(x + w + 2 * u, base - h); g.closePath(); g.fill();
      g.fillStyle = "#eef4ff"; g.beginPath(); g.moveTo(x - 2 * u, base - h); g.lineTo(x + w / 2, base - h - 14 * u); g.lineTo(x + w + 2 * u, base - h); g.lineTo(x + w / 2, base - h - 11 * u); g.closePath(); g.fill();
      if (n % 2) { g.fillStyle = "#0c1230"; R(x + w * 0.7, base - h - 16 * u, 5 * u, 10 * u); g.fillStyle = "#eef4ff"; R(x + w * 0.7 - u, base - h - 17 * u, 7 * u, 2 * u); }
      for (let wy = base - h + 6 * u; wy < H - 6 * u; wy += 11 * u) for (let wx = x + 5 * u; wx < x + w - 8 * u; wx += 10 * u) {
        if (((wx / u) * 3 + (wy / u) * 7 + n) % 5 < 2) continue;
        g.fillStyle = "#ffcf5a"; R(wx, wy, 4 * u, 5 * u);
      }
      x += w + 2 * u;
    }
    g.fillStyle = "#eef4ff"; R(0, H - 8 * u, W, 8 * u); // snow on the ground
    // falling snow
    if (!this.calm) { g.fillStyle = "rgba(255,255,255,0.85)"; for (const f of this.flakes) R(((f.x + Math.sin(t + f.y * 7) * 0.02) % 1) * W, ((f.y + t * f.v * 2) % 1) * H, u * f.s * 1.4, u * f.s * 1.4); }
    if (t < 0.35 && !this.calm) { g.globalAlpha = 1 - t / 0.35; g.fillStyle = "#fff"; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
    g.restore();
  }
  drawFinaleHi(hg, px) {
    const m = this.moonBox(), t = this.fin.t;
    const stops = (this.racers[0]?.pins || []).filter((q) => q.label).slice(-7);
    hg.textAlign = "center"; hg.textBaseline = "middle";
    hg.globalAlpha = Math.min(1, t / 0.5);
    const top = m.y - m.r * 0.62, wMax = m.r * 1.6;
    hg.font = `${px(17)}px "Bungee", sans-serif`; hg.fillStyle = "#c8202a"; hg.fillText("MERRY CHRISTMAS!", m.x, top, wMax);
    hg.font = `${px(8)}px "Bungee", sans-serif`; hg.fillStyle = "#1f6a3a"; hg.fillText("PRESENTS DELIVERED TO", m.x, top + px(16), wMax);
    const line = Math.min(px(13), (m.r * 1.15) / Math.max(1, stops.length));
    stops.forEach((q, i) => {
      if (t < 0.5 + i * 0.35) return;
      hg.font = `${Math.min(px(10), line * 0.8)}px "Bungee", sans-serif`;
      hg.fillStyle = q.tier >= 4 ? "#a8001a" : "#2a2440";
      hg.fillText(q.label, m.x, top + px(30) + line * (i + 0.5), wMax * 0.9);
    });
    hg.globalAlpha = 1;
  }
}
