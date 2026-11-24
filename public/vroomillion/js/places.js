// PLACES: every menu screen is somewhere on the road, drawn behind its panel on the same full-screen
// canvas as the race. The top of the screen shows the place's centrepiece (the panel starts below it);
// the rest is the place's surroundings.
//   garage   a neon garage, your car spinning on a turntable under spotlights
//   board    a giant roadside scoreboard with chasing bulbs
//   booth    a pit-stop booth on the pit lane, your car in its pit box
//   grid     the starting grid: the race road with the start lights above it
//   reststop a road-trip rest stop: a diner, a map board, your car parked outside
//   billboard a huge roadside billboard, lit up, your car parked below
import { carSprite, rearSprite } from "./cars.js";
import { voxelModel, drawVoxel } from "./voxel.js";

// which place each screen is
export const PLACE_OF = {
  garage: "garage", board: "board", account: "booth", paywall: "booth", admin: "booth",
  leagues: "grid", versus: "grid", online: "grid", passport: "reststop", how: "billboard", updates: "billboard",
};

const FONT = '"Bungee", "Space Grotesk", sans-serif';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// the sky outside follows the real clock, like the title screen
function skyNow(d = new Date()) {
  const hr = d.getHours() + d.getMinutes() / 60;
  if (hr >= 6.5 && hr < 17) return { stops: ["#2a6ad0", "#5b9ae8", "#a9d4f6"], ground: "#4a7a3a", night: 0, star: 0 };
  if ((hr >= 17 && hr < 20) || (hr >= 5 && hr < 6.5)) return { stops: ["#2b1652", "#a0306e", "#ff7a4d", "#ffbe6a"], ground: "#4a3a3a", night: 0.4, star: 0.2 };
  return { stops: ["#05061a", "#141238", "#2c1e58"], ground: "#16142a", night: 1, star: 1 };
}

export class Places {
  constructor(canvas, chase) {
    this.cv = canvas;
    this.g = canvas.getContext("2d");
    this.chase = chase;
    this.t = 0;
    this.yaw = 0.6; // the garage car's turn
    this.spinV = 0;
    this.dragging = false;
    this.models = new Map();
    this.inset = 0; // canvas px covered by the top bar (logo, cash, sound): the place starts below it
    this.stars = [...Array(70)].map(() => [Math.random(), Math.random() * 0.5, Math.random()]);
  }
  update(dt) {
    this.t += dt;
    // the garage turntable: turns on its own, or follows a drag and coasts to a stop
    if (this.dragging) return;
    if (Math.abs(this.spinV) > 0.05) { this.yaw += this.spinV * dt; this.spinV *= Math.pow(0.08, dt); }
    else this.yaw += dt * 0.55;
  }
  model(car) {
    const key = car.id + ":" + car.color;
    if (!this.models.has(key)) this.models.set(key, voxelModel(carSprite(car, 0), rearSprite(car, 0)));
    return this.models.get(key);
  }
  // drag to spin (main.js passes the pointer's x movement in screen pixels)
  dragBy(dx, dt) {
    const turn = dx * 0.012;
    this.yaw += turn;
    if (dt > 0) this.spinV = this.spinV * 0.5 + (turn / dt) * 0.5;
  }

  // the screen's car, as a side view and a rear view at a given width in canvas pixels
  side(car) { return carSprite(car, Math.floor(this.t * 6) % 2); }
  rear(car) { return rearSprite(car, Math.floor(this.t * 6) % 2); }
  drawSprite(cv, x, y, width, flip = false) {
    const g = this.g, res = cv.res || 1;
    const k = width / (cv.width / res);
    const w = Math.round((cv.width / res) * k), h = Math.round((cv.height / res) * k);
    g.save();
    g.translate(Math.round(x), Math.round(y));
    if (flip) g.scale(-1, 1);
    g.drawImage(cv, Math.round(-w / 2), -h, w, h);
    g.restore();
    return { w, h };
  }

