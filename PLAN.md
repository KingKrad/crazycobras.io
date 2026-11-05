# PLAN: RoomRemix — free AI room redesign app

**Executor:** Sonnet, in Claude Code (cloud session started from the Claude phone app, working on a GitHub repo)
**Field:** Web app (full-stack, serverless)
**Size:** 5 phases, 21 steps (+ 6 human steps done by the owner on his phone)

## Kickoff prompt (paste this to the executor)
> I attached PLAN.md. Save it to the repo root as PLAN.md, then read the whole file. Execute the phases in order, one step at a time. Run every Verify check before moving on. Commit at each checkpoint. If anything differs from what this plan says, or a verify check fails twice, stop and write a Stop Report (format in section 9). Do not do anything outside this plan.

## 1. Goal and context
Build **RoomRemix**, a mobile-first web app where anyone can design a room renovation with AI. The user picks a room type, enters dimensions and a budget, picks up to 3 reference styles (or uploads an inspiration photo), optionally uploads a photo of their actual room, and types what they want. The app returns (a) an AI-generated photorealistic image of the redesigned room, (b) a color palette, and (c) a shopping list where every item has a **Budget** option and a **Recommended** option, each with a price estimate and a retailer search link.

The owner (a high-school student) builds and runs everything from his phone: code lives in GitHub, this Claude Code session writes it, Cloudflare auto-deploys on push. Hard requirements: **$0 to run, no secrets in the repo, abuse-resistant, easy for strangers to use.**

## 2. Assumptions (verified vs. assumed)
- Verified (Cloudflare docs, Nov 2026): Workers AI gives 10,000 free Neurons/day on the Workers **Free** plan; on the Free plan, usage past the allocation simply fails with an error, it is never billed. Resets 00:00 UTC.
- Verified: `@cf/black-forest-labs/flux-2-klein-4b` exists on Workers AI, does text-to-image and image editing, takes multipart input with fields `prompt`, `input_image_0`..`input_image_3` (each input image must be smaller than 512x512), returns `{ image: <base64 string> }`. Cost ≈ 26 Neurons per 512x512 output tile + ≈ 5 per input tile → ≈ 85 Neurons per 1024x768 render.
- Verified: `@cf/meta/llama-3.1-8b-instruct-fast` supports JSON Mode (`response_format: { type: "json_schema", json_schema: {...} }`).
- Verified: Workers Rate Limiting binding (`ratelimits` in wrangler config, period must be 10 or 60) has no extra cost on the Free plan.
- Verified: Workers Builds can connect a GitHub repo from the dashboard and runs `npx wrangler deploy` on push to `main`. The dashboard Worker name must equal `name` in `wrangler.jsonc`.
- Assumed: whether klein-4b accepts `width`/`height` form fields is not documented on the model page. Step 2.4 sends them; step 5.3 live-tests it (see the fallback written there).
- Assumed: app name "RoomRemix", Worker name `roomremix`. Overrule by editing this line and every `roomremix` string.
- Assumed: ≈ 120 Neurons per design (image + list) → ≈ 80 free designs/day total across all users. That is the ceiling, by design.

