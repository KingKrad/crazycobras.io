// ON TOUR's race: a tour bus on a night highway, side-on, city to city. Each answer is a drive to a real
// music city (its skyline rises behind the road) and a gig there: the rarer the answer, the longer the
// drive and the bigger the venue (a bar, a club, a theatre, an arena... or headlining a festival). The
// crowd outside goes wild, spotlights sweep, and TURBO and up set off fireworks. The race starts at
// sunset and drives into the night; some nights it rains, some it's foggy. The answer card is a gig
// ticket, and the end of the race is the encore. Built on the side-scrolling scene (sidescroll.js).
import { SideScene, skyline, TIER_COL, clamp, lerp, hash } from "./sidescroll.js";

const VENUE = ["", "BAR GIG", "CLUB SHOW", "THEATRE", "ARENA", "FESTIVAL HEADLINER"];
const NEON = ["#ff4fd8", "#4fd1ff", "#ffd23a", "#5dff8f", "#c070ff"];
// the world's music cities (the ones with a landmark in sidescroll.js show it)
const CITIES = ["NASHVILLE", "MEMPHIS", "NEW ORLEANS", "AUSTIN", "LOS ANGELES", "LAS VEGAS", "NEW YORK", "CHICAGO", "DETROIT", "SEATTLE",
  "ATLANTA", "TORONTO", "MEXICO CITY", "RIO DE JANEIRO", "BUENOS AIRES", "LONDON", "LIVERPOOL", "DUBLIN", "PARIS", "BERLIN",
  "AMSTERDAM", "IBIZA", "VIENNA", "STOCKHOLM", "LAGOS", "CAIRO", "MUMBAI", "SEOUL", "TOKYO", "SYDNEY"].map((name) => ({ name }));

