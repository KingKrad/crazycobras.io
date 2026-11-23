// The showroom, plus the pixel-art sprite generator.
// Car names are made up on purpose: real makes and models are trademarks that
// car makers license to games. Real brands only appear as trivia answers.
// power = distance multiplier (set by class below), nitro = boost charges per race.

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
  C("trike", "Three-Wheel Wonder", "D", 500, 1, 0, "micro", "#7fc4e8", "#ffffff"),
  C("woodie", "Grandpa's Wagon", "D", 1100, 1, 0, "wagon", "#7a5a3a", "#d9c08a"),
  C("mailvan", "Mail Van", "D", 1900, 1, 0, "van", "#f4f4f4", "#2a5bd6"),
  C("taxi", "Yellow Cab", "D", 2700, 1, 0, "sedan", "#f2c230", "#111111"),
  C("pizza", "Pizza Delivery Hatch", "D", 3800, 1, 0, "hatch", "#d42d2d", "#f2c230"),
  C("icecream", "Ice Cream Van", "D", 5200, 1, 1, "van", "#ffd6e8", "#6ad1e8"),
  C("hippie", "Peace & Love Bus", "D", 7000, 1, 1, "van", "#e8a33a", "#f4f4f4"),

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
  C("lowrider", "Lowrider Deluxe", "C", 12500, 1, 1, "muscle", "#2bb3a3", "#e8e2c8"),
  C("drift", "Drift Missile", "C", 15000, 1, 1, "coupe", "#e8e8e8", "#3bd0ff"),
  C("police", "Highway Interceptor", "C", 20000, 1, 1, "sedan", "#1b1b1f", "#f4f4f4"),
  C("rallywagon", "Rally Wagon", "C", 27000, 1, 2, "wagon", "#1f4fc4", "#f2d21f"),
  C("hotrod", "Hot Rod '32", "C", 32000, 1, 1, "roadster", "#c8323c", "#f2a33a"),
  C("monster", "Monster Pickup", "C", 38000, 1, 2, "pickup", "#7ed321", "#111111"),
  C("caferacer", "Café Racer Coupe", "C", 43000, 1, 1, "coupe", "#3a3f4a", "#d9b25a"),
  C("ecohatch", "Electric Hatch", "C", 53000, 1, 1, "hatch", "#9ad7ff", "#1b1d22"),

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
  C("safari", "Safari Rally 4x4", "B", 75000, 1, 2, "suv", "#e8d6a8", "#2f5d50"),
  C("brake", "Shooting Brake", "B", 100000, 1, 2, "wagon", "#2f5d50", "#d9b25a"),
  C("limo", "Stretch Limo", "B", 120000, 1, 2, "sedan", "#111114", "#d8dde6"),
  C("gullwing", "Gullwing Classic '55", "B", 175000, 1, 1, "coupe", "#c9ced6", "#c8323c"),
  C("trackday", "Track Day Special", "B", 225000, 1, 2, "super", "#f2d21f", "#1b1b1f"),

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
  C("barchetta", "V12 Barchetta", "A", 330000, 1, 2, "roadster", "#c8121a", "#f4f4f4"),
  C("lemans", "Le Mans Prototype", "A", 450000, 1, 3, "super", "#1f8a4c", "#f4f4f4"),
  C("speedster", "Carbon Speedster", "A", 600000, 1, 2, "roadster", "#22232a", "#ff7a00"),
  C("stealth", "Stealth Fighter", "A", 760000, 1, 3, "hyper", "#2a2d33", "#3bd0ff"),

  C("nevera", "Electric Megawatt", "S", 900000, 1.4, 3, "hyper", "#3b6cff", "#111111"),
  C("venom", "Texas Twister", "S", 1000000, 1.41, 3, "hyper", "#f2d21f", "#111111"),
  C("tuatara", "Top-Speed Record Car", "S", 1100000, 1.42, 3, "hyper", "#f4f4f4", "#3b6cff"),
  C("veyron", "Sixteen-Cylinder Original", "S", 1200000, 1.43, 3, "hyper", "#16224f", "#c8323c"),
  C("agera", "Nordic Hypercar RS", "S", 1400000, 1.44, 3, "hyper", "#e9e9e9", "#f08a1c"),
  C("chiron", "W16 Super Sport", "S", 1600000, 1.45, 4, "hyper", "#1f6fe0", "#0c1a3a"),
  C("jesko", "Nordic Hypercar Absolute", "S", 1800000, 1.46, 4, "hyper", "#f4f4f4", "#e0201b"),
  C("one1", "Megawatt One", "S", 2000000, 1.47, 4, "hyper", "#2a2a30", "#3bd0ff"),
  C("bolide", "W16 Track Weapon", "S", 2300000, 1.48, 4, "hyper", "#0d3fb8", "#111111"),
  C("hydrogen", "Hydrogen Hyper", "S", 950000, 1, 3, "hyper", "#e9f4ff", "#3b6cff"),
  C("streamliner", "Land Speed Streamliner", "S", 1500000, 1, 4, "hyper", "#c8323c", "#f4f4f4"),
  C("ion", "Ion Thruster GT", "S", 2100000, 1, 4, "hyper", "#5a2fb5", "#3bd0ff"),

  C("v10", "Screaming V10 Formula Car", "X", 3000000, 1.5, 4, "formula", "#e0201b", "#f4f4f4"),
  C("rocketsled", "Rocket Sled", "X", 4000000, 1, 5, "formula", "#f2f2f2", "#ff7a00"),
  C("golden", "The Golden Vroomillion", "X", 5000000, 1.55, 5, "hyper", "#ffd23a", "#ff4fd8"),
  // can't be bought: reaching VROOMILLION CITY unlocks it
  { ...C("vroomillionaire", "THE VROOMILLIONAIRE", "X", 0, 1.62, 6, "hyper", "#ffcc33", "#fff6c2"), exclusive: true },
  // can't be bought or won: only an admin can gift it (ADMIN → PLAYERS). The best car in the game by a mile.
  { ...C("mazzy", "DEAN'S MAZZY", "X", 0, 9.0, 8, "pickup", "#b9a98a", "#26262b"), giftOnly: true, rim: "#f4f4f0" },
  // a 2026 electric fastback in dark stealth grey: no grille, all-glass roof, white seats showing through,
  // black window trim, dark aero wheels.
  // Ties the Mazzy for the best in the game.
  { ...C("tessy", "AMELIA'S TESSY", "X", 0, 9.0, 8, "ev", "#3e4047", "#111215"), giftOnly: true, rim: "#2b2d33", glass: "#232a36", seats: "#d8d6d0", aero: true, electric: true, hiRes: true },
  // a 2006 sedan in silver with a huge rocket booster strapped to its back. Ties for the best in the game.
  { ...C("hondeezy", "A-DOG'S HONDEEZY", "X", 0, 9.0, 8, "civic", "#b9bec6", "#2a2c31"), giftOnly: true, rim: "#c9ced6", glass: "#1e2836", seats: "#3a3c42", hiRes: true, rocket: true },
  // a black hot sedan (wide arches, big black grille, red brake callipers) with an outrageous exhaust:
  // huge oval tips, giant flames, crackle on every shift, and a screaming V12 sound. Ties for the best.
  { ...C("nico", "NICO'S CRAZY CAR", "X", 0, 9.0, 8, "rs3", "#17181c", "#0a0a0c"), giftOnly: true, rim: "#2f3138", glass: "#10151e", seats: "#1e1f24", hiRes: true, v12: true },
];
export const GIFT_CARS = CARS.filter((c) => c.giftOnly).map((c) => c.id);