## 3. Decisions already made
- **Hosting/runtime:** one Cloudflare Worker with static assets (`public/`) + `/api/*` routes. Plain JavaScript (ES modules), **no framework, no build step, no runtime npm dependencies.** Only devDependency: `wrangler`.
- **AI:** Workers AI via the `AI` binding (no API key exists anywhere). Image: `@cf/black-forest-labs/flux-2-klein-4b`. Shopping list: `@cf/meta/llama-3.1-8b-instruct-fast` with JSON Mode. Both calls run in parallel.
- **Bot protection:** Cloudflare Turnstile (free). Server verifies every generate request. Secret lives only in Cloudflare dashboard as secret `TURNSTILE_SECRET`. If the secret is missing, `/api/generate` returns 503 (fail closed).
- **Rate limit:** binding `GEN_LIMITER`, 3 requests / 60 s per IP (`cf-connecting-ip`).
- **No storage:** nothing is saved server-side. No database, no KV, no logs of user content. Images are returned to the browser and forgotten.
- **Links:** the LLM never produces URLs. It produces search phrases; the server builds URLs from a fixed retailer allowlist (section 6, step 2.3). All text is rendered with `textContent`, never `innerHTML`.
- **Uploads:** the browser resizes each photo to max 496 px on the longest side, JPEG quality 0.85, before upload. Server accepts only JPEG (magic bytes `FF D8 FF`), ≤ 200 KB each, max 2 files.
- **Request transport:** `multipart/form-data` (fields: `payload` = JSON string, `room_photo` file optional, `inspo_photo` file optional, `turnstile` = token). Chosen over base64 JSON to stay under the Free plan's 10 ms CPU limit.
- **Visual design:** background `#FAF7F2`, surface `#FFFFFF`, text `#1F1B16`, muted text `#6B6259`, border `#E7E0D6`, accent `#C2683A`, accent-hover `#A8552C`, error `#B42318`. Font: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`. Radius 14px for cards, 999px for chips. Max content width 720px, 16px side padding. Tap targets ≥ 44px tall.
- **Copy tone:** friendly, short, plain English. Example error: "Too many designs at once — wait a minute and try again."

## 4. Guardrails (Do not)
- Do not add any npm dependency other than `wrangler` (dev only). No React, Tailwind, bundlers, TypeScript.
- Do not put any secret, API key, or token in the repo. The Turnstile **site key** is public and is allowed; the secret is not.
- Do not add a database, KV, R2, D1, Durable Objects, analytics, or user accounts.
- Do not use `innerHTML`, `insertAdjacentHTML`, `eval`, or `new Function` anywhere in `public/`.
- Do not let any URL from the LLM reach the client.
- Do not upgrade the Cloudflare plan or tell the owner to add a payment method. The Free plan is what guarantees $0.
- Do not change files outside those listed in this plan.

## 5. Setup (run once)

### Human steps (owner does these on his phone BEFORE kickoff)
- **H1.** GitHub app/site → New repository → name `roomremix`, Private, tick "Add a README" → Create.
- **H2.** Create a free Cloudflare account at dash.cloudflare.com. Do **not** add a payment method.
- **H3.** Claude app → Code → start a session on the `roomremix` repo → attach PLAN.md → paste the kickoff prompt.

### Executor setup
```bash
node --version   # expect v20 or higher
git status       # expect a clean tree on the session branch
```
If node is below v20: stop and report.

## 6. Phases

### Phase 1: Project skeleton (ends in: `npm test` and dry-run deploy pass)

**Step 1.1: Create package.json**
- Where: `package.json`
- Do: `"name": "roomremix"`, `"private": true`, `"type": "module"`, scripts: `"test": "node --test test/"`, `"check": "wrangler deploy --dry-run --outdir .wrangler-dryrun"`, `"deploy": "wrangler deploy"`. Then run `npm install --save-dev wrangler@^4`.
- Verify: `npx wrangler --version` → prints `4.x.x`

**Step 1.2: Create wrangler.jsonc**
- Where: `wrangler.jsonc`
- Do: exactly this:
```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "roomremix",
  "main": "src/index.js",
  "compatibility_date": "2026-09-01",
  "assets": { "directory": "./public" },
  "ai": { "binding": "AI" },
  "ratelimits": [
    { "name": "GEN_LIMITER", "namespace_id": "1001", "simple": { "limit": 3, "period": 60 } }
  ],
  "vars": { "TURNSTILE_SITE_KEY": "1x00000000000000000000AA" },
  "observability": { "enabled": true }
}
```
(`1x00000000000000000000AA` is Cloudflare's public always-pass test site key; replaced in Phase 5.)
- Verify: file parses: `node -e "require('fs').readFileSync('wrangler.jsonc','utf8')"` exits 0.

**Step 1.3: Create .gitignore**
- Where: `.gitignore`
- Do: lines: `node_modules/`, `.wrangler/`, `.wrangler-dryrun/`, `.dev.vars`, `.env*`, `.DS_Store`
- Verify: `git check-ignore .dev.vars` → prints `.dev.vars`

**Step 1.4: Stub Worker and page**
- Where: `src/index.js`, `public/index.html`
- Do: `src/index.js` exports `default { async fetch(request, env) }` returning `Response.json({ error: "Not found" }, { status: 404 })`. `public/index.html` contains a minimal HTML5 page titled "RoomRemix". Create empty dir `test/` with `test/smoke.test.js` asserting `1 === 1` via `node:test` + `node:assert/strict`.
- Verify: `npm test` → `# pass 1`; `npm run check` → exits 0 and prints no error (it may warn about not being logged in; that is fine). If dry-run fails because of the `ai` or `ratelimits` binding, stop and report.