  // ---- shared bits ----
  skyFill(top, bottom, sky) {
    const g = this.g, W = this.cv.width;
    const gr = g.createLinearGradient(0, top, 0, bottom);
    sky.stops.forEach((c, i) => gr.addColorStop(i / (sky.stops.length - 1), c));
    g.fillStyle = gr;
    g.fillRect(0, top, W, bottom - top);
    if (sky.star) {
      g.fillStyle = "#ffffff";
      for (const [x, y, p] of this.stars) {
        if (Math.sin(this.t * 2 + p * 9) > 0.2 - sky.star) g.fillRect(Math.round(x * W), Math.round(top + y * (bottom - top)), 2, 2);
      }
    }
  }
  neon(text, x, y, size, color, align = "center", minCss = 13) {
    // drawn on the full-resolution layer over the scene when there is one, so the lettering is sharp,
    // and never smaller than about 15 screen pixels
    const c = this.chase;
    const hi = c?.hiG;
    const g = hi || this.g;
    g.save();
    if (hi) { const R = c.hiScale || 1; g.setTransform(new DOMMatrix([R, 0, 0, R, 0, 0]).multiply(this.g.getTransform())); c.hiUsed = true; }
    size = Math.max(size * 1.05, minCss / (c?.cssPx || 1)); // the sizes were picked for a different font
    y = Math.max(y, size * 0.75 + 2); // never up under the top bar
    g.font = `${size}px ${FONT}`;
    g.textAlign = align;
    g.textBaseline = "middle";
    const on = !(Math.sin(this.t * 0.37) > 0.996 && Math.sin(this.t * 31) > 0); // a rare, quick flicker
    // a dark outline first, so the tubes read on a bright sky too
    g.lineJoin = "round";
    g.lineWidth = Math.max(2, size * 0.2);
    g.strokeStyle = "rgba(10, 6, 24, 0.85)";
    g.strokeText(text, Math.round(x), Math.round(y));
    g.shadowColor = color;
    g.shadowBlur = on ? size * 0.9 : 0;
    g.fillStyle = on ? "#ffffff" : color;
    g.fillText(text, Math.round(x), Math.round(y));
    g.shadowBlur = on ? size * 0.4 : 0;
    g.fillStyle = on ? color : "#55334f";
    g.globalAlpha = on ? 0.55 : 1;
    g.fillText(text, Math.round(x), Math.round(y));
    g.restore();
  }
  // a frame of light bulbs chasing round a rectangle
  bulbs(x, y, w, h, gap, color) {
    const g = this.g, step = Math.floor(this.t * 8);
    let n = 0;
    const dot = (px, py) => {
      const lit = (n++ + step) % 3 === 0;
      g.fillStyle = lit ? "#fff6c8" : color;
      if (lit) { g.shadowColor = "#ffd23a"; g.shadowBlur = 8; }
      g.fillRect(Math.round(px) - 2, Math.round(py) - 2, 4, 4);
      g.shadowBlur = 0;
    };
    for (let i = 0; i <= w; i += gap) dot(x + i, y);
    for (let i = gap; i <= h; i += gap) dot(x + w, y + i);
    for (let i = w - gap; i >= 0; i -= gap) dot(x + i, y + h);
    for (let i = h - gap; i > 0; i -= gap) dot(x, y + i);
  }
  road(y, h, sky) {
    const g = this.g, W = this.cv.width;
    g.fillStyle = sky.ground; g.fillRect(0, y - 8, W, 8);
    g.fillStyle = "#2a2a34"; g.fillRect(0, y, W, h);
    g.fillStyle = "#3a3a46"; g.fillRect(0, y, W, 3);
    g.fillStyle = "#e9e6d8";
    const off = Math.floor(this.t * 0) % 40;
    for (let x = -off; x < W; x += 40) g.fillRect(x, y + Math.round(h * 0.55), 20, 3);
  }

