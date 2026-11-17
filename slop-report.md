# Slop Report: VROOMILLION

**Overall: 68/100** · Safe, honest little game with no secrets or injection holes, but it's selling a $5 upgrade with real car brands in the shop and no Terms, refund policy or contact info.
**AI-likelihood:** Likely AI-assisted: the synthwave-neon pixel look and em-dash-heavy UI copy read as the default "retro game" output, and every commit in the repo carries a `Co-Authored-By: Claude` trailer.

> Note: this game was built in the same Claude session that ran this audit, so treat the scores as a self-review, not an independent one.

| Category | Score | Critical | High | Medium | Low |
|---|---|---|---|---|---|
| Security | 67 | 0 | 0 | 3 | 4 |
| Legal & Compliance | 46 | 0 | 2 | 3 | 1 |
| AI-Slop / Authenticity | 84 | 0 | 0 | 1 | 3 |
| Craft & Quality | 77 | 0 | 0 | 2 | 3 |

Weighting: Security 35%, Legal 25%, AI-Slop 25%, Craft 15%. No Critical findings, so no cap.

## Status (after fixes, 17 Nov 2026)
- **L1 fixed (partly):** Terms with the $5 one-time price, a no-refunds policy (buyers tick to accept it before paying) and account rules (`terms.html`), linked from the footer, sign-up and the buy button. The site still shows no contact email by the owner's choice; the Terms send buyers to the support contact on their Stripe receipt.
- **L2 fixed:** all 51 branded shop cars renamed to made-up names; the paywall says "hypercars". Brands remain only as trivia answers.
- **S1 fixed:** `/verify` is rate-limited and `/me` re-checks Stripe at most once a minute per account. S7 fixed too: `/verify` no longer returns the email.
- **L4 fixed:** "Accounts are for players 13 and over" on the sign-up form, Terms and Privacy. L6 fixed: Privacy now mentions Cloudflare request logs.
- **Q1 fixed:** one-time recovery codes at sign-up reset a forgotten password; new codes from the ACCOUNT screen. No email verification yet.

## Fix these first
1. **L1**: add Terms of Service, a refund policy and a contact address before taking real money.
2. **L2**: stop selling and advertising real car brands ("Bugattis and Koenigseggs") in a paid game; rename the cars or drop brand names from the paywall.
3. **S1**: rate-limit `/verify` and `/me`; right now anyone can make the Worker call Stripe as fast as they like.
4. **L4**: say who accounts are for (13+), since a trivia racer will attract younger players.
5. **Q1**: plan password recovery before launch; a paying customer who forgets their password is currently stuck.

## Why it looks AI-made
Nothing here is a builder fingerprint: no Lovable/v0 leftovers, no default title, no template README, no Tailwind CDN. What gives it away is that every choice is the *first* one. Ask for "an 8-bit retro game" and you get a dark `#0b0618` background with hot-pink `#ff4fd8` and cyan `#4fd1ff` (`style.css:8-15`), a sunset gradient sun behind a city skyline, and Press Start 2P for every word on the page (`style.css:2`). VROOMILLION has all of these. The copy leans on em-dashes as a UI separator: `— PRESS START —` (`index.html:35`), `GO UNLIMITED — $5`, `UNLOCK UNLIMITED — $5`, `RACE AGAIN — $5`, `NOT ON THE LIST — TRY AGAIN!`, about 20 in player-facing text. In its favour, the car sprites, the question bank and the game rules are specific to this game and don't read as filler.

## Findings

### Security

#### S1 · Medium · Payment-check endpoints have no rate limit
- **Where:** `src/vroomillion.js:94` (`handleVerify`), `src/vroomillion.js:30` (`handleMe`)
- **Evidence:** `PAY_LIMITER` is only checked in `handleCheckout` (`src/vroomillion.js:57`). `/verify?session_id=cs_test_<anything well-formed>` triggers a live Stripe API call every time, and `/me` does too for an account with a pending checkout.
- **Why it matters:** a script can hammer these and burn through your Stripe API rate limit, so real buyers' checkouts start failing. It also turns your Worker into a free Stripe-lookup proxy.
- **Fix:** call `env.PAY_LIMITER.limit({ key: ip })` at the top of `handleVerify`, and only re-check `pending_session` in `handleMe` once every few minutes (store a `pending_checked_at` timestamp).