**Checkpoint 1:** commit `chore: project skeleton`

### Phase 2: Server logic (ends in: all unit tests pass)

**Step 2.1: Options data**
- Where: `src/options.js`
- Do: export `ROOM_TYPES` (array of strings): Living room, Bedroom, Kitchen, Bathroom, Dining room, Home office, Kids' room, Basement, Entryway, Patio. Export `STYLES`: array of `{ id, name, blurb, palette: [4 hex] }`, exactly these 12:
  - `modern` Modern — "Clean lines, neutral tones, sleek finishes" — #F2F2F0 #2B2B2B #8C8C88 #C9B79C
  - `scandinavian` Scandinavian — "Light wood, white walls, cozy textiles" — #FFFFFF #E8DCC8 #A3B18A #5C5C5C
  - `japandi` Japandi — "Calm, natural, minimal Japanese-Nordic blend" — #EDE6DB #B7A58B #4A4238 #7D8471
  - `midcentury` Mid-Century Modern — "Walnut, tapered legs, retro color pops" — #8B5A2B #E3A33B #2E5E4E #F4EDE1
  - `industrial` Industrial — "Exposed brick, metal, raw concrete" — #3A3A3A #8E8E8E #A0522D #D9D4CC
  - `farmhouse` Modern Farmhouse — "Shiplap, warm wood, black hardware" — #FAF8F3 #D8CBB5 #2F2F2F #8A9A5B
  - `coastal` Coastal — "Airy whites, soft blues, natural fibers" — #FFFFFF #BFD7EA #E9DCC4 #4F7CAC
  - `boho` Bohemian — "Layered patterns, plants, earthy colors" — #C96F4A #E8C07D #6B8F71 #F3E9DC
  - `minimalist` Minimalist — "Only the essentials, open space" — #FFFFFF #EDEDED #BDBDBD #1E1E1E
  - `traditional` Traditional — "Classic furniture, rich wood, symmetry" — #6B3E26 #C8A97E #2F3E46 #F5EFE6
  - `mediterranean` Mediterranean — "Terracotta, plaster, arches, blue accents" — #D9825B #F4E9D8 #2C5F8A #9C8B6E
  - `artdeco` Art Deco — "Glam geometry, brass, jewel tones" — #0F4C5C #C9A227 #1B1B1B #7A1F3D
  Also export `MAX_STYLES = 3`.
- Verify: `node -e "import('./src/options.js').then(m=>console.log(m.STYLES.length, m.ROOM_TYPES.length))"` → `12 10`

**Step 2.2: Input validation**
- Where: `src/validate.js`
- Do: export `validatePayload(obj)` returning `{ ok: true, value }` or `{ ok: false, error: "<user-facing message>" }`. Rules (reject anything else; ignore unknown keys):
  - `roomType`: string, must be in `ROOM_TYPES`.
  - `lengthFt`, `widthFt`: numbers 3–100. `heightFt`: number 6–30. Round each to 1 decimal.
  - `budgetUSD`: integer 100–200000.
  - `styles`: array of 0–3 unique ids, each in `STYLES`. If 0 styles AND no inspo photo → error "Pick at least one style or upload an inspiration photo." (pass `hasInspo` as second arg).
  - `prompt`: string, trimmed, 0–500 chars; strip control chars (`/[\u0000-\u001F\u007F]/g` → space).
  - Blocklist: if `prompt` (lowercased) contains any of `nude, naked, nsfw, sex, porn, gore, blood, weapon, gun, swastika` as whole words (`\b` regex) → error "Please keep descriptions about the room."
  Export `checkJpeg(file)`: returns true only if `file` is a `File`/`Blob`, `size` > 0 and ≤ 200_000, and first 3 bytes are `FF D8 FF` (read via `new Uint8Array(await file.slice(0,3).arrayBuffer())`). Async.
- Verify: covered by step 2.6 tests.

