// Deploy-time build step (vercel.json buildCommand): tags every script, stylesheet, font and answer-list
// link with this deploy's version (?v=<commit>), so browsers can cache them for a year (vercel.json
// headers) and a new deploy always loads fresh files together. Also lists the start-up scripts as
// modulepreload links so they download in parallel instead of one after another.
// Runs on the deploy server's copy of the files; the repository itself is never changed.
import fs from "node:fs";
import path from "node:path";

const ROOT = new URL("../public/vroomillion/", import.meta.url).pathname;
const V = (process.env.VERCEL_GIT_COMMIT_SHA || process.env.STAMP || String(Date.now())).slice(0, 12);
const tag = (url) => (/\?v=/.test(url) ? url : `${url}?v=${V}`);

// relative module imports: from "./x.js" and import("./x.js")
const stampJs = (src) => src
  .replace(/(from\s+["'])(\.\/[\w./-]+\.js)(["'])/g, (m, a, u, b) => a + tag(u) + b)
  .replace(/(import\(\s*["'])(\.\/[\w./-]+\.js)(["']\s*\))/g, (m, a, u, b) => a + tag(u) + b)
  // the prompt-list worker: new URL("./questions-worker.js", import.meta.url)
  .replace(/(new URL\(\s*["'])(\.\/[\w.-]+\.js)(["']\s*,\s*import\.meta\.url\))/g, (m, a, u, b) => a + tag(u) + b)
  // the long-tail answer lists (deep.js fetches deep/<file> and deep/index.json)
  // the new catalog's answer files (main.js fetches answers/<slug>.json)
  .replace(/fetch\("answers\/" \+ answerSlug\(p\) \+ "\.json"\)/g, `fetch("answers/" + answerSlug(p) + ".json?v=${V}")`)
  .replace(/fetch\("deep\/index\.json"\)/g, `fetch("deep/index.json?v=${V}")`)
  .replace(/fetch\("deep\/" \+ index\[p\]\.file\)/g, `fetch("deep/" + index[p].file + "?v=${V}")`);

const jsDir = path.join(ROOT, "js");
// this deploy's version, for the in-game auto-update check
fs.writeFileSync(path.join(ROOT, "version.json"), JSON.stringify({ v: V }) + "\n");
{
  const m = path.join(jsDir, "main.js");
  fs.writeFileSync(m, fs.readFileSync(m, "utf8").replace('const BUILD = "dev";', `const BUILD = ${JSON.stringify(V)};`));
}
// every script, including the prompt catalog in js/catalog (cached for a year too, so it must be tagged)
for (const dir of [jsDir, path.join(jsDir, "catalog")]) {
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".js"))) {
    const p = path.join(dir, f);
    fs.writeFileSync(p, stampJs(fs.readFileSync(p, "utf8")));
  }
}

// fonts inside the stylesheet
const css = path.join(ROOT, "style.css");
fs.writeFileSync(css, fs.readFileSync(css, "utf8").replace(/url\("?(fonts\/[\w.-]+)"?\)/g, (m, u) => `url("${tag(u)}")`));

// the pages: script, stylesheet, font preload, and modulepreload for main.js's own imports
const mainSrc = fs.readFileSync(path.join(jsDir, "main.js"), "utf8");
const deps = new Set();
const walk = (file) => {
  const src = fs.readFileSync(path.join(jsDir, file), "utf8");
  for (const m of src.matchAll(/from\s+["']\.\/([\w.-]+\.js)/g)) if (!deps.has(m[1])) { deps.add(m[1]); walk(m[1]); }
};
void mainSrc;
walk("main.js");
for (const page of fs.readdirSync(ROOT).filter((f) => f.endsWith(".html"))) {
  const p = path.join(ROOT, page);
  let html = fs.readFileSync(p, "utf8")
    .replace(/(src=")(js\/[\w.-]+\.js)(")/g, (m, a, u, b) => a + tag(u) + b)
    .replace(/(href=")(style\.css)(")/g, (m, a, u, b) => a + tag(u) + b)
    .replace(/(href=")(fonts\/[\w.-]+)(")/g, (m, a, u, b) => a + tag(u) + b);
  if (page === "index.html") {
    const preload = [...deps].map((d) => `  <link rel="modulepreload" href="js/${d}?v=${V}">`).join("\n");
    html = html.replace("</head>", `${preload}\n</head>`);
  }
  fs.writeFileSync(p, html);
}
console.log(`stamped version ${V}: ${deps.size} start-up modules preloaded`);
