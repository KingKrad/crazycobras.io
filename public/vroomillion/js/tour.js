// ON TOUR's race: the WORLD TOUR map at night, and your tour bus playing gigs round the world's music
// cities. Every answer is a gig: the rarer it is, the further the next city and the bigger the venue
// (a bar, a club, a theatre, an arena, a stadium... or headlining a festival). Long hops fly the tour
// jet; ONE IN A VROOMILLION laps the planet. The answer card is a gig ticket.
// It's WorldScene (world.js) with its own map layer, vehicle, trips and card.
import { WorldScene, toWorld, landAt, tripKind, MW } from "./world.js";

const lerp = (a, b, t) => a + (b - a) * t;
const VENUE = ["", "BAR GIG", "CLUB SHOW", "THEATRE", "ARENA", "FESTIVAL HEADLINER"];
const NEON = ["#ff4fd8", "#4fd1ff", "#ffd23a", "#5dff8f", "#c070ff"];
// the world's music cities
const CITIES = [
  ["NASHVILLE", 36.16, -86.78], ["MEMPHIS", 35.15, -90.05], ["NEW ORLEANS", 29.95, -90.07], ["AUSTIN", 30.27, -97.74],
  ["LOS ANGELES", 34.05, -118.24], ["LAS VEGAS", 36.17, -115.14], ["NEW YORK", 40.71, -74.0], ["CHICAGO", 41.88, -87.63],
  ["DETROIT", 42.33, -83.05], ["SEATTLE", 47.61, -122.33], ["ATLANTA", 33.75, -84.39], ["TORONTO", 43.65, -79.38],
  ["MEXICO CITY", 19.43, -99.13], ["HAVANA", 23.11, -82.37], ["KINGSTON", 17.97, -76.79], ["RIO DE JANEIRO", -22.9, -43.2],
  ["BUENOS AIRES", -34.6, -58.38], ["LONDON", 51.5, -0.13], ["LIVERPOOL", 53.41, -2.98], ["DUBLIN", 53.35, -6.26],
  ["PARIS", 48.86, 2.35], ["BERLIN", 52.52, 13.4], ["AMSTERDAM", 52.37, 4.9], ["IBIZA", 38.91, 1.43], ["VIENNA", 48.21, 16.37],
  ["STOCKHOLM", 59.33, 18.07], ["LAGOS", 6.52, 3.38], ["JOHANNESBURG", -26.2, 28.05], ["CAIRO", 30.04, 31.24],
  ["MUMBAI", 19.08, 72.88], ["SEOUL", 37.57, 126.98], ["TOKYO", 35.68, 139.7], ["SYDNEY", -33.87, 151.2], ["MELBOURNE", -37.81, 144.96],
].map(([name, lat, lon], i) => { const [x, y] = toWorld([lat, lon]); return { name, x, y, col: NEON[i % NEON.length] }; });

// the tour bus, from above, facing up: long, with a row of windows, a stripe and a roof unit
function drawBusTop(g, p, body, stripe) {
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x * p, y * p, w * p, h * p); };
  R(-4, -9, 8, 19, "#0b0618");
  R(-5, -6, 1, 3, "#1a1a22"); R(4, -6, 1, 3, "#1a1a22"); R(-5, 4, 1, 3, "#1a1a22"); R(4, 4, 1, 3, "#1a1a22");
  R(-3, -9, 6, 18, body);
  R(-3, -9, 6, 2, "#9fd8ff");                          // windscreen
  R(-2, -9, 1, 1, "#fff3c0"); R(1, -9, 1, 1, "#fff3c0"); // headlights
  R(-3, -5, 1, 11, stripe); R(2, -5, 1, 11, stripe);   // the tour's colours down each side
  R(-2, -2, 4, 4, "#d8d4e0"); R(-1, -1, 2, 2, "#8a8698"); // the roof unit
  R(-3, 8, 1, 1, "#ff3b3b"); R(2, 8, 1, 1, "#ff3b3b");
}