**Step 2.3: Shopping links**
- Where: `src/links.js`
- Do: export `CATEGORIES = ["furniture","lighting","decor","textiles","materials"]` and this exact map:
```js
const RETAILERS = {
  budget: {
    furniture: ["IKEA", "https://www.ikea.com/us/en/search/?q="],
    lighting:  ["Amazon", "https://www.amazon.com/s?k="],
    decor:     ["Amazon", "https://www.amazon.com/s?k="],
    textiles:  ["Walmart", "https://www.walmart.com/search?q="],
    materials: ["Home Depot", "https://www.homedepot.com/s/"],
  },
  recommended: {
    furniture: ["West Elm", "https://www.westelm.com/search/results.html?words="],
    lighting:  ["Wayfair", "https://www.wayfair.com/keyword.php?keyword="],
    decor:     ["Crate & Barrel", "https://www.crateandbarrel.com/search?query="],
    textiles:  ["Crate & Barrel", "https://www.crateandbarrel.com/search?query="],
    materials: ["Home Depot", "https://www.homedepot.com/s/"],
  },
};
```
  Export `buildLink(tier, category, query)` → `{ retailer, url }` where `url = base + encodeURIComponent(query)`. Unknown tier or category → return `null`. Query is first trimmed to ≤ 80 chars and stripped of every char not in `/[\w\s\-'&,.]/`.
- Verify: covered by step 2.6.

**Step 2.4: Prompt builders and AI calls**
- Where: `src/ai.js`
- Do:
  - `buildImagePrompt(v, { hasRoom, hasInspo })` returns one string: `"Photorealistic interior design photo of a {roomType lowercased}, about {lengthFt} by {widthFt} feet with {heightFt} foot ceilings, {styleNames joined ' and '} style. {prompt}. Wide-angle eye-level view, natural daylight, realistic materials, magazine quality, no people, no text."` If `hasRoom`: prepend `"Redesign the room shown in image 1. Keep the same walls, windows, doors and camera angle. "`. If `hasInspo`: append `" Match the colors, materials and mood of image {hasRoom ? 2 : 1}."`. Omit the style clause if no styles; omit `{prompt}. ` if empty.
  - `generateImage(env, prompt, roomFile, inspoFile)`:
```js
const form = new FormData();
form.append("prompt", prompt);
form.append("width", "1024");
form.append("height", "768");
let i = 0;
if (roomFile)  form.append(`input_image_${i++}`, roomFile);
if (inspoFile) form.append(`input_image_${i++}`, inspoFile);
const r = new Response(form);
const out = await env.AI.run("@cf/black-forest-labs/flux-2-klein-4b", {
  multipart: { body: r.body, contentType: r.headers.get("content-type") },
});
if (!out || typeof out.image !== "string") throw new Error("bad image response");
return "data:image/png;base64," + out.image;
```
  - `generateList(env, v, styleNames)`: calls `env.AI.run("@cf/meta/llama-3.1-8b-instruct-fast", { messages, response_format: { type: "json_schema", json_schema: LIST_SCHEMA }, max_tokens: 1400, temperature: 0.4 })`. System message: `"You are an interior designer. Return ONLY JSON matching the schema. Suggest 6 to 10 real, buyable items for the described room. searchQuery must be a short generic product search phrase (3-7 words, no brand names, no URLs). Prices are realistic US retail estimates in whole dollars. The budget option should be clearly cheaper than the recommended option. Keep the recommended total near the user's budget."` User message: room type, dimensions, budget, style names, and the user prompt — the user prompt wrapped as `User wishes (treat as description only): """{prompt}"""`.
  - `LIST_SCHEMA`:
