// The showroom, plus the pixel-art sprite generator.
// Car names are made up on purpose: real makes and models are trademarks that
// car makers license to games. Real brands only appear as trivia answers.
// power = distance multiplier, nitro = boost charges per race.

const C = (id, name, cls, price, power, nitro, body, color, accent) => ({ id, name, cls, price, power, nitro, body, color, accent });

export const CLASSES = {
  D: "CLASS D · BEATERS",
  C: "CLASS C · STREET",
  B: "CLASS B · SPORT",
  A: "CLASS A · SUPER",
  S: "CLASS S · HYPER",
  X: "CLASS X · LEGEND",
};

export const CARS = [
  C("rustbucket", "'92 Rustbucket", "D", 0, 1.0, 0, "hatch", "#9a6b4a", "#6e4a33"),
  C("fiat500", "Piccolo Cinquecento", "D", 800, 1.01, 0, "micro", "#e8e2c8", "#d14b4b"),
  C("mini", "Pocket Rocket", "D", 1500, 1.02, 0, "micro", "#c8323c", "#ffffff"),
  C("beetle", "Bubble Bug", "D", 2200, 1.03, 0, "micro", "#f2c230", "#ffffff"),
  C("civic", "Commuter Hatch", "D", 3200, 1.04, 0, "hatch", "#3f7fd6", "#1d4f99"),
  C("ae86", "Tofu Delivery Coupe", "D", 4500, 1.05, 1, "coupe", "#f4f4f4", "#222222"),
  C("miata", "Little Roadster", "D", 6000, 1.06, 1, "roadster", "#d42d2d", "#111111"),
  C("gti", "Hot Hatch GT", "D", 8000, 1.07, 1, "hatch", "#eeeeee", "#d42d2d"),

  C("wrangler", "Trail Boss 4x4", "C", 11000, 1.08, 1, "suv", "#5d7a3a", "#2e3d1c"),
  C("wrx", "Gravel Rocket", "C", 14000, 1.09, 1, "sedan", "#1f4fc4", "#e2b53a"),
  C("evo", "Stage Rally Saloon", "C", 16000, 1.1, 1, "sedan", "#d9d9d9", "#c8323c"),
  C("raptor", "Dune Basher Pickup", "C", 19000, 1.1, 2, "suv", "#2f6fd0", "#111111"),
  C("mustang", "Pony V8", "C", 23000, 1.11, 1, "muscle", "#1c3faa", "#ffffff"),
  C("camaro", "Detroit Muscle SS", "C", 25000, 1.12, 1, "muscle", "#f0c419", "#111111"),
  C("hellcat", "Supercharged Brawler", "C", 30000, 1.13, 1, "muscle", "#7a2fb5", "#111111"),
  C("rx7", "Rotary Coupe", "C", 34000, 1.14, 1, "coupe", "#f2d21f", "#111111"),
  C("m3", "Bavarian Sport Saloon", "C", 40000, 1.15, 1, "sedan", "#e9e9e9", "#3f7fd6"),
  C("r34", "Twin-Turbo Street Legend", "C", 46000, 1.16, 2, "coupe", "#2a52be", "#bfc6d6"),
  C("supra", "Turbo Six Coupe", "C", 50000, 1.17, 2, "coupe", "#ee7a1c", "#111111"),
  C("nsx", "Midship Sports '90", "C", 58000, 1.18, 1, "super", "#d42d2d", "#111111"),

  C("exige", "Featherweight Track Car", "B", 70000, 1.19, 1, "super", "#1f8a4c", "#f2d21f"),
  C("corvette", "American V8 Sports Car", "B", 80000, 1.2, 1, "super", "#f04a2a", "#111111"),
  C("gwagon", "Boxy Luxury 4x4", "B", 85000, 1.2, 2, "suv", "#1b1b1f", "#bfc6d6"),
  C("cobra", "Sixties V8 Roadster", "B", 95000, 1.21, 1, "roadster", "#1c3faa", "#ffffff"),
  C("viper", "Ten-Cylinder Brute", "B", 105000, 1.22, 1, "muscle", "#c8323c", "#ffffff"),
  C("911", "Rear-Engine Turbo Coupe", "B", 115000, 1.23, 2, "coupe", "#e2e2e2", "#c8323c"),
  C("gtr", "AWD Twin-Turbo Coupe", "B", 125000, 1.24, 2, "coupe", "#f4f4f4", "#d42d2d"),
  C("amggt", "Long-Hood Grand Tourer", "B", 135000, 1.25, 1, "coupe", "#9aa4ad", "#111111"),
  C("db11", "British Grand Tourer", "B", 145000, 1.25, 2, "coupe", "#2f5d50", "#bfc6d6"),
  C("r8", "German Midship V10", "B", 160000, 1.26, 2, "super", "#3a3f4a", "#d42d2d"),
  C("huracan", "Wedge V10", "B", 190000, 1.27, 2, "super", "#7ed321", "#111111"),
  C("488", "Italian Midship V8", "B", 210000, 1.28, 2, "super", "#e0201b", "#f2d21f"),
  C("720s", "Dihedral Supercar", "B", 240000, 1.29, 2, "super", "#ff7a00", "#111111"),

  C("countach", "Poster Wedge '88", "A", 300000, 1.3, 2, "super", "#f4f4f4", "#c8323c"),
  C("aventador", "Scissor-Door V12", "A", 340000, 1.31, 2, "super", "#f2d21f", "#111111"),
  C("gt40", "Le Mans Racer '66", "A", 380000, 1.32, 2, "super", "#6bb8e6", "#ff7a00"),
  C("f40", "Twin-Turbo Icon '87", "A", 420000, 1.33, 2, "hyper", "#e0201b", "#111111"),
  C("918", "Hybrid Spyder", "A", 470000, 1.34, 2, "hyper", "#c9ced6", "#b6e61a"),
  C("p1", "Plug-In Hypercar", "A", 520000, 1.35, 3, "hyper", "#f5b800", "#111111"),
  C("laferrari", "Hybrid V12 Flagship", "A", 570000, 1.36, 3, "hyper", "#d8121a", "#111111"),
  C("mclarenf1", "Three-Seat Legend '93", "A", 650000, 1.37, 2, "super", "#8b8f98", "#ff7a00"),
  C("huayra", "Gullwing Artisan", "A", 720000, 1.38, 3, "hyper", "#5a6b8c", "#d9b25a"),
  C("valkyrie", "Road-Going Racer", "A", 800000, 1.39, 3, "hyper", "#0f5c4a", "#d6ff3a"),

  C("nevera", "Electric Megawatt", "S", 900000, 1.4, 3, "hyper", "#3b6cff", "#111111"),
  C("venom", "Texas Twister", "S", 1000000, 1.41, 3, "hyper", "#f2d21f", "#111111"),
  C("tuatara", "Top-Speed Record Car", "S", 1100000, 1.42, 3, "hyper", "#f4f4f4", "#3b6cff"),
  C("veyron", "Sixteen-Cylinder Original", "S", 1200000, 1.43, 3, "hyper", "#16224f", "#c8323c"),
  C("agera", "Nordic Hypercar RS", "S", 1400000, 1.44, 3, "hyper", "#e9e9e9", "#f08a1c"),
  C("chiron", "W16 Super Sport", "S", 1600000, 1.45, 4, "hyper", "#1f6fe0", "#0c1a3a"),
  C("jesko", "Nordic Hypercar Absolute", "S", 1800000, 1.46, 4, "hyper", "#f4f4f4", "#e0201b"),
  C("one1", "Megawatt One", "S", 2000000, 1.47, 4, "hyper", "#2a2a30", "#3bd0ff"),
  C("bolide", "W16 Track Weapon", "S", 2300000, 1.48, 4, "hyper", "#0d3fb8", "#111111"),

  C("v10", "Screaming V10 Formula Car", "X", 3000000, 1.5, 4, "formula", "#e0201b", "#f4f4f4"),
  C("golden", "The Golden Vroomillion", "X", 5000000, 1.55, 5, "hyper", "#ffd23a", "#ff4fd8"),
  // can't be bought: reaching VROOMILLION CITY unlocks it
  { ...C("vroomillionaire", "THE VROOMILLIONAIRE", "X", 0, 1.62, 6, "hyper", "#ffcc33", "#fff6c2"), exclusive: true },
];