#### S2 · Medium · The one-free-run-a-day limit lives in the browser
- **Where:** `public/vroomillion/js/logic.js:30` (`canRace` reads `save.lastRunDay` from `localStorage`)
- **Evidence:** `canRace = (save, today) => !!save.unlimited || save.lastRunDay !== today`, where `save` comes from `localStorage`.
- **Why it matters:** a private window, or clearing site data, gives a fresh free run, forever. That is the thing you're charging $5 to remove. Unlimited itself *is* checked on the server, which is good.
- **Fix:** if it matters, count free runs on the server: an anonymous signed cookie plus a per-IP daily counter (in D1 or a KV namespace), checked by an endpoint when a race starts. Otherwise accept it as "honest players pay" and keep the README note.

#### S3 · Medium · Password hashing is on the light side
- **Where:** `src/accounts.js:10`
- **Evidence:** `const DEFAULT_ITERATIONS = 50000;` (PBKDF2-SHA256). OWASP currently recommends 600,000 for PBKDF2-SHA256.
- **Why it matters:** if the database ever leaked, weak passwords would be crackable faster. It's salted per user and upgradable, so this is a trade-off rather than a hole: it was lowered to fit the Workers free plan's ~10 ms CPU budget.
- **Fix:** on the Workers Paid plan, set `PBKDF2_ITERATIONS=100000` (the Workers maximum); hashes upgrade at next login. On the free plan, keep it and require longer passwords (12+ characters).

#### S4 · Low · Sign-up tells anyone whether an email has an account
- **Where:** `src/accounts.js:157`
- **Evidence:** `"There's already an account with that email. Log in instead."` with status 409.
- **Why it matters:** someone can check whether a given email bought Unlimited. Log-in is careful not to reveal this; sign-up undoes it. Low stakes for a game.
- **Fix:** accept it for usability, or return the same "check your details" message for both cases.

