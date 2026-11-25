// WORLD TOUR: hand-written world trivia prompts ("Name a capital that isn't its country's biggest city").
// Writes public/vroomillion/js/catalog/geoextra.js and each prompt's answer file, with every answer's
// coordinates (from the gazetteer geo/places.json, else COORDS below) so the car drives to it.
//   node tools/geo/trivia.mjs
import fs from "node:fs";
import { normalize } from "../../public/vroomillion/js/logic.js";
import { answerSlug } from "../../public/vroomillion/js/racepick.js";

// [prompt, kind (all play as WORLD TOUR's "trivia" topic, so most races get one), level, TRAFFIC, CRUISING, FAST LANE, DEEP CUT]
const LISTS = [
  ["Name a capital that isn't its country's biggest city", "capitals", 2,
    ["washington, d.c.|washington dc|washington", "canberra", "ottawa", "brasilia|brasília", "ankara", "bern"],
    ["wellington", "beijing", "abuja", "pretoria", "islamabad", "rabat", "hanoi", "quito", "abu dhabi"],
    ["astana", "naypyidaw|nay pyi taw", "dodoma", "yamoussoukro", "sucre", "belmopan", "porto-novo", "yaounde|yaoundé"], []],
  ["Name a US state capital that isn't the state's biggest city", "capitals", 2,
    ["sacramento", "albany", "tallahassee", "austin", "springfield", "harrisburg"],
    ["trenton", "olympia", "carson city", "juneau", "lansing", "frankfort", "baton rouge", "salem", "jefferson city", "annapolis", "montgomery", "topeka"],
    ["pierre", "bismarck", "dover", "montpelier", "concord", "augusta", "helena", "hartford"], []],
  ["Name a country where people drive on the left", "countries", 1,
    ["the united kingdom|united kingdom|uk|england|britain|great britain", "australia", "japan", "india", "ireland", "new zealand"],
    ["south africa", "thailand", "indonesia", "malaysia", "singapore", "jamaica", "kenya", "pakistan", "bangladesh", "sri lanka", "hong kong", "cyprus", "malta", "bahamas|the bahamas"],
    ["barbados", "trinidad and tobago", "zimbabwe", "zambia", "uganda", "tanzania", "mozambique", "botswana", "namibia", "nepal", "bhutan", "brunei", "fiji", "mauritius", "guyana", "suriname"], []],
  ["Name a country where Spanish is spoken", "countries", 1,
    ["spain", "mexico", "argentina", "colombia", "peru", "chile", "cuba"],
    ["venezuela", "ecuador", "bolivia", "uruguay", "paraguay", "guatemala", "honduras", "el salvador", "nicaragua", "costa rica", "panama", "dominican republic", "puerto rico"],
    ["equatorial guinea"], []],
  ["Name a country where French is spoken", "countries", 2,
    ["france", "canada", "belgium", "switzerland", "haiti", "monaco"],
    ["luxembourg", "ivory coast|cote d'ivoire|côte d'ivoire", "senegal", "cameroon", "madagascar", "morocco", "algeria", "tunisia", "mali", "dr congo|democratic republic of the congo|congo"],
    ["niger", "chad", "burkina faso", "benin", "togo", "guinea", "gabon", "rwanda", "burundi", "djibouti", "comoros", "seychelles", "vanuatu", "central african republic"], []],
  ["Name a country with no coastline", "countries", 2,
    ["switzerland", "austria", "bolivia", "paraguay", "mongolia", "nepal"],
    ["afghanistan", "kazakhstan", "hungary", "czech republic|czechia", "slovakia", "ethiopia", "uganda", "zambia", "zimbabwe", "luxembourg", "belarus", "serbia", "vatican city|vatican", "liechtenstein", "san marino", "andorra"],
    ["north macedonia|macedonia", "moldova", "armenia", "azerbaijan", "kyrgyzstan", "tajikistan", "turkmenistan", "uzbekistan", "laos", "bhutan", "rwanda", "burundi", "malawi", "botswana", "lesotho", "eswatini|swaziland", "south sudan", "chad", "niger", "mali", "burkina faso", "central african republic", "kosovo"], []],
  ["Name a country in the European Union", "countries", 1,
    ["france", "germany", "italy", "spain", "the netherlands|netherlands|holland", "belgium", "portugal", "ireland", "greece", "poland"],
    ["austria", "sweden", "denmark", "finland", "czech republic|czechia", "hungary", "romania", "croatia", "luxembourg"],
    ["bulgaria", "slovakia", "slovenia", "estonia", "latvia", "lithuania", "cyprus", "malta"], []],
  ["Name a Nordic country", "countries", 1,
    ["sweden", "norway", "denmark", "finland", "iceland"], ["greenland", "faroe islands"], [], []],
  ["Name a country on the equator", "countries", 2,
    ["brazil", "ecuador", "colombia", "kenya", "indonesia"],
    ["uganda", "gabon", "republic of the congo|congo", "dr congo|democratic republic of the congo", "somalia"],
    ["kiribati", "maldives", "sao tome and principe|são tomé and príncipe"], []],
  ["Name a country whose name starts and ends with A", "countries", 2,
    ["australia", "argentina", "austria", "albania", "algeria"],
    ["armenia", "andorra", "angola", "antigua and barbuda|antigua"], [], []],
  ["Name a country with a red and white flag", "countries", 2,
    ["canada", "japan", "poland", "switzerland", "denmark", "austria"],
    ["indonesia", "peru", "singapore", "monaco", "turkey", "tunisia", "latvia", "bahrain", "malta"],
    ["georgia (the country)|georgia", "qatar", "england", "lebanon"], []],
  ["Name a city that has hosted the Olympics", "cities", 1,
    ["london", "paris", "los angeles|la", "tokyo", "beijing", "atlanta", "rio de janeiro|rio"],
    ["sydney", "barcelona", "athens", "seoul", "moscow", "berlin", "montreal|montréal", "mexico city", "munich", "salt lake city", "lake placid", "vancouver", "sochi", "pyeongchang"],
    ["rome", "amsterdam", "stockholm", "antwerp", "helsinki", "melbourne", "calgary", "sarajevo", "lillehammer", "nagano", "turin|torino", "sapporo", "innsbruck", "grenoble", "oslo", "st. louis|st louis|saint louis", "chamonix", "st. moritz|st moritz", "albertville", "milan"], []],
  ["Name a city on the Mediterranean Sea", "cities", 2,
    ["barcelona", "marseille", "nice", "naples", "alexandria", "tel aviv", "monaco|monte carlo"],
    ["beirut", "valencia", "malaga|málaga", "genoa", "palermo", "tunis", "algiers", "split", "dubrovnik", "tripoli", "haifa", "cannes", "valletta", "antalya", "izmir|i̇zmir", "athens"],
    ["limassol", "thessaloniki", "heraklion", "palma|palma de mallorca", "ajaccio", "bari", "catania", "trieste", "alicante", "oran", "sfax", "latakia", "port said"], []],
];

