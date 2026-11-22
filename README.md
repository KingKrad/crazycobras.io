# VROOMILLION

An 8-bit trivia racer. Every question has lots of right answers; the more niche yours is, the further your car goes. Earn cash, buy faster cars.

The game lives in `public/vroomillion/`; the site's home page (`/`) redirects there. `src/` is the Cloudflare Worker that handles accounts and payments.

## Where it runs
- **Vercel** (project `crazycobras-io`, https://vroomillion.com, DNS on Cloudflare; vroomillion.vercel.app and crazycobras-io.vercel.app still work) serves the game's files from `public/` with the same security headers as `public/_headers` (`vercel.json`). `api/proxy.js` forwards `/api/vroomillion/*` to the Worker (`WORKER_URL`), passing the player's IP in `x-client-ip` with `PROXY_SECRET`, so the Worker's rate limits count each player, not Vercel's servers.
- **Cloudflare Worker** `crazycobras-io` (https://crazycobras-io.nucleargames8856.workers.dev) runs the API: accounts in the `vroomillion` D1 database, payments, the live answer check and rate limits. `npx wrangler deploy -c wrangler.api.jsonc` deploys it without the static files; plain `npx wrangler deploy` deploys the files too, so the workers.dev address also serves the game.
- **Settings:** the Worker's plain variables are in `wrangler.jsonc` (`TURNSTILE_SITE_KEY`, `ALLOWED_ORIGINS`, which must list the Vercel address). Secrets live in the Cloudflare dashboard: `STRIPE_SECRET_KEY`, `TURNSTILE_SECRET`, `PROXY_SECRET`. On Vercel: `WORKER_URL`, and `PROXY_SECRET` (the same value as the Worker's).
- **Turnstile:** the widget (Cloudflare dashboard → Turnstile) must list every address the game runs on.
- Both run on free plans.

## How it works
- **Modes:** 1P (solo; your distance is your score), 2P on one screen (answers hidden while typing), and ONLINE 1V1 (each on their own device; an Unlimited host makes a room, the friend joins free). Question modes: CLASSIC, GEARHEAD (cars) and HARD MODE (niche).
- **Prompts:** the catalog in `public/vroomillion/js/catalog/` (about 3,850 prompt families; format at the top of `w01.js`). Families never repeat for a player in any mode or race type until all are used, then the oldest come back. Near-twin prompts share one family. A race has seven different topics and groups, with at most one single-artist or single-show prompt (`js/racepick.js`). The count of fresh prompts left isn't shown.
- **The daily race:** one free race a day, the same seven prompts for everyone, from its own pool. The order is fixed in `catalog/daily-order.js` (see CLAUDE.md).
- **Answers:** `node tools/build-catalog.mjs` writes `public/vroomillion/answers/<prompt>.json` for each prompt (hand-written obvious answers, topped up from Wikidata where a prompt has a rule). The game's original prompts keep their answers in `js/data*.js`, and `deep/` holds long-tail lists for some of them.
- **Live check and AI referee:** an answer that isn't on the list is checked by `POST /api/vroomillion/check` (`src/check.js`): Wikidata when the prompt has a rule, then the free Cloudflare Workers AI judge (`src/judge.js`, capped at 700 a day, inside the free allowance). The game shows CHECKING… and gives one verdict (no answer after 3 s counts as a no).
- **Rarity tiers:** STALLED, TRAFFIC JAM (common), CRUISING (uncommon), FAST LANE (rare), TURBO (ultra rare), ONE IN A VROOMILLION (legendary). Typos are offered as a fix (none under 5 letters, one for 5–9, two for 10+).
- **Race rules:** CRAZY MODE flips the scoring (obvious answers go furthest, and only the first 2 answers on a prompt's common list hit the JACKPOT for 1000 m: `CRAZY_TOP`, `CRAZY_METRES` in logic.js; not for the daily race, never sets a best or stamps the passport). EQUAL CARS for 1v1 scores both players x1 with 2 nitro. A FENDER BENDER (same answer in a 1v1) is a coin toss: the winner keeps the points, the loser gets half.
- **Updates:** every deploy stamps a version (`tools/stamp.mjs`); open tabs reload on a menu screen when a new one is out. Each player-facing update gets an entry in `js/changelog.js` (WHAT'S NEW on the title screen).
- **Admin:** accounts whose email is in the `ADMIN_EMAILS` Worker secret (comma separated) always have Unlimited and get an ADMIN screen (ACCOUNT → ADMIN): accounts, Unlimited and paid counts, races per day (counted anonymously by `POST /api/vroomillion/race-start`), and per player: give or remove Unlimited, and give today's free races back. API in `src/admin.js`.
- **Unlimited ($5, one-time, non-refundable):** removes the daily limit and unlocks 2P, GEARHEAD and HARD MODE. Buyers must create an account (email + password) first; Unlimited belongs to the account and works on any device they log in on. Paid through Stripe Checkout; see setup below.
- **Accounts:** stored in a Cloudflare D1 database (`DB` binding, created automatically on the first deploy). Passwords are salted PBKDF2-SHA256 hashes; sessions are HttpOnly cookies. Accounts are for players 13+. Each account gets a one-time **recovery code** at sign-up (stored only as a hash) that resets a forgotten password from the log-in screen; players can make a new code from the ACCOUNT screen. Players can delete their account in the game. Terms: `public/vroomillion/terms.html`; privacy notice: `public/vroomillion/privacy.html`.
- **Saving:** every change saves in the browser (plus a backup copy there), and a few seconds later to the server under an anonymous device cookie (`src/device.js`). Logged-in players' progress is also kept on the account (`src/progress.js`, `users.progress`) and merged with each device's save on log-in (`mergeProgress` in `js/logic.js`: the more-played save leads, and cars, upgrades, stamps and bests combine), so it follows them to every device.
- **Continue with Google / Apple** (`src/oauth.js`): OpenID Connect code flow through `/api/vroomillion/oauth-<google|apple>` and `-cb`. Finds the account by the provider's ID, then by verified email (so it links to an existing password account), or makes a password-less one (`pw_hash` empty; it deletes with DELETE typed instead of a password). Each button shows only once its settings are in the Worker: `GOOGLE_CLIENT_ID` + secret `GOOGLE_CLIENT_SECRET`; `APPLE_CLIENT_ID` (Services ID), `APPLE_TEAM_ID`, `APPLE_KEY_ID` + secret `APPLE_PRIVATE_KEY` (the .p8 text). Redirect URLs: `https://vroomillion.com/api/vroomillion/oauth-google-cb` and `-apple-cb`.
- **Sound:** sound effects only, no music.
- **Adding prompts:** add lines to a catalog file in `public/vroomillion/js/catalog/`, then run `node tools/build-catalog.mjs`, `node tools/twins.mjs` (near-twins) and, for daily prompts, `node tools/daily-order.mjs`.
- **Adding cars:** edit the `CARS` list in `public/vroomillion/js/cars.js`.
- **Tests:** `npm test` covers answer judging, scoring, the daily race, the catalog and race picking, online 1v1, the AI judge and the payment endpoints.
- Font: Press Start 2P (SIL Open Font License, see `public/vroomillion/fonts/OFL.txt`).

## Turning on the $5 Unlimited payment
The game asks the Worker (`src/vroomillion.js`) to open a Stripe Checkout for the logged-in account, and after payment confirms with Stripe that it really went through before marking that account Unlimited. If a buyer closes the tab before coming back, the account is upgraded the next time they open the game. Until the key below is set, the buy button just says payments aren't set up — nobody can be charged.

1. The Worker and its `vroomillion` D1 database are already set up; the tables are created on first use.
2. **Stripe dashboard** → Developers → API keys → **Create restricted key**. Give it **Checkout Sessions: Write** and nothing else. Copy it. Start with a **test-mode** key (`rk_test_…`).
3. **Cloudflare dashboard** → Workers & Pages → `crazycobras-io` → Settings → Variables and Secrets → Add → type **Secret**, name `STRIPE_SECRET_KEY`, value = the key → Deploy. Never put the key in the repo.
4. Open the game, play your free daily race, press **GO UNLIMITED**, and pay with Stripe's test card `4242 4242 4242 4242` (any future date, any CVC). You should land on "UNLIMITED UNLOCKED!".
5. When that works, replace the secret with a **live** restricted key (`rk_live_…`) to take real money.

Buyers see the Stripe account's **business name** on the checkout page and on their card statement, so use an account that is yours and named for the game.

### Limits to know about
- Unlimited is checked on the server against the account, so it can't be faked in the browser. The one-free-daily-race limit for players without Unlimited is kept in the browser; clearing site data gives another go (the leaderboard only counts an account's first score each day).
- Password reset works with the recovery code, not email (that would need an email service). A buyer who loses both the password and the code can be helped by hand: check their payment in Stripe, ask them to make a new account, and mark it Unlimited in the D1 console with `UPDATE users SET unlimited = 1 WHERE email = '…'`.
- The site doesn't show a contact email yet. The Terms send buyers to the support contact on their Stripe receipt, so set a support email in Stripe → Settings → Business → **Public details** before going live.
- **No refunds.** The Terms say all sales are final, and buyers must tick "I understand Unlimited starts right away and is non-refundable" before checkout; the server refuses checkout without it and records the time on the Stripe payment (`metadata.no_refund_accepted_at`) as evidence if a buyer disputes the charge. If you ever do refund someone, set `unlimited = 0` for that account in D1.
- Password hashing uses 50,000 PBKDF2 rounds so sign-ups fit the Workers free plan's CPU limit. On a paid plan, set the variable `PBKDF2_ITERATIONS` to `100000`; existing passwords upgrade when people next log in.
- Accounts and payments only work on the website, not in the Claude artifact preview.
