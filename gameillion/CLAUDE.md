# Gameillion: project rules

An interactive, Duolingo-style course where learners use AI helpers to build and launch their own daily puzzle game. Free Unit 1 (lessons 1–3), $19 one-time unlock for the rest.

## Stack
- One Cloudflare Worker (`src/index.js`) serving static files from `public/` and the API under `/api/*`.
- D1 database (`migrations/`), Stripe Checkout + webhook, Resend for sign-in emails.
- Plain JavaScript ES modules. **No framework, no bundler, no runtime npm dependencies.** Only devDependency: `wrangler`.

## Where things live
- `public/js/rules.js`: **all game rules** (price, paywall, XP, levels, streaks, progress merge, lesson goals, daily puzzle maths, validation). Pure functions only: no DOM, no I/O. Shared by browser and Worker.
- `src/app.js`: the API. External services come in via `deps` so it's testable without a network.
- `src/content/lessons.js`: all lesson content as plain data. Paid lessons are only served to buyers by `/api/lessons/:n`.
- `public/play/game.js`: the starter daily game. It's a classic script (sandboxed iframe + standalone download), so it carries its own copy of the puzzle maths; `test/game.test.js` proves the copy matches `rules.js`.
- `public/js/fx.js`: particles, shake, synthesized sound. Effects scale with a 0–3 "tier".

## Rules
- Every change is a small, tested step: `npm test` must pass before committing.
- New or changed rules go in `rules.js` with tests in `test/rules.test.js`. API behaviour gets a test in `test/api.test.js`.
- Never use `innerHTML`/`insertAdjacentHTML`/`eval` on site pages; build DOM with `el()` and `textContent`. (`new Function` is allowed **only** inside the sandboxed `/play/` game, to run learner code.)
- No secrets in the repo. Secrets live in Cloudflare: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`. Missing secret → the feature fails closed with a friendly message.
- Never trust the client: paywall, purchases and admin checks happen in the Worker.
- Accessibility: keyboard reachable, visible focus, labels on every control, respect `prefers-reduced-motion` and the Motion setting.
- Feel: every action gets feedback that scales with how good it was; big moments get build-up and payoff.
- Originality: no copied names, art, music or levels from other games. Other games may appear only as linked case studies.
- No earnings promises in any copy.
- HTML pages are plain files. Keep the header/footer identical across pages when editing.

## Commands
- `npm test`: unit + API tests (Node's built-in runner).
- `npm run db:local` then `npm run dev`: local site at http://localhost:8787 (uses `.dev.vars`; `DEV_SHOW_LINKS=1` shows sign-in links on screen instead of emailing).
- `npm run check`: deploy dry run.