// places the gazetteer may not have, [lat, lon]
const COORDS = {
  "washington, d.c.": [38.9, -77.04], bern: [46.95, 7.45], "abu dhabi": [24.45, 54.38], astana: [51.17, 71.45], naypyidaw: [19.76, 96.08], dodoma: [-6.17, 35.74],
  yamoussoukro: [6.82, -5.28], sucre: [-19.05, -65.26], belmopan: [17.25, -88.77], "porto-novo": [6.5, 2.6], yaounde: [3.85, 11.5],
  sacramento: [38.58, -121.49], albany: [42.65, -73.76], tallahassee: [30.44, -84.28], austin: [30.27, -97.74], springfield: [39.8, -89.65], harrisburg: [40.27, -76.88],
  trenton: [40.22, -74.76], olympia: [47.04, -122.9], "carson city": [39.16, -119.77], juneau: [58.3, -134.42], lansing: [42.73, -84.55], frankfort: [38.2, -84.87],
  "baton rouge": [30.45, -91.19], salem: [44.94, -123.04], "jefferson city": [38.58, -92.17], annapolis: [38.98, -76.49], montgomery: [32.37, -86.3], topeka: [39.05, -95.68],
  pierre: [44.37, -100.35], bismarck: [46.81, -100.78], dover: [39.16, -75.52], montpelier: [44.26, -72.58], concord: [43.21, -71.54], augusta: [44.31, -69.78], helena: [46.59, -112.04], hartford: [41.76, -72.68],
  "hong kong": [22.32, 114.17], "puerto rico": [18.22, -66.59], greenland: [72, -40], "faroe islands": [62, -6.9], america: [39.8, -98.6], "antigua and barbuda": [17.06, -61.8],
  "lake placid": [44.28, -73.98], "st. louis": [38.63, -90.2], chamonix: [45.92, 6.87], "st. moritz": [46.5, 9.84], albertville: [45.68, 6.39], lillehammer: [61.12, 10.47],
  innsbruck: [47.27, 11.4], grenoble: [45.19, 5.72], pyeongchang: [37.37, 128.39], sochi: [43.6, 39.73], nagano: [36.65, 138.19], sapporo: [43.06, 141.35], calgary: [51.05, -114.07], sarajevo: [43.86, 18.41],
  "monaco": [43.74, 7.42], "tel aviv": [32.09, 34.78], alexandria: [31.2, 29.92], marseille: [43.3, 5.37], nice: [43.7, 7.27], cannes: [43.55, 7.02], split: [43.51, 16.44], dubrovnik: [42.65, 18.09],
  haifa: [32.79, 34.99], antalya: [36.9, 30.7], izmir: [38.42, 27.14], limassol: [34.68, 33.04], heraklion: [35.34, 25.13], palma: [39.57, 2.65], ajaccio: [41.93, 8.74], bari: [41.12, 16.87],
  catania: [37.5, 15.09], trieste: [45.65, 13.78], alicante: [38.35, -0.48], oran: [35.7, -0.63], sfax: [34.74, 10.76], latakia: [35.52, 35.79], "port said": [31.26, 32.3], genoa: [44.41, 8.93],
  palermo: [38.12, 13.36], valencia: [39.47, -0.38], malaga: [36.72, -4.42], valletta: [35.9, 14.51], "the united kingdom": [54, -2], "the netherlands": [52.13, 5.29], england: [52.5, -1.5],
  "georgia (the country)": [42.3, 43.36], "ivory coast": [7.54, -5.55], "dr congo": [-2.88, 23.66], "republic of the congo": [-0.66, 14.9], "sao tome and principe": [0.19, 6.61], kiribati: [1.87, -157.36],
};


