// WORLD TOUR: writes the geography prompt catalog (public/vroomillion/js/catalog/geo.js) from
// tools/geo/lists.json (tools/geo/fetch-lists.mjs). Every family is in the "geo" pool only, with a
// Wikidata rule that also fetches coordinates (so the race can drive to the place you named), and
// TRAFFIC is Wikidata's best-known answers (autotop). Prompts the game already has are not repeated:
// their families join the WORLD TOUR pool instead (GEO_JOIN).
//
//   node tools/geo/make-catalog.mjs     then   node tools/build-catalog.mjs   (builds the answers)
import fs from "node:fs";
import { FAMILIES } from "../../public/vroomillion/js/catalog/index.js";

const L = JSON.parse(fs.readFileSync(new URL("./lists.json", import.meta.url), "utf8"));
// (the families this script made are the ones in the WORLD TOUR pool only)
const have = new Map(FAMILIES.filter((f) => !(f.pools.length === 1 && f.pools[0] === "geo")).flatMap((f) => f.prompts.map((p) => [p.toLowerCase(), f])));

// how a place is named in a prompt
const RENAME = { "People's Republic of China": "China", "Kingdom of the Netherlands": "the Netherlands", "State of Palestine": "Palestine", "Republic of Ireland": "Ireland", "Georgia": "Georgia (the country)", "Democratic Republic of the Congo": "the DR Congo", "Republic of the Congo": "the Republic of the Congo", "The Gambia": "the Gambia", "Czech Republic": "the Czech Republic", "Federated States of Micronesia": "Micronesia" };
const THE = new Set(["United States", "United Kingdom", "Philippines", "Bahamas", "United Arab Emirates", "Dominican Republic", "Central African Republic", "Maldives", "Marshall Islands", "Solomon Islands", "Comoros", "Seychelles", "Vatican City"]);
const nm = (c) => RENAME[c.name] || (THE.has(c.name) ? "the " + c.name : c.name);
const short = (s) => s.replace(/^the /, "");
const CONT = { Q46: "Europe", Q48: "Asia", Q15: "Africa", Q49: "North America", Q18: "South America", Q538: "Oceania", Q55643: "Oceania" };
const CONT_Q = { Europe: "Q46", Asia: "Q48", Africa: "Q15", "North America": "Q49", "South America": "Q18", Oceania: "Q538" };
const countries = L.countries;
const rank = new Map(countries.map((c, i) => [c.q, i]));
const level = (i) => (i < 25 ? 1 : i < 70 ? 2 : 3);
const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "").slice(0, 24);