  // ---- the places ----
  draw(place, car) {
    const g = this.g;
    g.imageSmoothingEnabled = false;
    const W = this.cv.width, H = this.cv.height;
    // the centrepiece lives in the top strip; the panel covers the rest
    const full = Math.round(clamp(H * 0.26, 130, 250));
    const inset = place === "grid" ? 0 : Math.min(this.inset, full * 0.45);
    g.save();
    // fill the band behind the top bar with the place's own top colour, then draw the place below it
    if (place !== "grid") {
      const sky = skyNow();
      g.fillStyle = place === "garage" ? "#16101f" : sky.stops[0];
      g.fillRect(0, 0, W, H);
      g.translate(0, Math.round(inset));
    }
    const top = full - Math.round(inset);
    if (place === "grid") this.grid(W, H, top, car);
    else if (place === "garage") this.garage(W, H, top, car);
    else if (place === "board") this.board(W, H, top, car);
    else if (place === "booth") this.booth(W, H, top, car);
    else if (place === "reststop") this.reststop(W, H, top, car);
    else this.billboard(W, H, top, car);
    g.restore();
  }

  // the race road with your car on the line and the start lights above it
  grid(W, H, top) {
    const c = this.chase;
    c.update(1 / 60);
    c.draw();
    const g = this.g;
    // the light gantry across the top of the screen
    const gy = Math.round(Math.max(top * 0.28, this.inset + 10));
    g.fillStyle = "#14121e"; g.fillRect(0, gy - 4, W, 30);
    g.fillStyle = "#2c2838"; g.fillRect(0, gy - 4, W, 4);
    const n = 5, lw = 34, start = W / 2 - (n * lw) / 2;
    const lit = Math.floor((this.t * 1.2) % 7); // the lights come on one by one, then go out
    for (let i = 0; i < n; i++) {
      const x = Math.round(start + i * lw + 4);
      g.fillStyle = "#0a0910"; g.fillRect(x, gy, lw - 8, 22);
      const on = i < lit && lit <= n;
      g.fillStyle = on ? "#ff3b3b" : "#3a1418";
      if (on) { g.shadowColor = "#ff3b3b"; g.shadowBlur = 14; }
      g.fillRect(x + 4, gy + 4, lw - 16, 14);
      g.shadowBlur = 0;
    }
    this.neon("STARTING GRID", W / 2, gy + 46, 14, "#4fd1ff");
  }

