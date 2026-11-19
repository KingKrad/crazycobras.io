// Live answer check: an answer that isn't on a prompt's list is looked up on Wikidata, and counts if
// the item it finds is the right kind of thing for the prompt (src/answer-classes.js, generated from
// the same rules as the answer lists). This is how "mayochup" counts as a condiment.
import { CLASSES, BLOCK } from "./answer-classes.js";
import { json } from "./accounts.js";

const BLOCK_RE = new RegExp(BLOCK, "i");
const WDQS = "https://query.wikidata.org/sparql";

export const cleanAnswer = (s) => String(s ?? "")
  .normalize("NFC")
  .replace(/[^\p{L}\p{N} '&.\-]/gu, " ")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, 60);

const sparqlString = (s) => '"' + s.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';

export function checkQuery(where, answer) {
  return `SELECT ?l ?n WHERE {
  SERVICE wikibase:mwapi { bd:serviceParam wikibase:endpoint "www.wikidata.org"; wikibase:api "EntitySearch"; mwapi:search ${sparqlString(answer)}; mwapi:language "en"; mwapi:limit "7". ?i wikibase:apiOutputItem mwapi:item. ?ord wikibase:apiOrdinal true. }
  ?i wikibase:sitelinks ?n.
  ?i rdfs:label ?l. FILTER(lang(?l) = "en")
  FILTER EXISTS { ${where} }
} ORDER BY ?ord LIMIT 1`;
}

export async function handleCheck(request, env, fetchImpl = fetch) {
  if (request.method !== "POST") return json({ error: "Use POST." }, 405);
  if (env.CHECK_LIMITER) {
    const ip = request.headers.get("cf-connecting-ip") || "unknown";
    const { success } = await env.CHECK_LIMITER.limit({ key: ip });
    if (!success) return json({ found: false, reason: "busy" }, 429);
  }
  let body;
  try { body = await request.json(); } catch { return json({ error: "Bad request." }, 400); }
  const cls = CLASSES[String(body?.prompt ?? "")];
  const answer = cleanAnswer(body?.answer);
  if (!cls || answer.length < 3 || !/\p{L}/u.test(answer) || BLOCK_RE.test(answer)) return json({ found: false });

  const cacheKey = new Request(`https://answer-check.invalid/${encodeURIComponent(body.prompt)}/${encodeURIComponent(answer.toLowerCase())}`);
  const cache = typeof caches !== "undefined" ? caches.default : null;
  const cached = cache && (await cache.match(cacheKey));
  if (cached) return cached;

  let found = false;
  let label = "";
  let n = 0;
  try {
    const res = await fetchImpl(WDQS, {
      method: "POST",
      headers: { Accept: "application/sparql-results+json", "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "vroomillion-answer-check/1.0" },
      body: "query=" + encodeURIComponent(checkQuery(cls.where, answer)),
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok) {
      const row = (await res.json()).results?.bindings?.[0];
      if (row) {
        label = String(row.l.value).replace(/\s*\([^)]*\)\s*/g, " ").trim().toLowerCase();
        n = Number(row.n.value) || 0;
        const ex = cls.exclude ? new RegExp(cls.exclude, "i") : null;
        found = !!label && label.length <= 60 && !BLOCK_RE.test(label) && !(ex && ex.test(label));
      }
    } else {
      return json({ found: false, reason: "lookup failed" }, 502);
    }
  } catch {
    return json({ found: false, reason: "lookup failed" }, 504);
  }
  const out = json(found ? { found, label, n, tiers: cls.tiers } : { found: false });
  out.headers.set("Cache-Control", "public, max-age=86400");
  if (cache) await cache.put(cacheKey, out.clone());
  return out;
}