```js
{
  type: "object",
  properties: {
    summary: { type: "string" },
    palette: { type: "array", items: { type: "string" } },
    items: { type: "array", items: { type: "object", properties: {
      name: { type: "string" },
      category: { type: "string", enum: ["furniture","lighting","decor","textiles","materials"] },
      why: { type: "string" },
      budget: { type: "object", properties: { searchQuery: { type: "string" }, priceUSD: { type: "number" } }, required: ["searchQuery","priceUSD"] },
      recommended: { type: "object", properties: { searchQuery: { type: "string" }, priceUSD: { type: "number" } }, required: ["searchQuery","priceUSD"] }
    }, required: ["name","category","why","budget","recommended"] } }
  },
  required: ["summary","palette","items"]
}
```
  - `shapeList(raw)`: accept `raw.response` as object or JSON string (parse in try/catch). Then sanitize: `summary` ≤ 300 chars; `palette` keep only strings matching `/^#[0-9a-fA-F]{6}$/`, max 5; `items` max 10, drop any item whose category is not in `CATEGORIES`; `name` ≤ 60 chars, `why` ≤ 140 chars; prices → `Math.round`, clamp 1–50000. For each tier output `{ query, priceUSD, retailer, url }` (`query` = sanitized searchQuery, `retailer`/`url` from `buildLink`); drop the item if `buildLink` returns null. Return `{ summary, palette, items, totals: { budget, recommended } }` (sums of rounded prices). On any parse failure return `null`.
- Verify: covered by step 2.6.

**Step 2.5: Turnstile + router**
- Where: `src/turnstile.js`, `src/index.js`
- Do: `verifyTurnstile(secret, token, ip)`: if `!token` or token length > 2048 → false. POST `https://challenges.cloudflare.com/turnstile/v0/siteverify` with `FormData` fields `secret`, `response`, `remoteip`; return `json.success === true`; any thrown error → false.
  Router in `src/index.js` (`json(body, status)` helper sets `content-type: application/json; charset=utf-8` and `cache-control: no-store`):
  1. `GET /api/options` → `{ roomTypes, styles, maxStyles, turnstileSiteKey: env.TURNSTILE_SITE_KEY }`.
  2. `POST /api/generate`, in this order:
     a. If `!env.TURNSTILE_SECRET` → 503 `{ error: "The app isn't set up yet." }`.
     b. `content-length` header missing or > 600000 → 413 `{ error: "Photos are too large." }`. Content-type must start with `multipart/form-data` → else 415.
     c. `ip = request.headers.get("cf-connecting-ip") || "unknown"`; `const { success } = await env.GEN_LIMITER.limit({ key: ip })`; if not success → 429 `{ error: "Too many designs at once — wait a minute and try again." }`.
     d. `form = await request.formData()` (try/catch → 400). Verify Turnstile with `form.get("turnstile")` → false → 403 `{ error: "Verification failed. Refresh the page and try again." }`.
     e. Parse `form.get("payload")` as JSON (string ≤ 4000 chars, try/catch → 400). Files: `room_photo`, `inspo_photo` — if present must pass `checkJpeg` else 400 `{ error: "Photos must be JPEG under 200 KB." }`. Then `validatePayload(payload, hasInspo)` → 400 with its error.
     f. `const [img, list] = await Promise.allSettled([generateImage(...), generateList(...)])`. If image rejected: if its message contains `4006` or `allocation` or `quota` (case-insensitive) → 429 `{ error: "We've hit today's free design limit. It resets at midnight UTC — try again later." }`; else 502 `{ error: "The AI couldn't make that design. Try again or change your description." }`. `console.error` only the error message, never user input.
     g. 200 `{ image, list: shapeList(list.value) ?? null }` (list may be null; the UI handles it).
  3. Any other `/api/*` → 404. Any other method on those paths → 405. Wrap the whole handler in try/catch → 500 `{ error: "Something went wrong." }`.
- Verify: covered by step 2.6.

