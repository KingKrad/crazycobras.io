// Live answer check: an answer that isn't on a prompt's list is looked up on Wikidata, and counts if
// the item it finds is the right kind of thing for the prompt (src/answer-classes.js, generated from
// the same rules as the answer lists). This is how "mayochup" counts as a condiment. There is no AI judge:
// a prompt without a Wikidata rule accepts only the answers on its lists.
import { CLASSES, BLOCK } from "./answer-classes.js";
import { CATALOG_CLASSES } from "./catalog-classes.js";
import { json, readForm, clientIp } from "./accounts.js";
import { approvedAnswer } from "./stats.js";

export const BLOCK_RE = new RegExp(BLOCK + "|\\b(pussy|shit|fuck\\w*|bitch|cunt|whore|slut|nigg\\w*)\\b", "i"); // (Wikidata names a few things rudely)
const WDQS = "https://query.wikidata.org/sparql";

export const cleanAnswer = (s) => String(s ?? "")
  .normalize("NFC")
  .replace(/[^\p{L}\p{N} '&.\-]/gu, " ")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, 60);

const sparqlString = (s) => '"' + s.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';

// exact: the item's name or an alias must be the answer itself (for loose rules such as "described as an
// insect", where a fuzzy search hit like "Elephantomyia" for "elephant" would otherwise pass)
export function checkQuery(where, answer, exact = false) {
  const same = exact ? `\n  ?i rdfs:label|skos:altLabel ?m. FILTER(LCASE(STR(?m)) = LCASE(${sparqlString(answer)}))` : "";
  return `SELECT ?l ?n WHERE {
  SERVICE wikibase:mwapi { bd:serviceParam wikibase:endpoint "www.wikidata.org"; wikibase:api "EntitySearch"; mwapi:search ${sparqlString(answer)}; mwapi:language "en"; mwapi:limit "${exact ? 20 : 7}". ?i wikibase:apiOutputItem mwapi:item. ?ord wikibase:apiOrdinal true. }
  ?i wikibase:sitelinks ?n.
  ?i rdfs:label ?l. FILTER(lang(?l) IN ("en", "mul")) # many famous names exist only as "mul" labels
  FILTER EXISTS { ${where} }${same}
} ORDER BY ?ord LIMIT 1`;
}

export async function handleCheck(request, env, fetchImpl = fetch) {
  if (request.method !== "POST") return json({ error: "Use POST." }, 405);
  if (env.CHECK_LIMITER) {
    const ip = clientIp(request, env);
    const { success } = await env.CHECK_LIMITER.limit({ key: ip });
    if (!success) return json({ found: false, reason: "busy" }, 429);
  }
  const body = await readForm(request, 1000);
  const prompt = String(body?.prompt ?? "");
  const cls = CLASSES[prompt] || CATALOG_CLASSES[prompt];
  const answer = cleanAnswer(body?.answer);
  // answers the admin approved from the MISSED list count for any prompt (never cached: approving is instant)
  if (answer.length >= 3) { const ok = await approvedAnswer(env, prompt, answer); if (ok) return json(ok); }
  if (!cls || answer.length < 3 || !/\p{L}/u.test(answer) || BLOCK_RE.test(answer)) return json({ found: false });

  const cacheKey = new Request(`https://answer-check.invalid/${encodeURIComponent(body.prompt)}/${encodeURIComponent(answer.toLowerCase())}`);
  const cache = typeof caches !== "undefined" ? caches.default : null;
  const cached = cache && (await cache.match(cacheKey));
  if (cached) return cached;

  // A failed lookup (not a "no") is reported, and not remembered, so the player can try again.
  const wd = await wikidataLookup(cls, answer, fetchImpl);
  if (wd.failed) return json({ found: false, reason: "lookup failed" }, wd.failed);
  const out = json(wd.found ? { found: true, label: wd.label, n: wd.n, tiers: cls.tiers } : { found: false });
  out.headers.set("Cache-Control", "public, max-age=86400");
  if (cache) await cache.put(cacheKey, out.clone());
  return out;
}

// Wikidata's query service is sometimes briefly busy: retry once if it said no quickly, but never keep
// a player waiting more than about 4 seconds in all (the race clock is running).
async function wikidataLookup(cls, answer, fetchImpl) {
  const ask = (ms) => fetchImpl(WDQS, {
    method: "POST",
    headers: { Accept: "application/sparql-results+json", "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "vroomillion-answer-check/1.0" },
    body: "query=" + encodeURIComponent(checkQuery(cls.where, answer, !!cls.exact)),
    signal: AbortSignal.timeout(ms),
  });
  try {
    const t0 = Date.now();
    let res;
    try { res = await ask(3000); } catch { res = null; }
    if ((!res || !res.ok) && Date.now() - t0 < 1500) res = await ask(2500);
    if (!res) return { found: false, failed: 504 };
    if (!res.ok) return { found: false, failed: 502 };
    const row = (await res.json()).results?.bindings?.[0];
    if (!row) return { found: false };
    const label = String(row.l.value).replace(/\s*\([^)]*\)\s*/g, " ").trim().toLowerCase();
    const n = Number(row.n.value) || 0;
    const ex = cls.exclude ? new RegExp(cls.exclude, "i") : null;
    // titleRx: word-in-title prompts ("a movie with a number in the title") also need the right word in the name
    const title = cls.titleRx ? new RegExp(cls.titleRx, "i") : null;
    const found = !!label && label.length <= 60 && !BLOCK_RE.test(label) && !(ex && ex.test(label)) && !(title && !title.test(label));
    return { found, label, n };
  } catch {
    return { found: false, failed: 504 };
  }
}
