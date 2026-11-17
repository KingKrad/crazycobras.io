// The showroom, plus the pixel-art sprite generator.
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
  C("fiat500", "Fiat 500", "D", 800, 1.01, 0, "micro", "#e8e2c8", "#d14b4b"),
  C("mini", "Mini Cooper", "D", 1500, 1.02, 0, "micro", "#c8323c", "#ffffff"),
  C("beetle", "VW Beetle", "D", 2200, 1.03, 0, "micro", "#f2c230", "#ffffff"),
  C("civic", "Honda Civic", "D", 3200, 1.04, 0, "hatch", "#3f7fd6", "#1d4f99"),
  C("ae86", "Toyota AE86", "D", 4500, 1.05, 1, "coupe", "#f4f4f4", "#222222"),
  C("miata", "Mazda MX-5 Miata", "D", 6000, 1.06, 1, "roadster", "#d42d2d", "#111111"),
  C("gti", "VW Golf GTI", "D", 8000, 1.07, 1, "hatch", "#eeeeee", "#d42d2d"),

  C("wrangler", "Jeep Wrangler", "C", 11000, 1.08, 1, "suv", "#5d7a3a", "#2e3d1c"),
  C("wrx", "Subaru WRX STI", "C", 14000, 1.09, 1, "sedan", "#1f4fc4", "#e2b53a"),
  C("evo", "Mitsubishi Lancer Evo", "C", 16000, 1.1, 1, "sedan", "#d9d9d9", "#c8323c"),
  C("raptor", "Ford F-150 Raptor", "C", 19000, 1.1, 2, "suv", "#2f6fd0", "#111111"),
  C("mustang", "Ford Mustang GT", "C", 23000, 1.11, 1, "muscle", "#1c3faa", "#ffffff"),
  C("camaro", "Chevrolet Camaro SS", "C", 25000, 1.12, 1, "muscle", "#f0c419", "#111111"),
  C("hellcat", "Dodge Challenger Hellcat", "C", 30000, 1.13, 1, "muscle", "#7a2fb5", "#111111"),
  C("rx7", "Mazda RX-7", "C", 34000, 1.14, 1, "coupe", "#f2d21f", "#111111"),
  C("m3", "BMW M3", "C", 40000, 1.15, 1, "sedan", "#e9e9e9", "#3f7fd6"),
  C("r34", "Nissan Skyline GT-R R34", "C", 46000, 1.16, 2, "coupe", "#2a52be", "#bfc6d6"),
  C("supra", "Toyota Supra MK4", "C", 50000, 1.17, 2, "coupe", "#ee7a1c", "#111111"),
  C("nsx", "Honda NSX", "C", 58000, 1.18, 1, "super", "#d42d2d", "#111111"),

  C("exige", "Lotus Exige", "B", 70000, 1.19, 1, "super", "#1f8a4c", "#f2d21f"),
  C("corvette", "Chevrolet Corvette Z06", "B", 80000, 1.2, 1, "super", "#f04a2a", "#111111"),
  C("gwagon", "Mercedes G-Wagon", "B", 85000, 1.2, 2, "suv", "#1b1b1f", "#bfc6d6"),
  C("cobra", "Shelby Cobra 427", "B", 95000, 1.21, 1, "roadster", "#1c3faa", "#ffffff"),
  C("viper", "Dodge Viper ACR", "B", 105000, 1.22, 1, "muscle", "#c8323c", "#ffffff"),
  C("911", "Porsche 911 Turbo", "B", 115000, 1.23, 2, "coupe", "#e2e2e2", "#c8323c"),
  C("gtr", "Nissan GT-R Nismo", "B", 125000, 1.24, 2, "coupe", "#f4f4f4", "#d42d2d"),
  C("amggt", "Mercedes-AMG GT", "B", 135000, 1.25, 1, "coupe", "#9aa4ad", "#111111"),
  C("db11", "Aston Martin DB11", "B", 145000, 1.25, 2, "coupe", "#2f5d50", "#bfc6d6"),
  C("r8", "Audi R8", "B", 160000, 1.26, 2, "super", "#3a3f4a", "#d42d2d"),
  C("huracan", "Lamborghini Huracán", "B", 190000, 1.27, 2, "super", "#7ed321", "#111111"),
  C("488", "Ferrari 488", "B", 210000, 1.28, 2, "super", "#e0201b", "#f2d21f"),
  C("720s", "McLaren 720S", "B", 240000, 1.29, 2, "super", "#ff7a00", "#111111"),

  C("countach", "Lamborghini Countach", "A", 300000, 1.3, 2, "super", "#f4f4f4", "#c8323c"),
  C("aventador", "Lamborghini Aventador SVJ", "A", 340000, 1.31, 2, "super", "#f2d21f", "#111111"),
  C("gt40", "Ford GT40", "A", 380000, 1.32, 2, "super", "#6bb8e6", "#ff7a00"),
  C("f40", "Ferrari F40", "A", 420000, 1.33, 2, "hyper", "#e0201b", "#111111"),
  C("918", "Porsche 918 Spyder", "A", 470000, 1.34, 2, "hyper", "#c9ced6", "#b6e61a"),
  C("p1", "McLaren P1", "A", 520000, 1.35, 3, "hyper", "#f5b800", "#111111"),
  C("laferrari", "Ferrari LaFerrari", "A", 570000, 1.36, 3, "hyper", "#d8121a", "#111111"),
  C("mclarenf1", "McLaren F1", "A", 650000, 1.37, 2, "super", "#8b8f98", "#ff7a00"),
  C("huayra", "Pagani Huayra", "A", 720000, 1.38, 3, "hyper", "#5a6b8c", "#d9b25a"),
  C("valkyrie", "Aston Martin Valkyrie", "A", 800000, 1.39, 3, "hyper", "#0f5c4a", "#d6ff3a"),

  C("nevera", "Rimac Nevera", "S", 900000, 1.4, 3, "hyper", "#3b6cff", "#111111"),
  C("venom", "Hennessey Venom F5", "S", 1000000, 1.41, 3, "hyper", "#f2d21f", "#111111"),
  C("tuatara", "SSC Tuatara", "S", 1100000, 1.42, 3, "hyper", "#f4f4f4", "#3b6cff"),
  C("veyron", "Bugatti Veyron", "S", 1200000, 1.43, 3, "hyper", "#16224f", "#c8323c"),
  C("agera", "Koenigsegg Agera RS", "S", 1400000, 1.44, 3, "hyper", "#e9e9e9", "#f08a1c"),
  C("chiron", "Bugatti Chiron Super Sport", "S", 1600000, 1.45, 4, "hyper", "#1f6fe0", "#0c1a3a"),
  C("jesko", "Koenigsegg Jesko Absolut", "S", 1800000, 1.46, 4, "hyper", "#f4f4f4", "#e0201b"),
  C("one1", "Koenigsegg One:1", "S", 2000000, 1.47, 4, "hyper", "#2a2a30", "#3bd0ff"),
  C("bolide", "Bugatti Bolide", "S", 2300000, 1.48, 4, "hyper", "#0d3fb8", "#111111"),

  C("v10", "Screaming V10 Formula Car", "X", 3000000, 1.5, 4, "formula", "#e0201b", "#f4f4f4"),
  C("golden", "The Golden Vroomillion", "X", 5000000, 1.55, 5, "hyper", "#ffd23a", "#ff4fd8"),
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