export class TourScene extends WorldScene {
  constructor(canvas) {
    super(canvas);
    this.cardBg = "#1d0b2e";
  }
  setRacers(list) {
    super.setRacers(list);
    // the tour opens in a music city
    const c = CITIES[Math.floor(Math.random() * CITIES.length)];
    this.racers.forEach((r, i) => { r.x = c.x + (i ? 6 : 0); r.y = c.y + (i ? 4 : 0); r.visited = [c.name]; });
    if (this.racers[0]) this.cam = { x: this.racers[0].x, y: this.racers[0].y, z: this.fitZ(260) };
    this.camTo = { ...this.cam };
  }
  // ON TOUR's home screen: the bus plays a run of shows on its own
  lobbyTick(car) {
    if (!this.lobby || !this.racers.length || this.racers[0].car?.id !== car?.id) {
      this.lobby = true;
      this.setRacers([{ car, label: "", color: "#ff4fd8" }]);
      this.cam.z = this.fitZ(520);
      this.tourI = 0; this.tourWait = 1.2;
    }
    const r = this.racers[0];
    if (r.leg || r.pending) return;
    this.tourWait -= 1 / 30;
    if (this.tourWait > 0) return;
    const tier = [1, 2, 3, 2, 4, 3, 4][this.tourI++ % 7];
    this.planLeg({ i: 0, tier, color: "#ff4fd8" });
    this.launch(0, tier, false, 3 + tier * 0.4);
    if (r.pins.length > 5) r.pins.shift();
    if (r.trail.length > 600) r.trail.splice(0, r.trail.length - 600);
    this.tourWait = 2.2;
  }
  // the next gig: a music city about as far as the answer is rare, not one played lately
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
    r.visited = [...(r.visited || []), best.city.name].slice(-8);
    let { tx } = best; const { ty } = best;
    if (c.tier >= 5) tx += tx >= r.x ? MW : -MW; // a world tour in one go
    let wet = false;
    for (let k = 1; k < 24 && !wet; k++) if (!landAt(lerp(r.x, tx, k / 24), lerp(r.y, ty, k / 24))) wet = true;
    const kind = c.tier >= 3 && wet ? "plane" : tripKind(c.tier, wet); // the band flies over oceans
    r.pending = { x0: r.x, y0: r.y, x1: tx, y1: ty, kind, tier: c.tier, label: `${VENUE[c.tier]} · ${best.city.name}`, color: c.color };
  }
  // the map at night: darker, with the music cities lit up in neon
  drawOverlay(g) {
    const { W, H, u } = this;
    g.fillStyle = "rgba(10,6,40,0.5)"; g.fillRect(-10, -10, W + 20, H + 20);
    for (const c of CITIES) {
      const [sx, sy] = this.toScreen(c.x, c.y);
      if (sx < -40 || sx > W + 40 || sy < -40 || sy > H + 40) continue;
      const pulse = this.calm ? 1 : 0.75 + 0.25 * Math.sin(this.time * 2 + c.x);
      const rad = 9 * u * pulse;
      const gl = g.createRadialGradient(sx, sy, 0, sx, sy, rad);
      gl.addColorStop(0, c.col); gl.addColorStop(1, "rgba(0,0,0,0)");
      g.globalAlpha = 0.55; g.fillStyle = gl; g.fillRect(sx - rad, sy - rad, rad * 2, rad * 2); g.globalAlpha = 1;
      g.fillStyle = "#fff6e0"; g.fillRect(Math.round(sx - u / 2), Math.round(sy - u / 2), Math.max(1, Math.round(u)), Math.max(1, Math.round(u)));
    }
  }
  drawVehicle(g, px, r) { drawBusTop(g, px, "#f4f1ea", r.color || r.car?.color || "#ff4fd8"); }
  // the card is a gig ticket: a perforated stub down the right with a star on it
  drawCardMark(hg, w, h, col, px) {
    const x = w / 2 - px(26);
    hg.fillStyle = col;
    for (let y = -h / 2 + px(5); y < h / 2 - px(5); y += px(7)) hg.fillRect(x, y, px(1.5), px(3.5));
    hg.font = `${px(12)}px "Bungee", sans-serif`; hg.fillText("★", w / 2 - px(13), 0);
    hg.fillStyle = "#ff4fd8"; hg.fillRect(-w / 2 + px(2), -h / 2 + px(2), px(5), h - px(4));
  }
}