  garage(W, H, top, car) {
    const g = this.g;
    // back wall: dark bricks, a roller door, pegboards, a neon sign
    g.fillStyle = "#16101f"; g.fillRect(0, 0, W, H);
    g.fillStyle = "#1f1630";
    for (let y = 0; y < top + 40; y += 12) for (let x = (y / 12) % 2 ? 0 : -14; x < W; x += 28) g.fillRect(x, y, 26, 10);
    const dw = Math.min(W * 0.5, 300), dx = W / 2 - dw / 2;
    g.fillStyle = "#2b2440"; g.fillRect(dx, Math.round(top * 0.3), dw, Math.round(top * 0.62));
    g.fillStyle = "#231d36"; for (let y = Math.round(top * 0.3) + 6; y < top * 0.92; y += 8) g.fillRect(dx, y, dw, 2);
    for (const px of [16, W - 16 - 90]) {
      g.fillStyle = "#3a2a20"; g.fillRect(px, Math.round(top * 0.3), 90, 56);
      g.fillStyle = "#24180f"; for (let y = 0; y < 56; y += 8) for (let x = 0; x < 90; x += 8) g.fillRect(px + x + 3, Math.round(top * 0.3) + y + 3, 2, 2);
      g.fillStyle = "#9aa0aa"; g.fillRect(px + 12, Math.round(top * 0.3) + 10, 4, 26); g.fillRect(px + 30, Math.round(top * 0.3) + 8, 6, 30); g.fillRect(px + 52, Math.round(top * 0.3) + 12, 22, 4);
    }
    this.neon("GARAGE", W / 2, Math.round(top * 0.16), Math.round(clamp(W / 18, 16, 30)), "#ff4fd8");
    // the floor, with a turntable
    const fy = Math.round(top * 0.92);
    const fl = g.createLinearGradient(0, fy, 0, H);
    fl.addColorStop(0, "#2a2238"); fl.addColorStop(1, "#0d0a16");
    g.fillStyle = fl; g.fillRect(0, fy, W, H - fy);
    const tx = W / 2, ty = fy + 6, tr = Math.min(W * 0.32, 190);
    g.fillStyle = "#3a3150"; g.beginPath(); g.ellipse(tx, ty, tr, tr * 0.2, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#4a4064"; g.beginPath(); g.ellipse(tx, ty - 2, tr * 0.94, tr * 0.17, 0, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 16; i++) { // lights round the turntable edge, chasing
      const a = (i / 16) * Math.PI * 2;
      const on = (i + Math.floor(this.t * 10)) % 4 === 0;
      g.fillStyle = on ? "#4fd1ff" : "#244a66";
      g.fillRect(Math.round(tx + Math.cos(a) * tr * 0.97) - 2, Math.round(ty - 2 + Math.sin(a) * tr * 0.19) - 1, 4, 3);
    }
    // spotlights from the ceiling
    g.save();
    g.globalCompositeOperation = "lighter";
    for (const sx of [tx - tr * 0.8, tx + tr * 0.8]) {
      const gr = g.createLinearGradient(0, 0, 0, ty);
      gr.addColorStop(0, "rgba(255,240,200,0.18)"); gr.addColorStop(1, "rgba(255,240,200,0)");
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(sx - 6, 0); g.lineTo(sx + 6, 0); g.lineTo(tx + (tx - sx) * -0.1 + tr * 0.5, ty); g.lineTo(tx + (tx - sx) * -0.1 - tr * 0.5, ty); g.closePath(); g.fill();
    }
    g.restore();
    // your car in 3D, turning slowly on the turntable (drag it to spin it yourself)
    const cw = Math.min(W * 0.46, 260);
    const model = this.model(car);
    // seen from a little above, so the shadow sits on the turntable under the car
    const len = Math.min(cw * 0.9, (top * 0.82) / (model.H / model.L + 0.3)); // fits under the sign
    g.fillStyle = "rgba(0,0,0,0.35)"; g.beginPath(); g.ellipse(tx, ty - 2 - len * 0.1, len * 0.62, len * 0.12, 0, 0, Math.PI * 2); g.fill();
    drawVoxel(g, model, Math.round(tx), Math.round(ty - 2 - len * 0.1), len / model.L, this.yaw);
    // tyre stacks on the floor at the sides
    for (const sx of [24, W - 24 - 34]) for (let k = 0; k < 3; k++) {
      g.fillStyle = "#0c0c10"; g.fillRect(sx, fy - 12 - k * 14, 34, 13);
      g.fillStyle = "#26262e"; g.fillRect(sx + 4, fy - 9 - k * 14, 26, 3);
    }
  }

  board(W, H, top, car) {
    const g = this.g, sky = skyNow();
    this.skyFill(0, top, sky);
    // far hills and the road along the bottom of the strip
    g.fillStyle = sky.night ? "#1a1530" : "#3e6a56";
    g.beginPath(); g.moveTo(0, top * 0.8);
    for (let x = 0; x <= W; x += 40) g.lineTo(x, top * 0.8 - 16 - Math.sin(x * 0.02) * 12);
    g.lineTo(W, top); g.lineTo(0, top); g.fill();
    this.road(Math.round(top * 0.92), H, sky);
    // the giant scoreboard on two legs
    const bw = Math.min(W * 0.78, 470), bh = Math.round(top * 0.56), bx = Math.round(W / 2 - bw / 2), by = Math.round(top * 0.08);
    g.fillStyle = "#2a2838"; g.fillRect(bx + bw * 0.2, by + bh, 10, top); g.fillRect(bx + bw * 0.8 - 10, by + bh, 10, top);
    g.fillStyle = "#0a0910"; g.fillRect(bx, by, bw, bh);
    g.fillStyle = "#16141f"; for (let y = by + 4; y < by + bh - 2; y += 4) for (let x = bx + 4; x < bx + bw - 2; x += 4) g.fillRect(x, y, 2, 2);
    this.bulbs(bx, by, bw, bh, 12, "#7a5a14");
    this.neon("LEADERBOARD", W / 2, by + bh * 0.36, Math.round(clamp(W / 26, 12, 22)), "#ffd23a");
    this.neon("TODAY'S FASTEST", W / 2, by + bh * 0.74, Math.round(clamp(W / 46, 8, 12)), "#4fd1ff", "center", 9);
    // your car parked by the road
    this.drawSprite(this.side(car), W * 0.82, Math.round(top * 0.92) + 4, Math.min(W * 0.2, 120));
  }

