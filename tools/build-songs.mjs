// Every song by an artist, from Wikipedia: the artist's "List of songs recorded by ..." page (when there is
// one), the singles tables on their discography pages (including songs they're featured on), and the track
// listing of every album, EP and mixtape those pages link to. Writes the long tail into
// public/vroomillion/deep/<prompt>.json (merged with what's there), so every one of them counts instantly.
//
//   node tools/build-songs.mjs                      all single-artist song prompts
//   node tools/build-songs.mjs --only "Name a Drake song;Name an Adele song"
//
// Songs with their own Wikipedia article score as FAST LANE, the rest (album tracks) as DEEP CUT; the
// hand-written and generated tiers in data*.js always win over these.
import fs from "node:fs";
import { normalize } from "../public/vroomillion/js/logic.js";
import { tableSongs, trackSongs, albumLinks, albumArtist } from "./wiki-parse.mjs";

const args = process.argv.slice(2);
const only = args.includes("--only") ? new Set(args[args.indexOf("--only") + 1].split(";")) : null;
const DEEP_DIR = new URL("../public/vroomillion/deep/", import.meta.url);
const CACHE = process.env.WIKI_CACHE || null; // optional folder to keep fetched pages between runs
const UA = "vroomillion-answer-builder/1.0 (trivia game answer lists)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const deepSlug = (q) => q.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// One page's wikitext (following redirects). null when there's no such page.
async function wikitext(title) {
  const file = CACHE && `${CACHE}/${encodeURIComponent(title)}.json`;
  if (file && fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));
  const url = "https://en.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&redirects=1&titles=" + encodeURIComponent(title);
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (res.status === 429 || res.status >= 500) { await sleep(2000 * (attempt + 1)); continue; }
      const j = await res.json();
      const page = j.query?.pages?.[0];
      const out = page && !page.missing ? { title: page.title, text: page.revisions?.[0]?.slots?.main?.content || "" } : null;
      if (file) fs.writeFileSync(file, JSON.stringify(out));
      await sleep(150);
      return out;
    } catch { await sleep(1500 * (attempt + 1)); }
  }
  return null;
}

const BAD = /^(?:untitled|unreleased|tba|tbd|n\/a|none|—|-|various|bonus tracks?|hidden track|interlude|intro|outro|skit|\d+)$/i;

async function songsBy(artist, extraPages = []) {
  const songs = new Map(); // key -> { title, linked }
  const add = (list, album) => {
    for (const s of list) {
      const k = normalize(s.title);
      if (!s.title || s.title.length > 70 || BAD.test(s.title) || !k || k.length < 1) continue;
      if (/\b(?:discography|album|mixtape|tour)\b/i.test(s.title) && !album) continue;
      const had = songs.get(k);
      if (!had) songs.set(k, s);
      else if (s.linked) had.linked = true;
    }
  };
  const lists = [`List of songs recorded by ${artist}`, `List of songs by ${artist}`, ...extraPages];
  for (const t of lists) {
    const p = await wikitext(t);
    if (p && /^List of/i.test(p.title)) add([...tableSongs(p.text)]);
  }
  const discs = [`${artist} discography`, `${artist} singles discography`, `${artist} albums discography`];
  const albums = new Set();
  for (const t of discs) {
    const p = await wikitext(t);
    if (!p || !/discography/i.test(p.title)) continue;
    add(tableSongs(p.text));
    for (const a of albumLinks(p.text)) albums.add(a);
  }
  // only the artist's own albums: soundtracks, compilations and tributes they're on bring other people's songs
  const own = normalize(artist.replace(/^the /i, ""));
  let used = 0;
  for (const a of [...albums].slice(0, 120)) {
    const p = await wikitext(a);
    if (!p) continue;
    const by = normalize(albumArtist(p.text).replace(/^the /i, ""));
    if (!by || !(by === own || by.startsWith(own + " and ") || by.startsWith(own + " ") || by.includes(own))) continue;
    if (/\b(?:various artists|soundtrack|cast)\b/i.test(albumArtist(p.text))) continue;
    add(trackSongs(p.text), true);
    used++;
  }
  albums.used = used;
  return { songs: [...songs.values()], albums: albums.used ?? 0 };
}

// ---- run ----
const { PROMPTS } = await import("./prompt-sources.mjs");
const targets = Object.entries(PROMPTS).filter(([, v]) => v.performer).map(([q, v]) => [q, v.performer, (v.pages || []).filter((p) => /^List of/.test(p))]);
targets.push(["Name a Beatles song", "The Beatles", ["List of songs recorded by the Beatles"]]);
const dataFile = new URL("../public/vroomillion/js/data.js", import.meta.url);
const { QUESTIONS } = await import(dataFile.href);
for (let [q, artist, pages] of targets) {
  if (only && !only.has(q)) continue;
  // the game may word it "Name a song by The Weeknd"
  const question = QUESTIONS.find((x) => x.q === q) || QUESTIONS.find((x) => x.q === `Name a song by ${artist}`);
  if (!question) { console.log("?? no such prompt:", q); continue; }
  q = question.q;
  const known = new Set((question?.a || []).flat().flatMap((e) => e.split("|")).map(normalize));
  const { songs, albums } = await songsBy(artist, pages);
  const file = new URL(deepSlug(q) + ".json", DEEP_DIR);
  const old = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : { q, tiers: [70, 25], a: [] };
  const tiers = old.tiers || [70, 25];
  const have = new Set(old.a.flatMap(([e]) => e.split("|")).map(normalize));
  let added = 0;
  for (const s of songs) {
    const k = normalize(s.title);
    if (have.has(k)) continue;
    have.add(k);
    // "teach u a lesson (freestyle)" also counts as "teach u a lesson"
    const bare = s.title.replace(/\s*\([^)]*\)\s*/g, " ").trim();
    const forms = [s.title.toLowerCase(), ...(bare && bare !== s.title && !have.has(normalize(bare)) ? [bare.toLowerCase()] : [])];
    forms.slice(1).forEach((f) => have.add(normalize(f)));
    old.a.push([forms.join("|"), s.linked ? tiers[1] : 0]);
    if (!known.has(k)) added++;
  }
  if (old.a.length < 5) { console.log(`-- ${q}: only ${old.a.length}, skipped`); continue; }
  fs.writeFileSync(file, JSON.stringify({ q, tiers, a: old.a }));
  const total = new Set([...known, ...have]).size;
  console.log(`${q}: ${songs.length} songs from Wikipedia (${albums} albums), ${added} new, ${total} in all`);
}
// rebuild deep/index.json
const index = {};
for (const f of fs.readdirSync(DEEP_DIR).filter((f) => f.endsWith(".json") && f !== "index.json")) {
  const d = JSON.parse(fs.readFileSync(new URL(f, DEEP_DIR), "utf8"));
  index[d.q] = { file: f, n: d.a.length };
}
fs.writeFileSync(new URL("index.json", DEEP_DIR), JSON.stringify(index));
console.log("deep index:", Object.keys(index).length, "prompts");
