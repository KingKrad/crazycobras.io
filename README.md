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

An 8-bit trivia racer that lives at `/vroomillion/` on the same site. Every question has lots of right answers; the more niche yours is, the further your car goes. Win races, buy faster cars.

- **Modes:** 1P is just you and the road — reach each track's goal distance to win; or 2P on one screen (answers are hidden while typing).
- **Question modes:** CLASSIC (all topics) or GEARHEAD (cars and racing only), picked on the race setup screen.
- **Answers:** close typos are autocorrected; extra words in front still count ("front bumper" counts as bumper); wrong answers can be retried until the timer runs out.
- **Rarity tiers:** Stalled → Traffic → Cruising → Fast Lane → Deep Cut → One in a Vroomillion.
- **Cost:** $0. It is plain static files in `public/vroomillion/` — no AI calls, no server code, no accounts. Progress is saved in the player's own browser.
- **Adding questions:** edit `public/vroomillion/js/data.js`. Each question is five lists of answers, from most obvious to most niche; `"a|b"` makes `b` an accepted spelling of `a`. Add `deck: "car"` for GEARHEAD-only questions or `deck: "both"` for questions in both modes.
- **Adding cars:** edit the `CARS` list in `public/vroomillion/js/cars.js`.
- **Tests:** `npm test` covers answer judging, scoring and the question data.
- Font: Press Start 2P (SIL Open Font License, see `public/vroomillion/fonts/OFL.txt`).