  booth(W, H, top, car) {
    const g = this.g, sky = skyNow();
    this.skyFill(0, top * 0.5, sky);
    // the pit building: a long wall of garages with numbered doors
    g.fillStyle = "#26222f"; g.fillRect(0, Math.round(top * 0.2), W, Math.round(top * 0.72));
    g.fillStyle = "#33303f"; g.fillRect(0, Math.round(top * 0.2), W, 5);
    for (let x = 6, n = 1; x < W; x += 74, n++) {
      g.fillStyle = "#1a1722"; g.fillRect(x, Math.round(top * 0.38), 64, Math.round(top * 0.54));
      g.fillStyle = "#211d2b"; for (let y = Math.round(top * 0.38) + 5; y < top * 0.92; y += 6) g.fillRect(x, y, 64, 2);
      g.fillStyle = "#6a6478"; g.font = `8px ${FONT}`; g.textAlign = "center"; g.fillText(String(n), x + 32, Math.round(top * 0.33));
    }
    // the booth: a lit window in the middle
    const bw = Math.min(W * 0.44, 260), bx = Math.round(W / 2 - bw / 2), by = Math.round(top * 0.3), bh = Math.round(top * 0.4);
    g.fillStyle = "#3a3448"; g.fillRect(bx - 6, by - 6, bw + 12, bh + 12);
    const glass = g.createLinearGradient(0, by, 0, by + bh);
    glass.addColorStop(0, "#5ad8ff"); glass.addColorStop(1, "#1a6b9a");
    g.fillStyle = glass; g.fillRect(bx, by, bw, bh);
    g.fillStyle = "rgba(255,255,255,0.25)"; g.fillRect(bx + 10, by + 6, bw * 0.3, 3); g.fillRect(bx + 10, by + 12, bw * 0.18, 3);
    this.neon("PIT STOP", W / 2, Math.round(top * 0.12), Math.round(clamp(W / 22, 14, 26)), "#5dff8f");
    // the pit lane, with your car in its box
    const ly = Math.round(top * 0.92);
    g.fillStyle = "#33333d"; g.fillRect(0, ly, W, H - ly);
    g.fillStyle = "#ffd23a"; for (let x = 0; x < W; x += 30) g.fillRect(x, ly + 3, 16, 3);
    g.fillStyle = "#e9e6d8"; g.fillRect(W / 2 - 70, ly + 10, 140, 3);
    this.drawSprite(this.rear(car), W / 2, ly - 2, Math.min(W * 0.16, 90));
    // a stack of tyres and a fuel rig
    for (let k = 0; k < 4; k++) { g.fillStyle = "#0c0c10"; g.fillRect(18, ly - 14 - k * 13, 34, 12); g.fillStyle = "#ff3b3b"; g.fillRect(22, ly - 11 - k * 13, 26, 2); }
    g.fillStyle = "#c2185b"; g.fillRect(W - 46, ly - 54, 24, 54); g.fillStyle = "#ffd3ea"; g.fillRect(W - 42, ly - 48, 16, 10);
  }

