// Hand-drawn cars: each car has its own side and rear drawing at twice the old pixel detail, so the
// showroom looks sharp. A small kit (shaded bodies, glass, wheels, lights) keeps them consistent; each
// car's entry below is its own shape and its own details. Colours come from the car (and its paint
// job), so every paint still works. Cars without an entry here still use the old 8-bit body templates.
// Side views face right (nose on the right); rear views are what you see in a race.

// ---- the kit ----
const hex = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const mix = (h, f) => `rgb(${hex(h).map((v) => Math.max(0, Math.min(255, Math.round(f >= 1 ? v + (255 - v) * (f - 1) : v * f)))).join(",")})`;
const dark = (h, f = 0.6) => mix(h, f);
const light = (h, t = 0.3) => mix(h, 1 + t);
const poly = (g, pts, fill) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fillStyle = fill; g.fill(); };
const rect = (g, x, y, w, h, fill) => { g.fillStyle = fill; g.fillRect(x, y, w, h); };
const disc = (g, x, y, r, fill) => { g.fillStyle = fill; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
const oval = (g, x, y, rx, ry, fill) => { g.fillStyle = fill; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); };
// hard-edged pixels: no half-transparent edges, like the rest of the art
function crisp(cv) {
  const g = cv.getContext("2d");
  const im = g.getImageData(0, 0, cv.width, cv.height);
  for (let i = 3; i < im.data.length; i += 4) im.data[i] = im.data[i] > 110 ? 255 : 0;
  g.putImageData(im, 0, 0);
  cv.res = 2;
  return cv;
}
const canvas = (w, h) => { const cv = document.createElement("canvas"); cv.width = w; cv.height = h; return cv; };
// a body shape shaded top to bottom
function shaded(g, pts, col, top, bottom, t = 0.32) {
  const gr = g.createLinearGradient(0, top, 0, bottom);
  gr.addColorStop(0, light(col, t)); gr.addColorStop(0.45, col); gr.addColorStop(1, dark(col, 0.62));
  poly(g, pts, gr);
}
// side wheels: tyre, rim style, spokes that turn with the frame
function wheel(g, x, y, r, style, rim, frame) {
  disc(g, x, y, r, "#0b0b0e");
  disc(g, x, y, r * 0.82, "#16161c");
  if (style === "steel") {
    disc(g, x, y, r * 0.56, rim);
    disc(g, x, y, r * 0.42, dark(rim, 0.7));
    for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + frame * 0.8; rect(g, x + Math.cos(a) * r * 0.48 - 0.5, y + Math.sin(a) * r * 0.48 - 0.5, 1, 1, "#16161c"); }
    disc(g, x, y, r * 0.16, light(rim, 0.3));
  } else if (style === "hub") { // a chrome dish hubcap
    disc(g, x, y, r * 0.6, "#e4e8ee");
    disc(g, x, y, r * 0.44, "#b4bac4");
    disc(g, x, y, r * 0.18, "#f4f6f8");
    rect(g, x - r * 0.5 + frame, y - 0.4, r * 0.4, 0.8, "#ffffff");
  } else if (style === "white") { // whitewall with a chrome hub
    disc(g, x, y, r * 0.7, "#f2f2ee");
    disc(g, x, y, r * 0.52, "#16161c");
    disc(g, x, y, r * 0.4, "#d8dde6");
    disc(g, x, y, r * 0.14, "#8a909a");
  } else { // alloys: five spokes
    disc(g, x, y, r * 0.66, rim);
    g.strokeStyle = dark(rim, 0.55); g.lineWidth = 0.9;
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + frame * 0.6;
      g.beginPath(); g.moveTo(x + Math.cos(a) * r * 0.2, y + Math.sin(a) * r * 0.2); g.lineTo(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6); g.stroke();
    }
    disc(g, x, y, r * 0.16, dark(rim, 0.5));
  }
}
const arch = (g, x, y, r, col) => { g.fillStyle = col; g.beginPath(); g.arc(x, y, r * 1.12, Math.PI, 0); g.fill(); };
// rear tyres under the body; the tread steps with the frame so they look like they roll
function rearTyres(g, xs, y, w, h, frame) {
  for (const x of xs) {
    rect(g, x, y, w, h, "#101014");
    g.fillStyle = "#26262e";
    for (let yy = y + 1 + frame; yy < y + h; yy += 2) g.fillRect(x + 1, yy, w - 2, 1);
  }
}
const plate = (g, x, y, w = 18, h = 6) => { rect(g, x, y, w, h, "#e9e6d8"); for (let i = 0; i < 5; i++) rect(g, x + 2 + i * 3, y + 2, 2, 2, "#7d8296"); };

// ---- a standard rear view, shaped by a few numbers per car ----
// shoulder: body half-width; top: where the body starts; roof: [half-width at the top, y of the top];
// glass: inset; tail: light style; bumper colour; extra: anything the car has on the back
function stdRear(car, frame, R) {
  const H = R.h || 52, b = H - 52, cx = 40;
  const cv = canvas(80, H), g = cv.getContext("2d");
  const sw = R.shoulder || 36, top = (R.top ?? 19) + b, bottom = 46 + b;
  rearTyres(g, [cx - sw + 1, cx + sw - 15], 40 + b, 14, 12, frame);
  // roof and rear window
  const [rw, ry] = R.roof || [18, 4];
  const bw = R.roofBase || sw - 6;
  const roofCol = R.roofCol ? R.roofCol(car) : car.color;
  if (!R.open) {
    poly(g, [[cx - rw, ry + b], [cx + rw, ry + b], [cx + bw, top], [cx - bw, top]], roofCol);
    const gi = R.glassInset ?? 2;
    poly(g, [[cx - rw + gi, ry + b + gi], [cx + rw - gi, ry + b + gi], [cx + bw - gi - 1, top], [cx - bw + gi + 1, top]], R.glass || "#1b2430");
    poly(g, [[cx - rw + gi + 3, ry + b + gi + 1], [cx - rw + gi + 8, ry + b + gi + 1], [cx - bw + gi + 8, top - 1], [cx - bw + gi + 3, top - 1]], "rgba(255,255,255,0.14)");
    for (const hx of R.heads || [cx - 9, cx + 9]) oval(g, hx, top - 4, 3, 2.4, R.seats || "#2a2c33");
  }
  // body
  const pts = R.body || [[cx - sw + 4, top + 5], [cx - sw + 9, top], [cx + sw - 9, top], [cx + sw - 4, top + 5], [cx + sw - 2, top + 11], [cx + sw - 2, bottom - 2], [cx + sw - 6, bottom], [cx - sw + 6, bottom], [cx - sw + 2, bottom - 2], [cx - sw + 2, top + 11]];
  shaded(g, pts, car.color, top, bottom);
  if (R.lower) poly(g, [[cx - sw + 2, top + R.lower], [cx + sw - 2, top + R.lower], [cx + sw - 2, bottom - 2], [cx + sw - 6, bottom], [cx - sw + 6, bottom], [cx - sw + 2, bottom - 2]], R.lowerCol ? R.lowerCol(car) : car.accent);
  // tail lights
  const ty = top + (R.tailY ?? 5);
  const tl = R.tail || "bar";
  if (tl === "round") for (const x of [cx - sw + 8, cx + sw - 8]) { disc(g, x, ty + 2, 3, "#e0201b"); disc(g, x - 0.8, ty + 1.2, 1.1, "#ff9a9a"); }
  else if (tl === "tall") for (const x of [cx - sw + 3, cx + sw - 8]) { rect(g, x, ty - 2, 5, 12, "#e0201b"); rect(g, x + 1, ty - 1, 3, 3, "#ff9a9a"); rect(g, x + 1, ty + 6, 3, 2, "#ffb02e"); }
  else if (tl === "tiny") for (const x of [cx - sw + 5, cx + sw - 9]) { rect(g, x, ty, 4, 3, "#e0201b"); }
  else { // bar: a wide light each side
    poly(g, [[cx - sw + 3, ty], [cx - sw + 18, ty - 0.5], [cx - sw + 18, ty + 4], [cx - sw + 3, ty + 5]], "#e0201b");
    poly(g, [[cx + sw - 3, ty], [cx + sw - 18, ty - 0.5], [cx + sw - 18, ty + 4], [cx + sw - 3, ty + 5]], "#e0201b");
    rect(g, cx - sw + 6, ty + 1, 9, 1, "#ff9a9a"); rect(g, cx + sw - 15, ty + 1, 9, 1, "#ff9a9a");
  }
  plate(g, cx - 9, top + (R.plateY ?? 13));
  // bumper and exhaust
  rect(g, cx - sw + 2, bottom - 4, sw * 2 - 4, 3, R.bumper || "#2a2c33");
  if (R.pipe !== false) { rect(g, cx - sw + 9, bottom - 1, 4, 2, "#8a909a"); rect(g, cx - sw + 10, bottom - 0.5, 2, 1, "#2a2c33"); }
  if (R.extra) R.extra(g, car, { cx, sw, top, bottom, b });
  return crisp(cv);
}