// countries (a central point) and the cities in these lists, so none depend on the gazetteer
Object.assign(COORDS, {
  france: [46.6, 2.4], germany: [51, 10], italy: [42.8, 12.6], spain: [40.2, -3.5], portugal: [39.6, -8], ireland: [53.2, -8], greece: [39.1, 22], poland: [52, 19.4],
  belgium: [50.6, 4.6], austria: [47.6, 14.1], sweden: [62.8, 16.5], denmark: [56, 9.5], finland: [64, 26], norway: [61.5, 9], iceland: [64.9, -18.6], hungary: [47.1, 19.4],
  "czech republic": [49.8, 15.5], romania: [45.9, 25], croatia: [45.2, 15.5], luxembourg: [49.8, 6.1], bulgaria: [42.7, 25.3], slovakia: [48.7, 19.7], slovenia: [46.1, 14.8],
  estonia: [58.6, 25], latvia: [56.9, 24.9], lithuania: [55.2, 23.9], cyprus: [35, 33.2], malta: [35.9, 14.4], switzerland: [46.8, 8.2], monaco: [43.74, 7.42], albania: [41.1, 20.1],
  andorra: [42.5, 1.6], "vatican city": [41.9, 12.45], "san marino": [43.94, 12.46], liechtenstein: [47.15, 9.55], belarus: [53.7, 28], serbia: [44, 21], "north macedonia": [41.6, 21.7],
  moldova: [47.2, 28.5], kosovo: [42.6, 20.9], armenia: [40.2, 45], azerbaijan: [40.3, 47.7], turkey: [39, 35.2], "united states": [39.8, -98.6], canada: [56, -106], mexico: [23.6, -102.5],
  cuba: [21.5, -79], jamaica: [18.1, -77.3], haiti: [19, -72.4], "dominican republic": [18.9, -70.5], bahamas: [24.5, -77.5], barbados: [13.2, -59.5], "trinidad and tobago": [10.5, -61.3],
  guatemala: [15.8, -90.2], honduras: [14.8, -86.6], "el salvador": [13.8, -88.9], nicaragua: [12.9, -85.2], "costa rica": [9.9, -84], panama: [8.5, -80.1], colombia: [4.6, -74.1],
  venezuela: [7, -66], ecuador: [-1.4, -78.4], peru: [-9.2, -75], bolivia: [-16.3, -63.6], chile: [-33.5, -70.7], argentina: [-34, -64], uruguay: [-32.8, -56], paraguay: [-23.4, -58.4],
  brazil: [-10.8, -52.9], guyana: [4.9, -58.9], suriname: [4, -56], australia: [-25.3, 133.8], "new zealand": [-41.3, 172.5], fiji: [-17.8, 178], vanuatu: [-15.4, 166.9],
  japan: [36.2, 138.3], india: [21, 78.7], pakistan: [30.4, 69.3], bangladesh: [23.7, 90.4], "sri lanka": [7.9, 80.8], nepal: [28.4, 84.1], bhutan: [27.5, 90.4], mongolia: [46.9, 103.8],
  kazakhstan: [48, 67], kyrgyzstan: [41.2, 74.8], tajikistan: [38.9, 71.3], turkmenistan: [39, 59.6], uzbekistan: [41.4, 64.6], afghanistan: [33.9, 67.7], thailand: [15.9, 101],
  laos: [19.9, 102.5], malaysia: [4.2, 102], singapore: [1.35, 103.82], indonesia: [-2.5, 117.5], brunei: [4.5, 114.7], maldives: [3.2, 73.2], qatar: [25.3, 51.2], bahrain: [26.07, 50.55],
  lebanon: [33.9, 35.9], egypt: [26.8, 30.8], tunisia: [34, 9.5], algeria: [28, 2.6], morocco: [31.8, -7.1], senegal: [14.5, -14.5], mali: [17.6, -4], niger: [17.6, 8.1], chad: [15.5, 18.7],
  "burkina faso": [12.2, -1.6], benin: [9.3, 2.3], togo: [8.6, 0.8], guinea: [9.9, -9.7], cameroon: [7.4, 12.4], gabon: [-0.8, 11.6], "central african republic": [6.6, 20.9],
  ethiopia: [9.1, 40.5], somalia: [5.2, 46.2], kenya: [0.2, 37.9], uganda: [1.4, 32.3], rwanda: [-1.9, 29.9], burundi: [-3.4, 29.9], tanzania: [-6.4, 34.9], djibouti: [11.8, 42.6],
  zambia: [-13.1, 27.8], zimbabwe: [-19, 29.2], malawi: [-13.3, 34.3], mozambique: [-18.7, 35.5], botswana: [-22.3, 24.7], namibia: [-22.9, 18.5], "south africa": [-30.6, 22.9],
  lesotho: [-29.6, 28.2], eswatini: [-26.5, 31.5], madagascar: [-18.8, 46.9], mauritius: [-20.3, 57.6], comoros: [-11.9, 43.9], seychelles: [-4.7, 55.5], "south sudan": [6.9, 31.3],
  "equatorial guinea": [1.65, 10.27], "puerto rico": [18.22, -66.59], "hong kong": [22.32, 114.17],
  london: [51.51, -0.13], paris: [48.86, 2.35], "los angeles": [34.05, -118.24], tokyo: [35.68, 139.69], beijing: [39.9, 116.4], atlanta: [33.75, -84.39], "rio de janeiro": [-22.91, -43.17],
  sydney: [-33.87, 151.21], barcelona: [41.39, 2.17], athens: [37.98, 23.73], seoul: [37.57, 126.98], moscow: [55.76, 37.62], berlin: [52.52, 13.41], montreal: [45.5, -73.57],
  "mexico city": [19.43, -99.13], munich: [48.14, 11.58], "salt lake city": [40.76, -111.89], vancouver: [49.28, -123.12], rome: [41.9, 12.5], amsterdam: [52.37, 4.9],
  stockholm: [59.33, 18.07], antwerp: [51.22, 4.4], helsinki: [60.17, 24.94], melbourne: [-37.81, 144.96], turin: [45.07, 7.69], oslo: [59.91, 10.75], milan: [45.46, 9.19],
  canberra: [-35.28, 149.13], ottawa: [45.42, -75.7], brasilia: [-15.79, -47.88], ankara: [39.93, 32.86], wellington: [-41.29, 174.78], abuja: [9.08, 7.4], pretoria: [-25.75, 28.19],
  islamabad: [33.68, 73.05], rabat: [34.02, -6.84], hanoi: [21.03, 105.85], quito: [-0.18, -78.47], naples: [40.85, 14.27], beirut: [33.89, 35.5], tunis: [36.81, 10.18],
  algiers: [36.75, 3.06], tripoli: [32.89, 13.19], thessaloniki: [40.64, 22.94],
});

