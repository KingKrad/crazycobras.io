# VROOMILLION

An 8-bit trivia racer. Every question has lots of right answers; the more niche yours is, the further your car goes. Earn cash, buy faster cars.

The game lives in `public/vroomillion/`; the site's home page (`/`) redirects there. `src/` is the Cloudflare Worker that handles accounts and payments.

## Deploy from your phone
- dash.cloudflare.com → Workers & Pages → Create application → Import a repository → connect GitHub → pick `crazycobras.io` → project name `crazycobras-io`, deploy command `npx wrangler deploy` → Save and Deploy. Cloudflare redeploys on every push to `main`.
- Runs on the Cloudflare **Workers Free** plan.

## How it works
- **Modes:** 1P is a solo run — your distance is your score; or 2P on one screen (answers are hidden while typing).
- **Question modes:** CLASSIC (all topics) or GEARHEAD (cars and racing only), picked on the race setup screen.
- **Answers:** close typos are fixed silently; extra words in front still count ("front bumper" counts as bumper); wrong answers can be retried until the timer runs out.
- **Rarity tiers:** Stalled → Traffic → Cruising → Fast Lane → Deep Cut → One in a Vroomillion.
- **Daily free run:** one race per day per browser (1P or 2P). The first race each day uses the same 7 prompts for everyone, picked from the date.
- **Unlimited ($5, one-time):** removes the daily limit. Buyers must create an account (email + password) first; Unlimited belongs to the account and works on any device they log in on. Paid through Stripe Checkout; see setup below.
- **Accounts:** stored in a Cloudflare D1 database (`DB` binding, created automatically on the first deploy). Passwords are salted PBKDF2-SHA256 hashes; sessions are HttpOnly cookies. Players can delete their account in the game. Privacy notice: `public/vroomillion/privacy.html`.
- **Sound:** sound effects only, no music.
- **Adding questions:** edit `public/vroomillion/js/data.js`. Each question is five lists of answers, from most obvious to most niche; `"a|b"` makes `b` an accepted spelling of `a`. Add `deck: "car"` for GEARHEAD-only questions or `deck: "both"` for questions in both modes.
- **Adding cars:** edit the `CARS` list in `public/vroomillion/js/cars.js`.
- **Tests:** `npm test` covers answer judging, scoring, the daily limit, the question data and the payment endpoints.
- Font: Press Start 2P (SIL Open Font License, see `public/vroomillion/fonts/OFL.txt`).

## Turning on the $5 Unlimited payment
The game asks the Worker (`src/vroomillion.js`) to open a Stripe Checkout for the logged-in account, and after payment confirms with Stripe that it really went through before marking that account Unlimited. If a buyer closes the tab before coming back, the account is upgraded the next time they open the game. Until the key below is set, the buy button just says payments aren't set up — nobody can be charged.

1. **Merge this branch into `main`** so Cloudflare deploys it. The first deploy creates the `vroomillion` D1 database automatically (free tier); the tables are created on first use.
2. **Stripe dashboard** → Developers → API keys → **Create restricted key**. Give it **Checkout Sessions: Write** and nothing else. Copy it. Start with a **test-mode** key (`rk_test_…`).
3. **Cloudflare dashboard** → Workers & Pages → `crazycobras-io` → Settings → Variables and Secrets → Add → type **Secret**, name `STRIPE_SECRET_KEY`, value = the key → Deploy. Never put the key in the repo.
4. Open the game, use your free run, press **GO UNLIMITED**, and pay with Stripe's test card `4242 4242 4242 4242` (any future date, any CVC). You should land on "UNLIMITED UNLOCKED!".
5. When that works, replace the secret with a **live** restricted key (`rk_live_…`) to take real money.

Buyers see the Stripe account's **business name** on the checkout page and on their card statement, so use an account that is yours and named for the game.

### Limits to know about
- Unlimited is checked on the server against the account, so it can't be faked in the browser. The one-free-run-a-day limit for players without Unlimited is still kept in the browser; clearing site data gives a fresh free run.
- There's no "forgot password" yet: sending reset emails needs an email service. Until then, a locked-out buyer can be helped by hand (check their payment in Stripe, then ask them to make a new account and mark it Unlimited in the D1 console with `UPDATE users SET unlimited = 1 WHERE email = '…'`).
- Password hashing uses 50,000 PBKDF2 rounds so sign-ups fit the Workers free plan's CPU limit. On a paid plan, set the variable `PBKDF2_ITERATIONS` to `100000`; existing passwords upgrade when people next log in.
- Accounts and payments only work on the website, not in the Claude artifact preview.
