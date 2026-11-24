// BOX OFFICE: writes the movie & TV prompt catalog (public/vroomillion/js/catalog/film.js) from
// tools/film/lists.json (tools/film/fetch-lists.mjs). Every family is in the "film" pool only, with a
// Wikidata rule; TRAFFIC is Wikidata's best-known answers (autotop). Prompts the game already has join
// the pool instead (FILM_JOIN), like WORLD TOUR's.
//   node tools/film/make-catalog.mjs     then   node tools/build-catalog.mjs   (builds the answers)
import fs from "node:fs";
import { FAMILIES } from "../../public/vroomillion/js/catalog/index.js";

const L = JSON.parse(fs.readFileSync(new URL("./lists.json", import.meta.url), "utf8"));
const have = new Map(FAMILIES.filter((f) => !(f.pools.length === 1 && f.pools[0] === "film")).flatMap((f) => f.prompts.map((p) => [p.toLowerCase(), f])));
const DROPPED = new Set(fs.existsSync(new URL("./dropped.json", import.meta.url)) ? JSON.parse(fs.readFileSync(new URL("./dropped.json", import.meta.url), "utf8")) : []);
const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "").slice(0, 24);
const TOPICS = ["director", "star", "characters", "tv", "studio", "era", "genre", "awards", "people"];
const lines = Object.fromEntries(TOPICS.map((t) => [t, []]));
const join = {};
const used = new Set();
function fam(topic, id, lvl, prompt, where, opts = "") {
  if (DROPPED.has(id)) return;
  const key = prompt.toLowerCase();
  if (have.has(key)) { join[have.get(key).id] = topic; return; }
  if (used.has(key) || used.has("id:" + id) || /\|/.test(prompt + where)) return;
  used.add(key); used.add("id:" + id);
  lines[topic].push(`${id} | ${lvl} | film | g:${topic} | ${prompt} | autotop=12 max=800 ${opts} w:${where} |`);
}
const FILM = "?i wdt:P31/wdt:P279? wd:Q11424.";
const SHOW = "?i wdt:P31/wdt:P279? wd:Q5398426.";
const lvl = (i, a, b) => (i < a ? 1 : i < b ? 2 : 3);
const clean = (n) => n.replace(/\s*\(.*?\)\s*/g, " ").trim();

L.directors.slice(0, 90).forEach((d, i) => fam("director", "fdir/" + slug(d.name), lvl(i, 30, 60), `Name a film directed by ${clean(d.name)}`, `?i wdt:P57 wd:${d.q}. ${FILM}`, "min=1 minans=6"));
L.actors.slice(0, 140).forEach((a, i) => fam("star", "fstar/" + slug(a.name), lvl(i, 40, 90), `Name a movie starring ${clean(a.name)}`, `?i wdt:P161 wd:${a.q}. ${FILM}`, "min=1 minans=8"));
L.shows.slice(0, 70).forEach((s, i) => fam("characters", "fchar/" + slug(s.name), lvl(i, 25, 50), `Name a character from ${clean(s.name)}`, `?i wdt:P1441 wd:${s.q}.`, "min=1 minans=8"));
L.franchises.slice(0, 40).forEach((s, i) => fam("characters", "ffran/" + slug(s.name), lvl(i, 15, 30), `Name a character from ${clean(s.name)}`, `?i wdt:P1441 wd:${s.q}.`, "min=1 minans=8"));
L.networks.slice(0, 30).forEach((n, i) => fam("tv", "fnet/" + slug(n.name), lvl(i, 12, 24), `Name a TV show on ${clean(n.name)}`, `?i wdt:P449 wd:${n.q}. ${SHOW}`, "min=2 minans=10"));
L.studios.slice(0, 30).forEach((s, i) => fam("studio", "fstudio/" + slug(s.name), lvl(i, 12, 24), `Name a film made by ${clean(s.name)}`, `?i wdt:P272 wd:${s.q}. ${FILM}`, "min=2 minans=10"));
for (let y = 1930; y <= 2020; y += 10) fam("era", "fera/" + y, y >= 1980 ? 1 : 2, `Name a movie from the ${y}s`, `?i wdt:P31 wd:Q11424; wdt:P577 ?d. FILTER(YEAR(?d) >= ${y} && YEAR(?d) <= ${y + 9})`, "min=15 minans=20");
for (let y = 1990; y <= 2020; y += 10) fam("era", "ftv/" + y, 2, `Name a TV series that started in the ${y}s`, `?i wdt:P31 wd:Q5398426; wdt:P580 ?d. FILTER(YEAR(?d) >= ${y} && YEAR(?d) <= ${y + 9})`, "min=15 minans=20");
const GENRES = [["a horror movie", "Q200092"], ["a science fiction movie", "Q471839"], ["a western", "Q172980"], ["a movie musical", "Q842256"], ["a war movie", "Q369747"], ["a romantic comedy", "Q860626"], ["a superhero movie", "Q1535153"], ["a crime movie", "Q959790"], ["a fantasy movie", "Q157394"], ["a thriller", "Q2484376"], ["a documentary film", "Q93204"], ["a disaster movie", "Q846544"], ["a heist movie", "Q496523"], ["a martial arts movie", "Q1251417"], ["a spy movie", "Q2297927"], ["a zombie movie", "Q1342372"], ["a teen movie", "Q1146335"], ["a sports movie", "Q1135802"]];
GENRES.forEach(([g, q], i) => fam("genre", "fgenre/" + slug(g), i < 8 ? 1 : 2, `Name ${g}`, `?i wdt:P136 wd:${q}. ${FILM}`, "min=8 minans=15"));
for (const [g, q, w] of [["a sitcom", "Q170238", "?i wdt:P136 wd:Q170238."], ["an animated TV series", "Q581714", "?i wdt:P31 wd:Q581714."], ["a reality TV show", "Q182415", "?i wdt:P136 wd:Q182415."], ["an anime series", "Q63952888", "?i wdt:P31 wd:Q63952888."], ["a soap opera", "Q23739", "?i wdt:P136 wd:Q23739."], ["a game show", "Q11578774", "?i wdt:P136 wd:Q11578774."], ["a TV drama series", "Q1366112", "?i wdt:P136 wd:Q1366112. ?i wdt:P31 wd:Q5398426."], ["a crime drama TV show", "Q5937792", "?i wdt:P136 wd:Q5937792."]])
  fam("tv", "ftvg/" + slug(g), 1, `Name ${g}`, w, "min=8 minans=15");