// ---- each car ----
// side(g, car, frame): draws on a canvas of the size given; rear: the stdRear settings or a function
const HAND = {
  // '92 Rustbucket: a tired early-90s hatch. A primer-grey door, rust spots, steel wheels, one hubcap left.
  rustbucket: {
    size: [70, 24],
    side(g, car, frame) {
      shaded(g, [[3, 12], [4, 9.4], [9, 8.6], [16, 3.4], [35, 2.6], [41, 3.4], [47, 8.2], [58, 9.4], [65, 10.6], [67, 13], [67, 17.6], [3, 17.6], [2, 15]], car.color, 2, 18);
      poly(g, [[16.6, 8.2], [21, 4], [34.6, 3.4], [40, 4], [44.6, 8.2]], "#101216");
      poly(g, [[17.8, 7.8], [21.6, 4.6], [30, 4.2], [30, 7.8]], "#2a3a55"); poly(g, [[31.4, 7.8], [31.4, 4.2], [39.4, 4.6], [43, 7.8]], "#2a3a55");
      poly(g, [[31.6, 8.4], [43.4, 8.4], [43.4, 16.6], [31.6, 16.6]], "#8c8a86"); // the primer door
      rect(g, 31.6, 8.4, 0.6, 8.2, "#5a5852"); rect(g, 38, 11, 2.4, 0.8, "#3a3a3a");
      for (const [x, y, w, h] of [[8, 14.6, 3, 1.6], [12, 15.4, 1.6, 1], [52, 15.8, 2.6, 1.2], [60, 12.4, 1.6, 1.4], [24, 9.6, 1.4, 1]]) rect(g, x, y, w, h, "#7a3a18");
      rect(g, 63, 11.2, 4, 2, "#f4e8b8"); rect(g, 2.4, 10.6, 2, 3, "#c0201b");
      rect(g, 3, 16, 64, 1.6, "#2a2a2e");
      arch(g, 14.5, 17.4, 5.2, "#1a1a1e"); arch(g, 55, 17.4, 5.2, "#1a1a1e");
      wheel(g, 14.5, 18, 5, "steel", "#8a8e96", frame);
      wheel(g, 55, 18, 5, "hub", "#c9ced6", frame);
    },
    rear: { tail: "bar", roof: [17, 5], extra: (g, car, { cx, top }) => { rect(g, cx + 14, top + 3, 4, 2, "#7a3a18"); rect(g, cx - 20, top + 15, 3, 2, "#7a3a18"); } },
  },
  // Piccolo Cinquecento: a tiny round city car, cream with a red stripe and a fold-back canvas roof
  fiat500: {
    size: [58, 24],
    side(g, car, frame) {
      shaded(g, [[4, 12.6], [6, 8.6], [12, 4.6], [21, 2.4], [32, 2.4], [40, 5.6], [46, 9.6], [51, 11.6], [53, 14], [53, 17.6], [4, 17.6], [3, 15]], car.color, 2, 18, 0.25);
      poly(g, [[13, 8.6], [17, 4.4], [31, 3.6], [37, 5.6], [40.6, 8.6]], "#101216");
      poly(g, [[14.4, 8.2], [17.6, 5], [26, 4.4], [26, 8.2]], "#2a3a55"); poly(g, [[27.4, 8.2], [27.4, 4.4], [31.6, 4.4], [36.8, 6], [39.2, 8.2]], "#2a3a55");
      rect(g, 18, 2.2, 13, 1.4, dark(car.color, 0.5)); // the canvas roof
      rect(g, 4, 12, 49, 1.2, car.accent); // red waist stripe
      disc(g, 49, 11.4, 1.6, "#f4f6ff"); rect(g, 3.4, 10.8, 1.6, 2.4, "#c0201b");
      rect(g, 3, 15.6, 4, 1.4, "#d8dde6"); rect(g, 50, 15.6, 4, 1.4, "#d8dde6");
      arch(g, 13, 17.4, 4.4, dark(car.color, 0.45)); arch(g, 44, 17.4, 4.4, dark(car.color, 0.45));
      wheel(g, 13, 18.2, 4.2, "hub", "#d8dde6", frame); wheel(g, 44, 18.2, 4.2, "hub", "#d8dde6", frame);
    },
    rear: { shoulder: 28, roof: [14, 6], roofBase: 22, tail: "tiny", bumper: "#d8dde6", heads: [33, 47],
      extra: (g, car, { cx, top }) => rect(g, cx - 26, top + 10, 52, 1.4, car.accent) },
  },
  // Pocket Rocket: a boxy tiny British-style runabout, red with a white roof and twin bonnet stripes
  mini: {
    size: [58, 24],
    side(g, car, frame) {
      shaded(g, [[3.6, 12], [4.4, 8.4], [9, 8], [12, 3.4], [36, 3], [40, 7.8], [50, 8.6], [53.6, 10.4], [54, 17.6], [3.6, 17.6]], car.color, 3, 18, 0.25);
      rect(g, 11.6, 2.4, 25, 1.6, car.accent); // the white roof
      poly(g, [[12.6, 8], [13.6, 4.2], [35.4, 4], [38.6, 8]], "#101216");
      poly(g, [[13.8, 7.6], [14.6, 4.8], [24, 4.6], [24, 7.6]], "#2a3a55"); poly(g, [[25.4, 7.6], [25.4, 4.6], [34.8, 4.6], [37.2, 7.6]], "#2a3a55");
      rect(g, 40, 8.2, 13, 0.8, car.accent); rect(g, 40, 9.4, 13, 0.6, car.accent); // bonnet stripes
      rect(g, 25, 8.4, 0.6, 8, dark(car.color, 0.5));
      disc(g, 52, 11, 1.6, "#f4f6ff"); rect(g, 3, 10, 1.6, 2.6, "#c0201b");
      rect(g, 3, 15.4, 51, 1.6, "#d8dde6");
      wheel(g, 13, 18.2, 4.2, "alloy", "#c9ced6", frame); wheel(g, 45, 18.2, 4.2, "alloy", "#c9ced6", frame);
    },
    rear: { shoulder: 29, roof: [22, 5], roofBase: 25, tail: "tall", bumper: "#d8dde6", roofCol: (car) => car.accent, heads: [33, 47] },
  },
  // Bubble Bug: a round-backed little car with separate curved fenders, running boards and big round lamps
  beetle: {
    size: [62, 25],
    side(g, car, frame) {
      // the round body
      g.fillStyle = car.color; g.beginPath(); g.ellipse(30, 13, 25, 11, 0, Math.PI, 0); g.fill();
      shaded(g, [[5, 13], [55, 13], [56, 16.6], [5, 16.6]], car.color, 2, 18);
      g.fillStyle = light(car.color, 0.32); g.beginPath(); g.ellipse(30, 12.6, 22, 9, 0, Math.PI * 1.1, Math.PI * 1.6); g.lineTo(30, 12.6); g.fill();
      poly(g, [[16, 9.4], [21, 4.4], [30, 3.4], [38, 4.4], [43, 9.4]], "#101216");
      poly(g, [[17.6, 9], [21.6, 5], [29, 4.2], [29, 9]], "#2a3a55"); poly(g, [[30.4, 9], [30.4, 4.2], [37.4, 5], [41.4, 9]], "#2a3a55");
      // fenders and running board
      for (const fx of [14, 47]) { g.fillStyle = dark(car.color, 0.85); g.beginPath(); g.ellipse(fx, 15.4, 7.4, 4.6, 0, Math.PI, 0); g.fill(); }
      rect(g, 20, 17, 21, 1.4, "#2a2a2e");
      disc(g, 52.6, 12.2, 1.8, "#f4f6ff"); disc(g, 52.6, 12.2, 1, "#ffffff"); rect(g, 6.4, 12.2, 1.4, 2.4, "#c0201b");
      rect(g, 4, 16, 3.4, 1.2, "#d8dde6"); rect(g, 54.4, 16, 3.4, 1.2, "#d8dde6");
      wheel(g, 14, 18.6, 4.4, "hub", "#e4e8ee", frame); wheel(g, 47, 18.6, 4.4, "hub", "#e4e8ee", frame);
    },
    rear: (car, frame) => {
      const cv = canvas(80, 52), g = cv.getContext("2d");
      rearTyres(g, [10, 56], 40, 14, 12, frame);
      g.fillStyle = car.color; g.beginPath(); g.ellipse(40, 32, 28, 26, 0, Math.PI, 0); g.fill();
      shaded(g, [[12, 32], [68, 32], [68, 44], [12, 44]], car.color, 10, 46);
      g.fillStyle = light(car.color, 0.3); g.beginPath(); g.ellipse(40, 31, 24, 22, 0, Math.PI * 1.15, Math.PI * 1.45); g.lineTo(40, 31); g.fill();
      oval(g, 40, 14, 9, 4, "#101216"); oval(g, 40, 14, 7.6, 3, "#2a3a55");
      for (let k = 0; k < 4; k++) rect(g, 33, 22 + k * 2, 14, 1, dark(car.color, 0.6)); // engine-lid vents
      for (const x of [17, 63]) { g.fillStyle = dark(car.color, 0.85); g.beginPath(); g.ellipse(x, 40, 9, 8, 0, Math.PI, 0); g.fill(); disc(g, x, 33, 2.4, "#e0201b"); }
      plate(g, 31, 34);
      rect(g, 10, 44, 60, 2.4, "#d8dde6");
      rect(g, 20, 46, 3, 2, "#8a909a");
      return crisp(cv);
    },
  },
  // Commuter Hatch: a tidy modern five-door hatch, blue, with a rear spoiler lip and alloys
  civic: {
    size: [70, 24],
    side(g, car, frame) {
      shaded(g, [[3, 12.4], [4, 9], [9, 7.4], [17, 3], [36, 2.2], [43, 3.8], [50, 8.2], [60, 9.6], [66, 11], [68, 13.4], [67.4, 17.6], [3, 17.6], [2, 15]], car.color, 2, 18);
      poly(g, [[16, 8], [20.4, 3.8], [35.6, 3], [42.4, 4.4], [47.6, 8.2]], "#0c0d10");
      poly(g, [[17.6, 7.6], [21, 4.4], [29.6, 4], [29.6, 7.6]], "#25344c"); poly(g, [[31, 7.6], [31, 4], [41.4, 4.8], [45.4, 7.6]], "#25344c");
      poly(g, [[21.6, 4.8], [26, 4.4], [23, 6.6]], "rgba(255,255,255,0.2)");
      poly(g, [[4, 8.6], [10, 7.2], [10, 8], [4.4, 9.4]], dark(car.color, 0.4)); // spoiler lip
      rect(g, 5, 11.2, 61, 0.7, light(car.color, 0.45));
      rect(g, 30.4, 8.6, 0.6, 8, dark(car.color, 0.45)); rect(g, 47, 8.6, 0.6, 7.6, dark(car.color, 0.45));
      rect(g, 24, 11.8, 2.6, 0.8, dark(car.color, 0.5)); rect(g, 40, 11.8, 2.6, 0.8, dark(car.color, 0.5));
      poly(g, [[60, 10.4], [67, 11.6], [66.6, 12.8], [60.4, 11.6]], "#eef4ff"); poly(g, [[2.6, 10.6], [7, 9.6], [7.2, 11], [2.8, 12]], "#d42020");
      rect(g, 3, 16, 65, 1.6, "#24262c");
      arch(g, 14.5, 17.6, 5, "#141418"); arch(g, 56, 17.6, 5, "#141418");
      wheel(g, 14.5, 18.2, 4.9, "alloy", "#b8bec8", frame); wheel(g, 56, 18.2, 4.9, "alloy", "#b8bec8", frame);
    },
    rear: { tail: "bar", roof: [18, 4], extra: (g, car, { cx, top }) => rect(g, cx - 18, top - 13, 36, 1.4, dark(car.color, 0.4)) },
  },
  // Tofu Delivery Coupe: an 80s three-door coupe in two-tone, white over black, a little shop sign on the door
  ae86: {
    size: [70, 24],
    side(g, car, frame) {
      shaded(g, [[3, 11.6], [4, 9], [12, 8.2], [19, 3.4], [36, 2.8], [44, 8], [58, 8.8], [66, 10], [67.6, 12], [67.6, 17.6], [3, 17.6], [2, 14.6]], car.color, 2, 18, 0.2);
      poly(g, [[2, 13.2], [67.6, 13.2], [67.6, 17.6], [3, 17.6], [2, 14.6]], car.accent); // black lower half
      rect(g, 2, 12.8, 65.6, 0.6, "#c0201b");
      poly(g, [[18.6, 8], [21.4, 4], [35.4, 3.6], [42, 8]], "#0c0d10");
      poly(g, [[20, 7.6], [22, 4.6], [29.8, 4.4], [29.8, 7.6]], "#25344c"); poly(g, [[31.2, 7.6], [31.2, 4.4], [35, 4.4], [40, 7.6]], "#25344c");
      rect(g, 28, 9.6, 10, 2.6, "#f4f4f4"); rect(g, 28.6, 10.2, 8.8, 1.4, "#2a2c33"); // the shop sign on the door
      rect(g, 58, 9.4, 8, 1.4, "#1b1b1f"); // pop-up lamps, down
      rect(g, 2.4, 10.4, 2.4, 2.4, "#d42020");
      wheel(g, 14.5, 18.2, 4.8, "alloy", "#d8dde6", frame); wheel(g, 56, 18.2, 4.8, "alloy", "#d8dde6", frame);
    },
    rear: { tail: "bar", roof: [16, 5], lower: 9, plateY: 11 },
  },
  // Little Roadster: a small open two-seater, red, folded top, a driver's head, pop-up lamps
  miata: {
    size: [68, 22],
    side(g, car, frame) {
      shaded(g, [[3, 11], [5, 8.4], [22, 7.6], [27, 7.4], [32, 8.2], [44, 8.2], [58, 8.8], [64.6, 10.2], [66, 12.4], [66, 15.8], [3, 15.8], [2, 13.4]], car.color, 6, 16);
      poly(g, [[32, 8.2], [36.6, 4], [37.4, 4], [34, 8.2]], "#9fb4cc"); // windscreen
      rect(g, 20, 6.8, 9, 1.6, "#16161a"); // folded top
      oval(g, 28.6, 5.6, 1.8, 2, "#2a1e18"); rect(g, 27.4, 6.8, 3, 1.8, "#3a3a46"); // driver
      rect(g, 4, 10.4, 61, 0.6, light(car.color, 0.45));
      rect(g, 27, 9, 0.6, 6, dark(car.color, 0.45));
      rect(g, 56, 8.6, 7, 1.2, dark(car.color, 0.55)); rect(g, 2.4, 9.6, 3, 2.2, "#d42020");
      rect(g, 3, 14.4, 63, 1.4, "#1d1d22");
      wheel(g, 13.5, 16.4, 4.6, "alloy", "#c9ced6", frame); wheel(g, 55, 16.4, 4.6, "alloy", "#c9ced6", frame);
    },
    rear: { open: true, top: 22, tail: "bar", extra: (g, car, { cx }) => { rect(g, cx - 20, 15, 40, 7, "#16161a"); oval(g, cx - 8, 15, 3.4, 3.4, "#2a1e18"); rect(g, cx - 26, 20, 4, 3, "#1b1b1f"); rect(g, cx + 22, 20, 4, 3, "#1b1b1f"); } },
  },
  // Hot Hatch GT: a three-door hot hatch, white, a red pinstripe round the grille, black lower trim, big alloys
  gti: {
    size: [68, 24],
    side(g, car, frame) {
      shaded(g, [[3, 12], [4, 8.8], [9, 7.6], [17, 3.2], [35, 2.4], [41, 3.6], [47, 8.2], [57, 9.4], [64, 10.8], [66.4, 13], [66, 17.6], [3, 17.6], [2, 15]], car.color, 2, 18, 0.18);
      poly(g, [[16.4, 8], [20.6, 4], [34.6, 3.2], [40.6, 4.6], [44.6, 8.2]], "#0c0d10");
      poly(g, [[18, 7.6], [21.2, 4.6], [33.8, 4], [39.6, 5], [42.6, 7.6]], "#25344c"); // one long door window
      rect(g, 3, 13.4, 63, 0.6, car.accent); // the red pinstripe down the side
      rect(g, 2.6, 15, 64, 2.6, "#1d1d22"); // black lower trim
      rect(g, 33, 11.6, 3, 0.8, "#3a3a46");
      poly(g, [[59, 10.2], [65.6, 11.2], [65.4, 12.4], [59.4, 11.4]], "#eef4ff"); rect(g, 2.4, 10.4, 3, 2.4, "#d42020");
      arch(g, 14.5, 17.6, 5.2, "#141418"); arch(g, 55, 17.6, 5.2, "#141418");
      wheel(g, 14.5, 18.2, 5.2, "alloy", "#2c2e34", frame); wheel(g, 55, 18.2, 5.2, "alloy", "#2c2e34", frame);
    },
    rear: { tail: "bar", roof: [17, 4], lower: 17, lowerCol: () => "#1d1d22", plateY: 10,
      extra: (g, car, { cx, top }) => { rect(g, cx - 34, top + 8, 68, 0.8, car.accent); rect(g, cx + 20, 44, 4, 2, "#8a909a"); } },
  },
  // Three-Wheel Wonder: a tall, bubbly three-wheeler with one wheel up front and a big glass cabin
  trike: {
    size: [56, 26],
    side(g, car, frame) {
      shaded(g, [[3, 15], [4, 8], [8, 3.4], [22, 2], [32, 3.4], [40, 9], [48, 12], [52, 15.4], [52, 18.4], [3, 18.4]], car.color, 2, 19, 0.25);
      poly(g, [[9.4, 9], [11, 4.4], [22, 3.4], [30, 4.6], [36, 9.4]], "#0c0d10");
      poly(g, [[10.6, 8.6], [11.8, 5], [21.6, 4.2], [29.4, 5.2], [34.2, 8.6]], "#2a3a55");
      oval(g, 24, 6.6, 1.8, 1.9, "#2a1e18");
      rect(g, 4, 12.4, 47, 1, car.accent);
      disc(g, 49.6, 13.6, 1.6, "#f4f6ff"); rect(g, 3, 12, 1.6, 2.6, "#c0201b");
      rect(g, 22, 11, 0.6, 7, dark(car.color, 0.5)); rect(g, 16, 13.6, 2.4, 0.8, dark(car.color, 0.5));
      wheel(g, 11, 19.6, 4.4, "steel", "#d8dde6", frame); wheel(g, 45, 20.4, 3.6, "steel", "#d8dde6", frame); // the single small front wheel
    },
    rear: { shoulder: 30, roof: [15, 2], roofBase: 24, top: 18, tail: "round", heads: [40],
      extra: (g, car, { cx }) => rect(g, cx - 28, 30, 56, 1.4, car.accent) },
  },
  // Grandpa's Wagon: a long old estate car with timber side panels and a roof rack
  woodie: {
    size: [76, 24],
    side(g, car, frame) {
      shaded(g, [[3, 11.6], [3.4, 4], [5, 2.6], [41, 2.4], [47, 3.6], [52, 8.4], [64, 9.4], [71, 10.8], [73, 13], [73, 17.6], [3, 17.6], [2, 14.6]], car.color, 2, 18, 0.2);
      // the wood panels
      poly(g, [[3.4, 9], [50, 9], [50, 15.4], [3.4, 15.4]], car.accent);
      g.fillStyle = dark(car.accent, 0.62); for (const x of [3.4, 17, 33, 48.6]) g.fillRect(x, 9, 1.4, 6.4);
      rect(g, 3.4, 9, 46.6, 1.2, dark(car.accent, 0.62)); rect(g, 3.4, 14.2, 46.6, 1.2, dark(car.accent, 0.62));
      poly(g, [[5, 8.2], [5.6, 3.6], [40, 3.4], [45.6, 4.4], [49.4, 8.4]], "#0c0d10");
      for (const [a, z] of [[6.4, 16], [17.4, 32], [33.4, 47.6]]) poly(g, [[a, 7.8], [a, 4.2], [z - (z > 45 ? 3 : 0), 4.2], [z, 7.8]], "#2a3a55");
      rect(g, 6, 1, 34, 1, "#3a3a46"); for (const x of [8, 22, 36]) rect(g, x, 1, 1, 2, "#3a3a46"); // roof rack
      rect(g, 66, 10.6, 5, 1.6, "#f4e8b8"); rect(g, 2.4, 10, 2, 3, "#c0201b");
      rect(g, 2, 16, 72, 1.6, "#d8dde6");
      wheel(g, 15, 18.2, 4.8, "white", "#d8dde6", frame); wheel(g, 61, 18.2, 4.8, "white", "#d8dde6", frame);
    },
    rear: { roof: [26, 3], roofBase: 30, tail: "tall", bumper: "#d8dde6", lower: 3, lowerCol: (car) => car.accent,
      extra: (g, car, { cx, top }) => { rect(g, cx - 34, top + 3, 68, 1.2, dark(car.accent, 0.6)); rect(g, cx - 20, 1, 40, 2, "#3a3a46"); } },
  },
  // Mail Van: a tall, boxy delivery van, white with a blue stripe and a sliding side door
  mailvan: {
    size: [74, 30],
    side(g, car, frame) {
      shaded(g, [[3, 22], [3, 3], [5, 1.6], [50, 1.6], [53, 3], [57, 11], [66, 12.6], [70, 14.6], [71, 17], [71, 23.6], [3, 23.6]], car.color, 1, 24, 0.12);
      rect(g, 3, 15, 68, 2.4, car.accent); rect(g, 3, 18, 68, 0.8, car.accent); // the stripe
      poly(g, [[51.6, 3.4], [55.6, 11], [61, 11.8], [61, 3.4]], "#0c0d10"); poly(g, [[52.6, 4], [56, 10.4], [60.2, 11], [60.2, 4]], "#2a3a55");
      rect(g, 24, 3, 0.7, 20, dark(car.color, 0.6)); rect(g, 44, 3, 0.7, 20, dark(car.color, 0.6)); rect(g, 26, 12, 6, 0.8, "#3a3a46"); // sliding door
      rect(g, 6, 5, 12, 6, "#e9e6d8"); rect(g, 7, 6, 10, 1, car.accent); rect(g, 7, 8, 7, 1, car.accent); // a little badge
      rect(g, 66, 15.4, 5, 2, "#f4f6ff"); rect(g, 2.4, 14, 2, 4, "#c0201b");
      rect(g, 3, 22, 68, 1.6, "#2a2c33");
      wheel(g, 15, 24.2, 5, "steel", "#d8dde6", frame); wheel(g, 60, 24.2, 5, "steel", "#d8dde6", frame);
    },
    rear: { h: 60, shoulder: 34, top: 8, roof: [33, 6], roofBase: 33, glassInset: 3, tail: "tall", tailY: 16, plateY: 26, pipe: true,
      body: [[8, 12], [72, 12], [74, 14], [74, 52], [6, 52], [6, 14]],
      extra: (g, car) => { rect(g, 39.4, 14, 1.2, 38, dark(car.color, 0.6)); rect(g, 6, 36, 68, 3, car.accent); rect(g, 12, 18, 24, 12, "#2a3a55"); rect(g, 44, 18, 24, 12, "#2a3a55"); } },
  },
  // Yellow Cab: a big old-school sedan with a roof sign and a checker band
  taxi: {
    size: [74, 26],
    side(g, car, frame) {
      shaded(g, [[2.6, 13.6], [3, 11], [14, 10], [20, 5], [42, 4.4], [49, 9.6], [62, 10.4], [70, 11.6], [71.6, 14], [71.6, 19.6], [2.6, 19.6]], car.color, 4, 20, 0.2);
      poly(g, [[19.6, 9.8], [22, 5.6], [41, 5.2], [46.4, 10]], "#0c0d10");
      poly(g, [[21, 9.4], [22.8, 6.2], [32, 6], [32, 9.4]], "#2a3a55"); poly(g, [[33.4, 9.4], [33.4, 6], [40.4, 5.8], [44.4, 9.4]], "#2a3a55");
      for (let i = 0; i < 16; i++) rect(g, 6 + i * 4, 13.2 + (i % 2), 2, 1, "#111111"); // the checker band
      rect(g, 6, 13.2, 64, 0.2, "#111111");
      rect(g, 26, 1.4, 12, 3.2, "#f4f4f4"); rect(g, 27, 2.2, 10, 1.6, car.accent); // roof sign
      rect(g, 66, 12, 5, 1.8, "#f4f6ff"); rect(g, 2.2, 11.6, 2, 3, "#c0201b");
      rect(g, 2, 18, 70, 1.6, "#d8dde6");
      wheel(g, 15.5, 20.4, 5, "hub", "#e4e8ee", frame); wheel(g, 60, 20.4, 5, "hub", "#e4e8ee", frame);
    },
    rear: { h: 56, top: 23, roof: [17, 9], tail: "bar", bumper: "#d8dde6",
      extra: (g, car, { cx, top }) => { rect(g, cx - 7, 2, 14, 5, "#f4f4f4"); rect(g, cx - 6, 3, 12, 3, car.accent); for (let i = 0; i < 17; i++) rect(g, cx - 34 + i * 4, top + 9 + (i % 2), 2, 1, "#111111"); } },
  },
  // Pizza Delivery Hatch: a little red hatch with a glowing pizza sign on the roof and a yellow stripe
  pizza: {
    size: [64, 27],
    side(g, car, frame) {
      shaded(g, [[3, 15], [4, 12], [8, 11], [15, 6.6], [32, 6], [38, 7.2], [44, 11.4], [53, 12.4], [59, 13.6], [61, 16], [60.6, 20.6], [3, 20.6], [2, 18]], car.color, 5, 21);
      poly(g, [[14.4, 11.2], [18, 7.4], [31.6, 6.8], [37.4, 8], [41.4, 11.4]], "#0c0d10");
      poly(g, [[16, 10.8], [18.6, 8], [26.4, 7.6], [26.4, 10.8]], "#2a3a55"); poly(g, [[27.8, 10.8], [27.8, 7.6], [36.6, 8.4], [39.6, 10.8]], "#2a3a55");
      rect(g, 3, 15.6, 58, 1.4, car.accent);
      // the roof sign: a pizza slice
      rect(g, 18, 4.4, 16, 2, "#2a2c33");
      poly(g, [[19, 4.4], [33, 4.4], [26, 0.4]], "#ffd23a"); poly(g, [[20.6, 4.4], [31.4, 4.4], [26, 1.4]], "#ffb02e");
      for (const [x, y] of [[24.6, 3], [27.6, 3.4], [26, 2]]) disc(g, x, y, 0.7, "#c0201b");
      rect(g, 55, 14, 5, 1.8, "#f4f6ff"); rect(g, 2.4, 13.6, 2, 3, "#c0201b");
      rect(g, 3, 19, 58, 1.6, "#24262c");
      wheel(g, 13.5, 21.2, 4.6, "steel", "#d8dde6", frame); wheel(g, 51, 21.2, 4.6, "steel", "#d8dde6", frame);
    },
    rear: { h: 56, top: 23, roof: [15, 8], tail: "bar",
      extra: (g, car, { cx, top }) => { poly(g, [[cx - 8, 7], [cx + 8, 7], [cx, 1]], "#ffd23a"); rect(g, cx - 8, 7, 16, 2, "#2a2c33"); rect(g, cx - 34, top + 8, 68, 1.4, car.accent); } },
  },
  // Ice Cream Van: a van with a serving hatch and striped awning, and a giant cone on the roof
  icecream: {
    size: [74, 33],
    side(g, car, frame) {
      shaded(g, [[3, 25], [3, 7], [5, 5.6], [50, 5.6], [53, 7], [57, 14], [66, 15.6], [70, 17.6], [71, 20], [71, 26.6], [3, 26.6]], car.color, 5, 27, 0.12);
      poly(g, [[51.6, 7.4], [55.6, 14], [61, 14.8], [61, 7.4]], "#0c0d10"); poly(g, [[52.6, 8], [56, 13.4], [60.2, 14], [60.2, 8]], "#2a3a55");
      rect(g, 12, 10, 28, 9, "#2a1e18"); rect(g, 13, 11, 26, 7, "#ffe8b8"); // the serving hatch
      for (let i = 0; i < 7; i++) rect(g, 11 + i * 4.2, 8, 4.2, 2.4, i % 2 ? "#f4f4f4" : car.accent); // awning
      rect(g, 3, 20, 68, 1.6, car.accent);
      // the giant cone on the roof
      poly(g, [[26, 5.6], [30, 5.6], [28, -2 + 8]], "#d9a25a");
      disc(g, 28, 2.6, 3, "#ffd6e8"); disc(g, 27, 1.8, 1.4, "#ffffff"); disc(g, 29.6, 1.2, 0.7, "#c0201b");
      rect(g, 66, 18.4, 5, 2, "#f4f6ff"); rect(g, 2.4, 17, 2, 4, "#c0201b");
      rect(g, 3, 25, 68, 1.6, "#2a2c33");
      wheel(g, 15, 27.2, 5, "steel", "#d8dde6", frame); wheel(g, 60, 27.2, 5, "steel", "#d8dde6", frame);
    },
    rear: { h: 62, shoulder: 34, top: 10, roof: [33, 8], roofBase: 33, tail: "tall", tailY: 16, plateY: 28,
      body: [[8, 14], [72, 14], [74, 16], [74, 54], [6, 54], [6, 16]],
      extra: (g, car) => { rect(g, 6, 38, 68, 3, car.accent); disc(g, 40, 5, 4, "#ffd6e8"); poly(g, [[37, 8], [43, 8], [40, 14]], "#d9a25a"); rect(g, 14, 20, 52, 12, "#2a3a55"); } },
  },
  // Peace & Love Bus: a split-window camper bus, two-tone with a white top, and flower stickers
  hippie: {
    size: [72, 31],
    side(g, car, frame) {
      shaded(g, [[3, 24], [3, 5], [6, 2.4], [58, 2.4], [64, 4.4], [67.6, 9], [68.6, 16], [68.6, 25.6], [3, 25.6]], car.color, 2, 26, 0.15);
      poly(g, [[3, 3.6], [6, 2.4], [58, 2.4], [64, 4.4], [67, 8], [67.6, 12], [3, 12]], car.accent); // white top half
      for (let x = 7; x < 56; x += 10) { rect(g, x, 4.4, 8, 6, "#0c0d10"); rect(g, x + 1, 5, 6, 4.8, "#2a3a55"); }
      poly(g, [[59, 4.6], [63.4, 5.6], [66, 9.4], [66, 11], [59, 11]], "#2a3a55");
      rect(g, 3, 12, 65.6, 1, light(car.color, 0.4));
      for (const [x, y] of [[12, 17], [26, 19.4], [40, 16.4], [52, 19]]) { for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; disc(g, x + Math.cos(a) * 1.4, y + Math.sin(a) * 1.4, 1, "#ff4fd8"); } disc(g, x, y, 0.9, "#ffd23a"); }
      disc(g, 65.4, 15, 1.8, "#f4f6ff");
      rect(g, 2.4, 14, 2, 4, "#c0201b");
      rect(g, 2, 24, 67, 1.8, "#d8dde6");
      wheel(g, 14, 26, 4.8, "hub", "#e4e8ee", frame); wheel(g, 57, 26, 4.8, "hub", "#e4e8ee", frame);
    },
    rear: { h: 62, shoulder: 33, top: 10, roof: [30, 5], roofBase: 31, tail: "round", tailY: 18, plateY: 30, bumper: "#d8dde6",
      body: [[10, 12], [70, 12], [73, 16], [73, 54], [7, 54], [7, 16]],
      roofCol: (car) => car.accent,
      extra: (g, car) => { rect(g, 7, 12, 66, 10, car.accent); rect(g, 14, 14, 52, 7, "#2a3a55"); disc(g, 40, 30, 5, car.accent); disc(g, 40, 30, 3.6, car.color); rect(g, 39.4, 26.4, 1.2, 7, car.accent); } },
  },
  // CHRISTMAS '26 SANTA'S SLEIGH: a curly-fronted sleigh in the car's colour with gold scrollwork, Santa at
  // the reins, a sack of presents behind him, and a reindeer (Rudolph, nose glowing) galloping in front.
  sleigh26: {
    size: [96, 34],
    side(g, car, frame) {
      const step = frame % 2;
      // the second reindeer, behind
      oval(g, 66, 15, 8, 3.6, "#5a3a1e");
      rect(g, 60 + step * 2, 17, 1.6, 7, "#3a2412"); rect(g, 71 - step * 2, 17, 1.6, 7, "#3a2412");
      rect(g, 72, 8.6, 2, 6, "#5a3a1e"); oval(g, 76, 8, 3.4, 2.2, "#5a3a1e");
      // Rudolph, in front
      rect(g, 74 + step * 3, 19, 1.8, 9 - step, "#5a3a1e"); rect(g, 86 - step * 3, 19, 1.8, 9 - step, "#5a3a1e"); // legs
      rect(g, 76 - step * 2, 19, 1.8, 8, "#6e4628"); rect(g, 84 + step * 2, 19, 1.8, 8, "#6e4628");
      oval(g, 80, 17, 9, 4.2, "#8a5a32"); oval(g, 80, 18.4, 7, 2, "#c89a66");                       // body and belly
      oval(g, 71.6, 15, 2, 1.6, "#f4ead8");                                                          // tail
      poly(g, [[86, 15], [88, 8], [91, 8], [89.6, 16]], "#8a5a32");                                   // neck
      oval(g, 91, 7.4, 3.6, 2.4, "#8a5a32");                                                         // head
      disc(g, 94.2, 7.8, 1.5, "#ff2020"); disc(g, 93.8, 7.3, 0.6, "#ffb0b0");                         // the red nose
      disc(g, 90.6, 6.4, 0.6, "#111111");                                                            // eye
      g.strokeStyle = "#e8d6a8"; g.lineWidth = 1;                                                    // antlers
      g.beginPath(); g.moveTo(89.6, 5.4); g.lineTo(88, 1); g.moveTo(88.6, 3); g.lineTo(86, 1.6); g.moveTo(90.6, 5.2); g.lineTo(92, 1.2); g.moveTo(91.4, 3); g.lineTo(93.6, 2); g.stroke();
      rect(g, 84, 13.6, 4, 1.4, "#c8202a"); disc(g, 85, 15.6, 0.9, "#ffd23a");                          // collar and bell
      // reins
      g.strokeStyle = "#6a3a1a"; g.lineWidth = 0.8;
      g.beginPath(); g.moveTo(31, 12); g.quadraticCurveTo(55, 18, 86, 14.6); g.stroke();
      // runners: a long silver blade, curling up at the front
      rect(g, 3, 29.6, 46, 1.8, "#d8dde6"); rect(g, 3, 31, 46, 0.6, "#8a909a");
      g.strokeStyle = "#d8dde6"; g.lineWidth = 1.8;
      g.beginPath(); g.moveTo(48, 30.4); g.quadraticCurveTo(56, 30, 55, 23); g.quadraticCurveTo(54, 19.6, 51, 21.4); g.stroke();
      for (const x of [9, 22, 36]) rect(g, x, 25, 1.6, 5, "#b4bac4");
      // the sack of presents, behind Santa
      oval(g, 11, 11, 7, 7, "#7a4a22"); oval(g, 9, 9, 3, 2.6, "#a86a34");
      rect(g, 7, 2.6, 4.6, 4.6, "#5dff8f"); rect(g, 9, 2.6, 0.8, 4.6, "#c8202a");
      rect(g, 12.6, 3.6, 4, 4, "#4fd1ff"); rect(g, 12.6, 5.2, 4, 0.8, "#ffd23a");
      // Santa
      rect(g, 19, 8, 11, 10, "#d42020");                         // coat
      rect(g, 19, 13.6, 11, 1.6, "#1b1b1f"); rect(g, 23.4, 13.4, 2, 2, "#ffd23a"); // belt and buckle
      oval(g, 27, 4.6, 3.2, 3, "#f2c8a0");                       // face
      oval(g, 27.6, 7.4, 3.2, 2.8, "#f4f4f4");                   // beard
      poly(g, [[23.4, 3.4], [30.6, 3.4], [26, -0.4], [22, 1.6]], "#d42020"); rect(g, 23, 3, 8, 1.6, "#f4f4f4"); // hat
      disc(g, 21.6, 2, 1.4, "#f4f4f4");                          // bobble
      rect(g, 29, 10.6, 3, 2, "#f4f4f4"); rect(g, 31, 10.6, 1.6, 2, "#1b1b1f"); // arm, mitten
      // the sleigh's body: high at the back, low in the middle, a curl at the front
      shaded(g, [[4, 27], [2.6, 15], [4, 9.4], [8, 8], [10.6, 11.6], [15, 16.6], [34, 16.6], [40, 13.6], [44, 9.6], [48, 10], [48.6, 13.6], [45, 21], [40, 27]], car.color, 8, 27);
      g.strokeStyle = car.accent; g.lineWidth = 1.1;                // gold scrollwork
      g.beginPath(); g.moveTo(4, 25.4); g.lineTo(39, 25.4); g.stroke();
      g.beginPath(); g.moveTo(4.6, 15); g.quadraticCurveTo(5, 9.6, 8.6, 9.6); g.quadraticCurveTo(10, 12.4, 15.6, 18); g.lineTo(34, 18); g.quadraticCurveTo(40, 15, 44.6, 11.4); g.stroke();
      disc(g, 46, 12.4, 1.8, car.accent); disc(g, 46, 12.4, 0.8, dark(car.color, 0.7));
      disc(g, 12, 21.6, 2.4, car.accent); disc(g, 12, 21.6, 1.2, car.color);
      disc(g, 30, 21.6, 2.4, car.accent); disc(g, 30, 21.6, 1.2, car.color);
    },
    rear(car, frame) {
      const cv = canvas(80, 60), g = cv.getContext("2d");
      const step = frame % 2;
      // the reindeer ahead: their backs and antlers over the top
      for (const [x, c] of [[28, "#5a3a1e"], [52, "#8a5a32"]]) {
        oval(g, x, 14, 6, 4, c);
        g.strokeStyle = "#e8d6a8"; g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(x - 2, 10); g.lineTo(x - 5, 3 + step); g.moveTo(x - 4, 6); g.lineTo(x - 8, 5); g.moveTo(x + 2, 10); g.lineTo(x + 5, 3 + step); g.moveTo(x + 4, 6); g.lineTo(x + 8, 5); g.stroke();
      }
      // the sack, Santa's back and his hat
      oval(g, 24, 22, 10, 9, "#7a4a22"); rect(g, 17, 12, 6, 6, "#5dff8f"); rect(g, 26, 13, 5, 5, "#4fd1ff");
      rect(g, 38, 16, 16, 12, "#d42020"); oval(g, 46, 14, 6, 4, "#f4f4f4");
      poly(g, [[41, 12], [51, 12], [47, 4], [43, 6]], "#d42020"); rect(g, 40, 11, 12, 2, "#f4f4f4"); disc(g, 46.6, 4, 2, "#f4f4f4");
      // the back of the sleigh: a tall curved panel with gold scrollwork
      shaded(g, [[8, 50], [6, 30], [10, 24], [20, 26], [40, 28], [60, 26], [70, 24], [74, 30], [72, 50]], car.color, 24, 50);
      g.strokeStyle = car.accent; g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(9, 31); g.quadraticCurveTo(20, 27.6, 40, 30); g.quadraticCurveTo(60, 27.6, 71, 31); g.stroke();
      g.beginPath(); g.moveTo(10, 47); g.lineTo(70, 47); g.stroke();
      for (const x of [18, 40, 62]) { disc(g, x, 39, 3.4, car.accent); disc(g, x, 39, 1.8, car.color); }
      // runners
      rect(g, 10, 50, 3, 5, "#b4bac4"); rect(g, 67, 50, 3, 5, "#b4bac4");
      rect(g, 6, 54 + step * 0, 12, 2.4, "#d8dde6"); rect(g, 62, 54, 12, 2.4, "#d8dde6");
      return crisp(cv);
    },
  },
};