const lines = { countries: [], capitals: [], cities: [], regions: [], water: [], peaks: [], islands: [], landmarks: [], nature: [] };
const join = {}; // existing family id -> WORLD TOUR topic
const used = new Set();
// a family: topic, id, level, prompt, Wikidata binding for ?i, rule options
// prompts whose answer lists came out too short (tools/geo/fix-tiers.mjs) stay out
const DROPPED = new Set(fs.existsSync(new URL("./dropped.json", import.meta.url)) ? JSON.parse(fs.readFileSync(new URL("./dropped.json", import.meta.url), "utf8")) : []);
// EASY TRACK (level 1): what most people can answer. A WORLD TOUR race is mostly these, plus one
// tricky prompt (any other level): see racepick.js.
const FAMOUS = new Set(["unitedstates", "unitedkingdom", "france", "italy", "spain", "germany", "japan", "peoplesrepublicofchina", "india", "brazil", "mexico", "canada", "australia", "russia", "egypt", "greece", "turkey", "southafrica", "argentina", "ireland", "kingdomofthenetherlands", "portugal"]);
const BIG_STATES = new Set(["california", "texas", "florida", "newyork", "pennsylvania", "illinois", "ohio", "georgia", "northcarolina", "michigan", "newjersey", "virginia", "washington", "arizona", "massachusetts", "nevada", "hawaii", "colorado", "louisiana", "tennessee"]);
const FAMOUS_CITIES = new Set(["paris", "london", "rome", "newyorkcity", "tokyo", "barcelona", "berlin", "moscow", "beijing", "istanbul", "dubai", "sydney", "losangeles", "venice", "amsterdam", "prague", "vienna", "madrid", "sanfrancisco", "cairo", "athens", "lasvegas", "riodejaneiro", "florence"]);
const WORLDWIDE = /^(gcountry|gcapital|gpeak|gwater\/(lake|river|falls)|gisland\/world|gnat\/(desert|beach)|gsight\/world|glang\/(spanish|french|english)|griver|gmount)\b/;
function easy(id) {
  const [kind, what] = id.split("/");
  if (WORLDWIDE.test(id)) return true;
  if (["gcity", "grivc", "gislc", "gmountc", "gpark", "gunesco"].includes(kind)) return FAMOUS.has(what) && (kind === "gcity" || ["unitedstates", "unitedkingdom", "france", "italy", "japan", "greece", "canada", "australia", "spain"].includes(what));
  if (kind === "gcityus") return BIG_STATES.has(what);
  if (kind === "gsight") return FAMOUS_CITIES.has(what);
  return false;
}
function fam(topic, id, lvl0, prompt, where0, opts = "") {
  const lvl = easy(id) ? 1 : Math.max(2, lvl0);
  let where = where0;
  if (DROPPED.has(id)) return;
  const key = prompt.toLowerCase();
  if (have.has(key)) { join[have.get(key).id] = topic; return; }
  if (used.has(key) || used.has("id:" + id)) return;
  used.add(key); used.add("id:" + id);
  // never a place that no longer exists; settlements: no ancient cities or ruins, no "canton of X"
  const settle = topic === "cities" || topic === "capitals";
  // (a population figure: real, living places only; ancient cities and ruins don't have one)
  const extra = settle ? " noadmin" : "";
  if (settle) where += " ?i wdt:P1082 [].";
  lines[topic].push(`${id} | ${lvl} | geo | g:${topic} | ${prompt} | geo autotop=12 max=800 ${opts}${extra} w:${where} FILTER NOT EXISTS { ?i wdt:P576 [] } |`);
}
const SOV = "?i wdt:P31 wd:Q3624078. FILTER NOT EXISTS { ?i wdt:P576 [] }";
// the countries of a continent, listed (much faster for Wikidata than working them out per item)
const inCont = (cq) => `VALUES ?c { ${countries.filter((c) => c.cont.includes(cq) || (cq === "Q538" && c.cont.includes("Q55643"))).map((c) => "wd:" + c.q).join(" ")} }`;

// ---- countries ----
fam("countries", "gcountry/world", 1, "Name a country", SOV, "min=1 minans=40");
for (const [name, q] of Object.entries(CONT_Q)) fam("countries", "gcountry/" + slug(name), 1, `Name a country in ${name}`, `${SOV} ?i wdt:P30 ${q === "Q538" ? "?oc. VALUES ?oc { wd:Q538 wd:Q55643 }" : "wd:" + q + "."}`, "min=1 minans=8");
countries.slice(0, 40).forEach((c, i) => fam("countries", "gborder/" + slug(c.name), level(i), `Name a country that borders ${nm(c)}`, `wd:${c.q} wdt:P47 ?i. ?i wdt:P31 wd:Q3624078.`, "min=1 minans=3"));
for (const [lang, q] of [["Spanish", "Q1321"], ["French", "Q150"], ["English", "Q1860"], ["Arabic", "Q13955"], ["Portuguese", "Q5146"], ["German", "Q188"], ["Russian", "Q7737"]])
  fam("countries", "glang/" + slug(lang), 2, `Name a country where ${lang} is an official language`, `${SOV} ?i wdt:P37 wd:${q}.`, "min=1 minans=5");