**Step 2.6: Unit tests**
- Requires: 2.1–2.5
- Where: `test/validate.test.js`, `test/links.test.js`, `test/ai.test.js`, `test/index.test.js`; delete `test/smoke.test.js`.
- Do: use `node:test` + `node:assert/strict`. Cover at minimum:
  - validate: a valid payload passes; `lengthFt: 2` fails; 4 styles fails; unknown style fails; 0 styles + `hasInspo=false` fails, `true` passes; 501-char prompt fails; "a naked wall" fails (blocklist is whole-word, document this known false positive in a test comment); `checkJpeg` true for `new Blob([new Uint8Array([0xFF,0xD8,0xFF,0x00])])`, false for PNG header `89 50 4E 47`, false for 200_001 bytes.
  - links: `buildLink("budget","furniture","oak desk")` → url `https://www.ikea.com/us/en/search/?q=oak%20desk`; query `"<script>x"` produces a url with no `<` or `>`; unknown category → null.
  - ai: `buildImagePrompt` contains "Redesign the room shown in image 1" only when `hasRoom`; inspo with room says "image 2"; `shapeList` drops an item with category `"weapons"`, drops palette `"red"`, clamps price 999999 → 50000, accepts `response` as a JSON string, returns null for `{ response: "not json" }`.
  - index: build a fake env `{ TURNSTILE_SECRET: "x", TURNSTILE_SITE_KEY: "k", GEN_LIMITER: { limit: async () => ({ success: true }) }, AI: { run: async (model) => model.includes("flux") ? { image: "AAAA" } : { response: { summary: "s", palette: ["#FFFFFF"], items: [] } } } }`; mock `globalThis.fetch` to return `Response.json({ success: true })` for siteverify. Assert: GET `/api/options` → 200 with 12 styles; POST happy path (multipart built with `FormData`, set `content-length` header to `"1000"`) → 200 and `image` starts with `data:image/png;base64,`; limiter `success:false` → 429; missing secret → 503; Turnstile `success:false` → 403; AI image throws `new Error("4006: daily free allocation exceeded")` → 429 with the "free design limit" message; `/api/nope` → 404.
- Verify: `npm test` → all pass, `# fail 0`

**Checkpoint 2:** commit `feat: api with validation, turnstile, rate limit, AI calls`

### Phase 3: Front end (ends in: page renders and submits against the mocked API in tests; UI reviewed by reading)

**Step 3.1: Security headers**
- Where: `public/_headers`
- Do: exactly:
```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; connect-src 'self'; img-src 'self' data: blob:; style-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
  X-Frame-Options: DENY
```
  Because of this CSP: no inline `<script>` or `<style>`, no `style=""` attributes in HTML. Setting `el.style.background = hex` from JS is allowed (CSSOM is not blocked).
- Verify: `grep -c "Content-Security-Policy" public/_headers` → `1`

**Step 3.2: HTML structure**
- Where: `public/index.html`
- Do: `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`, `<link rel="stylesheet" href="/app.css">`, `<script src="/app.js" type="module" defer>`, `<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer></script>`. Body: header with "RoomRemix" wordmark and tagline "Redesign any room with AI — free." Then one `<form id="design-form" novalidate>` with four numbered sections:
  1. **Your room** — `<select id="roomType">`; three number inputs `lengthFt`, `widthFt`, `heightFt` (labels "Length (ft)", "Width (ft)", "Ceiling (ft)", `inputmode="decimal"`, defaults 12, 14, 8); `budgetUSD` (label "Budget ($)", `inputmode="numeric"`, default 3000).
  2. **Pick a style** (helper "Up to 3") — `<div id="styles" role="group">` filled by JS; below it a file input `inspoPhoto` labelled "Or upload an inspiration photo" (`accept="image/*"`).
  3. **Your room photo (optional)** — file input `roomPhoto` (`accept="image/*"`), helper "Snap the room from a corner for best results."; a `<img id="roomPreview" hidden alt="Your room">`.
  4. **Describe it** — `<textarea id="prompt" maxlength="500" rows="4" placeholder="e.g. Warm and cozy, lots of plants, a reading nook by the window, keep the hardwood floor">` with a live "0/500" counter.
  Then `<div id="turnstile"></div>`, a submit button "Design my room", `<p id="status" role="status" aria-live="polite"></p>`.
  After the form: `<section id="results" hidden>` containing `<img id="resultImg" alt="AI design of your room">`, "Download image" `<a id="downloadBtn" download="roomremix.png">`, `<p id="summary">`, `<div id="palette">`, a two-button tab bar `#tabBudget` "Budget" / `#tabRec` "Recommended" (`role="tab"`, `aria-selected`), `<p id="total">`, `<ul id="items">`, and a "Start over" button. Footer: "Images are generated by AI and not saved. Prices are estimates; links are store searches." + link to `/privacy.html`.
- Verify: `grep -c "<script>" public/index.html` → `0` (no inline scripts); `grep -c 'style="' public/index.html` → `0`

