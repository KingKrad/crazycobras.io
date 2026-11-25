// WORLD TOUR for American players: re-levels the generated geography prompts (catalog/geo.js) by how well
// an American player knows the place, and drops the ones almost nobody could answer ("a mountain in
// Australia", "a river in Albania"). Level 1 = the easy track, 2 = the race's one tricky prompt.
// Run after tools/geo/make-catalog.mjs:   node tools/geo/easier.mjs
import fs from "node:fs";

const FILE = new URL("../../public/vroomillion/js/catalog/geo.js", import.meta.url);
const DROPPED = new URL("./dropped.json", import.meta.url);

const US = /^(the USA|the United States|the US)$/;
const STATES_EASY = new Set(["New York", "California", "Texas", "Florida", "Illinois", "Ohio", "Georgia", "Nevada", "Massachusetts", "Colorado", "Michigan", "Tennessee", "Louisiana", "Washington", "North Carolina", "Arizona", "Pennsylvania", "New Jersey", "Virginia", "Oregon", "Hawaii", "Alaska", "Missouri", "Minnesota", "Wisconsin", "Indiana", "Maryland", "Utah", "Kentucky", "Alabama", "South Carolina", "Oklahoma", "Connecticut"]);
const STATES = new Set([...STATES_EASY, "Iowa", "Kansas", "Nebraska", "Arkansas", "Mississippi", "New Mexico", "Idaho", "Montana", "Wyoming", "North Dakota", "South Dakota", "Maine", "Vermont", "New Hampshire", "Rhode Island", "Delaware", "West Virginia", "New York State"]);
// countries Americans know well, and ones they know a bit
const KNOWN = new Set(["Canada", "Mexico", "the United Kingdom", "France", "Italy", "Spain", "Germany", "Japan", "China", "Australia", "Ireland", "Greece", "Egypt", "Brazil", "India", "Russia"]);
const SOME = new Set(["Argentina", "Portugal", "Turkey", "South Africa", "Switzerland", "Sweden", "Norway", "the Netherlands", "South Korea", "Thailand", "New Zealand", "Israel", "Colombia", "Chile", "Peru", "Cuba", "Jamaica", "Poland", "Austria", "Belgium", "Denmark", "Iceland", "the Philippines", "Vietnam", "Kenya", "Morocco", "Saudi Arabia", "the United Arab Emirates"]);
const CITY_EASY = new Set(["Paris", "London", "Rome", "New York City", "Washington, D.C.", "San Francisco", "Chicago", "Las Vegas"]);
const CITY_FAMOUS = new Set(["Venice", "Barcelona", "Sydney", "Cairo", "Tokyo", "Beijing", "Rio de Janeiro", "Athens", "Moscow", "Berlin", "Istanbul", "Vienna", "Prague", "Vatican City", "Hong Kong", "Singapore", "Jerusalem", "Dublin", "Amsterdam", "Madrid", "Lisbon", "Kyoto", "Mexico City", "Seoul", "Bangkok", "Shanghai", "Dubai", "Toronto", "Munich", "Saint Petersburg", "Buenos Aires", "Budapest", "Florence"]);
const CONT_OK = new Set(["Europe", "Asia", "North America", "South America", "Africa"]);