for (const [what, q] of [["a Best Picture Oscar winner", "Q102427"], ["a Best Actor Oscar winner", "Q103916"], ["a Best Actress Oscar winner", "Q103618"], ["a Best Director Oscar winner", "Q103360"], ["a Palme d'Or-winning film", "Q179808"], ["a Best Animated Feature Oscar winner", "Q106800"], ["a Best Supporting Actor Oscar winner", "Q106291"], ["a Best Supporting Actress Oscar winner", "Q106301"]])
  fam("awards", "faward/" + slug(what), 2, `Name ${what}`, `?i wdt:P166 wd:${q}.`, "min=1 minans=10");
for (const [who, q] of [["the United States", "Q30"], ["the United Kingdom", "Q145"], ["France", "Q142"], ["India", "Q668"], ["Japan", "Q17"], ["South Korea", "Q884"], ["Italy", "Q38"], ["Germany", "Q183"], ["Spain", "Q29"], ["Australia", "Q408"], ["Canada", "Q16"], ["Mexico", "Q96"], ["Brazil", "Q155"], ["China", "Q148"], ["Ireland", "Q27"], ["Sweden", "Q34"]]) {
  fam("people", "factor/" + slug(who), 2, `Name an actor or actress from ${who}`, `?i wdt:P106 wd:Q33999; wdt:P27 wd:${q}.`, "min=30 minans=20 surnames");
  fam("people", "fdirc/" + slug(who), 3, `Name a film director from ${who}`, `?i wdt:P106 wd:Q2526255; wdt:P27 wd:${q}.`, "min=20 minans=12 surnames");
}

let out = `// GENERATED by tools/film/make-catalog.mjs: the BOX OFFICE movie & TV prompts (pool "film").
// Answers: tools/build-catalog.mjs (Wikidata, ranked by how many Wikipedias cover each film, show or person).
export const FILM = \`
`;
for (const [topic, ls] of Object.entries(lines)) out += `# screen\n// ${topic}\n` + ls.join("\n") + "\n";
out += "`;\n\n// families the game already had that BOX OFFICE plays too: family id -> BOX OFFICE topic\nexport const FILM_JOIN = " + JSON.stringify(join, null, 1) + ";\n";
fs.writeFileSync(new URL("../../public/vroomillion/js/catalog/film.js", import.meta.url), out);
console.log("BOX OFFICE families:", Object.values(lines).reduce((a, l) => a + l.length, 0), Object.entries(lines).map(([k, v]) => `${k} ${v.length}`).join(", "), "| joined existing:", Object.keys(join).length);