// PREMIUM cars: one is in the dealership each day for real money (src/premium.js has the same list and
// prices; a test keeps them in step). They have unique looks and effects but only the power of a middle
// car of their class, so nobody can buy a win. fx: rainbow (trail), neon (underglow), sparkle, electric.
export const PREMIUM = [
  { ...C("disco", "DISCO DEVILLE", "C", 0, 1, 2, "sedan", "#ff4fd8", "#ffd23a"), premium: 199, rarity: "EPIC", fx: "rainbow" },
  { ...C("neon", "NEON NIGHTRIDER", "C", 0, 1, 2, "coupe", "#141418", "#ff2fd0"), premium: 299, rarity: "EPIC", fx: "neon" },
  { ...C("ghost", "PHANTOM GHOST", "B", 0, 1, 2, "sedan", "#e8f0ff", "#9fd8ff"), premium: 299, rarity: "EPIC", fx: "sparkle" },
  { ...C("goldgoose", "GOLDEN GOOSE", "B", 0, 1, 2, "muscle", "#ffcc33", "#fff6c2"), premium: 399, rarity: "LEGENDARY", fx: "sparkle" },
  { ...C("lava", "LAVA RUNNER", "A", 0, 1, 3, "super", "#2b1a18", "#ff5a1f"), premium: 399, rarity: "EPIC", fx: "neon" },
  { ...C("laser", "LASER LIGHTNING", "A", 0, 1, 3, "super", "#1b1d22", "#3bd0ff"), premium: 399, rarity: "LEGENDARY", fx: "electric", electric: true },
  { ...C("comet", "THE COMET", "S", 0, 1, 4, "hyper", "#22226a", "#ffffff"), premium: 499, rarity: "LEGENDARY", fx: "rainbow" },
];
CARS.push(...PREMIUM);
// today's premium car (UTC day), the same on every device and on the server
export const premiumFor = (day) => PREMIUM[((Math.round((Date.parse(day + "T00:00:00Z") - Date.parse("2026-01-01T00:00:00Z")) / 86400000) % PREMIUM.length) + PREMIUM.length) % PREMIUM.length];

// Rarity, apart from the speed class: COMMON, RARE, EPIC, LEGENDARY (the answer-tier colours)
export const RARITIES = { COMMON: 1, RARE: 3, EPIC: 4, LEGENDARY: 5, "ONE OF A KIND": 5 };
export function rarityOf(car) {
  if (car.giftOnly) return "ONE OF A KIND";
  if (car.rarity) return car.rarity;
  if (car.exclusive) return "LEGENDARY";
  return { D: "COMMON", C: car.price < 30000 ? "COMMON" : "RARE", B: "RARE", A: "EPIC", S: car.price < 2500000 ? "EPIC" : "LEGENDARY", X: "LEGENDARY" }[car.cls];
}
// the cars that count towards the garage collection: everything you can earn by playing
export const COLLECTION = CARS.filter((c) => !c.giftOnly && !c.premium);

