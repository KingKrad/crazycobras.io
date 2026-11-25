// BOX OFFICE: writes the movie & TV prompt catalog (public/vroomillion/js/catalog/film.js) from
// tools/film/lists.json (tools/film/fetch-lists.mjs). Every family is in the "film" pool only, with a
// Wikidata rule; TRAFFIC is Wikidata's best-known answers (autotop). Prompts the game already has join
// the pool instead (FILM_JOIN), like WORLD TOUR's.
//   node tools/film/make-catalog.mjs     then   node tools/build-catalog.mjs   (builds the answers)
import fs from "node:fs";
import { FAMILIES } from "../../public/vroomillion/js/catalog/index.js";
import { answerSlug } from "../../public/vroomillion/js/racepick.js";
import { MOVIES, SMALL } from "./movies.mjs";

const L = JSON.parse(fs.readFileSync(new URL("./lists.json", import.meta.url), "utf8"));
const have = new Map(FAMILIES.filter((f) => !(f.pools.length === 1 && f.pools[0] === "film")).flatMap((f) => f.prompts.map((p) => [p.toLowerCase(), f])));
const DROPPED = new Set(fs.existsSync(new URL("./dropped.json", import.meta.url)) ? JSON.parse(fs.readFileSync(new URL("./dropped.json", import.meta.url), "utf8")) : []);
const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "").slice(0, 24);
const TOPICS = ["director", "star", "franchise", "characters", "tv", "studio", "era", "genre", "awards", "people"];
const lines = Object.fromEntries(TOPICS.map((t) => [t, []]));
const join = {};
const used = new Set();
// alts: how the game's older prompts word the same thing ("Name a Brad Pitt movie"): those join instead
function fam(topic, id, lvl, prompt, where, opts = "", alts = []) {
  if (DROPPED.has(id)) return;
  const key = prompt.toLowerCase();
  const old = [key, ...alts.map((a) => a.toLowerCase())].find((k) => have.has(k));
  // a joined family keeps its own level elsewhere; in BOX OFFICE it plays at this list's level ("topic:level")
  if (old) { const f = have.get(old); join[f.id] = lvl !== f.level ? `${topic}:${lvl}` : topic; return; } // BOX OFFICE's own level for it
  if (used.has(key) || used.has("id:" + id) || /\|/.test(prompt + (typeof where === "string" ? where : ""))) return;
  used.add(key); used.add("id:" + id);
  if (where && typeof where === "object") { handFam(topic, id, lvl, prompt, where); return; }
  lines[topic].push(`${id} | ${lvl} | film | g:${topic} | ${prompt} | autotop=12 max=800 ${opts} w:${where} |`);
}
// a hand-written family (tools/film/movies.mjs): its catalog line carries the obvious answers, and its
// answer file is written here (tools/build-catalog.mjs never overwrites it)
function handFam(topic, id, lvl, prompt, tiers) {
  const a = [...tiers, []].slice(0, 5).map((t) => [...t]);
  const top = a[0].map((e) => e.split("|")[0]);
  if (top.some((t) => /[,|]/.test(t)) || top.length < 5) throw new Error("bad hand list for " + prompt);
  lines[topic].push(`${id} | ${lvl} | film | g:${topic} | ${prompt} | | ${top.join(", ")}`);
  const file = new URL(`../../public/vroomillion/answers/${answerSlug(prompt)}.json`, import.meta.url);
  fs.writeFileSync(file, JSON.stringify({ q: prompt, a, tiers: [999999, 999999], fam: id, hand: true }));
}
const FILM = "?i wdt:P31/wdt:P279* wd:Q11424."; // * : animated features are a subclass of a subclass
const SHOW = "?i wdt:P31/wdt:P279? wd:Q5398426.";
const lvl = (i, a, b) => (i < a ? 1 : i < b ? 2 : 3);
const clean = (n) => n.replace(/\s*\(.*?\)\s*/g, " ").trim();