fam("countries", "gcountry/landlocked", 2, "Name a landlocked country", "?i wdt:P31 wd:Q123480. ?i wdt:P31 wd:Q3624078.", "min=1 minans=10");
fam("countries", "gcountry/island", 2, "Name an island country", "?i wdt:P31 wd:Q112099. ?i wdt:P31 wd:Q3624078.", "min=1 minans=10");
fam("countries", "gcountry/monarchy", 3, "Name a country with a king, queen or emperor", `${SOV} ?i wdt:P122/wdt:P279* wd:Q7269.`, "min=1 minans=8");
// ---- capitals ----
fam("capitals", "gcapital/world", 1, "Name a capital city", "?c wdt:P31 wd:Q3624078; wdt:P36 ?i.", "min=1 minans=40");
for (const [name, q] of Object.entries(CONT_Q)) fam("capitals", "gcapital/" + slug(name), 1, `Name a capital city in ${name}`, `?c wdt:P31 wd:Q3624078; wdt:P36 ?i. ${inCont(q)}`, "min=1 minans=8");
// ---- cities ----
const CITY = "{ ?i wdt:P31/wdt:P279* wd:Q515. }";
countries.slice(0, 75).forEach((c, i) => fam("cities", "gcity/" + slug(c.name), level(i), `Name a city in ${nm(c)}`, `${CITY} ?i wdt:P17 wd:${c.q}.`, "min=2 minans=10"));
const US = "Q30";
const STATES = (L.divisions[US] || []).filter((d) => !/District of Columbia|Puerto Rico|Guam|Samoa|Virgin|Mariana|Minor/.test(d.name));
STATES.forEach((s, i) => fam("cities", "gcityus/" + slug(s.name), i < 20 ? 1 : 2, `Name a city in ${s.name}`, `{ ?i wdt:P31 wd:Q1093829. } UNION { ?i wdt:P31 wd:Q15127012. } UNION { ?i wdt:P31 wd:Q1549591. } ?i wdt:P131/wdt:P131? wd:${s.q}.`, "min=2 minans=10"));
// states and provinces elsewhere: the bigger ones only
for (const cq of ["Q16", "Q408", "Q145", "Q183", "Q668", "Q38", "Q29", "Q155", "Q96", "Q17", "Q142", "Q148"]) {
  const c = countries.find((x) => x.q === cq);
  for (const d of (L.divisions[cq] || []).filter((d) => d.n >= 60).slice(0, 12))
    fam("cities", "gcityr/" + slug(d.name), 2, `Name a city or town in ${d.name}${c && d.name !== nm(c) ? "" : ""}`, `?i wdt:P131/wdt:P131? wd:${d.q}; wdt:P1082 ?pop; wdt:P625 []. FILTER(?pop >= 3000) ?i wdt:P31 ?kind. ?kind rdfs:label ?kl. FILTER(lang(?kl) = "en") VALUES ?w { "city" "town" "village" "municipality" "commune" "urban" } FILTER(CONTAINS(LCASE(?kl), ?w)) FILTER NOT EXISTS { VALUES ?bad { "region" "county" "district" "province" "state" "division" } FILTER(CONTAINS(LCASE(?kl), ?bad)) }`, "min=2 minans=10 notcounty");
}
// ---- regions ----
countries.slice(0, 45).forEach((c, i) => {
  const n = (L.divisions[c.q] || []).length;
  if (n >= 4) fam("regions", "gregion/" + slug(c.name), level(i), `Name a state, province or region of ${nm(c)}`, `wd:${c.q} wdt:P150 ?i.`, `min=1 minans=${Math.min(10, n)}`);
});
STATES.slice(0, 16).forEach((s) => fam("regions", "gcounty/" + slug(s.name), 3, `Name a county in ${s.name}`, `?i wdt:P31 wd:Q47168; wdt:P131 wd:${s.q}.`, "min=1 minans=10"));
// ---- water ----
const RIVER = "{ ?i wdt:P31 wd:Q4022. } UNION { ?i wdt:P31 wd:Q573344. }";
for (const [name, q] of Object.entries(CONT_Q)) {
  fam("water", "griver/" + slug(name), 2, `Name a river in ${name}`, `${RIVER} ?i wdt:P17 ?c. ${inCont(q)}`, "min=8 minans=10");
  fam("water", "glake/" + slug(name), 2, `Name a lake in ${name}`, `?i wdt:P31/wdt:P279* wd:Q23397; wdt:P17 ?c. ${inCont(q)}`, "min=8 minans=10");
  fam("water", "gfalls/" + slug(name), 3, `Name a waterfall in ${name}`, `?i wdt:P31/wdt:P279* wd:Q34038; wdt:P17 ?c. ${inCont(q)}`, "min=3 minans=8");
}
countries.slice(0, 35).forEach((c, i) => fam("water", "grivc/" + slug(c.name), level(i), `Name a river in ${nm(c)}`, `${RIVER} ?i wdt:P17 wd:${c.q}.`, "min=3 minans=10"));
countries.slice(0, 20).forEach((c, i) => fam("water", "glakec/" + slug(c.name), level(i) + 1 > 3 ? 3 : level(i) + 1, `Name a lake in ${nm(c)}`, `?i wdt:P31/wdt:P279* wd:Q23397; wdt:P17 wd:${c.q}.`, "min=3 minans=10"));
fam("water", "gwater/gulf", 2, "Name a bay or gulf", "?i wdt:P31/wdt:P279* wd:Q1322134.", "min=15 minans=20");
fam("water", "gwater/falls", 2, "Name a waterfall", "?i wdt:P31/wdt:P279* wd:Q34038.", "min=10 minans=20");
fam("water", "gwater/lake", 1, "Name a lake", "?i wdt:P31/wdt:P279* wd:Q23397.", "min=30 minans=20");
fam("water", "gwater/river", 1, "Name a river in the world", RIVER, "min=40 minans=20");
// ---- peaks ----
const MOUNT = "{ ?i wdt:P31 wd:Q8502. } UNION { ?i wdt:P31 wd:Q207326. }";
for (const [name, q] of Object.entries(CONT_Q)) {
  fam("peaks", "gmount/" + slug(name), 2, `Name a mountain in ${name}`, `${MOUNT} ?i wdt:P17 ?c. ${inCont(q)}`, "min=6 minans=10");
  fam("peaks", "gvolc/" + slug(name), 3, `Name a volcano in ${name}`, `?i wdt:P31/wdt:P279* wd:Q8072; wdt:P17 ?c. ${inCont(q)}`, "min=4 minans=6");
  fam("peaks", "grange/" + slug(name), 2, `Name a mountain range in ${name}`, `?i wdt:P31/wdt:P279* wd:Q46831; wdt:P17 ?c. ${inCont(q)}`, "min=6 minans=8");
}
countries.slice(0, 25).forEach((c, i) => fam("peaks", "gmountc/" + slug(c.name), level(i) + 1 > 3 ? 3 : level(i) + 1, `Name a mountain in ${nm(c)}`, `${MOUNT} ?i wdt:P17 wd:${c.q}.`, "min=3 minans=10"));
fam("peaks", "gpeak/volcano", 1, "Name a volcano", "?i wdt:P31/wdt:P279* wd:Q8072.", "min=20 minans=20");
fam("peaks", "gpeak/range", 1, "Name a mountain range", "?i wdt:P31/wdt:P279* wd:Q46831.", "min=30 minans=20");
fam("peaks", "gpeak/mountain", 1, "Name a famous mountain", MOUNT, "min=50 minans=20");
// ---- islands ----
const ISLAND = "?i wdt:P31/wdt:P279* wd:Q23442.";
fam("islands", "gisland/world", 1, "Name an island", ISLAND, "min=60 minans=20");
countries.slice(0, 40).forEach((c, i) => fam("islands", "gislc/" + slug(c.name), level(i), `Name an island that belongs to ${nm(c)}`, `${ISLAND} ?i wdt:P17 wd:${c.q}.`, "min=3 minans=8"));
// ---- landmarks ----
const SIGHT = "VALUES ?k { wd:Q811979 wd:Q33506 wd:Q22698 wd:Q570116 wd:Q4989906 wd:Q16970 wd:Q12280 } ?i wdt:P31/wdt:P279* ?k.";
L.cities.slice(0, 60).forEach((c, i) => fam("landmarks", "gsight/" + slug(c.name), i < 25 ? 1 : 2, `Name a landmark or sight in ${c.name}`, `?i wdt:P131/wdt:P131? wd:${c.q}. ${SIGHT}`, "min=4 minans=10"));
countries.slice(0, 45).forEach((c, i) => fam("landmarks", "gunesco/" + slug(c.name), level(i), `Name a UNESCO World Heritage Site in ${nm(c)}`, `?i wdt:P1435 wd:Q9259; wdt:P17 wd:${c.q}.`, "min=1 minans=6"));
countries.slice(0, 25).forEach((c, i) => fam("landmarks", "gpark/" + slug(c.name), level(i), `Name a national park in ${nm(c)}`, `?i wdt:P31/wdt:P279* wd:Q46169; wdt:P17 wd:${c.q}.`, "min=2 minans=8"));
countries.slice(0, 20).forEach((c, i) => fam("landmarks", "gcastle/" + slug(c.name), level(i) + 1 > 3 ? 3 : level(i) + 1, `Name a castle or palace in ${nm(c)}`, `VALUES ?k { wd:Q23413 wd:Q16560 } ?i wdt:P31/wdt:P279* ?k; wdt:P17 wd:${c.q}.`, "min=4 minans=8"));
L.cities.slice(0, 30).forEach((c, i) => fam("landmarks", "gmuseum/" + slug(c.name), 2, `Name a museum in ${c.name}`, `?i wdt:P31/wdt:P279* wd:Q33506; wdt:P131/wdt:P131? wd:${c.q}.`, "min=3 minans=8"));
L.cities.slice(0, 25).forEach((c, i) => fam("landmarks", "gtower/" + slug(c.name), 3, `Name a skyscraper or tower in ${c.name}`, `VALUES ?k { wd:Q11303 wd:Q12518 } ?i wdt:P31/wdt:P279* ?k; wdt:P131/wdt:P131? wd:${c.q}.`, "min=2 minans=6"));
L.cities.slice(0, 30).forEach((c, i) => fam("landmarks", "ghood/" + slug(c.name), 2, `Name a neighbourhood or district of ${c.name}`, `VALUES ?k { wd:Q123705 wd:Q2198484 wd:Q15715406 wd:Q1638812 } ?i wdt:P31/wdt:P279* ?k; wdt:P131/wdt:P131? wd:${c.q}.`, "min=2 minans=8"));
countries.slice(0, 20).forEach((c, i) => fam("landmarks", "gairport/" + slug(c.name), 3, `Name an airport in ${nm(c)}`, `?i wdt:P31/wdt:P279* wd:Q1248784; wdt:P17 wd:${c.q}.`, "min=4 minans=6"));
fam("landmarks", "gsight/world", 1, "Name a famous landmark anywhere in the world", `${SIGHT} ?i wdt:P625 [].`, "min=90 minans=30");
// ---- nature ----
fam("nature", "gnat/desert", 1, "Name a desert", "?i wdt:P31/wdt:P279* wd:Q8514.", "min=8 minans=15");
fam("nature", "gnat/canyon", 2, "Name a canyon or gorge", "?i wdt:P31/wdt:P279* wd:Q150784.", "min=8 minans=10");
fam("nature", "gnat/glacier", 3, "Name a glacier", "?i wdt:P31/wdt:P279* wd:Q35666.", "min=8 minans=10");
fam("nature", "gnat/cave", 3, "Name a cave", "?i wdt:P31/wdt:P279* wd:Q35509.", "min=10 minans=10");
fam("nature", "gnat/beach", 2, "Name a famous beach", "?i wdt:P31/wdt:P279* wd:Q40080.", "min=8 minans=10");
fam("nature", "gnat/peninsula", 2, "Name a peninsula", "?i wdt:P31/wdt:P279* wd:Q34763.", "min=15 minans=15");
fam("nature", "gnat/cape", 3, "Name a cape or headland", "?i wdt:P31/wdt:P279* wd:Q185113.", "min=10 minans=10");
fam("nature", "gnat/archipelago", 2, "Name an archipelago or island group", "?i wdt:P31/wdt:P279* wd:Q33837.", "min=15 minans=15");
fam("nature", "gnat/forest", 3, "Name a famous forest", "?i wdt:P31/wdt:P279* wd:Q4421.", "min=10 minans=10");
fam("nature", "gnat/reef", 3, "Name a coral reef or atoll", "VALUES ?k { wd:Q11292 wd:Q42523 } ?i wdt:P31/wdt:P279* ?k.", "min=8 minans=10");

let out = `// GENERATED by tools/geo/make-catalog.mjs: the WORLD TOUR geography prompts (pool "geo").
// Answers: tools/build-catalog.mjs (Wikidata, ranked by how many Wikipedias cover each place, with coordinates).
export const GEO = \`
`;
for (const [topic, ls] of Object.entries(lines)) out += `# places\n// ${topic}\n` + ls.join("\n") + "\n";
out += "`;\n\n// families the game already had that WORLD TOUR plays too: family id -> WORLD TOUR topic\nexport const GEO_JOIN = " + JSON.stringify(join, null, 1) + ";\n";
fs.writeFileSync(new URL("../../public/vroomillion/js/catalog/geo.js", import.meta.url), out);
const total = Object.values(lines).reduce((a, l) => a + l.length, 0);
console.log("WORLD TOUR families:", total, Object.entries(lines).map(([k, v]) => `${k} ${v.length}`).join(", "), "| joined existing:", Object.keys(join).length);