  reststop(W, H, top, car) {
    const g = this.g, sky = skyNow();
    this.skyFill(0, top, sky);
    // a diner with a big window and a neon sign on a pole
    const dx = Math.round(W * 0.06), dw = Math.round(Math.min(W * 0.46, 280)), dy = Math.round(top * 0.42), dh = Math.round(top * 0.5);
    g.fillStyle = "#b8c4cc"; g.fillRect(dx, dy, dw, dh);
    g.fillStyle = "#e0201b"; g.fillRect(dx, dy, dw, 8); g.fillRect(dx, dy + dh - 10, dw, 4);
    g.fillStyle = sky.night ? "#ffd27a" : "#5a7a90"; g.fillRect(dx + 10, dy + 16, dw - 60, dh - 34);
    g.fillStyle = "#3a3a46"; g.fillRect(dx + dw - 40, dy + 16, 26, dh - 26);
    g.fillStyle = "#6a6a76"; g.fillRect(dx + dw + 20, Math.round(top * 0.12), 6, dy);
    this.neon("REST STOP", dx + dw + 23, Math.round(top * 0.14), Math.round(clamp(W / 34, 10, 16)), "#ff4fd8");
    // the map board on two posts
    const mx = Math.round(W * 0.6), mw = Math.round(Math.min(W * 0.34, 200)), my = Math.round(top * 0.3), mh = Math.round(top * 0.44);
    g.fillStyle = "#5a3a20"; g.fillRect(mx + 10, my + mh, 6, top); g.fillRect(mx + mw - 16, my + mh, 6, top);
    g.fillStyle = "#7a5228"; g.fillRect(mx - 4, my - 4, mw + 8, mh + 8);
    g.fillStyle = "#e9dcb4"; g.fillRect(mx, my, mw, mh);
    g.strokeStyle = "#c2185b"; g.lineWidth = 2; g.setLineDash([4, 4]); g.beginPath();
    g.moveTo(mx + 10, my + mh - 10); g.lineTo(mx + mw * 0.3, my + mh * 0.5); g.lineTo(mx + mw * 0.6, my + mh * 0.65); g.lineTo(mx + mw - 12, my + 12); g.stroke();
    g.setLineDash([]);
    g.fillStyle = "#4a8a5a"; g.fillRect(mx + 8, my + 8, mw * 0.3, mh * 0.25); g.fillStyle = "#5aa0d0"; g.fillRect(mx + mw * 0.55, my + mh * 0.6, mw * 0.35, mh * 0.3);
    for (const [px, py] of [[0.3, 0.5], [0.6, 0.65], [1, 0]]) { g.fillStyle = "#e0201b"; g.fillRect(Math.round(mx + mw * px - (px === 1 ? 14 : 3)), Math.round(my + mh * py + (px === 1 ? 10 : -3)), 6, 6); }
    this.road(Math.round(top * 0.92), H, sky);
    this.drawSprite(this.side(car), W * 0.46, Math.round(top * 0.92) + 4, Math.min(W * 0.2, 120));
  }

  billboard(W, H, top, car) {
    const g = this.g, sky = skyNow();
    this.skyFill(0, top, sky);
    g.fillStyle = sky.night ? "#120f24" : "#5a8a6a";
    g.beginPath(); g.moveTo(0, top * 0.86);
    for (let x = 0; x <= W; x += 30) g.lineTo(x, top * 0.86 - 10 - Math.abs(Math.sin(x * 0.013)) * 20);
    g.lineTo(W, top); g.lineTo(0, top); g.fill();
    this.road(Math.round(top * 0.92), H, sky);
    // the billboard on two poles, with a catwalk and spotlights
    const bw = Math.min(W * 0.8, 480), bh = Math.round(top * 0.5), bx = Math.round(W / 2 - bw / 2), by = Math.round(top * 0.1);
    g.fillStyle = "#3a3a46"; g.fillRect(bx + bw * 0.25, by + bh, 8, top); g.fillRect(bx + bw * 0.75 - 8, by + bh, 8, top);
    g.fillStyle = "#e9e6d8"; g.fillRect(bx - 6, by - 6, bw + 12, bh + 12);
    const face = g.createLinearGradient(0, by, 0, by + bh);
    face.addColorStop(0, "#2a1160"); face.addColorStop(1, "#c2185b");
    g.fillStyle = face; g.fillRect(bx, by, bw, bh);
    g.fillStyle = "#5a5a66"; g.fillRect(bx, by + bh + 6, bw, 4);
    this.neon("HOW TO PLAY", W / 2, by + bh * 0.36, Math.round(clamp(W / 26, 12, 22)), "#ffd23a");
    this.neon("RARER = FURTHER", W / 2, by + bh * 0.76, Math.round(clamp(W / 46, 8, 12)), "#7cf9ff", "center", 9);
    this.drawSprite(this.side(car), W * 0.14, Math.round(top * 0.92) + 4, Math.min(W * 0.15, 90));
  }
}