// colour helpers: mix two "#rrggbb" colours
const hx = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const mix = (a, b, t) => { const A = hx(a), B = hx(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], clamp(t, 0, 1)))).join(",")})`; };
// a smooth bumpy line (for hills): value noise
const bump = (x) => { const i = Math.floor(x), f = x - i, k = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), k); };

// the tour bus, side-on, facing right: a long coach with a row of windows, the tour's colour down the
// side, a destination board, and wheels that turn
function drawBus(g, x, y, s, stripe, t, night) {
  const R = (a, b, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x + a * s), Math.round(y + b * s), Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s))); };
  if (night) { // headlights on the road ahead
    g.fillStyle = "rgba(255,236,170,0.16)";
    g.beginPath(); g.moveTo(x + 27 * s, y - 6 * s); g.lineTo(x + 95 * s, y - 1 * s); g.lineTo(x + 95 * s, y + 6 * s); g.lineTo(x + 27 * s, y - 2 * s); g.fill();
  }
  R(-28, -21, 56, 18, "#0b0618");
  R(-27, -20, 54, 16, "#f1eee6");
  R(-27, -9, 54, 3, stripe); R(-27, -6, 54, 1, "#0b0618");
  for (let k = 0; k < 6; k++) R(-24 + k * 7.6, -18, 6, 6, night ? "#ffe9a0" : "#7fb4d8");
  R(21, -18, 6, 8, "#7fb4d8"); R(22, -17, 4, 2, "#ffffff");       // the windscreen
  R(-20, -21.5, 18, 1.6, "#2a2240"); R(-19, -21.4, 16, 1.2, stripe);  // the roof sign
  R(26, -6, 2, 2, night ? "#fff6c8" : "#e8e2c8"); R(-28, -7, 1.6, 2, "#ff3b3b"); // lights
  R(-27, -4, 54, 1.4, "#2a2c33");
  for (const wx of [-17, 17]) {
    g.fillStyle = "#101014"; g.beginPath(); g.arc(x + wx * s, y - 2 * s, 4.2 * s, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#b4bac4"; g.beginPath(); g.arc(x + wx * s, y - 2 * s, 2 * s, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#101014"; const a = t * 9; g.fillRect(Math.round(x + (wx + Math.cos(a) * 1.4) * s - s / 2), Math.round(y + (-2 + Math.sin(a) * 1.4) * s - s / 2), Math.max(1, Math.round(s)), Math.max(1, Math.round(s)));
  }
}

// a venue by the road, from a little bar to a festival stage; x: its left edge, y: the ground
function drawVenue(g, x, y, s, tier, t, k, calm) {
  const R = (a, b, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x + a * s), Math.round(y - b * s - h * s), Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s))); };
  const blink = (i) => calm || Math.sin(t * 5 + i * 1.7) > -0.6;
  const neon = NEON[tier % NEON.length];
  if (tier <= 1) { // a bar: brick, one lit window, a neon beer sign
    R(0, 0, 30, 22, "#4a2420"); R(0, 22, 30, 2, "#2a1410"); R(4, 4, 8, 12, "#2a1410"); R(16, 8, 10, 8, "#ffcf5a");
    if (blink(0)) R(17, 17, 8, 3, neon);
  } else if (tier === 2) { // a club: a black box, a neon stripe and a queue door
    R(0, 0, 36, 28, "#16101e"); R(0, 26, 36, 2, neon); R(13, 0, 10, 12, "#2a1a3a"); R(14, 1, 8, 10, blink(1) ? "#ff4fd8" : "#5a1a4a");
    for (let i = 0; i < 6; i++) if (blink(i)) R(3 + i * 5.4, 18, 3, 3, NEON[i % 5]);
  } else if (tier === 3) { // a theatre: columns and a marquee full of bulbs
    R(0, 0, 44, 34, "#5a3a2a"); R(-2, 34, 48, 3, "#3a2418"); for (let i = 0; i < 5; i++) R(3 + i * 9, 0, 3, 24, "#7a5a44");
    R(4, 24, 36, 8, "#1a0a10"); for (let i = 0; i < 12; i++) if (blink(i)) R(5 + i * 3, 31, 1.4, 1.4, "#fff6c8");
  } else if (tier === 4) { // an arena: a big glowing dome
    g.fillStyle = "#1e1630"; g.beginPath(); g.ellipse(x + 30 * s, y - 2 * s, 32 * s, 30 * s, 0, Math.PI, 0); g.fill();
    for (let i = 0; i < 10; i++) R(2 + i * 5.8, 4, 3, 3, blink(i) ? NEON[i % 5] : "#2a2040");
    R(0, 0, 60, 4, "#2a2240");
  } else { // a festival: a huge stage with a lighting rig and screens
    R(0, 0, 70, 8, "#2a2238"); R(0, 8, 3, 40, "#3a3450"); R(67, 8, 3, 40, "#3a3450"); R(0, 46, 70, 3, "#3a3450");
    R(6, 10, 18, 22, "#3a0a5a"); R(46, 10, 18, 22, "#3a0a5a"); R(26, 10, 18, 30, "#c41a7c");
    for (let i = 0; i < 12; i++) if (blink(i)) R(3 + i * 5.6, 44, 2, 2, NEON[i % 5]);
  }
}

export class TourScene extends SideScene {
  constructor(canvas) {
    super(canvas);
    this.cardBg = "#1d0b2e";
    this.night = 0.2; this.weather = "clear";
  }
  cityList() { return CITIES; }
  // the encore lists the gigs as "ARENA · TOKYO"
  planLeg(c) { super.planLeg(c); const r = this.racers[c.i]; if (r?.pending) r.pending.label = `${VENUE[c.tier]} · ${r.pending.city.name}`; }
  onSetRacers() {
    this.weather = this.lobby ? "clear" : ["clear", "clear", "rain", "fog"][Math.floor(Math.random() * 4)];
    this.night = this.lobby ? 0.8 : 0.1;
    this.drops = Array.from({ length: 90 }, (_, k) => ({ x: hash(k * 3.1), y: hash(k * 7.7), v: 0.9 + hash(k) * 0.6 }));
  }
  // ON TOUR's home screen: the bus drives a run of shows on its own, deep into the night
  lobbyTick(car) {
    if (!this.lobby || !this.racers.length || this.racers[0].car?.id !== car?.id) {
      this.lobby = true;
      this.setRacers([{ car, label: "", color: "#ff4fd8" }]);
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
  onArrive(r, L) {
    if (L.tier >= 4 && !this.calm) { const st = this.stops[this.stops.length - 1]; this.fwAt = { wx: st.wx + 40, n: L.tier === 5 ? 9 : 4, col: TIER_COL[L.tier] }; }
  }
  tick(dt) {
    // dusk into night as the tour goes on
    const want = this.lobby ? 0.85 : clamp(0.1 + this.answers * 0.15, 0, 1);
    this.night += (want - this.night) * Math.min(1, dt * 0.6);
    if (this.fwAt && Math.random() < dt * 5) {
      this.firework(this.sx(this.fwAt.wx) + (Math.random() - 0.5) * 60 * this.u, this.groundY() - (60 + Math.random() * 40) * this.u, this.fwAt.col);
      if (--this.fwAt.n <= 0) this.fwAt = null;
    }
  }
  vehicleLift(r) { return r.lane * 6 * this.u; }
  tagUp() { return 36 * this.u; }

  drawWorld(g) {
    const { W, H, u } = this, k = this.night, gy = this.groundY(), t = this.calm ? 0 : this.time;
    const s = Math.max(1, u);
    // the sky: a synthwave sunset turning into night
    const sky = g.createLinearGradient(0, 0, 0, gy);
    sky.addColorStop(0, mix("#3a1a6a", "#04020e", k)); sky.addColorStop(0.65, mix("#ff5a6a", "#160a34", k)); sky.addColorStop(1, mix("#ffb05a", "#3a1450", k));
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    // the setting sun, striped
    if (k < 0.85) {
      const sy = gy - 46 * u + k * 70 * u, sr = 30 * u;
      g.save(); g.globalAlpha = 1 - k;
      const sg = g.createLinearGradient(0, sy - sr, 0, sy + sr); sg.addColorStop(0, "#ffe46a"); sg.addColorStop(1, "#ff3a7a");
      g.fillStyle = sg; g.beginPath(); g.arc(W * 0.72, sy, sr, 0, Math.PI * 2); g.fill();
      g.fillStyle = mix("#ff5a6a", "#160a34", k);
      for (let i = 0; i < 5; i++) g.fillRect(W * 0.72 - sr, sy + i * 6 * u, sr * 2, (1 + i * 0.6) * u);
      g.restore();
    }
    // stars and the moon
    g.globalAlpha = clamp(k * 1.3 - 0.2, 0, 1);
    for (let i = 0; i < 70; i++) { g.fillStyle = (Math.sin(t * 2 + i) > 0.6) ? "#ffffff" : "#b8b4e8"; g.fillRect(Math.round(hash(i) * W), Math.round(hash(i + 50) * gy * 0.8), Math.max(1, Math.round(u * 0.8)), Math.max(1, Math.round(u * 0.8))); }
    g.fillStyle = "#f6f0d8"; g.beginPath(); g.arc(W * 0.2, H * 0.12, 11 * u, 0, Math.PI * 2); g.fill();
    g.fillStyle = mix("#3a1a6a", "#04020e", k); g.beginPath(); g.arc(W * 0.2 + 4 * u, H * 0.12 - 2 * u, 10 * u, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 1;
    // far mountains
    const layer = (p, base, amp, scale, col) => {
      g.fillStyle = col; g.beginPath(); g.moveTo(0, gy);
      for (let x = 0; x <= W + 8; x += 6) { const wx = (x - this.anchorX) / (u * p) + this.cam; g.lineTo(x, base - bump(wx / scale) * amp - bump(wx / (scale * 0.37) + 9) * amp * 0.35); }
      g.lineTo(W, gy); g.closePath(); g.fill();
    };
    layer(0.08, gy - 26 * u, 40 * u, 260, mix("#7a2a6a", "#140a2e", k));
    // the cities: each stop's skyline, behind the road
    for (const st of this.stops) {
      const x = this.sx(st.wx, 0.32);
      if (x < -120 * u || x > W + 120 * u) continue;
      skyline(g, st.city.name, x, gy - 14 * u, s * 0.9, { col: mix("#4a1a5a", "#120a26", k), win: "#ffcf5a", lit: 0.12 + k * 0.4, t });
    }
    layer(0.5, gy - 10 * u, 16 * u, 90, mix("#3a1440", "#0b0618", k));
    // the highway: a shoulder, a crash barrier, lamp posts, the road, its dashes
    g.fillStyle = mix("#2a1a2a", "#0e0a16", k); g.fillRect(0, gy - 10 * u, W, 10 * u);
    for (let wx = Math.floor((this.cam - this.anchorX / u) / 150) * 150; ; wx += 150) {
      const x = this.sx(wx); if (x > W + 20) break; if (x < -20) continue;
      g.fillStyle = "#3a3450"; g.fillRect(Math.round(x), Math.round(gy - 52 * u), Math.max(1, Math.round(1.6 * u)), Math.round(42 * u)); g.fillRect(Math.round(x), Math.round(gy - 52 * u), Math.round(9 * u), Math.max(1, Math.round(1.4 * u)));
      if (k > 0.35) { g.fillStyle = `rgba(255,214,140,${0.22 * k})`; g.beginPath(); g.moveTo(x + 8 * u, gy - 51 * u); g.lineTo(x + 20 * u, gy + 8 * u); g.lineTo(x - 4 * u, gy + 8 * u); g.fill(); g.fillStyle = "#fff0b0"; g.fillRect(Math.round(x + 7 * u), Math.round(gy - 51 * u), Math.round(3 * u), Math.max(1, Math.round(1.6 * u))); }
    }
    // the venues at the stops, and the fans outside
    for (const st of this.stops) {
      if (st.i < 0) continue;
      const x = this.sx(st.wx) + 40 * u;
      if (x < -100 * u || x > W + 20) continue;
      drawVenue(g, x, gy - 10 * u, s * 1.25, st.tier, t, k, this.calm);
      const recent = st.arrived ? clamp(1 - (this.time - st.arrived) / 8, 0, 1) : 0;
      if (recent > 0 && st.tier >= 3 && !this.calm) { // spotlights sweeping the sky
        for (let i = 0; i < 3; i++) {
          const a = Math.sin(t * 1.3 + i * 2) * 0.5, x0 = x + (12 + i * 16) * u;
          g.globalAlpha = 0.12 * recent; g.fillStyle = NEON[i];
          g.beginPath(); g.moveTo(x0, gy - 20 * u); g.lineTo(x0 + Math.sin(a) * 200 * u - 14 * u, 0); g.lineTo(x0 + Math.sin(a) * 200 * u + 14 * u, 0); g.fill();
        }
        g.globalAlpha = 1;
      }
      const fans = 4 + st.tier * 3;
      for (let i = 0; i < fans; i++) {
        const fx = x + (i * 5.2 - 4) * u, hop = recent > 0 && !this.calm ? Math.max(0, Math.sin(t * 9 + i * 1.3)) * 3 * u * (0.4 + recent) : 0;
        g.fillStyle = ["#2a1a3a", "#3a2040", "#1a1430"][i % 3];
        g.fillRect(Math.round(fx), Math.round(gy - 16 * u - hop), Math.round(3 * u), Math.round(6 * u));
        g.beginPath(); g.arc(fx + 1.5 * u, gy - 17.5 * u - hop, 1.7 * u, 0, Math.PI * 2); g.fill();
        if (recent > 0 && st.tier >= 4 && i % 2) { g.fillStyle = i % 4 === 1 ? "#ffcf5a" : "#cfe8ff"; g.fillRect(Math.round(fx + 2 * u), Math.round(gy - 24 * u - hop), Math.max(1, Math.round(u)), Math.round(2 * u)); } // lighters and phones up
      }
    }
    // the road
    const rd = g.createLinearGradient(0, gy, 0, H); rd.addColorStop(0, mix("#3a3448", "#1a1824", k)); rd.addColorStop(1, mix("#24202e", "#0c0a12", k));
    g.fillStyle = rd; g.fillRect(0, gy, W, H - gy);
    g.fillStyle = "#c8c0d8"; g.fillRect(0, gy, W, Math.max(1, Math.round(u)));
    g.fillStyle = "#ffd23a";
    for (let wx = Math.floor((this.cam - this.anchorX / u) / 40) * 40; ; wx += 40) { const x = this.sx(wx); if (x > W) break; g.fillRect(Math.round(x), Math.round(gy + 9 * u), Math.round(18 * u), Math.max(1, Math.round(1.6 * u))); }
    // oncoming traffic in the far lane: headlights going by
    for (let i = 0; i < 3; i++) {
      const per = 900, wx = ((i * 337 - this.time * 120) % per + per) % per + Math.floor(this.cam / per) * per - per * 0.3;
      const x = this.sx(wx); if (x < -30 || x > W + 30) continue;
      g.fillStyle = ["#3a5a8a", "#8a3a3a", "#5a5a5a"][i]; g.fillRect(Math.round(x), Math.round(gy - 1 * u), Math.round(20 * u), Math.round(6 * u)); g.fillRect(Math.round(x + 4 * u), Math.round(gy - 5 * u), Math.round(11 * u), Math.round(4 * u));
      g.fillStyle = "#fff6c8"; g.fillRect(Math.round(x), Math.round(gy + 1 * u), Math.round(2 * u), Math.round(2 * u));
      if (k > 0.4) { g.fillStyle = "rgba(255,246,200,0.12)"; g.beginPath(); g.moveTo(x, gy); g.lineTo(x - 60 * u, gy - 3 * u); g.lineTo(x - 60 * u, gy + 8 * u); g.fill(); }
    }
    // the buses (the far lane first)
    for (const r of [...this.racers].sort((a, b) => b.lane - a.lane)) {
      const [x, y] = this.vehicleAt(r);
      const shakeX = r.stalled > 0 && !this.calm ? (Math.random() - 0.5) * 2 * u : 0;
      drawBus(g, x + shakeX, y, s * 1.3, r.color || r.car?.color || "#ff4fd8", r.leg ? t : t * 0.1, k > 0.4);
      if (r.leg && !this.calm && Math.random() < 0.5) this.particles.push({ x: x - 36 * u, y: y - 5 * u, vx: -30 - Math.random() * 20, vy: -6, life: 0.5, c: "rgba(200,190,220,0.5)", s: 2, screen: true });
    }
    // the weather
    if (this.weather === "rain" && !this.calm) {
      g.strokeStyle = "rgba(190,210,255,0.35)"; g.lineWidth = Math.max(1, u * 0.7); g.beginPath();
      for (const d of this.drops) { const x = ((d.x * W - this.time * 60 * d.v) % W + W) % W, y = ((d.y + this.time * 1.4 * d.v) % 1) * H; g.moveTo(x, y); g.lineTo(x - 3 * u, y + 10 * u); }
      g.stroke();
      g.fillStyle = "rgba(255,214,140,0.06)"; g.fillRect(0, gy + 2 * u, W, 10 * u); // wet road shine
    } else if (this.weather === "fog") {
      for (let i = 0; i < 3; i++) { const y = gy - (30 + i * 22) * u; const fg = g.createLinearGradient(0, y - 14 * u, 0, y + 14 * u); fg.addColorStop(0, "rgba(200,180,230,0)"); fg.addColorStop(0.5, `rgba(200,180,230,${0.12 + 0.04 * Math.sin(this.time * 0.5 + i)})`); fg.addColorStop(1, "rgba(200,180,230,0)"); g.fillStyle = fg; g.fillRect(0, y - 14 * u, W, 28 * u); }
    }
  }
  // the venue signs: what kind of gig, and where
  drawStopsHi(hg, px) {
    const u = this.u, gy = this.groundY();
    for (const st of this.stops.slice(-8)) {
      if (st.i < 0) continue;
      const x = this.sx(st.wx) + 40 * u + [15, 15, 18, 22, 30, 35][st.tier] * 1.25 * u;
      if (x < -60 || x > this.W + 60) continue;
      const top = gy - 10 * u - [24, 26, 30, 38, 34, 50][st.tier] * 1.25 * u - px(14);
      hg.font = `${px(9)}px "Bungee", sans-serif`;
      const t1 = VENUE[st.tier], t2 = st.city.name, w = Math.max(hg.measureText(t1).width, hg.measureText(t2).width) + px(10);
      hg.fillStyle = "rgba(11,6,24,0.85)"; hg.fillRect(x - w / 2, top - px(8), w, px(26));
      hg.strokeStyle = NEON[st.tier % NEON.length]; hg.lineWidth = px(1.5); hg.strokeRect(x - w / 2, top - px(8), w, px(26));
      hg.fillStyle = NEON[st.tier % NEON.length]; hg.fillText(t1, x, top);
      hg.fillStyle = "#fff6e0"; hg.fillText(t2, x, top + px(11));
    }
  }
  // ---- the finale: the encore. A stage under sweeping lights, your bus parked by it, a sea of lighters,
  // and the screen behind the stage showing your tour poster: every gig you played ----
  stageBox() {
    const { W, H } = this;
    const top = H * 0.18, bot = H * 0.7;
    return { x: W * 0.08, y: top, w: W * 0.84, h: bot - top, floor: bot };
  }
  drawFinale() {
    const { g, W, H, u } = this, t = this.fin.t, b = this.stageBox();
    const R = (x, y, w, h) => g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
    g.save(); g.imageSmoothingEnabled = false;
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#07021a"); bg.addColorStop(0.6, "#1a0630"); bg.addColorStop(1, "#05020c");
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    // spotlights sweeping over the crowd
    if (!this.calm) for (let k = 0; k < 5; k++) {
      const x0 = b.x + (b.w * (k + 0.5)) / 5, a = Math.sin(t * 1.3 + k * 1.7) * 0.55;
      g.globalAlpha = 0.16; g.fillStyle = ["#ff4fd8", "#4fd1ff", "#ffd23a", "#5dff8f", "#c070ff"][k];
      g.beginPath(); g.moveTo(x0, b.y); g.lineTo(x0 + Math.sin(a) * H - W * 0.08, H); g.lineTo(x0 + Math.sin(a) * H + W * 0.08, H); g.closePath(); g.fill();
    }
    g.globalAlpha = 1;
    // the big screen at the back of the stage (the poster's words go on the sharp layer)
    const sc = { x: b.x + b.w * 0.12, y: b.y + 10 * u, w: b.w * 0.76, h: b.h * 0.62 };
    g.fillStyle = "#0b0618"; R(sc.x - 3 * u, sc.y - 3 * u, sc.w + 6 * u, sc.h + 6 * u);
    const pg = g.createLinearGradient(0, sc.y, 0, sc.y + sc.h); pg.addColorStop(0, "#3a0a5a"); pg.addColorStop(1, "#c41a7c");
    g.fillStyle = pg; R(sc.x, sc.y, sc.w, sc.h);
    // the truss and its lights
    g.fillStyle = "#3a3450"; R(b.x, b.y - 4 * u, b.w, 4 * u);
    for (let k = 0; k < 12; k++) { const on = this.calm || Math.sin(t * 6 + k) > -0.3; g.fillStyle = on ? ["#fff6c8", "#ff4fd8", "#4fd1ff"][k % 3] : "#4a4060"; R(b.x + (b.w * (k + 0.5)) / 12 - u, b.y - 3 * u, 2.5 * u, 2.5 * u); }
    // the stage floor
    g.fillStyle = "#2a2238"; R(b.x, b.floor - 10 * u, b.w, 10 * u);
    g.fillStyle = "#ffd23a"; R(b.x, b.floor - 10 * u, b.w, u);
    // the tour bus, parked at the side of the stage, side-on
    const bx = b.x + b.w - 58 * u, by = b.floor - 10 * u;
    g.fillStyle = "#f4f1ea"; R(bx, by - 18 * u, 52 * u, 16 * u);
    g.fillStyle = this.racers[0]?.color || "#ff4fd8"; R(bx, by - 9 * u, 52 * u, 3 * u);
    g.fillStyle = "#9fd8ff"; for (let k = 0; k < 6; k++) R(bx + 3 * u + k * 8 * u, by - 16 * u, 6 * u, 5 * u);
    g.fillStyle = "#1a1a22"; R(bx + 8 * u, by - 3 * u, 7 * u, 4 * u); R(bx + 38 * u, by - 3 * u, 7 * u, 4 * u);
    // the crowd: heads, and lighters and phone lights waving
    for (let row = 0; row < 4; row++) {
      const y = b.floor + 8 * u + row * 11 * u;
      for (let x = (row % 2) * 5 * u; x < W; x += 10 * u) {
        const sway = Math.sin(t * 2.2 + x * 0.05 + row) * 2 * u;
        g.fillStyle = "#120a22"; g.beginPath(); g.arc(x, y, 4.5 * u, 0, Math.PI * 2); g.fill();
        if (((x / u) * 7 + row * 13) % 3 < 1.2) {
          g.fillStyle = "#3a3048"; R(x + sway * 0.3, y - 12 * u, 1.5 * u, 8 * u);
          const flick = this.calm ? 1 : 0.7 + 0.3 * Math.sin(t * 15 + x);
          g.fillStyle = (row + x) % 2 ? `rgba(255,190,60,${flick})` : `rgba(200,230,255,${flick})`;
          R(x + sway - u * 0.5, y - 15 * u, 2 * u, 3 * u);
        }
      }
    }
    if (t < 0.35 && !this.calm) { g.globalAlpha = 1 - t / 0.35; g.fillStyle = "#fff"; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
    g.restore();
  }
  drawFinaleHi(hg, px) {
    const b = this.stageBox(), u = this.u, t = this.fin.t;
    const sc = { x: b.x + b.w * 0.12, y: b.y + 10 * u, w: b.w * 0.76, h: b.h * 0.62 };
    const gigs = (this.racers[0]?.pins || []).filter((p) => p.label).slice(-7);
    hg.textAlign = "center"; hg.textBaseline = "middle";
    const pop = Math.min(1, t / 0.5);
    hg.globalAlpha = pop;
    hg.font = `${px(22)}px "Bungee", sans-serif`; hg.fillStyle = "#000"; hg.fillText("ENCORE!", sc.x + sc.w / 2 + px(2), sc.y + px(20) + px(2), sc.w - px(10));
    hg.fillStyle = "#ffe6fb"; hg.fillText("ENCORE!", sc.x + sc.w / 2, sc.y + px(20), sc.w - px(10));
    hg.font = `${px(9)}px "Bungee", sans-serif`; hg.fillStyle = "#ffd23a"; hg.fillText("THE WORLD TOUR · LIVE IN", sc.x + sc.w / 2, sc.y + px(40), sc.w - px(10));
    const line = Math.min(px(15), (sc.h - px(56)) / Math.max(1, gigs.length));
    gigs.forEach((p, i) => {
      if (t < 0.5 + i * 0.35) return; // one gig at a time
      hg.font = `${Math.min(px(11), line * 0.8)}px "Bungee", sans-serif`;
      hg.fillStyle = TIER_COL[p.tier] || "#fff";
      hg.fillText(p.label, sc.x + sc.w / 2, sc.y + px(56) + line * (i + 0.5), sc.w - px(12));
    });
    hg.globalAlpha = 1;
  }
  // the card is a gig ticket: a perforated stub down the right with a star on it
  drawCardMark(hg, w, h, col, px) {
    const x = w / 2 - px(26);
    hg.fillStyle = col;
    for (let y = -h / 2 + px(5); y < h / 2 - px(5); y += px(7)) hg.fillRect(x, y, px(1.5), px(3.5));
    hg.font = `${px(12)}px "Bungee", sans-serif`; hg.fillText("★", w / 2 - px(13), 0);
    hg.fillStyle = "#ff4fd8"; hg.fillRect(-w / 2 + px(2), -h / 2 + px(2), px(5), h - px(4));
  }
}