// ---- the Christmas '26 present cars: a hand-drawn car dressed up for Christmas ----
// base: the car underneath (drawn in this car's colours); pad: room around it [left, top, right, bottom];
// side/rear: the decorations, drawn over it (x, y in the base car's own coordinates)
function dressed(base, pad, side, rear, rearTop = 0) {
  return {
    size: [HAND[base].size[0] + pad[0] + pad[2], HAND[base].size[1] + pad[1] + pad[3]],
    side(g, car, frame) {
      const b = canvas(...HAND[base].size), bg = b.getContext("2d");
      HAND[base].side(bg, car, frame);
      g.drawImage(b, pad[0], pad[1]);
      g.save(); g.translate(pad[0], pad[1]); side(g, car, frame, bg); g.restore();
    },
    rear(car, frame) {
      const r = handRear({ ...car, id: base }, frame);
      const cv = canvas(r.width, r.height + rearTop), g = cv.getContext("2d");
      g.drawImage(r, 0, rearTop);
      g.save(); g.translate(0, rearTop); rear(g, car, frame, r.width, r.height); g.restore();
      return crisp(cv);
    },
  };
}
// red stripes painted only over the car's own pixels, in a band (x0..x1, y0..y1), skipping the wheels
function candyStripes(g, x0, y0, x1, y1, skip = []) {
  g.save();
  g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.clip();
  g.globalCompositeOperation = "source-atop";
  g.fillStyle = "#d42020";
  for (let x = x0 - 20; x < x1 + 20; x += 6) {
    if (skip.some(([a, b]) => x + 3 > a && x < b)) continue;
    poly(g, [[x, y1], [x + 3, y1], [x + 3 + (y1 - y0), y0], [x + (y1 - y0), y0]], "#d42020");
  }
  g.restore();
}
const ANTLERS = (g, x, y, k = 1) => {
  g.strokeStyle = "#c89a5a"; g.lineWidth = 1.3 * k;
  g.beginPath();
  for (const s of [-1, 1]) { g.moveTo(x + s * 2 * k, y); g.lineTo(x + s * 5 * k, y - 7 * k); g.moveTo(x + s * 3.6 * k, y - 4 * k); g.lineTo(x + s * 7 * k, y - 5 * k); g.moveTo(x + s * 4.6 * k, y - 6 * k); g.lineTo(x + s * 3 * k, y - 9 * k); }
  g.stroke();
};
Object.assign(HAND, {
  // CANDY CANE ROADSTER: a white roadster wrapped in red candy stripes, a giant candy cane behind the seat
  candycane26: dressed("miata", [0, 9, 0, 0], (g) => {
    candyStripes(g, 3, 8.4, 66, 14.4, [[8, 19], [50, 60]]);
    g.strokeStyle = "#f4f4f4"; g.lineWidth = 2.4;
    g.beginPath(); g.moveTo(18, 8); g.lineTo(18, -4); g.arc(14.5, -4, 3.5, 0, Math.PI, true); g.stroke();
    g.strokeStyle = "#d42020"; g.lineWidth = 2.4; g.setLineDash([1.6, 1.6]);
    g.beginPath(); g.moveTo(18, 8); g.lineTo(18, -4); g.arc(14.5, -4, 3.5, 0, Math.PI, true); g.stroke(); g.setLineDash([]);
    disc(g, 45, 7.6, 1.6, "#1f8a4c"); disc(g, 47.6, 7.6, 1.6, "#1f8a4c"); disc(g, 46.3, 8, 1.1, "#d42020"); // holly on the hood
  }, (g, car, frame, w, h) => {
    candyStripes(g, 8, h - 19, w - 8, h - 10);
    poly(g, [[33, 24], [40, 27.4], [47, 24], [47, 31], [40, 27.4], [33, 31]], "#d42020"); disc(g, 40, 27.4, 2.2, "#ffd23a"); // a big bow on the boot
  }),
  // GINGERBREAD BUG: a round little car baked out of gingerbread, with icing and gumdrops
  gingerbug26: dressed("beetle", [0, 2, 0, 0], (g) => {
    g.strokeStyle = "#fff6ec"; g.lineWidth = 1.2;
    g.beginPath(); for (let x = 6; x <= 54; x += 1) g.lineTo(x, 13.6 + Math.sin(x * 1.2) * 0.9); g.stroke(); // icing squiggle
    g.beginPath(); g.ellipse(30, 13, 25.6, 11.6, 0, Math.PI * 1.08, Math.PI * 1.92); g.stroke(); // icing on the roofline
    for (const [x, y, c] of [[12, 7.4, "#d42020"], [21, 2.8, "#5dff8f"], [30, 1.4, "#ffd23a"], [39, 2.8, "#4fd1ff"], [48, 7.4, "#ff4fd8"]]) { disc(g, x, y, 1.6, c); disc(g, x - 0.5, y - 0.5, 0.5, "#ffffff"); }
    for (const x of [24, 36]) disc(g, x, 15.6, 0.9, "#fff6ec"); // icing buttons
  }, (g, car, frame, w, h) => {
    g.strokeStyle = "#fff6ec"; g.lineWidth = 1.4;
    g.beginPath(); for (let x = 13; x <= 67; x += 1) g.lineTo(x, 31 + Math.sin(x * 1.1) * 1); g.stroke();
    for (const [x, y, c] of [[20, 14, "#d42020"], [30, 8, "#5dff8f"], [40, 6, "#ffd23a"], [50, 8, "#4fd1ff"], [60, 14, "#ff4fd8"]]) disc(g, x, y, 2.2, c);
  }),
  // NORTH POLE SNOWPLOW: a work van with a big striped plow blade full of snow, and a flashing light bar
  plow26: dressed("mailvan", [0, 3, 12, 0], (g, car, frame) => {
    rect(g, 18, -2.6, 20, 2.6, "#2a2c33"); rect(g, 19, -2.2, 8, 1.8, frame % 2 ? "#ff9a1f" : "#ffd23a"); rect(g, 29, -2.2, 8, 1.8, frame % 2 ? "#ffd23a" : "#ff9a1f");
    rect(g, 70, 18, 4, 3, "#2a2c33"); // the plow's arm
    poly(g, [[74, 11], [80, 9], [85, 13], [85, 28], [74, 28]], "#ffb02e");
    for (let y = 12; y < 28; y += 4) poly(g, [[74, y], [85, y + 2], [85, y + 4], [74, y + 2]], "#1b1b1f");
    oval(g, 75, 12, 4, 3, "#f4f8ff"); oval(g, 79, 9.6, 4, 2.4, "#ffffff"); oval(g, 83, 11.6, 2.6, 2, "#eef4ff"); // the snow it's pushing
  }, (g, car, frame, w) => {
    rect(g, w / 2 - 18, 2, 36, 4, "#2a2c33"); rect(g, w / 2 - 17, 2.6, 16, 2.6, frame % 2 ? "#ff9a1f" : "#ffd23a"); rect(g, w / 2 + 1, 2.6, 16, 2.6, frame % 2 ? "#ffd23a" : "#ff9a1f");
    for (let x = 8; x < w - 8; x += 8) poly(g, [[x, 44], [x + 4, 44], [x + 8, 48], [x + 4, 48]], "#1b1b1f");
  }),
  // RED-NOSED HOT HATCH: a reindeer-brown hatch with antlers on the roof and a glowing red nose
  rudolph26: dressed("gti", [0, 9, 4, 0], (g) => {
    ANTLERS(g, 23, 3, 1); ANTLERS(g, 31, 2.6, 1);
    disc(g, 67.6, 12.4, 2.6, "#ff2020"); disc(g, 67, 11.6, 0.9, "#ffb0b0"); // the nose
    rect(g, 52, 6.6, 2.4, 0.8, "#111111"); rect(g, 52.6, 5.8, 0.6, 0.8, "#111111"); // eyelashes on the headlight side
  }, (g, car, frame, w) => {
    ANTLERS(g, w / 2 - 9, 6, 1.2); ANTLERS(g, w / 2 + 9, 6, 1.2);
    disc(g, w / 2, 44, 3, "#f4ead8"); // a fluffy tail
  }, 10),
});

export const handDrawn = (car) => !!HAND[car.id];
export function handSide(car, frame) {
  const s = HAND[car.id];
  const [w, h] = s.size;
  const cv = canvas(w, h), g = cv.getContext("2d");
  s.side(g, car, frame);
  return crisp(cv);
}
export function handRear(car, frame) {
  const s = HAND[car.id];
  return typeof s.rear === "function" ? s.rear(car, frame) : stdRear(car, frame, s.rear || {});
}
export const HAND_IDS = Object.keys(HAND);