const GAZ = JSON.parse(fs.readFileSync(new URL("../../public/vroomillion/geo/places.json", import.meta.url), "utf8"));
const coordOf = (forms) => {
  for (const f of forms) { const k = normalize(f); if (COORDS[f]) return COORDS[f]; if (GAZ[k]) return GAZ[k]; }
  for (const f of forms) for (const [name, c] of Object.entries(COORDS)) if (normalize(name) === normalize(f)) return c;
  return null;
};
let out = `// GENERATED by tools/geo/trivia.mjs: WORLD TOUR's world trivia prompts (pool "geo"), hand-written.
export const GEO_EXTRA = \`
# places
`;
const missing = [];
for (const [prompt, topic, lvl, ...tiers] of LISTS) {
  const id = "gtriv/" + prompt.toLowerCase().replace(/^name an? /, "").replace(/[^a-z0-9]+/g, "").slice(0, 24);
  const a = [...tiers, [], [], [], []].slice(0, 5).map((t) => [...new Set(t)]);
  const top = a[0].map((e) => e.split("|")[0]);
  if (top.some((t) => /[|]/.test(t)) || top.length < 5) throw new Error("bad list for " + prompt);
  const at = {};
  for (const e of a.flat()) { const forms = e.split("|"); const c = coordOf(forms); if (c) at[normalize(forms[0])] = c; else missing.push(forms[0]); }
  out += `${id} | ${lvl} | geo | g:trivia | ${prompt} | | ${top.map((t) => t.replace(/,/g, "")).join(", ")}\n`;
  fs.writeFileSync(new URL(`../../public/vroomillion/answers/${answerSlug(prompt)}.json`, import.meta.url), JSON.stringify({ q: prompt, a, tiers: [999999, 999999], fam: id, hand: true, at }));
}
out += "`;\n";
fs.writeFileSync(new URL("../../public/vroomillion/js/catalog/geoextra.js", import.meta.url), out);
console.log("WORLD TOUR trivia:", LISTS.length, "prompts | answers without coordinates:", missing.length ? missing.join(", ") : "none");
