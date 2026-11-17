# RoomRemix

## What it is
A mobile-first web app where anyone can redesign a room with AI. Pick a room, size, budget and style, and get an AI image, a color palette, and a shopping list with Budget and Recommended options.

## Costs
- Runs on the Cloudflare **Workers Free** plan: $0.
- The free AI allowance is about 80 designs per day across all users. Past that, designs fail with a friendly message; you are never billed.
- **Never add a payment method** to the Cloudflare account.
- The limit resets at midnight UTC.

## Deploy from your phone
- **H4.** dash.cloudflare.com → Workers & Pages → Create application → Import a repository → connect GitHub → pick `crazycobras.io` → leave project name `crazycobras-io`, deploy command `npx wrangler deploy` → Save and Deploy. Note the URL (`https://crazycobras-io.<your-subdomain>.workers.dev`).
- **H5.** Dashboard → Turnstile → Add widget → name RoomRemix → hostname: your workers.dev hostname from H4 → Widget mode Managed → Create. Copy the **Site key** and **Secret key**.
- **H6.** Workers & Pages → crazycobras-io → Settings → Variables and Secrets → Add → type **Secret**, name `TURNSTILE_SECRET`, value = Secret key → Save/Deploy. Then paste the **Site key** (never the secret) into this Claude Code chat.

## Safety notes
- No secrets in the repo. The Turnstile secret lives only in the Cloudflare dashboard as `TURNSTILE_SECRET`; without it the app refuses to generate.
- Cloudflare Turnstile checks every request is from a human.
- Rate limit: 3 designs per minute per visitor.
- Nothing is stored: no database, no accounts, no saved photos.

---

# VROOMILLION

An 8-bit trivia racer that lives at `/vroomillion/` on the same site. Every question has lots of right answers; the more niche yours is, the further your car goes. Earn cash, buy faster cars.

- **Modes:** 1P is a solo run — your distance is your score; or 2P on one screen (answers are hidden while typing).
- **Question modes:** CLASSIC (all topics) or GEARHEAD (cars and racing only), picked on the race setup screen.
- **Answers:** close typos are fixed silently; extra words in front still count ("front bumper" counts as bumper); wrong answers can be retried until the timer runs out.
- **Rarity tiers:** Stalled → Traffic → Cruising → Fast Lane → Deep Cut → One in a Vroomillion.
- **Daily free run:** one race per day per browser (1P or 2P). The first race each day uses the same 7 prompts for everyone, picked from the date.
- **Unlimited ($5, one-time):** removes the daily limit on that browser. Paid through Stripe Checkout; see setup below.
- **Sound:** sound effects only, no music.
- **Adding questions:** edit `public/vroomillion/js/data.js`. Each question is five lists of answers, from most obvious to most niche; `"a|b"` makes `b` an accepted spelling of `a`. Add `deck: "car"` for GEARHEAD-only questions or `deck: "both"` for questions in both modes.
- **Adding cars:** edit the `CARS` list in `public/vroomillion/js/cars.js`.
- **Tests:** `npm test` covers answer judging, scoring, the daily limit, the question data and the payment endpoints.
- Font: Press Start 2P (SIL Open Font License, see `public/vroomillion/fonts/OFL.txt`).

## Turning on the $5 Unlimited payment
The game asks the Worker (`src/vroomillion.js`) to open a Stripe Checkout, and after payment asks it to confirm with Stripe that the payment really went through. Until the key below is set, the buy button just says payments aren't set up — nobody can be charged.

1. **Merge this branch into `main`** so Cloudflare deploys it.
2. **Stripe dashboard** → Developers → API keys → **Create restricted key**. Give it **Checkout Sessions: Write** and nothing else. Copy it. Start with a **test-mode** key (`rk_test_…`).
3. **Cloudflare dashboard** → Workers & Pages → `crazycobras-io` → Settings → Variables and Secrets → Add → type **Secret**, name `STRIPE_SECRET_KEY`, value = the key → Deploy. Never put the key in the repo.
4. Open the game, use your free run, press **GO UNLIMITED**, and pay with Stripe's test card `4242 4242 4242 4242` (any future date, any CVC). You should land on "UNLIMITED UNLOCKED!".
5. When that works, replace the secret with a **live** restricted key (`rk_live_…`) to take real money.

Buyers see the Stripe account's **business name** on the checkout page and on their card statement, so use an account that is yours and named for the game.

### Limits to know about
- Unlimited and the daily limit are stored in the player's browser. Someone who clears site data gets a fresh free run, and a determined person with developer tools could flip the switch without paying. Making that airtight needs player accounts and a server that runs the races, which this game doesn't have.
- A purchase unlocks one browser on one device. There is no "restore purchase" yet; refunds or moves to another device are handled by hand from the Stripe dashboard.
- Payments only work on the website, not in the Claude artifact preview.