#### S5 · Low · No bot check on sign-up
- **Where:** `src/accounts.js:127` (only `AUTH_LIMITER`, 10/min per IP)
- **Evidence:** sign-up has no human check (Cloudflare Turnstile is free and was used by the site's earlier RoomRemix app, since removed).
- **Why it matters:** a botnet can fill your D1 database with junk accounts within the free-tier write limits.
- **Fix:** add the Turnstile widget to the sign-up form and verify the token in `handleSignup` against Turnstile's siteverify API.

#### S6 · Low · Body-size check trusts `Content-Length`
- **Where:** `src/accounts.js:132`
- **Evidence:** `const len = Number(request.headers.get("content-length") || 0); if (len > 2000) …`. A chunked request with no length header skips it, and `request.json()` parses whatever arrives.
- **Fix:** read with `await request.text()`, reject if `text.length > 2000`, then `JSON.parse`.

#### S7 · Low · `/verify` hands the buyer's email to whoever has the receipt link
- **Where:** `src/vroomillion.js:112`
- **Evidence:** `return json({ paid: true, email: user.email });`. The `unlocked.html?session_id=…` URL sits in browser history and could be shared.
- **Fix:** return only `{ paid: true }` and let the page say "your account".

Checked and fine: no secrets in the code (Stripe key only from `env`); price set on the server; no `innerHTML`, `eval` or other XSS sinks anywhere; parameterised SQL everywhere; HttpOnly + Secure + SameSite=Lax session cookie scoped to `/api/vroomillion`; only a hash of the session token is stored; constant-time password compare; same-origin checks on state-changing POSTs; checkout redirects only to `https://checkout.stripe.com/`; strict CSP in `public/_headers`. No production npm dependencies (only `wrangler`, dev-only), so `npm audit --omit=dev` has nothing to check.

### Legal & Compliance

#### L1 · High · Selling a product and running accounts with no Terms, refund policy or contact
- **Where:** site-wide; `public/vroomillion/index.html:177` (footer links only to Privacy); paywall `index.html:79`
- **Evidence:** a $5 purchase and email/password accounts, but no Terms of Service, no refund terms, and no way to contact the seller anywhere in the game.
- **Why it matters:** card networks and Stripe expect a reachable refund policy and customer contact, and their absence invites chargebacks ("I couldn't reach anyone"). Terms are where you say what Unlimited is, that it's tied to the account, what happens if the game shuts down, and that you can close abusive accounts.
- **Fix:** add `terms.html` covering what Unlimited includes, the price, the refund window (e.g. "email us within 14 days"), account rules, and that the game is provided as-is. Link it from the footer and next to the buy button ("By paying you agree to the Terms"), and add a support email.

#### L2 · High · Real car brands sold as items and used to advertise the paid upgrade
- **Where:** `public/vroomillion/js/cars.js:68-69` (e.g. `"Bugatti Chiron Super Sport"`, `"Koenigsegg Jesko Absolut"`, plus Ferrari, Lamborghini, Porsche and others); `public/vroomillion/index.html:83`
- **Evidence:** the shop sells virtual cars under real model names, and the paywall perk reads `Earn cash faster for the Bugattis and Koenigseggs`.
- **Why it matters:** car makers license their names and likenesses to games and enforce it; that's why big racing games pay for them. A free fan project tends to fly under the radar. A paid one that names the brands in its sales copy is easier to send a cease-and-desist to. The footer's "Not affiliated with any car maker" helps but doesn't license anything.
- **Fix:** give the shop cars parody or descriptive names ("Bavarian Hypercar", "Swedish Ghost"), keep the pixel art generic, and remove brand names from the paywall: `Earn cash faster for the hypercars`. Brand names in trivia *answers* ("Name a car brand") are plain factual references and are fine.

#### L3 · Medium · Name and top tier echo the game it's inspired by
- **Where:** `public/vroomillion/js/logic.js:9`, `index.html:28`, footer `index.html:177`
- **Evidence:** "VROOMILLION" and the top tier "ONE IN A VROOMILLION" mirror Krillion's "One in a Krillion". The footer names Krillion.
- **Why it matters:** riffing on a game's name is fine for a fan project; once you charge money it starts to look like trading on their brand.
- **Fix:** worth a quick search for Krillion trademarks before launch. Consider a name and top tier that stand on their own, and keep the "not affiliated" line.

#### L4 · Medium · Accounts with no age statement
- **Where:** `public/vroomillion/privacy.html:16`; sign-up form in `js/main.js` (`authForm`)
- **Evidence:** the game collects emails at sign-up and doesn't say who accounts are for.
- **Why it matters:** a trivia car game will attract under-13s. Knowingly collecting a child's email in the US brings in COPPA. A plain age line is the usual minimum.
- **Fix:** add "Accounts are for players 13 and over. Under 13? Ask a parent to buy Unlimited on their account." to the sign-up form and the privacy page.

#### L5 · Medium · Accessibility: very small text and a fixed timer
- **Where:** `public/vroomillion/style.css:523` and `:526` (6px), plus about nine more rules at 7px (`:276`, `:346`, `:351`, `:445`, `:530`, …); `js/logic.js:13` (`ANSWER_SECONDS = 25`)
- **Evidence:** Press Start 2P at 6-7px for car names, best score, round label, footer and badges; a 25-second limit with no way to extend it.
- **Why it matters:** hard to read for many players, especially on phones, and timed tasks with no extension are a WCAG failure (2.2.1).
- **Fix:** set a 9px minimum for the pixel font (or switch small labels to a readable font), and add an "extra time" setting (e.g. 50s) in How to Play or the setup screen.

#### L6 · Low · Privacy notice leaves out server logs
- **Where:** `public/vroomillion/privacy.html:18`; `wrangler.jsonc:16`
- **Evidence:** `"observability": { "enabled": true }`, and IPs are used for rate limits, but the notice says only what accounts store.
- **Fix:** add one line: "Our host, Cloudflare, briefly logs requests (including IP address) to run the site and stop abuse." Plus a contact address for privacy requests.

### AI-Slop / Authenticity

#### A1 · Medium · The default "retro game" look
- **Where:** `public/vroomillion/style.css:2`, `:8-15`; title scene in `index.html:28-35`
- **Evidence:** a near-black purple background, neon pink plus cyan accents, a striped synthwave sun, Press Start 2P everywhere, and a blinking `— PRESS START —`.
- **Fix:** keep the pixel art (it's good) but give it a point of view: a daytime palette, a single signature colour taken from your favourite car, or a different pixel face for body text (e.g. a narrower bitmap font) so it isn't the same synthwave every retro prompt produces.

#### A2 · Low · Em-dash as the house separator
- **Where:** about 20 player-facing strings, e.g. `index.html:35`, `:93`; `js/main.js:139`, `:233`, `:604`, `:726`, `:779`, `:899`
- **Fix:** use the game's own separators: `GO UNLIMITED · $5`, `2P VERSUS: SAME SCREEN`, `NOT ON THE LIST. TRY AGAIN!`, `PRESS START`.

#### A3 · Low · Code tells
- **Where:** `public/vroomillion/js/main.js` (946 lines, nine `// ---------- x ----------` banners); repo history (12 commits with `Co-Authored-By: Claude` trailers)
- **Fix:** split `main.js` into `race.js`, `menus.js` and `account.js`. The trailers are honest attribution and fine to keep; just know anyone reading the repo will see them.

#### A4 · Low · Rarity is asserted, not measured
- **Where:** `public/vroomillion/js/logic.js:9`
- **Evidence:** `blurb: "Almost nobody alive says that."` The tiers were assigned when the question bank was written, not counted from what players answer.
- **Fix:** soften it ("A true deep cut."), or later log answer counts (anonymously) and re-tier from real data.

### Craft & Quality

#### Q1 · Medium · Paid accounts with no password recovery and no email check
- **Where:** `src/accounts.js` (no reset flow); README "Limits to know about"
- **Evidence:** a buyer who forgets their password, or mistypes their email at sign-up, has no self-service way back to what they paid for.
- **Fix:** add an email provider (e.g. Resend or Cloudflare Email) for a reset link, or at minimum show a support email on the log-in form.

#### Q2 · Medium · No favicon or share preview for a game you share with friends
- **Where:** `public/vroomillion/index.html` head (has `description`, no `og:*`, no `rel="icon"`)
- **Evidence:** pasting the link in a group chat shows a bare URL; browsers request `/favicon.ico` and get a 404.
- **Fix:** add a 1200×630 `og:image` (the title screen screenshot), `og:title`/`og:description`, and a pixel-car favicon.

#### Q3 · Low · The artifact preview shows a sign-up and paywall that can't work there
- **Where:** `public/vroomillion/js/main.js:297`
- **Evidence:** the preview explains itself only after someone fills the form ("…only work on the VROOMILLION website…").
- **Fix:** detect the preview up front (no `/api/vroomillion/me`) and replace the form with "Unlimited is available at <your site>".

#### Q4 · Low · Dead state
- **Where:** `public/vroomillion/js/main.js:32` (`wins: 0`, never incremented now); `:515` (`deck`, `daily` stored on `race` but never read)
- **Fix:** delete them.

#### Q5 · Low · Price written in two places
- **Where:** `public/vroomillion/index.html:79` and five buttons in `js/main.js` (`:139`, `:233`, `:248`, `:891`, `:899`) say `$5`; the server charges `PRICE_CENTS = 500` in `src/vroomillion.js`.
- **Fix:** serve the price from `/api/vroomillion/me` (or a tiny `/price` endpoint) and render it, so a price change can't leave the buttons lying.

## What's actually good
- **The server code is careful.** Prices and Unlimited status live on the server, SQL is parameterised, cookies are locked down, and 63 tests cover the account and payment edge cases (tampered receipts, wrong prices, expired sessions, closed tabs).
- **No trackers, no ads, no dark patterns.** No fake urgency, no invented stats or reviews, and a privacy page that matches what the code does.
- **The game itself is specific.** Hand-built pixel sprites for 54 cars, a question bank of about 9,800 answers across 40 questions, and rules (fender benders, nitro, daily prompts) that aren't template filler.
- **Fails closed.** Without the Stripe key or database, buying and sign-up refuse cleanly instead of half-working.

---
*Automated + manual review of source only. Not legal advice; not a substitute for a penetration test.*
