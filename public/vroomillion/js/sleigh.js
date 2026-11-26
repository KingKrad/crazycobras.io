// CHRISTMAS's race: Christmas Eve, side-on. Santa's sleigh (reindeer, Rudolph's nose and all) flies over
// a snowy town under the moon: rooftops, chimneys, lit windows and fairy lights scroll by below, pine
// forests and mountains behind, the northern lights overhead and snow falling. Each answer is a flight to
// a real city (its skyline rises behind the roofs) and a present down a chimney there, while the
// townsfolk wave. Rarer answers fly further and higher, and light up the sky. It starts at Santa's
// workshop, with the elves. The answer card is a gift tag; the end is the moonlit delivery list.
// Built on the side-scrolling scene (sidescroll.js).
import { SideScene, skyline, TIER_COL, clamp, lerp, hash } from "./sidescroll.js";
import { carSprite, carById } from "./cars.js";

const LIGHTS = ["#ffd23a", "#ff5a4f", "#5dff8f", "#fff6e0"];
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
].map(([name]) => ({ name }));
const HOME = { name: "SANTA'S VILLAGE" };
const bump = (x) => { const i = Math.floor(x), f = x - i, k = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), k); };
const SLOT = 62; // one house per this many world units

export class SleighScene extends SideScene {
  constructor(canvas) {
    super(canvas);
    this.cardBg = "#0e2a1a";
    this.aurora = 0.2;
    this.flakes = Array.from({ length: 70 }, (_, k) => ({ x: (k * 0.6180339) % 1, y: (k * 0.4142) % 1, s: 0.6 + ((k * 7) % 5) / 5, v: 0.04 + ((k * 13) % 7) / 120 }));
    this.gifts = [];
  }
  cityList() { return CITIES; }
  startCity() { return HOME; }
  onSetRacers() { this.gifts = []; this.aurora = this.lobby ? 0.5 : 0.2; }
  // the home screen: the sleigh doing a round of deliveries on its own
  lobbyTick(car) {
    if (!this.lobby || !this.racers.length || this.racers[0].car?.id !== car?.id) {
      this.lobby = true;
      this.setRacers([{ car, label: "", color: "#ff3b3b" }]);
      this.tourI = 0; this.tourWait = 1.2;
    }
    const r = this.racers[0];
    if (r.leg || r.pending) return;
    this.tourWait -= 1 / 30;
    if (this.tourWait > 0) return;
    const tier = [1, 2, 3, 2, 4, 3, 5][this.tourI++ % 7];
    this.planLeg({ i: 0, tier });
    this.launch(0, tier, false, 3 + tier * 0.4);
    if (r.pins.length > 8) r.pins.shift();
    this.tourWait = 2.4;
  }
  // high over the roofs; a flight arcs up (the rarer, the higher), and the sleigh bobs on the wind
  vehicleLift(r) {
    const u = this.u, bob = this.calm ? 0 : Math.sin(this.time * 2.2 + r.lane) * 2.5 * u;
    const arc = r.leg ? Math.sin(Math.PI * (r.legK || 0)) * (10 + r.leg.tier * 9) * u : 0;
    return 62 * u + r.lane * 20 * u + bob + arc;
  }
  tagUp() { return 24 * this.u; }
  onLaunch(r, tier) { if (tier >= 3) this.aurora = Math.max(this.aurora, 0.4 + tier * 0.12); }
  // a present goes down the nearest chimney
  onArrive(r, L) {
    const [x, y] = this.vehicleAt(r);
    const slot = Math.round(r.wx / SLOT);
    this.gifts.push({ x, y: y + 4 * this.u, tx: this.sx(slot * SLOT + SLOT * 0.62), t: 0, col: TIER_COL[L.tier] });
    if (L.tier >= 4 && !this.calm) for (let k = 0; k < 4; k++) this.firework(x + (Math.random() - 0.5) * 80 * this.u, y - 30 * this.u - Math.random() * 30 * this.u, TIER_COL[L.tier]);
  }
  tick(dt) {
    this.aurora += ((this.lobby ? 0.5 : 0.2 + this.answers * 0.05) - this.aurora) * Math.min(1, dt * 0.25);
    for (const p of this.gifts) p.t += dt;
    this.gifts = this.gifts.filter((p) => p.t < 1.6);
  }
  house(i) { // the house in slot i: its size, roof, chimney and lights
    const w = 40 + Math.floor(hash(i * 1.7) * 16), h = 24 + Math.floor(hash(i * 3.3) * 22);
    return { w, h, roof: hash(i * 5.1) < 0.7 ? "gable" : "flat", chimney: hash(i * 7.9) < 0.75, lights: hash(i * 2.3) < 0.6, wreath: hash(i * 4.4) < 0.5, col: ["#5a2a2a", "#2a3a5a", "#3a4a3a", "#5a4a3a", "#4a2a4a"][i % 5] };
  }
  roofY(i) { const hs = this.house(i); return this.bottom - 2 * this.u - hs.h * this.u; }

