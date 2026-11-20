// Pulling song titles out of Wikipedia wikitext (used by tools/build-songs.mjs; tested in test/).

// "[[Hotline Bling|Hotline Bling]]{{ref}}" -> "Hotline Bling"
export function cleanTitle(raw) {
  let t = String(raw)
    .replace(/<ref[^>]*\/>/g, "").replace(/<ref[\s\S]*?<\/ref>/g, "").replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\{\{(?:sort|sortname)\|[^|}]*\|([^}]*)\}\}/gi, "$1")
    .replace(/\{\{(?:nowrap|nobr|lang\|[a-z-]+)\|([^}]*)\}\}/gi, "$1")
    .replace(/\{\{[^}]*\}\}/g, "")
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1")
    .replace(/'''?/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/\s*\((?:featuring|feat\.|ft\.|with|remix|demo|live|acoustic|interlude|skit|bonus|edit|version|reprise|intro|outro)[^)]*\)\s*/gi, " ")
    .replace(/\s*\[[^\]]*\]\s*/g, " ")
    .replace(/^["“”\s]+|["“”\s]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return t;
}

const linked = (raw) => /\[\[/.test(raw);

// Song titles in a page's tables: quoted titles at the start of a row ('! scope="row" | "[[Song]]"').
export function tableSongs(text) {
  const out = [];
  for (const line of text.split("\n")) {
    if (!/^\s*[!|]/.test(line) || /Episode:|^\s*\|\s*(?:title|caption|alt)\s*=/i.test(line)) continue;
    // cell attributes first (scope="row", rowspan="2", style="..."), then the quoted title
    const m = line.match(/^\s*[!|]\s*(?:(?:[a-z-]+\s*=\s*(?:"[^"]*"|[^\s|]+)\s*)+\|)?\s*(?:\{\{[^}]*\}\}\s*)?"(.+?)"(?=\s*(?:<ref|\{\{|\(|$|\|\||<br|<span))/i);
    if (m) out.push({ title: cleanTitle(m[1]), linked: linked(m[1]) });
  }
  return out;
}

// {{Track listing | title1 = ... | title2 = ...}}
export function trackSongs(text) {
  const out = [];
  for (const m of text.matchAll(/^\s*\|\s*title\d+\s*=\s*(.+)$/gim)) out.push({ title: cleanTitle(m[1]), linked: linked(m[1]) });
  return out;
}

// Albums, EPs and mixtapes in a discography page's tables: italic titles at the start of a row.
export function albumLinks(text) {
  const out = new Set();
  for (const line of text.split("\n")) {
    if (!/^\s*!/.test(line)) continue;
    const m = line.match(/''\[\[([^\]|#]+)(?:\|[^\]]*)?\]\]''/);
    if (m) out.add(m[1].trim());
  }
  return [...out];
}


// The album's own artist, from its infobox ("| artist = [[Olivia Rodrigo]]"), cleaned. "" if none.
export function albumArtist(text) {
  const m = text.match(/\|\s*artist\s*=\s*([^\n]*)/i);
  return m ? cleanTitle(m[1]) : "";
}