// -> 1, 2 or null (drop); undefined = leave as it is
function level(p) {
  let m;
  const place = (re) => (m = p.match(re)) && m[1];
  if (/^Name a country$|^Name a capital city$|^Name an island$|^Name a lake$|^Name a waterfall$|^Name a mountain$|^Name a famous mountain$|^Name a mountain range$|^Name a desert$|^Name a famous beach$|^Name a river in the world$|^Name a Caribbean vacation spot$/.test(p)) return 1;
  if (place(/^Name a city in (.+)$/) || place(/^Name a city or town in (.+)$/)) {
    const x = m[1];
    if (US.test(x)) return 1;
    if (STATES_EASY.has(x)) return 1;
    if (STATES.has(x)) return 2;
    if (x === "Georgia (the country)") return null;
    return KNOWN.has(x) ? 1 : SOME.has(x) ? 2 : null;
  }
  if (place(/^Name a landmark or sight in (.+)$/)) return CITY_EASY.has(m[1]) ? 1 : CITY_FAMOUS.has(m[1]) ? 2 : null;
  if (place(/^Name a UNESCO World Heritage Site in (.+)$/)) return US.test(m[1]) ? 1 : KNOWN.has(m[1]) ? 2 : null;
  if (place(/^Name a national park in (.+)$/)) return US.test(m[1]) ? 1 : KNOWN.has(m[1]) ? 2 : null;
  if (place(/^Name an island that belongs to (.+)$/)) return US.test(m[1]) ? 1 : KNOWN.has(m[1]) ? 2 : null;
  if (place(/^Name a mountain in (.+)$/)) {
    const x = m[1];
    if (US.test(x)) return 1;
    if (["Asia", "South America", "Canada", "Japan", "Italy", "France", "Switzerland", "Mexico"].includes(x)) return 2;
    return null; // Australia, Finland, Egypt...: almost nobody knows one
  }
  if (place(/^Name a mountain range in (.+)$/)) return ["Europe", "Asia", "North America", "South America"].includes(m[1]) ? 2 : null;
  if (place(/^Name a volcano in (.+)$/)) return ["Europe", "Asia", "North America"].includes(m[1]) ? 2 : null;
  if (place(/^Name a river in (.+)$/)) {
    const x = m[1];
    if (US.test(x)) return 1;
    if (CONT_OK.has(x) || ["Canada", "the United Kingdom", "France", "Italy", "Germany", "Egypt", "China", "India", "Brazil", "Russia", "Spain", "Mexico"].includes(x)) return 2;
    return null;
  }
  if (place(/^Name a lake in (.+)$/)) {
    const x = m[1];
    if (US.test(x) || x === "North America") return 1;
    if (["Canada", "Europe", "Africa", "Asia", "South America", "Italy", "Switzerland", "the United Kingdom"].includes(x)) return 2;
    return null;
  }
  if (place(/^Name a waterfall in (.+)$/)) return ["North America", "South America"].includes(m[1]) ? 2 : null;
  if (place(/^Name a state, province or region of (.+)$/)) {
    const x = m[1];
    if (US.test(x)) return 1;
    return ["Canada", "Mexico", "Australia", "Italy", "France", "Spain", "the United Kingdom"].includes(x) ? 2 : null;
  }
  if (place(/^Name a skyscraper or tower in (.+)$/)) return ["New York City", "Chicago", "London", "Paris", "Tokyo"].includes(m[1]) ? 2 : null;
  if (place(/^Name an airport in (.+)$/)) return US.test(m[1]) ? 2 : null;
  if (place(/^Name a country that borders (.+)$/)) return ["China", "India", "the United States", "France", "Germany", "Russia", "Brazil"].includes(m[1]) ? 2 : null;
  if (/^Name a country in Oceania$|^Name a capital city in North America$|^Name a country where English is an official language$/.test(p)) return 2;
  if (/^Name a capital city in Oceania$|^Name a cape or headland$/.test(p)) return null;
  if (/^Name a (famous forest|canyon or gorge|archipelago or island group|cave|peninsula|bay or gulf)$/.test(p)) return 2;
  return undefined;
}

const text = fs.readFileSync(FILE, "utf8");
const dropped = new Set(fs.existsSync(DROPPED) ? JSON.parse(fs.readFileSync(DROPPED, "utf8")) : []);
let n1 = 0, n2 = 0, gone = 0, kept = 0;
const out = text.split("\n").map((line) => {
  const cols = line.split("|").map((s) => s.trim());
  if (cols.length !== 7 || !/^g[a-z]*\//.test(cols[0])) return line;
  const lv = level(cols[4].split(";")[0].trim());
  if (lv === null) { dropped.add(cols[0]); gone++; return null; }
  if (lv === undefined) { kept++; return line; }
  lv === 1 ? n1++ : n2++;
  return line.replace(/^(\S+ \| )\d( \|)/, `$1${lv}$2`);
}).filter((l) => l !== null).join("\n");
// the game's older prompts that WORLD TOUR plays too: their WORLD TOUR level ("topic:level"), or out
const j = out.indexOf("export const GEO_JOIN = ");
const join = JSON.parse(out.slice(j + "export const GEO_JOIN = ".length).replace(/;\s*$/, ""));
const { FAMILIES } = await import("../../public/vroomillion/js/catalog/index.js");
const promptOf = new Map(FAMILIES.map((f) => [f.id, f.prompts[0]]));
for (const [id, v] of Object.entries(join)) {
  const lv = level(promptOf.get(id) || "");
  const topic = v.split(":")[0];
  if (lv === null) { delete join[id]; gone++; } else if (lv) { join[id] = `${topic}:${lv}`; lv === 1 ? n1++ : n2++; } else kept++;
}
fs.writeFileSync(FILE, out.slice(0, j) + "export const GEO_JOIN = " + JSON.stringify(join, null, 1) + ";\n");
fs.writeFileSync(DROPPED, JSON.stringify([...dropped].sort(), null, 1));
console.log(`WORLD TOUR: easy ${n1}, tricky ${n2}, dropped ${gone}, left as they were ${kept}`);