**Step 3.3: Styles**
- Where: `public/app.css`
- Do: mobile-first using the tokens in section 3 as CSS custom properties on `:root`. Sections are white cards (16px padding, 1px border, radius 14px, 16px gap). Style chips: grid `repeat(auto-fill, minmax(150px, 1fr))`; each chip is a `<button type="button" aria-pressed>` showing name (600 weight), blurb (13px muted), and a row of 4 palette dots (16px circles); `aria-pressed="true"` → 2px accent border + `#FBEFE8` background. Primary button: full width, 52px tall, accent background, white 17px 600 text, hover accent-hover, `:disabled` opacity .5. Result image: width 100%, radius 14px. Item rows: name + why on the left, price right-aligned, then a "Shop at {retailer} →" link in accent color. Inputs: 16px font-size (prevents iOS zoom), 44px min height. Respect `prefers-reduced-motion` (no transitions). Spinner: simple CSS rotating ring shown inside the button while loading.
- Verify: visually reviewed in Phase 5; here `grep -c "font-size: 16px" public/app.css` ≥ 1

**Step 3.4: Client logic**
- Where: `public/app.js`
- Do (all DOM text via `textContent`; build nodes with `document.createElement`):
  - On load: `fetch("/api/options")` → fill `#roomType` options and style chips. Toggling a chip flips `aria-pressed`; a 4th selection is blocked and `#status` says "You can pick up to 3 styles."
  - Render Turnstile once `window.turnstile` exists (poll every 100 ms, max 50 tries): `turnstile.render("#turnstile", { sitekey, callback: t => token = t, "expired-callback": () => token = null })`.
  - `resizeToJpeg(file)`: `createImageBitmap(file)` → canvas scaled so longest side ≤ 496 → `canvas.toBlob(cb, "image/jpeg", 0.85)`; if the blob > 200_000 bytes retry at 0.7, then 0.5; still too big → error "That photo couldn't be shrunk enough — try another." Show `#roomPreview` from `URL.createObjectURL(blob)` after resize.
  - Submit: client-side check of the same ranges as `validate.js` (show the first error in `#status`, focus the field); if no token → "Please complete the verification check." Build `FormData`: `payload` = JSON string of `{ roomType, lengthFt, widthFt, heightFt, budgetUSD, styles, prompt }` (numbers via `Number()`), `room_photo`/`inspo_photo` blobs as `File` named `room.jpg`/`inspo.jpg` only if chosen, `turnstile` = token. Disable the button, show spinner, set status "Designing your room… this takes about 15 seconds." POST to `/api/generate`. Always `turnstile.reset()` and `token = null` afterward.
  - On non-200: show `body.error` (fallback "Something went wrong."). On 200: set `#resultImg.src` and `#downloadBtn.href` to `image`; if `list` is null show summary "Shopping list unavailable this time — try generating again." and hide the tabs; else fill summary, palette swatches (`el.style.background = hex`, plus `title` = hex), default to the Budget tab. Tab switch re-renders `#items` and `#total` ("Estimated total: $X,XXX" via `toLocaleString("en-US")`). Each link: `a.href = item[tier].url`, `target="_blank"`, `rel="noopener noreferrer nofollow"`. Unhide `#results` and `scrollIntoView({ behavior: "smooth" })`.
  - "Start over" hides results and scrolls to top; form values are kept.
- Verify: `grep -nE "innerHTML|insertAdjacentHTML|eval\(|new Function" public/app.js` → no output

**Step 3.5: Privacy page**
- Where: `public/privacy.html`
- Do: plain page using `/app.css`. Content (short paragraphs): RoomRemix doesn't create accounts or store photos or descriptions; uploads are sent to Cloudflare Workers AI to make one image and then discarded; Cloudflare Turnstile checks you're human; shopping links go to outside stores with their own policies; AI images are concept art, not construction plans — check with a professional before structural, electrical or plumbing work. Link back to `/`.
- Verify: `test -f public/privacy.html && echo ok` → `ok`

**Checkpoint 3:** `npm test` passes and `npm run check` exits 0; commit `feat: mobile front end`

### Phase 4: README with phone setup (ends in: owner can deploy by following it)