export const carById = (id) => CARS.find((c) => c.id === id) || CARS[0];

// Side-view body templates, nose pointing right.
// B body · D shadow · S accent · W glass · R tail light · L headlight
const BODIES = {
  micro: {
    wheels: [2, 14],
    rows: [
      "......BBBBBBBBB.......",
      ".....BWWWWBWWWWB......",
      "....BBWWWWBWWWWBB.....",
      ".RBBBBBBBBBBBBBBBBBB..",
      ".RBBSSSSSSSSSSSSBBBBL.",
      ".BBBBBBBBBBBBBBBBBBBB.",
      ".DDDDDDDDDDDDDDDDDDD..",
    ],
  },
  hatch: {
    wheels: [3, 20],
    rows: [
      "........BBBBBBBBBBBB........",
      ".......BWWWWWBWWWWWBB.......",
      "......BBWWWWWBWWWWWWBB......",
      ".RBBBBBBBBBBBBBBBBBBBBBBBB..",
      ".RBBBBBBBBBBBBBBBBBBBBBBBBL.",
      ".BBSSSSSSSSSSSSSSSSSSSBBBBL.",
      ".DDDDDDDDDDDDDDDDDDDDDDDDD..",
    ],
  },
  sedan: {
    wheels: [3, 21],
    rows: [
      "..........BBBBBBBBBB..........",
      ".........BWWWWBWWWWWB.........",
      "........BBWWWWBWWWWWBB........",
      ".RBBBBBBBBBBBBBBBBBBBBBBBBBB..",
      ".RBBBBBBBBBBBBBBBBBBBBBBBBBBL.",
      ".BBSSSSSSSSSSSSSSSSSSSSSSBBBB.",
      ".DDDDDDDDDDDDDDDDDDDDDDDDDDD..",
    ],
  },
  coupe: {
    wheels: [3, 21],
    rows: [
      "S...........BBBBBBB...........",
      "S.........BBWWWBWWBB..........",
      "SBB.....BBBWWWWBWWWWBB........",
      ".RBBBBBBBBBBBBBBBBBBBBBBBB....",
      ".RBBSSSSSSSSSSSSSSSSSSBBBBBL..",
      ".BBBBBBBBBBBBBBBBBBBBBBBBBBBB.",
      "..DDDDDDDDDDDDDDDDDDDDDDDDDD..",
    ],
  },
  muscle: {
    wheels: [3, 21],
    rows: [
      "........BBBBBBBBB.............",
      ".......BWWWWBWWWWB....SS......",
      ".RBBBBBBWWWWBWWWWBBBBBBBBBBB..",
      ".RBBBBBBBBBBBBBBBBBBBBBBBBBBL.",
      ".BBSSSSSSSSSSSSSSSSSSSSSSSBBL.",
      ".BBBBBBBBBBBBBBBBBBBBBBBBBBBB.",
      ".DDDDDDDDDDDDDDDDDDDDDDDDDDD..",
    ],
  },
  roadster: {
    wheels: [3, 20],
    rows: [
      "............................",
      "..............W.............",
      ".............WW.SS..........",
      ".RBBBBBBBBBBBBBBBBBBBBBBB...",
      ".RBBBBBBBBBBBBBBBBBBBBBBBBL.",
      ".BBSSSSSSSSSSSSSSSSSSSBBBB..",
      "..DDDDDDDDDDDDDDDDDDDDDDD...",
    ],
  },
  suv: {
    wheels: [3, 21],
    rows: [
      "......BBBBBBBBBBBBBBB.........",
      ".....BWWWWBWWWWBWWWWB.........",
      ".....BWWWWBWWWWBWWWWBB........",
      ".RBBBBBBBBBBBBBBBBBBBBBBBBBB..",
      ".RBBBBBBBBBBBBBBBBBBBBBBBBBBL.",
      ".BBSSSSSSSSSSSSSSSSSSSSSSBBBL.",
      ".BBBBBBBBBBBBBBBBBBBBBBBBBBBB.",
      ".DDDDDDDDDDDDDDDDDDDDDDDDDDD..",
    ],
  },
  super: {
    wheels: [3, 21],
    rows: [
      "...........BBBBBBB............",
      ".S.......BBWWWWBWWBB..........",
      ".SBBBBBBBBWWWWWBWWWWBBBB......",
      ".RBBBBBBBBBBBBBBBBBBBBBBBBBL..",
      ".BBBSSSSSSSSSSSSSSSSSSSBBBBBB.",
      "..DDDDDDDDDDDDDDDDDDDDDDDDDD..",
    ],
  },
  hyper: {
    wheels: [3, 21],
    rows: [
      "SSS...........BBBBBB..........",
      ".S.........BBBWWWWBWBB........",
      ".SBBBBBBBBBBBWWWWWBWWWBBBB....",
      ".RBBBBBBBBBBBBBBBBBBBBBBBBBBL.",
      ".BBSSSSBBBBBBBBBBBBBBBSSSSBBB.",
      "..DDDDDDDDDDDDDDDDDDDDDDDDDD..",
    ],
  },
  formula: {
    wheels: [3, 22],
    rows: [
      "SSS...........................",
      ".S............BB..............",
      ".S..........BBWWB.............",
      ".SBBBBBBBBBBBBBBBBBBBBB.......",
      "..BBSSSSSSSSSSSSBBBBBBBBBBBSS.",
      "..DDDDDDDDDDDDDD...........S..",
    ],
  },
};