// PAINT: each car has its factory colour plus three more, unlocked by levelling it up
const PAINTS = ["#d42d2d", "#1f4fc4", "#f2c230", "#1f8a4c", "#f4f4f4", "#1b1b1f", "#ff7a00", "#7a2fb5", "#3bd0ff", "#ff4fd8", "#c9ced6", "#2f5d50", "#8a5a2b", "#b6e61a"];
export function paintsFor(car) {
  let h = 7;
  for (const ch of car.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const out = [car.color];
  for (let k = 0; out.length < 4 && k < 40; k++) {
    const c = PAINTS[(h + k * 5) % PAINTS.length];
    if (!out.includes(c) && c.toLowerCase() !== car.color.toLowerCase()) out.push(c);
  }
  return out;
}
export const painted = (car, idx) => (idx > 0 && paintsFor(car)[idx] ? { ...car, color: paintsFor(car)[idx] } : car);

// Power by class: the car really decides how far you get. Within a class, pricier cars sit higher.
export const POWER_RANGE = { D: [1.0, 1.3], C: [1.45, 1.95], B: [2.1, 2.7], A: [2.9, 3.5], S: [3.7, 4.4], X: [4.7, 5.4] };
for (const cls of Object.keys(POWER_RANGE)) {
  const list = CARS.filter((c) => c.cls === cls && !c.exclusive && !c.giftOnly && !c.premium).sort((a, b) => a.price - b.price);
  const [lo, hi] = POWER_RANGE[cls];
  list.forEach((c, i) => { c.power = Math.round((lo + (list.length > 1 ? (hi - lo) * i / (list.length - 1) : 0)) * 100) / 100; });
}
CARS.find((c) => c.exclusive).power = 6.0;
for (const p of PREMIUM) {
  const list = CARS.filter((c) => c.cls === p.cls && !c.exclusive && !c.giftOnly && !c.premium).sort((a, b) => a.power - b.power);
  p.power = list[Math.floor(list.length / 2)].power;
}
// Prices tuned so an average player buys a class S car (the Moon) after about 40 races.
const PRICE_SCALE = { A: 1.2, S: 1.45, X: 1.3 };
for (const c of CARS) if (PRICE_SCALE[c.cls] && c.price) c.price = Math.round(c.price * PRICE_SCALE[c.cls] / 10000) * 10000;

export const carById = (id) => CARS.find((c) => c.id === id) || CARS[0];

// Side-view body templates, nose pointing right.
// (pickup: a '97 extended-cab truck: little rear jump-seat window, long bed under a black cover)
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
  van: {
    wheels: [3, 19],
    rows: [
      ".BBBBBBBBBBBBBBBBBBBB.....",
      ".BWWWWBWWWWBWWWWBWWWWB....",
      ".BWWWWBWWWWBWWWWBWWWWBB...",
      "RBBBBBBBBBBBBBBBBBBBBBBB..",
      "RBSSSSSSSSSSSSSSSSSSSBBBBL",
      ".BBBBBBBBBBBBBBBBBBBBBBBBL",
      ".BBBBBBBBBBBBBBBBBBBBBBBB.",
      ".DDDDDDDDDDDDDDDDDDDDDDDD.",
    ],
  },
  wagon: {
    wheels: [3, 21],
    rows: [
      "....BBBBBBBBBBBBBBBBB.........",
      "...BWWWWWBWWWWBWWWWWBB........",
      "..BBWWWWWBWWWWBWWWWWWBB.......",
      ".RBBBBBBBBBBBBBBBBBBBBBBBBBB..",
      ".RBBBBBBBBBBBBBBBBBBBBBBBBBBL.",
      ".BBSSSSSSSSSSSSSSSSSSSSSSBBBL.",
      ".DDDDDDDDDDDDDDDDDDDDDDDDDDD..",
    ],
  },
  pickup: {
    wheels: [4, 25],
    rows: [
      "...................BBBBBBBB.......",
      "..................BWWWBWWWWWB.....",
      "..................BWWWBWWWWWWB....",
      ".SSSSSSSSSSSSSSSS.BBBBBBBBBBBBBBB.",
      "RBBBBBBBBBBBBBBBBDBBBBBBBBBBBBBBBL",
      "RBBBBBBBBBBBBBBBBDBBBBBBBBBBBBBBBL",
      ".BBBBBBBBBBBBBBBBDBBBBBBBBBBBBBBB.",
      "HDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDH",
    ],
  },
  // the electric fastback: a smooth arch from the short nose over the glass roof down to the trunk lip
  ev: {
    wheels: [5, 25],
    rows: [
      "............WWWWWWWWWW............",
      "..........WWWWWWWWWWWWWW..........",
      "........SWWWIIWWSWWWIIWWWS........",
      "......SSBBBBBBBBBBBBBBBBBBBBB.....",
      "...RBBBBBBBBDBBBBBBBDBBBBBBBBBBB..",
      "..RBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBL",
      "..BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB.",
      "...SSSSSSSSSSSSSSSSSSSSSSSSSSSSS..",
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

// aero wheel covers: a flat disc with a few spokes, for the electric car
const AERO = [
  [".KKK.", "KHHHK", "KHKHK", "KHHHK", ".KKK."],
  [".KKK.", "KHKHK", "KHHHK", "KHKHK", ".KKK."],
];
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
  const ck = car.id + ":" + car.color + ":" + frame;
  if (cache.has(ck)) return cache.get(ck);
  if (car.hiRes) { const cv = car.rocket ? civicSide(car, frame) : car.v12 ? rs3Side(car, frame) : evSide(car, frame); cache.set(ck, cv); return cv; }
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
    W: car.glass || "#9fe3ff",
    I: car.seats || car.glass || "#9fe3ff",
    R: "#ff3b3b",
    L: "#fff6a0",
    K: "#15151c",
    H: car.rim || "#c9ced6",
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
  for (const wx of tpl.wheels) (car.aero ? AERO : WHEELS)[frame].forEach((row, y) => [...row].forEach((ch, x) => put(ch, wx + x, wheelTop + y)));
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
  pickup:   { w: 40, roof: 22, glass: 4, body: 10, tyre: 7, tyreH: 6, slope: 0, chrome: true, tall: true },
  van:      { w: 38, roof: 34, glass: 7, body: 11, tyre: 6, tyreH: 5, slope: 0, tall: true },
  wagon:    { w: 38, roof: 26, glass: 5, body: 8, tyre: 6, tyreH: 5, slope: 0, chrome: true },
  ev:       { w: 40, roof: 16, glass: 7, body: 8, tyre: 7, tyreH: 5, lip: true, pipes: "none", slimLights: true },
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
  } else if (t.slimLights) {
    put(r, s, "RRRRRR"); put(r, s + bw - 6, "RRRRRR");
  } else {
    put(r, s, "RRRRY"); put(r, s + bw - 5, "YRRRR"); put(r, mid - 1, "CC");
  }
  r = row(); span(r, bw, "B");
  if (t.lightbar) { put(r, s, "rrr"); put(r, s + bw - 3, "rrr"); } else if (t.slimLights) { put(r, s, "rr"); put(r, s + bw - 2, "rr"); } else { put(r, s, "rrrr"); put(r, s + bw - 4, "rrrr"); }
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
  else if (pipes !== "none") put(r, s + 3, "GKG");
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
  const key = car.id + ":" + car.color + ":" + frame;
  if (rearCache.has(key)) return rearCache.get(key);
  if (car.hiRes) { const cv = car.rocket ? civicRear(car, frame) : car.v12 ? rs3Rear(car, frame) : evRear(car, frame); rearCache.set(key, cv); return cv; }
  const rows = rearRows(car.body, frame);
  const cv = document.createElement("canvas");
  cv.width = rows[0].length;
  cv.height = rows.length;
  const g = cv.getContext("2d");
  const pal = {
    B: car.color, L: lighten(car.color, 0.3), D: shade(car.color, 0.55), E: shade(car.color, 0.3), S: car.accent,
    W: "#2b3a55", w: "#9fc2ea", N: "#7d8296", R: "#ff3b3b", r: "#b0202c", Y: "#ffb02e", C: "#d8dde6",
    K: "#15151c", T: "#2c2c38", P: "#e9e6d8", G: "#a7adb8", H: car.seats || "#22222b", X: "#1c1c24",
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


// ---- a detailed car (twice the pixels; canvas.res = 2 tells the game to draw it at half size) ----
// AMELIA'S TESSY: a dark grey electric fastback, drawn with shapes and then snapped to hard pixel edges.
function crisp(cv) {
  const g = cv.getContext("2d");
  const im = g.getImageData(0, 0, cv.width, cv.height);
  for (let i = 3; i < im.data.length; i += 4) im.data[i] = im.data[i] > 110 ? 255 : 0;
  g.putImageData(im, 0, 0);
  cv.res = 2;
  return cv;
}
const poly = (g, pts, fill) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fillStyle = fill; g.fill(); };

function evSide(car, frame) {
  const cv = document.createElement("canvas");
  cv.width = 72; cv.height = 25;
  const g = cv.getContext("2d");
  const dark = shade(car.color, 0.7), deep = shade(car.color, 0.45), light = lighten(car.color, 0.28);
  // the body: trunk lip, a long glass arch, short sloping hood, rounded nose
  const body = [[3, 11], [7, 9], [12, 8.2], [22, 2.4], [30, 0.8], [38, 0.8], [46, 4.5], [51, 8.2], [60, 9.8], [67, 11.2], [70.5, 13], [70.5, 16], [69, 18.5], [3, 18.5], [2, 15]];
  const grad = g.createLinearGradient(0, 0, 0, 19);
  grad.addColorStop(0, light); grad.addColorStop(0.45, car.color); grad.addColorStop(1, dark);
  poly(g, body, grad);
  // the glasshouse with black trim, and the light seats showing through
  poly(g, [[11, 8.6], [22.5, 3.2], [30, 1.8], [38, 1.8], [45, 5], [49.5, 8.6]], car.accent);
  poly(g, [[13, 8.2], [23, 3.8], [30, 2.6], [37.5, 2.6], [44, 5.4], [47.5, 8.2]], car.glass);
  g.fillStyle = car.seats;
  for (const hx of [25.5, 37.5]) { g.beginPath(); g.ellipse(hx, 5.6, 1.5, 1.4, 0, 0, Math.PI * 2); g.fill(); g.fillRect(hx - 2.5, 7.1, 4, 1); }
  g.fillStyle = car.accent; g.fillRect(31.5, 2, 1.6, 7); // B-pillar
  g.fillStyle = "rgba(255,255,255,0.22)"; poly(g, [[25, 3.4], [33, 2.6], [30, 5]], "rgba(255,255,255,0.18)"); // a sky reflection on the roof glass
  // shoulder highlight, door lines, flush handles, mirror
  g.fillStyle = light; g.fillRect(8, 10.2, 58, 0.9);
  g.fillStyle = deep; g.fillRect(31.8, 9.2, 0.7, 8); g.fillRect(46, 9.2, 0.7, 7.5);
  g.fillStyle = lighten(car.color, 0.45); g.fillRect(26, 11.6, 3, 0.8); g.fillRect(40, 11.6, 3, 0.8);
  poly(g, [[47, 8], [50.5, 7.6], [50.5, 9.4], [47.5, 9.4]], car.accent);
  // slim headlight, a sliver of tail light, black rocker and lower bumper
  poly(g, [[63, 11.4], [69.5, 12.4], [69.5, 13.1], [63.5, 12.3]], "#f4f6ff");
  poly(g, [[2.2, 11.5], [7, 10], [7, 11], [2.4, 12.4]], "#ff3b3b");
  g.fillStyle = car.accent; g.fillRect(6, 17, 60, 1.6); g.fillRect(66, 16.6, 4, 1.2);
  // wheel arches and the dark aero wheels; the spokes move between the two frames
  for (const wx of [15.5, 57]) {
    g.fillStyle = "#08080a"; g.beginPath(); g.arc(wx, 18.3, 6.4, Math.PI, 0); g.fill();
    g.fillStyle = "#15151c"; g.beginPath(); g.arc(wx, 18.5, 5.6, 0, Math.PI * 2); g.fill();
    g.fillStyle = car.rim; g.beginPath(); g.arc(wx, 18.5, 3.9, 0, Math.PI * 2); g.fill();
    g.strokeStyle = lighten(car.rim, 0.25); g.lineWidth = 0.9;
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + frame * 0.6;
      g.beginPath(); g.moveTo(wx + Math.cos(a) * 0.8, 18.5 + Math.sin(a) * 0.8); g.lineTo(wx + Math.cos(a + 0.5) * 3.6, 18.5 + Math.sin(a + 0.5) * 3.6); g.stroke();
    }
    g.fillStyle = "#0d0d10"; g.beginPath(); g.arc(wx, 18.5, 1, 0, Math.PI * 2); g.fill();
  }
  return crisp(cv);
}

function evRear(car, frame) {
  const cv = document.createElement("canvas");
  cv.width = 80; cv.height = 52;
  const g = cv.getContext("2d");
  const dark = shade(car.color, 0.7), light = lighten(car.color, 0.25);
  // tyres first, under the body; the tread alternates so they look like they roll
  for (const tx of [7, 59]) {
    g.fillStyle = "#15151c"; g.fillRect(tx, 40, 14, 12);
    g.fillStyle = "#2c2c38"; for (let y = 41 + frame; y < 52; y += 2) g.fillRect(tx + 1, y, 12, 1);
  }
  // the body: wide hips, rounded shoulders
  const grad = g.createLinearGradient(0, 18, 0, 46);
  grad.addColorStop(0, light); grad.addColorStop(0.4, car.color); grad.addColorStop(1, dark);
  poly(g, [[6, 25], [12, 21], [68, 21], [74, 25], [76, 30], [76, 43], [72, 46], [8, 46], [4, 43], [4, 30]], grad);
  // the sloping rear glass, the thin roof line, mirrors, and the white headrests
  poly(g, [[23, 3], [57, 3], [66, 21], [14, 21]], car.color);
  poly(g, [[25, 5], [55, 5], [63, 21], [17, 21]], car.glass);
  // headrests: small and rounded
  g.fillStyle = car.seats;
  for (const hx of [29, 51]) { g.beginPath(); g.ellipse(hx, 15.5, 3, 2.4, 0, 0, Math.PI * 2); g.fill(); g.fillRect(hx - 0.6, 17.5, 1.2, 2); }
  poly(g, [[28, 6], [36, 6], [26, 17], [21, 17]], "rgba(255,255,255,0.16)");
  // mirrors on stalks at the bottom corners of the glass
  poly(g, [[7, 17], [13, 17.5], [15, 20], [7, 20]], car.accent); poly(g, [[73, 17], [67, 17.5], [65, 20], [73, 20]], car.accent);
  // black lip spoiler, slim wrap-around tail lights
  g.fillStyle = car.accent; g.fillRect(14, 21, 52, 1.6);
  g.fillStyle = "#ff3b3b"; poly(g, [[5, 26], [22, 25], [22, 27.2], [5, 28.6]], "#ff3b3b"); poly(g, [[75, 26], [58, 25], [58, 27.2], [75, 28.6]], "#ff3b3b");
  g.fillStyle = "#b0202c"; g.fillRect(5, 28.6, 3, 3); g.fillRect(72, 28.6, 3, 3);
  // trunk line, number plate, black diffuser
  g.fillStyle = dark; g.fillRect(14, 30, 52, 0.8);
  g.fillStyle = "#e9e6d8"; g.fillRect(31, 33, 18, 6);
  g.fillStyle = "#7d8296"; for (const x of [33, 36, 40, 43, 46]) g.fillRect(x, 35, 2, 2);
  g.fillStyle = car.accent; g.fillRect(6, 42, 68, 4);
  g.fillStyle = shade(car.accent, 1.6); for (let x = 12; x < 70; x += 7) g.fillRect(x, 42, 1, 4);
  return crisp(cv);
}


// A-DOG'S HONDEEZY: a silver 2006 sedan (wedge nose, steep windscreen, high short trunk) with a big
// white rocket booster on struts over the roof, engine bell out the back. Twice the pixels, like the Tessy.
function civicSide(car, frame) {
  const cv = document.createElement("canvas");
  cv.width = 76; cv.height = 36;
  const g = cv.getContext("2d");
  const Y = 11; // the car sits under the rocket
  const dark = shade(car.color, 0.62), deep = shade(car.color, 0.42), light = lighten(car.color, 0.35);
  // the rocket: engine bell at the back, black band, white body, grid fins, pointed nose
  poly(g, [[2, 1.5], [9, 3], [9, 8], [2, 9.5]], "#4a4d55");
  poly(g, [[3, 3], [8, 3.8], [8, 7.2], [3, 8]], "#2a2c31");
  g.fillStyle = "#f4f6f8"; g.fillRect(9, 2, 50, 7);
  g.fillStyle = "#dfe3ea"; g.fillRect(9, 6.6, 50, 2.4);
  g.fillStyle = "#16171b"; g.fillRect(40, 2, 5, 7); // interstage
  g.fillStyle = "#c9ced6"; g.fillRect(12, 2, 1, 7); g.fillRect(26, 2, 1, 7);
  poly(g, [[59, 2], [66, 3.4], [71, 5.5], [66, 7.6], [59, 9]], "#f4f6f8");
  poly(g, [[59, 6.6], [66, 7.6], [59, 9]], "#dfe3ea");
  g.fillStyle = "#3a3c42"; g.fillRect(46, 0.4, 3, 1.6); g.fillRect(46, 9, 3, 1.6); // grid fins
  g.fillStyle = "#2a5bd6"; g.fillRect(30, 3.4, 8, 1.4); // a stripe of livery
  // struts down to the roof
  g.fillStyle = "#5a5d66"; g.fillRect(20, 9, 1.4, Y - 7); g.fillRect(38, 9, 1.4, Y - 7); g.fillRect(52, 9, 1.4, Y - 5);
  // the car body
  const body = [[3, Y + 11], [5, Y + 8.6], [14, Y + 8], [22, Y + 2.4], [32, Y + 1.2], [42, Y + 1.4], [50, Y + 6.5], [56, Y + 8.6], [66, Y + 10.2], [72, Y + 11.8], [73, Y + 15], [71.5, Y + 18.5], [3, Y + 18.5], [2, Y + 14]];
  const grad = g.createLinearGradient(0, Y, 0, Y + 19);
  grad.addColorStop(0, light); grad.addColorStop(0.45, car.color); grad.addColorStop(1, dark);
  poly(g, body, grad);
  // windows with black trim and a B-pillar
  poly(g, [[15, Y + 8.4], [22.6, Y + 3.1], [32, Y + 2], [41.5, Y + 2.2], [49.4, Y + 8.4]], car.accent);
  poly(g, [[17, Y + 8], [23.2, Y + 3.7], [31.4, Y + 2.8], [40.8, Y + 3], [47.4, Y + 8]], car.glass);
  g.fillStyle = car.accent; g.fillRect(32.2, Y + 2.2, 1.6, 6.2);
  poly(g, [[24, Y + 4.2], [30, Y + 3.3], [26.5, Y + 6]], "rgba(255,255,255,0.22)");
  // shoulder crease, door seams, handles, mirror
  g.fillStyle = light; g.fillRect(8, Y + 10.4, 60, 0.8);
  g.fillStyle = deep; g.fillRect(32.6, Y + 9, 0.7, 8); g.fillRect(48, Y + 9, 0.7, 7.5);
  g.fillStyle = shade(car.color, 0.55); g.fillRect(26, Y + 11.8, 3, 0.9); g.fillRect(42, Y + 11.8, 3, 0.9);
  poly(g, [[49.6, Y + 7.8], [53, Y + 7.4], [53, Y + 9.2], [50, Y + 9.2]], car.accent);
  // sharp headlight, big tail light, a dark lower bumper and side skirt
  poly(g, [[64, Y + 11], [71.6, Y + 12.4], [71.4, Y + 13.4], [64.4, Y + 12.4]], "#f4f6ff");
  poly(g, [[2.4, Y + 11.4], [8, Y + 9.2], [8.4, Y + 11.4], [2.6, Y + 13]], "#e0201b");
  g.fillStyle = "#3a3c42"; g.fillRect(6, Y + 17, 61, 1.5); g.fillRect(67, Y + 16.6, 5, 1.4);
  // wheels: silver five-spoke alloys under dark arches
  for (const wx of [15.5, 59]) {
    g.fillStyle = "#08080a"; g.beginPath(); g.arc(wx, Y + 18.3, 6.4, Math.PI, 0); g.fill();
    g.fillStyle = "#15151c"; g.beginPath(); g.arc(wx, Y + 18.5, 5.6, 0, Math.PI * 2); g.fill();
    g.fillStyle = car.rim; g.beginPath(); g.arc(wx, Y + 18.5, 3.9, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#5a5d66"; g.lineWidth = 0.9;
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + frame * 0.6;
      g.beginPath(); g.moveTo(wx + Math.cos(a) * 1.2, Y + 18.5 + Math.sin(a) * 1.2); g.lineTo(wx + Math.cos(a) * 3.4, Y + 18.5 + Math.sin(a) * 3.4); g.stroke();
    }
    g.fillStyle = "#2a2c31"; g.beginPath(); g.arc(wx, Y + 18.5, 1, 0, Math.PI * 2); g.fill();
  }
  return crisp(cv);
}

function civicRear(car, frame) {
  const cv = document.createElement("canvas");
  cv.width = 80; cv.height = 70;
  const g = cv.getContext("2d");
  const Y = 18; // the car sits under the rocket's engines
  const dark = shade(car.color, 0.66), light = lighten(car.color, 0.3);
  for (const tx of [7, 59]) {
    g.fillStyle = "#15151c"; g.fillRect(tx, Y + 40, 14, 12);
    g.fillStyle = "#2c2c38"; for (let y = Y + 41 + frame; y < Y + 52; y += 2) g.fillRect(tx + 1, y, 12, 1);
  }
  // body: a tall, upright trunk
  const grad = g.createLinearGradient(0, Y + 16, 0, Y + 46);
  grad.addColorStop(0, light); grad.addColorStop(0.4, car.color); grad.addColorStop(1, dark);
  poly(g, [[6, Y + 24], [12, Y + 19], [68, Y + 19], [74, Y + 24], [76, Y + 30], [76, Y + 44], [72, Y + 46], [8, Y + 46], [4, Y + 44], [4, Y + 30]], grad);
  // the rear window and roof
  poly(g, [[22, Y + 4], [58, Y + 4], [65, Y + 19], [15, Y + 19]], car.color);
  poly(g, [[24, Y + 6], [56, Y + 6], [62, Y + 19], [18, Y + 19]], car.glass);
  g.fillStyle = car.seats;
  for (const hx of [30, 50]) { g.beginPath(); g.ellipse(hx, Y + 14, 3, 2.4, 0, 0, Math.PI * 2); g.fill(); }
  poly(g, [[7, Y + 16], [13, Y + 16.5], [15, Y + 19], [7, Y + 19]], car.accent); poly(g, [[73, Y + 16], [67, Y + 16.5], [65, Y + 19], [73, Y + 19]], car.accent);
  // big wraparound tail lights with a chrome bar between
  poly(g, [[5, Y + 24], [24, Y + 23], [24, Y + 29], [5, Y + 30]], "#e0201b");
  poly(g, [[75, Y + 24], [56, Y + 23], [56, Y + 29], [75, Y + 30]], "#e0201b");
  g.fillStyle = "#ff8a8a"; g.fillRect(8, Y + 24.6, 12, 1.2); g.fillRect(60, Y + 24.6, 12, 1.2);
  g.fillStyle = "#d8dde6"; g.fillRect(24, Y + 25, 32, 2.2);
  g.fillStyle = "#e9e6d8"; g.fillRect(31, Y + 33, 18, 6);
  g.fillStyle = "#7d8296"; for (const x of [33, 36, 40, 43, 46]) g.fillRect(x, Y + 35, 2, 2);
  g.fillStyle = "#3a3c42"; g.fillRect(6, Y + 42, 68, 4);
  g.fillStyle = "#a7adb8"; g.fillRect(12, Y + 43, 4, 2); // the one exhaust tip
  // the rocket booster seen from behind: a big round base with nine engines, on struts over the roof
  g.fillStyle = "#5a5d66"; g.fillRect(24, Y + 1, 2, 5); g.fillRect(54, Y + 1, 2, 5);
  g.fillStyle = "#f4f6f8"; g.beginPath(); g.arc(40, 14, 14, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#16171b"; g.beginPath(); g.arc(40, 14, 12, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#4a4d55";
  const eng = [[40, 14]];
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; eng.push([40 + Math.cos(a) * 7.6, 14 + Math.sin(a) * 7.6]); }
  for (const [ex, ey] of eng) { g.beginPath(); g.arc(ex, ey, 2.4, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = "#0a0a0c";
  for (const [ex, ey] of eng) { g.beginPath(); g.arc(ex, ey, 1.3, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = "#3a3c42"; g.fillRect(24, 2, 4, 3); g.fillRect(52, 2, 4, 3); // grid fins poking out
  return crisp(cv);
}


// NICO'S CRAZY CAR: a black compact sports sedan, low and wide: flared arches, a big black
// honeycomb grille, slim lights, red brake callipers, a lip spoiler and two huge oval exhaust tips.
function rs3Side(car, frame) {
  const cv = document.createElement("canvas");
  cv.width = 72; cv.height = 25;
  const g = cv.getContext("2d");
  // black paint needs strong highlights to read: a bright top edge, a lit shoulder, a dark sill
  const base = "#1c1d22", light = "#4a4d57", shine = "#7d828f", deep = "#0b0b0e";
  const body = [[3, 12], [6, 9.4], [14, 8.6], [22, 3], [31, 1.6], [41, 1.8], [49, 6.2], [55, 8.6], [64, 10.2], [70, 11.6], [71, 14.5], [70, 18.4], [3, 18.4], [2, 15]];
  const grad = g.createLinearGradient(0, 0, 0, 19);
  grad.addColorStop(0, light); grad.addColorStop(0.35, base); grad.addColorStop(1, deep);
  poly(g, body, grad);
  // flared wheel arches
  poly(g, [[8, 12.2], [11, 10.4], [21, 10.4], [24, 12.2]], "#26272d");
  poly(g, [[51, 12], [54, 10.2], [64, 10.4], [67, 12.2]], "#26272d");
  // windows, trim, pillar
  poly(g, [[14.6, 9], [22.6, 3.6], [31, 2.4], [40.6, 2.6], [48.4, 8.8]], "#000000");
  poly(g, [[16.6, 8.6], [23.2, 4.2], [30.8, 3.2], [40, 3.4], [46.6, 8.4]], car.glass);
  g.fillStyle = "#000000"; g.fillRect(31.6, 2.6, 1.6, 6.2);
  poly(g, [[24, 4.8], [29.6, 3.8], [26.4, 6.6]], "rgba(255,255,255,0.18)");
  g.fillStyle = shine; g.fillRect(22, 2.4, 18, 0.7); // roof shine
  g.fillStyle = light; g.fillRect(8, 10.6, 58, 0.8);
  g.fillStyle = "#08080a"; g.fillRect(32, 9.4, 0.7, 8); g.fillRect(47.6, 9.4, 0.7, 7.6);
  g.fillStyle = "#3a3d46"; g.fillRect(26, 12, 3, 0.8); g.fillRect(41, 12, 3, 0.8);
  poly(g, [[48.6, 8.2], [52, 7.8], [52, 9.6], [49, 9.6]], "#000000");
  // front: big black grille and a slim LED headlight; rear: lip spoiler and a thin tail light
  poly(g, [[66, 12.6], [70.6, 13.2], [70.6, 16.8], [66.4, 16.8]], "#050506");
  g.fillStyle = "#2a2c33"; for (let y = 13.4; y < 16.6; y += 1.2) g.fillRect(67, y, 3.2, 0.5);
  poly(g, [[62.6, 11], [69.6, 12], [69.4, 12.8], [63, 12]], "#e8f2ff");
  poly(g, [[3, 9.6], [8.6, 8.4], [8.8, 9.2], [3.2, 10.4]], "#050506"); // spoiler lip
  poly(g, [[2.4, 11.6], [8, 10.4], [8.2, 11.4], [2.6, 12.6]], "#ff2020");
  g.fillStyle = "#050506"; g.fillRect(5, 16.8, 62, 1.6);
  // one huge oval exhaust tip poking out the back
  g.fillStyle = "#c9ced6"; g.beginPath(); g.ellipse(3.6, 16.4, 2.4, 1.4, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#111114"; g.beginPath(); g.ellipse(3.6, 16.4, 1.5, 0.8, 0, 0, Math.PI * 2); g.fill();
  // dark five-spoke wheels with red brake callipers
  for (const wx of [16, 59]) {
    g.fillStyle = "#050506"; g.beginPath(); g.arc(wx, 18.3, 6.6, Math.PI, 0); g.fill();
    g.fillStyle = "#111114"; g.beginPath(); g.arc(wx, 18.5, 5.8, 0, Math.PI * 2); g.fill();
    g.fillStyle = car.rim; g.beginPath(); g.arc(wx, 18.5, 4.1, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#e0201b"; g.fillRect(wx + 1.2, 15.6, 2, 2.4); // calliper
    g.strokeStyle = "#5a5d66"; g.lineWidth = 0.9;
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + frame * 0.6;
      g.beginPath(); g.moveTo(wx + Math.cos(a) * 1.1, 18.5 + Math.sin(a) * 1.1); g.lineTo(wx + Math.cos(a) * 3.7, 18.5 + Math.sin(a) * 3.7); g.stroke();
    }
    g.fillStyle = "#1a1a1e"; g.beginPath(); g.arc(wx, 18.5, 1, 0, Math.PI * 2); g.fill();
  }
  return crisp(cv);
}

function rs3Rear(car, frame) {
  const cv = document.createElement("canvas");
  cv.width = 84; cv.height = 52;
  const g = cv.getContext("2d");
  const light = "#4a4d57", base = "#1c1d22", deep = "#0b0b0e";
  // fat tyres, wide stance
  for (const tx of [5, 63]) {
    g.fillStyle = "#111114"; g.fillRect(tx, 39, 16, 13);
    g.fillStyle = "#26262e"; for (let y = 40 + frame; y < 52; y += 2) g.fillRect(tx + 1, y, 14, 1);
  }
  const grad = g.createLinearGradient(0, 18, 0, 46);
  grad.addColorStop(0, light); grad.addColorStop(0.35, base); grad.addColorStop(1, deep);
  poly(g, [[5, 25], [11, 20], [73, 20], [79, 25], [82, 31], [82, 43], [78, 46], [6, 46], [2, 43], [2, 31]], grad);
  // the rear window, roof and spoiler
  poly(g, [[24, 4], [60, 4], [68, 20], [16, 20]], base);
  poly(g, [[26, 6], [58, 6], [65, 20], [19, 20]], car.glass);
  g.fillStyle = "#7d828f"; g.fillRect(26, 4, 32, 1); // roof shine
  poly(g, [[30, 7], [37, 7], [27, 17], [23, 17]], "rgba(255,255,255,0.12)");
  poly(g, [[6, 17], [13, 17.5], [15, 20], [6, 20]], "#000000"); poly(g, [[78, 17], [71, 17.5], [69, 20], [78, 20]], "#000000");
  g.fillStyle = "#050506"; g.fillRect(15, 20, 54, 1.8);
  // slim tail lights joined by a thin light bar
  poly(g, [[4, 25], [24, 24], [24, 27], [4, 28.6]], "#ff2020"); poly(g, [[80, 25], [60, 24], [60, 27], [80, 28.6]], "#ff2020");
  g.fillStyle = "#a01818"; g.fillRect(24, 25, 36, 1);
  g.fillStyle = "#e9e6d8"; g.fillRect(33, 31, 18, 6);
  g.fillStyle = "#7d828f"; for (const x of [35, 38, 42, 45, 48]) g.fillRect(x, 33, 2, 2);
  // a big black diffuser with two huge oval exhaust tips
  g.fillStyle = "#050506"; g.fillRect(4, 39, 76, 7);
  g.fillStyle = "#2a2c33"; for (let x = 26; x < 58; x += 5) g.fillRect(x, 39, 1, 7);
  for (const ex of [14, 70]) {
    g.fillStyle = "#e8ecf4"; g.beginPath(); g.ellipse(ex, 42.5, 6.4, 3.6, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#9aa0ac"; g.beginPath(); g.ellipse(ex, 42.8, 5.2, 2.7, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#050506"; g.beginPath(); g.ellipse(ex, 43, 4.2, 2, 0, 0, Math.PI * 2); g.fill();
  }
  return crisp(cv);
}