  drawWorld(g) {
    const { W, H, u } = this, t = this.calm ? 0 : this.time, base = this.bottom - 2 * u;
    const s = Math.max(1, u);
    // the night sky
    const sky = g.createLinearGradient(0, 0, 0, base);
    sky.addColorStop(0, "#030820"); sky.addColorStop(0.7, "#0c1a48"); sky.addColorStop(1, "#1c2c60");
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 80; i++) { g.fillStyle = Math.sin(t * 2.5 + i * 1.3) > 0.5 ? "#ffffff" : "#8a9ad8"; g.fillRect(Math.round(hash(i) * W), Math.round(hash(i + 90) * base * 0.75), Math.max(1, Math.round(u * 0.8)), Math.max(1, Math.round(u * 0.8))); }
    // the northern lights: green and violet curtains, brighter the better it's going
    const a = clamp(this.aurora, 0, 1);
    for (let band = 0; band < 3; band++) {
      const col = ["94,255,170", "80,220,255", "190,120,255"][band];
      for (let x = 0; x < W; x += Math.max(2, Math.round(3 * u))) {
        const wave = Math.sin(x / (60 * u) + t * 0.4 + band * 1.7) * 18 * u + Math.sin(x / (23 * u) - t * 0.7) * 6 * u;
        const y0 = base * (0.18 + band * 0.1) + wave, len = (30 + 20 * Math.sin(x / (40 * u) + band)) * u * (0.6 + a);
        const gr = g.createLinearGradient(0, y0, 0, y0 + len); gr.addColorStop(0, `rgba(${col},0)`); gr.addColorStop(0.3, `rgba(${col},${0.26 * a})`); gr.addColorStop(1, `rgba(${col},0)`);
        g.fillStyle = gr; g.fillRect(x, y0, Math.max(2, Math.round(3 * u)), len);
      }
    }
    // the moon
    const mx = W * 0.8, my = this.playTop() + 16 * u, mr = 16 * u;
    const mg = g.createRadialGradient(mx, my, mr * 0.8, mx, my, mr * 2.4); mg.addColorStop(0, "rgba(255,246,200,0.25)"); mg.addColorStop(1, "rgba(255,246,200,0)");
    g.fillStyle = mg; g.fillRect(mx - mr * 3, my - mr * 3, mr * 6, mr * 6);
    g.fillStyle = "#fff3c4"; g.beginPath(); g.arc(mx, my, mr, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#efe0a4"; for (const [dx, dy, rr] of [[-0.4, -0.3, 0.16], [0.3, 0.25, 0.12], [0.1, -0.5, 0.08]]) { g.beginPath(); g.arc(mx + dx * mr, my + dy * mr, rr * mr, 0, Math.PI * 2); g.fill(); }
    // snowy mountains far away
    const ridge = (p, y0, amp, scale, col, cap) => {
      g.fillStyle = col; g.beginPath(); g.moveTo(0, base);
      const pts = [];
      for (let x = 0; x <= W + 8; x += 6) { const wx = (x - this.anchorX) / (u * p) + this.cam; const y = y0 - bump(wx / scale) * amp - bump(wx / (scale * 0.4) + 5) * amp * 0.3; pts.push([x, y]); g.lineTo(x, y); }
      g.lineTo(W, base); g.closePath(); g.fill();
      if (cap) { g.fillStyle = cap; for (const [x, y] of pts) if (y < y0 - amp * 0.55) g.fillRect(x, y, 6, Math.max(1, (y0 - amp * 0.55 - y) * 0.5)); }
    };
    ridge(0.06, base - 40 * u, 46 * u, 240, "#2a3a6a", "#dfe8ff");
    // the cities: each stop's skyline, iced, with warm windows
    for (const st of this.stops) {
      if (st.i < 0) continue;
      const x = this.sx(st.wx, 0.3);
      if (x < -120 * u || x > W + 120 * u) continue;
      skyline(g, st.city.name, x, base - 26 * u, s * 0.85, { col: "#1a2650", win: "#ffd88a", lit: 0.45, snow: true, t });
    }
    // pine forest
    for (let wx = Math.floor((this.cam - this.anchorX / (u * 0.5)) / 22) * 22; ; wx += 22) {
      const x = this.sx(wx, 0.5); if (x > W + 20) break; if (x < -20) continue;
      const th = (16 + hash(wx) * 16) * u, y0 = base - 20 * u;
      g.fillStyle = "#0e2a26"; g.beginPath(); g.moveTo(x, y0 - th); g.lineTo(x + 7 * u, y0); g.lineTo(x - 7 * u, y0); g.fill();
      g.fillStyle = "#e8f0ff"; g.beginPath(); g.moveTo(x, y0 - th); g.lineTo(x + 2.4 * u, y0 - th * 0.66); g.lineTo(x - 2.4 * u, y0 - th * 0.66); g.fill();
    }
    g.fillStyle = "#c8d4f0"; g.fillRect(0, base - 20 * u, W, 20 * u);
    // Santa's workshop at the start: candy-striped pole, the workshop, elves waving
    const home = this.sx(0) - 70 * u;
    if (home > -140 * u && home < W + 20) {
      const R = (a2, b2, w2, h2, c) => { g.fillStyle = c; g.fillRect(Math.round(home + a2 * u), Math.round(base - b2 * u - h2 * u), Math.max(1, Math.round(w2 * u)), Math.max(1, Math.round(h2 * u))); };
      R(0, 0, 60, 34, "#7a2a20"); R(-4, 34, 68, 4, "#eef4ff"); R(22, 0, 14, 20, "#3a1a10"); R(6, 14, 10, 10, "#ffd88a"); R(44, 14, 10, 10, "#ffd88a");
      for (let k = 0; k < 6; k++) R(70, k * 6, 3, 3, k % 2 ? "#d42020" : "#f4f4f4"); R(68.5, 36, 6, 3, "#ffd23a");
      for (let k = 0; k < 4; k++) { const ex = 4 + k * 14, wave = Math.sin(t * 6 + k) > 0; R(ex, -1, 4, 6, "#1f8a4c"); R(ex + 0.5, 5, 3, 3, "#f2c8a0"); R(ex, 8, 4, 3, "#d42020"); R(wave ? ex + 4 : ex - 1, wave ? 4 : 2, 1, 3, "#1f8a4c"); }
    }
    // the rooftops
    for (let i = Math.floor((this.cam - this.anchorX / u) / SLOT) - 1; ; i++) {
      const x0 = this.sx(i * SLOT); if (x0 > W + 10) break;
      if (i < 1 || x0 + SLOT * u < -10) continue; // (the workshop stands at the start)
      const hs = this.house(i), x = x0 + (SLOT - hs.w) * u * 0.5, top = base - hs.h * u, w = hs.w * u;
      g.fillStyle = hs.col; g.fillRect(Math.round(x), Math.round(top), Math.round(w), Math.round(hs.h * u + 4 * u));
      if (hs.roof === "gable") { g.fillStyle = "#2a1a1a"; g.beginPath(); g.moveTo(x - 3 * u, top); g.lineTo(x + w / 2, top - 14 * u); g.lineTo(x + w + 3 * u, top); g.fill(); g.fillStyle = "#f0f6ff"; g.beginPath(); g.moveTo(x - 3 * u, top); g.lineTo(x + w / 2, top - 14 * u); g.lineTo(x + w + 3 * u, top); g.lineTo(x + w / 2, top - 10.5 * u); g.fill(); }
      else { g.fillStyle = "#f0f6ff"; g.fillRect(Math.round(x - 2 * u), Math.round(top - 3 * u), Math.round(w + 4 * u), Math.round(3 * u)); }
      if (hs.chimney) { const cx = x + w * 0.62; g.fillStyle = "#6a3a2a"; g.fillRect(Math.round(cx), Math.round(top - 16 * u), Math.round(6 * u), Math.round(12 * u)); g.fillStyle = "#f0f6ff"; g.fillRect(Math.round(cx - u), Math.round(top - 17 * u), Math.round(8 * u), Math.round(2 * u));
        if (!this.calm) for (let k = 0; k < 3; k++) { const ph = (t * 0.6 + k / 3 + hash(i)) % 1; g.fillStyle = `rgba(220,220,235,${0.35 * (1 - ph)})`; g.beginPath(); g.arc(cx + 3 * u + Math.sin(ph * 6) * 3 * u, top - 18 * u - ph * 20 * u, (2 + ph * 4) * u, 0, Math.PI * 2); g.fill(); } }
      for (let wy = 0; wy < 2; wy++) for (let wxi = 0; wxi < 3; wxi++) { if (hash(i * 9 + wy * 3 + wxi) < 0.25) continue; const wx2 = x + (6 + wxi * (hs.w - 16) / 2) * u, wy2 = top + (6 + wy * 11) * u; if (wy2 > base - 6 * u) continue; g.fillStyle = "#ffd88a"; g.fillRect(Math.round(wx2), Math.round(wy2), Math.round(6 * u), Math.round(6 * u)); g.fillStyle = hs.col; g.fillRect(Math.round(wx2 + 2.6 * u), Math.round(wy2), Math.max(1, Math.round(0.8 * u)), Math.round(6 * u)); }
      if (hs.wreath) { g.strokeStyle = "#1f8a4c"; g.lineWidth = 1.6 * u; g.beginPath(); g.arc(x + w * 0.3, top + hs.h * u * 0.62, 3 * u, 0, Math.PI * 2); g.stroke(); g.fillStyle = "#d42020"; g.fillRect(Math.round(x + w * 0.3 - u), Math.round(top + hs.h * u * 0.62 + 2 * u), Math.round(2 * u), Math.round(2 * u)); }
      if (hs.lights) for (let k = 0; k < hs.w / 5; k++) { g.fillStyle = (this.calm || Math.sin(t * 4 + k + i) > -0.3) ? LIGHTS[(k + i) % LIGHTS.length] : "#3a3a4a"; g.fillRect(Math.round(x + k * 5 * u), Math.round(top + 1 * u + (k % 2) * u), Math.max(1, Math.round(1.6 * u)), Math.max(1, Math.round(1.6 * u))); }
    }
    // townsfolk waving at the sleigh where it just delivered
    for (const st of this.stops) {
      if (!st.arrived || st.i < 0) continue;
      const k = clamp(1 - (this.time - st.arrived) / 6, 0, 1); if (k <= 0) continue;
      const x = this.sx(st.wx);
      for (let n = 0; n < 4; n++) {
        const px2 = x + (n * 9 - 14) * u, py = base + 1 * u, up = !this.calm && Math.sin(t * 8 + n) > 0;
        g.fillStyle = ["#d42020", "#2a5bd6", "#1f8a4c", "#ffd23a"][n]; g.fillRect(Math.round(px2), Math.round(py - 8 * u), Math.round(4 * u), Math.round(6 * u));
        g.fillStyle = "#f2c8a0"; g.fillRect(Math.round(px2 + 0.5 * u), Math.round(py - 11 * u), Math.round(3 * u), Math.round(3 * u));
        g.fillStyle = ["#d42020", "#2a5bd6", "#1f8a4c", "#ffd23a"][n]; g.fillRect(Math.round(px2 + 4 * u), Math.round(py - (up ? 13 : 9) * u), Math.max(1, Math.round(u)), Math.round(4 * u));
      }
    }
    // snow on the ground at the very bottom
    g.fillStyle = "#eef4ff"; g.fillRect(0, base, W, 6 * u); // a snowy street, then the night below it (the answer bar and buttons sit there)
    const low = g.createLinearGradient(0, base + 6 * u, 0, H); low.addColorStop(0, "#1a2a5a"); low.addColorStop(1, "#060c24");
    g.fillStyle = low; g.fillRect(0, base + 6 * u, W, H - base);
    // the presents going down the chimneys
    for (const p of this.gifts) {
      const k = clamp(p.t / 1, 0, 1), x = lerp(p.x, p.tx, k), y = lerp(p.y, base - 50 * u, k * k);
      if (k < 1) { g.fillStyle = "#c8202a"; g.fillRect(Math.round(x - 3 * u), Math.round(y - 3 * u), Math.round(6 * u), Math.round(6 * u)); g.fillStyle = "#ffd23a"; g.fillRect(Math.round(x - 0.6 * u), Math.round(y - 3 * u), Math.max(1, Math.round(1.2 * u)), Math.round(6 * u)); }
      else if (!this.calm) for (let q = 0; q < 6; q++) { g.fillStyle = p.col; const a2 = q + p.t * 4; g.fillRect(Math.round(x + Math.cos(a2) * (p.t - 1) * 30 * u), Math.round(y + Math.sin(a2) * (p.t - 1) * 30 * u), Math.max(1, Math.round(1.5 * u)), Math.max(1, Math.round(1.5 * u))); }
    }
    // the sleighs, and their sparkly trails
    for (const r of this.racers) {
      const [x, y] = this.vehicleAt(r);
      if (r.leg && !this.calm && Math.random() < 0.8) this.particles.push({ x: x - 22 * u, y: y - 4 * u + (Math.random() - 0.5) * 6 * u, vx: -20 - Math.random() * 30, vy: (Math.random() - 0.5) * 10, life: 0.8, c: LIGHTS[Math.floor(Math.random() * 4)], s: 1.6, screen: true });
      const img = carSprite(carById("sleigh26"), this.calm ? 0 : Math.floor(this.time * 8) % 2);
      const sw = 82 * u, sh = sw * img.height / img.width;
      g.save();
      if (r.stalled > 0 && !this.calm) g.translate((Math.random() - 0.5) * 2 * u, 0);
      g.drawImage(img, Math.round(x - sw * 0.6), Math.round(y - sh), Math.round(sw), Math.round(sh));
      g.restore();
    }
    // falling snow
    if (!this.calm) {
      g.fillStyle = "rgba(255,255,255,0.85)";
      for (const f of this.flakes) { const fx = ((f.x + Math.sin(this.time * 0.7 + f.y * 9) * 0.02 - this.time * 0.01) % 1 + 1) % 1 * W, fy = ((f.y + this.time * f.v) % 1) * H; const d = Math.max(1, Math.round(u * f.s * 1.3)); g.fillRect(Math.round(fx), Math.round(fy), d, d); }
    }
  }
  // each city's name on a banner over the roofs; DELIVERED! once the present's down
  drawStopsHi(hg, px) {
    const u = this.u;
    for (const st of this.stops.slice(-8)) {
      if (st.i < 0) continue;
      const x = this.sx(st.wx);
      if (x < -60 || x > this.W + 60) continue;
      const y = this.bottom - 2 * u - 22 * u; // in front of the houses, under the sleigh
      const done = st.arrived && this.time - st.arrived < 5;
      hg.font = `${px(10)}px "Bungee", sans-serif`;
      const t1 = (done ? "DELIVERED! · " : "★ ") + st.city.name, w = hg.measureText(t1).width + px(12);
      hg.fillStyle = "rgba(14,42,26,0.88)"; hg.fillRect(x - w / 2, y - px(9), w, px(18));
      hg.strokeStyle = "#ffd23a"; hg.lineWidth = px(1.5); hg.strokeRect(x - w / 2, y - px(9), w, px(18));
      hg.fillStyle = done ? "#ffd23a" : "#fff6e0"; hg.fillText(t1, x, y + px(1));
    }
  }
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