const alsoAs = (n) => [`Name a ${clean(n)} movie`, `Name an ${clean(n)} movie`, `Name a ${clean(n)} film`, `Name an ${clean(n)} film`];
// the game's older hand-written character prompts ("Name a Simpsons character") join instead
const charAs = (n) => [...new Set([clean(n), noThe(n)])].flatMap((x) => [`Name a ${x} character`, `Name an ${x} character`]);
const an = (s) => (/^[aeiou]/i.test(s) ? "an " : "a ") + s;
const noThe = (s) => clean(s).replace(/^The /, "");
// characters: present in the show, or in at least two of its episodes/films (one is just a crossover guest:
// Scooby-Doo in Supernatural, the Simpsons in Family Guy)
const BY = "{ ?i wdt:P1441 wd:%s. } UNION { ?i wdt:P8345 wd:%s. } UNION { ?w wdt:P179 wd:%s; wdt:P674 ?i. ?v wdt:P179 wd:%s; wdt:P674 ?i. FILTER(?w != ?v) }";
const CHAR = (q) => BY.replace(/%s/g, q) + " ?i wdt:P31/wdt:P279* wd:Q95074.";
// Everyday names only: BOX OFFICE is for everyone, so the lists are cut to the best-known (hand-picked,
// best-known first in tools/film/names.mjs) and the wording is what people say ("a Christopher Nolan film").
// a/an by sound: "an HBO show", "an MTV show", "an '80s movie"
const an2 = (s) => (/^([aeiou]|'8|8|(HBO|FX|MTV|NBC|AMC|ABC|A24)\b)/i.test(s) ? "an " : "a ") + s;
const NICHE_SHOWS = new Set(["Neighbours", "EastEnders", "Coronation Street", "Only Fools and Horses", "Fawlty Towers", "Twin Peaks",
  "Battlestar Galactica", "ER", "Cheers", "Frasier", "The Wire", "Dark", "Thomas & Friends", "Hey Arnold!", "Courage the Cowardly Dog",
  "Sailor Moon", "Death Note", "Star Trek: The Next Generation", "Doctor Who", "Prison Break", "Lost", "Desperate Housewives", "The X-Files",
  "Buffy the Vampire Slayer", "Supernatural", "Gilmore Girls", "Gossip Girl", "Dexter", "Mad Men", "Succession", "Westworld", "Arrested Development"]);
const NICHE_FRANCHISES = new Set(["Police Academy", "American Pie", "Pokémon", "Tom and Jerry", "Scooby-Doo", "The Conjuring Universe", "Saw",
  "Friday the 13th", "A Nightmare on Elm Street", "Halloween", "Winnie-the-Pooh", "The Muppets", "Planet of the Apes", "King Kong", "Godzilla",
  "Rambo", "DC Extended Universe", "Alien", "Terminator", "Barbie", "Wizarding World", "Middle-earth", "Mad Max"]);
const NETWORKS = { Netflix: 1, "Disney+": 1, Nickelodeon: 1, "Disney Channel": 1, "Cartoon Network": 1, HBO: 1, NBC: 2, CBS: 2,
  "American Broadcasting Company": 2, "Fox Broadcasting Company": 2, "Prime Video": 2, Hulu: 2, "Apple TV+": 2, "BBC One": 2, "The CW": 2, MTV: 2, AMC: 2, "Comedy Central": 2 };
// studios: only the family names everyone knows from the logo before the film
const STUDIOS = { Pixar: [1, "Pixar"], "Walt Disney Animation Studios": [1, "Disney animated"], "DreamWorks Animation": [1, "DreamWorks"],
  "Marvel Studios": [1, "Marvel Studios"], Illumination: [2, "Illumination"], "Studio Ghibli": [2, "Studio Ghibli"], "Walt Disney Pictures": [2, "Disney"] };
const SHORT = { "Fox Broadcasting Company": "Fox", "American Broadcasting Company": "ABC" };
// "Name a Breaking Bad character", but "Name a character from The Office"
const charPrompt = (n) => (/^The /.test(clean(n)) ? `Name a character from ${clean(n)}` : `Name ${an2(clean(n))} character`);

// directors: only the household names, and only ever as the race's tricky prompt (most players don't know who made what)
L.directors.slice(0, 12).forEach((d, i) => fam("director", "fdir/" + slug(d.name), 2, `Name ${an2(clean(d.name))} film`, `?i wdt:P57 wd:${d.q}. ${FILM}`, "min=1 minans=6", [...alsoAs(d.name), `Name a film directed by ${clean(d.name)}`]));
L.actors.slice(0, 120).forEach((a, i) => fam("star", "fstar/" + slug(a.name), lvl(i, 60, 120), `Name ${an2(clean(a.name))} movie`, `{ ?i wdt:P161 wd:${a.q}. } UNION { ?i wdt:P725 wd:${a.q}. } ${FILM}`, "min=1 minans=8", [...alsoAs(a.name), `Name a movie starring ${clean(a.name)}`]));
L.shows.filter((s) => !NICHE_SHOWS.has(s.name)).forEach((s, i) => fam("characters", "fchar/" + slug(s.name), lvl(i, 40, 80), charPrompt(s.name), CHAR(s.q), "min=1 minans=8", charAs(s.name)));
L.franchises.filter((s) => !NICHE_FRANCHISES.has(s.name)).forEach((s, i) => {
  fam("characters", "ffran/" + slug(s.name), lvl(i, 30, 60), charPrompt(s.name), CHAR(s.q), "min=1 minans=8", charAs(s.name));
  if (SMALL.includes(s.name)) return; // too few films for a prompt
  fam("franchise", "fmovie/" + slug(s.name), lvl(i, 35, 60), `Name ${an(noThe(s.name))} movie`,
    MOVIES[s.name] || `{ ?i wdt:P179+ wd:${s.q}. } UNION { ?i wdt:P8345 wd:${s.q}. } ${FILM}`, "min=1 minans=5", [...alsoAs(noThe(s.name)), ...alsoAs(clean(s.name))]);
});
L.networks.filter((n) => NETWORKS[n.name]).forEach((n) => fam("tv", "fnet/" + slug(n.name), NETWORKS[n.name], `Name ${an2(SHORT[n.name] || clean(n.name))} show`, `?i wdt:P449 wd:${n.q}. ${SHOW}`, "min=2 minans=10"));
L.studios.filter((s) => STUDIOS[s.name]).forEach((s) => fam("studio", "fstudio/" + slug(s.name), STUDIOS[s.name][0], `Name ${an2(STUDIOS[s.name][1])} movie`, `?i wdt:P272 wd:${s.q}. ${FILM}`, "min=1 minans=8"));
const decade = (y) => (y >= 2000 ? `${y}s` : `'${String(y).slice(2)}s`);
for (let y = 1950; y <= 2020; y += 10) fam("era", "fera/" + y, y >= 1980 ? 1 : 2, `Name ${an2(decade(y))} movie`, `?i wdt:P31 wd:Q11424; wdt:P577 ?d. FILTER(YEAR(?d) >= ${y} && YEAR(?d) <= ${y + 9}) FILTER NOT EXISTS { ?i wdt:P577 ?e. FILTER(YEAR(?e) < ${y}) }`, "min=15 minans=20", [`Name a movie from the ${y}s`]);
for (let y = 1990; y <= 2020; y += 10) fam("era", "ftv/" + y, 2, `Name ${an2(decade(y))} TV show`, `?i wdt:P31 wd:Q5398426; wdt:P580 ?d. FILTER(YEAR(?d) >= ${y} && YEAR(?d) <= ${y + 9}) FILTER NOT EXISTS { ?i wdt:P580 ?e. FILTER(YEAR(?e) < ${y}) }`, "min=15 minans=20");
const GENRES = [["a horror movie", "Q200092"], ["a science fiction movie", "Q471839"], ["a western", "Q172980"], ["a movie musical", "Q842256"], ["a war movie", "Q369747"], ["a romantic comedy", "Q860626"], ["a superhero movie", "Q1535153"], ["a crime movie", "Q959790"], ["a fantasy movie", "Q157394"], ["a thriller", "Q2484376"], ["a disaster movie", "Q846544"], ["a heist movie", "Q496523"], ["a spy movie", "Q2297927"], ["a sports movie", "Q1135802"]];
GENRES.forEach(([g, q], i) => fam("genre", "fgenre/" + slug(g), i < 8 ? 1 : 2, `Name ${g}`, `?i wdt:P136 wd:${q}. ${FILM}`, "min=8 minans=15"));
for (const [g, w] of [["a sitcom", "?i wdt:P136 wd:Q170238."], ["a cartoon TV show", "?i wdt:P31 wd:Q581714."], ["a reality TV show", "?i wdt:P136 wd:Q182415."], ["an anime series", "?i wdt:P31 wd:Q63952888."], ["a TV drama", "?i wdt:P136 wd:Q1366112. ?i wdt:P31 wd:Q5398426."]])
  fam("tv", "ftvg/" + slug(g), 1, `Name ${g}`, w, "min=8 minans=15");
for (const [what, q] of [["a Best Picture winner", "Q102427"], ["a Best Actor Oscar winner", "Q103916"], ["a Best Actress Oscar winner", "Q103618"], ["a Best Animated Feature winner", "Q106800"]])
  fam("awards", "faward/" + slug(what), 2, `Name ${what}`, `?i wdt:P166 wd:${q}. ` + (/(Actor|Actress) Oscar/.test(what) ? "?i wdt:P31 wd:Q5." : FILM), "min=1 minans=10");

let out = `// GENERATED by tools/film/make-catalog.mjs: the BOX OFFICE movie & TV prompts (pool "film").
// Answers: tools/build-catalog.mjs (Wikidata, ranked by how many Wikipedias cover each film, show or person).
export const FILM = \`
`;
for (const [topic, ls] of Object.entries(lines)) out += `# screen\n// ${topic}\n` + ls.join("\n") + "\n";
out += "`;\n\n// families the game already had that BOX OFFICE plays too: family id -> BOX OFFICE topic\nexport const FILM_JOIN = " + JSON.stringify(join, null, 1) + ";\n";
fs.writeFileSync(new URL("../../public/vroomillion/js/catalog/film.js", import.meta.url), out);
console.log("BOX OFFICE families:", Object.values(lines).reduce((a, l) => a + l.length, 0), Object.entries(lines).map(([k, v]) => `${k} ${v.length}`).join(", "), "| joined existing:", Object.keys(join).length);