const WHEELS = [
  [".KKK.", "KKHKK", "KHHHK", "KKHKK", ".KKK."],
  [".KKK.", "KHKHK", "KKHKK", "KHKHK", ".KKK."],
];

function lighten(hex, t) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.round(v + (255 - v) * t);
  return `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
}

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
}

const cache = new Map();

// Returns an offscreen canvas holding the car at 1 pixel per cell.
// frame 0/1 draws the wheel spokes in two positions so they can spin.
export function carSprite(car, frame = 0) {
  const ck = car.id + ":" + frame;
  if (cache.has(ck)) return cache.get(ck);
  const tpl = BODIES[car.body] || BODIES.sedan;
  const w = tpl.rows[0].length;
  const wheelTop = tpl.rows.length - 2;
  const h = wheelTop + 5;
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const g = cv.getContext("2d");
  const pal = {
    B: car.color,
    D: shade(car.color, 0.55),
    S: car.accent,
    W: "#9fe3ff",
    R: "#ff3b3b",
    L: "#fff6a0",
    K: "#15151c",
    H: "#c9ced6",
  };
  const put = (ch, x, y) => {
    if (!pal[ch]) return;
    g.fillStyle = pal[ch];
    g.fillRect(x, y, 1, 1);
  };
  tpl.rows.forEach((row, y) => [...row].forEach((ch, x) => put(ch, x, y)));
  // one highlight row on the roofline for a bit of shine
  g.fillStyle = "rgba(255,255,255,0.28)";
  tpl.rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === "B" && (y === 0 || tpl.rows[y - 1][x] === "." )) g.fillRect(x, y, 1, 1);
  }));
  for (const wx of tpl.wheels) WHEELS[frame].forEach((row, y) => [...row].forEach((ch, x) => put(ch, wx + x, wheelTop + y)));
  cache.set(ck, cv);
  return cv;
}

// ---- rear views, for the behind-the-car race camera ----
// Each body type is described by a few measurements and drawn as pixel rows.
// B body · L body highlight · D body shadow · E dark edge · S accent · W glass · w glass glint
// N plate lettering · R tail light · r tail light (lower, darker) · Y indicator · C chrome/badge · P number plate
// K tyre · T tread · G exhaust tip · X diffuser · H headrest/helmet · . empty
const REAR = {
  micro:    { w: 30, roof: 18, glass: 5, body: 7, tyre: 5, tyreH: 5 },
  hatch:    { w: 34, roof: 22, glass: 5, body: 7, tyre: 6, tyreH: 5, lip: true },
  sedan:    { w: 38, roof: 20, glass: 5, body: 8, tyre: 6, tyreH: 5, chrome: true },
  coupe:    { w: 38, roof: 18, glass: 4, body: 8, tyre: 6, tyreH: 5, wing: 1, pipes: "twin" },
  muscle:   { w: 40, roof: 20, glass: 4, body: 9, tyre: 7, tyreH: 6, lip: true, stripes: true, chrome: true, pipes: "quad" },
  roadster: { w: 34, open: true, body: 7, tyre: 6, tyreH: 5, pipes: "twin" },
  suv:      { w: 40, roof: 34, glass: 6, body: 10, tyre: 7, tyreH: 6, slope: 0, spare: true, tall: true },
  super:    { w: 42, roof: 16, glass: 3, body: 7, tyre: 8, tyreH: 6, wing: 2, lightbar: true, diffuser: true, pipes: "centre" },
  hyper:    { w: 44, roof: 14, glass: 3, body: 7, tyre: 9, tyreH: 6, wing: 3, lightbar: true, diffuser: true, pipes: "quad" },
};

function grid(w) {
  const rows = [];
  const row = () => { const r = Array(w).fill("."); rows.push(r); return r; };
  // fill `width` cells centred in the row with ch; returns the start x
  const span = (r, width, ch) => { const s = Math.floor((w - width) / 2); for (let i = 0; i < width; i++) if (s + i >= 0 && s + i < w) r[s + i] = ch; return s; };
  const put = (r, x, str) => { [...str].forEach((c, i) => { if (x + i >= 0 && x + i < w && c !== " ") r[x + i] = c; }); };
  return { rows, row, span, put };
}

function rearRows(type, frame) {
  if (type === "formula") return formulaRows(frame);
  const t = REAR[type] || REAR.sedan;
  const w = t.w;
  const { rows, row, span, put } = grid(w);
  const bw = w - 4; // body width; the outer 2 columns each side are for mirrors
  const mid = Math.floor(w / 2);

  if (t.wing) {
    let r = row(); span(r, w - 2, "S"); r[1] = r[w - 2] = "E";
    if (t.wing > 1) { r = row(); span(r, w - 2, "D"); r[1] = r[w - 2] = "E"; }
    const q = Math.floor(w / 4);
    for (let i = 0; i < 2; i++) { r = row(); r[q] = r[q + 1] = r[w - 1 - q] = r[w - 2 - q] = "G"; }
  }

  let glassBottom;
  if (t.open) {
    // roadster: windscreen frame, the backs of two seats and a roll hoop
    let r = row(); span(r, bw - 10, "E");
    r = row(); const g0 = span(r, bw - 10, "W"); put(r, g0 + 2, "ww");
    r = row(); span(r, bw - 8, "W"); put(r, mid - 9, "HHHH"); put(r, mid + 5, "HHHH"); put(r, g0 + 3, "w");
    r = row(); put(r, mid - 10, "EHHHHE"); put(r, mid + 4, "EHHHHE");
    glassBottom = rows.length;
  } else {
    let r = row(); span(r, t.roof, "B"); span(r, t.roof - 6, "L");
    r = row(); span(r, t.roof + 2, "B");
    for (let i = 0; i < t.glass; i++) {
      r = row();
      const width = Math.min(bw, t.roof + 2 + 2 * (i + 1) * (t.slope ?? 1));
      const s0 = span(r, width, "B");
      span(r, width - 2, "W");
      // a diagonal glint across the glass
      put(r, s0 + 3 + i, "ww");
      if (i > 0) put(r, s0 + 6 + i, "w");
      // headrests show through the rear window
      if (i >= t.glass - 2 && t.glass > 2) { put(r, mid - 7, "HHH"); put(r, mid + 4, "HHH"); }
    }
    glassBottom = rows.length;
  }
  if (t.lip) { const r = row(); span(r, bw - 6, "S"); }

  // shoulder line with mirrors poking out each side
  let r = row(); const s = span(r, bw, "B"); span(r, bw - 4, "L");
  put(r, 0, "DD"); put(r, w - 2, "DD");
  if (!t.lightbar) { put(r, s, "RR"); put(r, s + bw - 2, "RR"); }
  // tail lights
  r = row(); span(r, bw, "B");
  if (t.lightbar) {
    for (let x = s + 1; x < s + bw - 1; x++) r[x] = "R";
    put(r, mid - 2, "CCCC");
  } else {
    put(r, s, "RRRRY"); put(r, s + bw - 5, "YRRRR"); put(r, mid - 1, "CC");
  }
  r = row(); span(r, bw, "B");
  if (t.lightbar) { put(r, s, "rrr"); put(r, s + bw - 3, "rrr"); } else { put(r, s, "rrrr"); put(r, s + bw - 4, "rrrr"); }
  // number plate, with a few dark "letters"
  r = row(); span(r, bw, "B"); r[s] = r[s + bw - 1] = "D";
  if (t.spare) {
    // a spare wheel hung on the tailgate, over the plate area
    put(r, mid - 3, "KKKKKK");
  } else {
    const pw = t.lightbar ? 8 : 10;
    const p0 = span(r, pw, "P"); put(r, p0 + 1, t.lightbar ? "NNNNNN" : "NN NNN N");
  }
  if (t.spare) { r = row(); span(r, bw, "B"); r[s] = r[s + bw - 1] = "D"; put(r, mid - 4, "KKTCCTKK"); r = row(); span(r, bw, "B"); r[s] = r[s + bw - 1] = "D"; put(r, mid - 3, "KKKKKK"); }
  // the rest of the body, shaded at the edges
  const used = t.spare ? 6 : 4;
  for (let i = 0; i < t.body - used; i++) { r = row(); span(r, bw, "B"); r[s] = r[s + bw - 1] = "D"; }
  if (t.stripes) for (let y = glassBottom - 1; y < rows.length; y++) { if (rows[y][mid - 3] === "B" || rows[y][mid - 3] === "L") { rows[y][mid - 3] = rows[y][mid - 2] = rows[y][mid + 1] = rows[y][mid + 2] = "S"; } }
  if (t.chrome) { r = row(); span(r, bw, "D"); span(r, bw - 4, "C"); }
  if (t.tall) { r = row(); span(r, bw, "D"); }
  // bumper and exhausts
  r = row(); span(r, bw, "D"); r[s] = r[s + bw - 1] = "E";
  const pipes = t.pipes || "single";
  if (pipes === "centre") put(r, mid - 3, "GKKKKG");
  else if (pipes === "quad") { put(r, s + 3, "GKG GKG"); put(r, s + bw - 10, "GKG GKG"); }
  else if (pipes === "twin") { put(r, s + 3, "GKG"); put(r, s + bw - 6, "GKG"); }
  else put(r, s + 3, "GKG");
  if (t.diffuser) {
    r = row(); span(r, bw - 2, "X");
    for (let x = s + 3; x < s + bw - 3; x += 4) r[x] = "E";
    if (pipes === "centre") put(r, mid - 2, "GKKG");
  }
  // tyres below the bumper; tread alternates between frames so they look like they roll
  for (let i = 0; i < t.tyreH; i++) {
    r = row();
    const tread = (i + frame) % 2 ? "T" : "K";
    const tyre = "K" + tread.repeat(t.tyre - 2) + "K";
    put(r, s, tyre); put(r, s + bw - t.tyre, tyre);
    if (i === 0) for (let x = s + t.tyre; x < s + bw - t.tyre; x++) r[x] = "X";
    if (i === t.tyreH - 1) { put(r, s, "K".repeat(t.tyre)); put(r, s + bw - t.tyre, "K".repeat(t.tyre)); }
  }
  return rows.map((x) => x.join(""));
}

function formulaRows(frame) {
  const w = 42;
  const { rows, row, span, put } = grid(w);
  const mid = w / 2;
  // big rear wing on endplates
  let r = row(); span(r, 38, "S"); put(r, 2, "E"); put(r, w - 3, "E");
  r = row(); span(r, 38, "D"); put(r, 2, "E"); put(r, w - 3, "E");
  r = row(); span(r, 30, "S"); put(r, 2, "E"); put(r, w - 3, "E");
  r = row(); put(r, 2, "E"); put(r, w - 3, "E"); span(r, 2, "E");
  // driver's helmet over the engine cover
  r = row(); put(r, 2, "E"); put(r, w - 3, "E"); span(r, 6, "H");
  r = row(); span(r, 8, "H"); span(r, 4, "S");
  r = row(); span(r, 12, "B"); span(r, 6, "L");
  // wheels, suspension and the narrow tail
  for (let i = 0; i < 9; i++) {
    r = row();
    const tread = (i + frame) % 2 ? "T" : "K";
    const tyre = i === 8 ? "K".repeat(9) : "K" + tread.repeat(7) + "K";
    put(r, 1, tyre); put(r, w - 10, tyre);
    if (i === 1 || i === 4) { for (let x = 10; x < w - 10; x++) r[x] = "E"; }
    if (i < 2) span(r, 14, "B");
    else if (i === 2) { span(r, 16, "B"); span(r, 12, "L"); }
    else if (i === 3) { span(r, 16, "B"); span(r, 2, "R"); }
    else if (i === 4) { span(r, 14, "D"); span(r, 2, "R"); }
    else if (i === 5) { span(r, 12, "X"); for (let x = mid - 5; x < mid + 6; x += 3) r[x] = "E"; }
    else if (i === 6) put(r, mid - 2, "GKKG");
  }
  return rows.map((x) => x.join(""));
}

const rearCache = new Map();
export function rearSprite(car, frame = 0) {
  const key = car.id + ":" + frame;
  if (rearCache.has(key)) return rearCache.get(key);
  const rows = rearRows(car.body, frame);
  const cv = document.createElement("canvas");
  cv.width = rows[0].length;
  cv.height = rows.length;
  const g = cv.getContext("2d");
  const pal = {
    B: car.color, L: lighten(car.color, 0.3), D: shade(car.color, 0.55), E: shade(car.color, 0.3), S: car.accent,
    W: "#2b3a55", w: "#9fc2ea", N: "#7d8296", R: "#ff3b3b", r: "#b0202c", Y: "#ffb02e", C: "#d8dde6",
    K: "#15151c", T: "#2c2c38", P: "#e9e6d8", G: "#a7adb8", H: "#22222b", X: "#1c1c24",
  };
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (!pal[ch]) return;
    g.fillStyle = pal[ch];
    g.fillRect(x, y, 1, 1);
  }));
  // a little shine on the top edge of the body
  g.fillStyle = "rgba(255,255,255,0.25)";
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === "B" && (y === 0 || rows[y - 1][x] === "." || rows[y - 1][x] === "W")) g.fillRect(x, y, 1, 1);
  }));
  rearCache.set(key, cv);
  return cv;
}