**Step 4.1: Write README.md**
- Where: `README.md` (replace the GitHub default)
- Do: sections "What it is" (2 lines), "Costs" (Free plan, ≈ 80 designs/day cap, never add a payment method, limit resets midnight UTC), "Deploy from your phone" with the human steps H4–H6 below copied verbatim, "Safety notes" (no secrets in repo; Turnstile; 3/min rate limit; nothing stored).
- Verify: `grep -c "TURNSTILE_SECRET" README.md` ≥ 1

**Step 4.2: Push and open PR**
- Do: push the session branch and open a pull request into `main` titled "RoomRemix v1". Then print to the owner: "Merge the PR on GitHub, then do steps H4–H6 in the README. Come back here with your Turnstile site key."
- Verify: `git log --oneline -5` shows checkpoints 1–3 and the README commit; PR URL printed.

**Checkpoint 4:** PR open.

#### Human steps (owner, on phone, after merging the PR)
- **H4.** dash.cloudflare.com → Workers & Pages → Create application → Import a repository → connect GitHub → pick `roomremix` → leave project name `roomremix`, deploy command `npx wrangler deploy` → Save and Deploy. Note the URL (`https://roomremix.<your-subdomain>.workers.dev`).
- **H5.** Dashboard → Turnstile → Add widget → name RoomRemix → hostname: your workers.dev hostname from H4 → Widget mode Managed → Create. Copy the **Site key** and **Secret key**.
- **H6.** Workers & Pages → roomremix → Settings → Variables and Secrets → Add → type **Secret**, name `TURNSTILE_SECRET`, value = Secret key → Save/Deploy. Then paste the **Site key** (never the secret) into this Claude Code chat.

### Phase 5: Go live (ends in: real design generated on the live URL)

**Step 5.1: Wait for the site key**
- Do: if the owner hasn't pasted a site key in chat, ask once: "Paste your Turnstile site key (starts with 0x)." Accept only a value matching `/^0x[0-9A-Za-z_-]{10,}$/`. If he pastes something that looks like the secret (he says "secret", or it's the value he labeled secret), tell him not to share it, have him rotate it in Turnstile, and continue only with the site key.
- Verify: you have a value matching the regex.

**Step 5.2: Swap the key and ship**
- Where: `wrangler.jsonc` → `vars.TURNSTILE_SITE_KEY`
- Do: replace the test key with the site key; `npm test`; commit `chore: production turnstile site key`; push to a new branch, open PR "Turnstile site key", tell the owner to merge it.
- Verify: `npm test` → `# fail 0`; PR URL printed.

**Step 5.3: Live test (owner reports, you fix)**
- Do: ask the owner to open the live URL on his phone, make one design with no photos and one with a room photo, and tell you what happened. If he gets "The AI couldn't make that design" on both: in `src/ai.js` remove the two `form.append("width"...)`/`("height"...)` lines (klein may reject them), `npm test`, commit `fix: let klein choose output size`, PR, merge, retest. If it still fails after that, stop and report with the exact message he sees and anything in Cloudflare → roomremix → Logs.
- Verify: owner confirms an image + shopping list appeared, and a Budget link opens a store search.

## 7. Final verification
- [ ] `npm test` → `# fail 0`; `npm run check` exits 0
- [ ] `grep -rnE "innerHTML|eval\(|new Function" public/` → no output
- [ ] `git grep -nE "0x4AAA[0-9A-Za-z_-]{20,}|secret\s*[:=]\s*['\"][^'\"]+" -- . ':!PLAN.md'` → no output (no secret committed; site key in wrangler.jsonc is fine)
- [ ] Live URL: generate works with and without photos; 4th rapid submit within a minute shows the "Too many designs" message
- [ ] Live URL at 375px width: no horizontal scroll, all buttons ≥ 44px tall
- [ ] Shopping list shows both tabs with totals; links open in a new tab to IKEA/Amazon/Walmart/Home Depot (budget) and West Elm/Wayfair/Crate & Barrel/Home Depot (recommended)

## 8. Definition of done
The live workers.dev URL produces a room image plus a Budget/Recommended shopping list for a stranger on a phone, the account is on the Workers Free plan with no payment method, and all boxes above are checked. Stop there; do not add features.

## 9. Stop Report format (use only on deviation)
```
STOP at step <id>
Expected: <what the plan said>
Actual: <what happened, with exact error/output>
Already done: <steps completed + any files changed>
Needs from planner: <the specific decision or fix>
```
