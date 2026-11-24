# Gameillion

Build the next one-in-a-million daily game. Gameillion is a bite-size interactive course: every lesson changes a real, playable daily puzzle game right next to it. Learners use AI helpers to customise and code it, then download and publish their own game.

- Unit 1 (3 lessons) is free with no sign-up. Progress saves in the browser.
- The full course is a **$19 one-time** unlock via Stripe Checkout.
- Accounts use an email sign-in link and are only needed after buying, to sync across devices.
- The showcase takes learner submissions, which an admin approves.

## Run locally
```bash
npm install
npm run db:local      # create the local D1 tables
npm run dev           # http://localhost:8787
npm test
```
Create a `.dev.vars` file (it's git-ignored) for local secrets, e.g.:
```
DEV_SHOW_LINKS=1
ADMIN_EMAILS=you@example.com
STRIPE_WEBHOOK_SECRET=whsec_local
```

## Deploy (Cloudflare Workers)
1. **Repo:** put this folder at the root of a new GitHub repo named `gameillion`.
2. **Database:** in the Cloudflare dashboard go to Storage & Databases → D1 → Create → name it `gameillion`. Copy its **Database ID** into `wrangler.jsonc` (`database_id`). (Or run `npx wrangler d1 create gameillion`.)
3. **Worker:** Workers & Pages → Create → Import a repository → pick `gameillion`. Use deploy command `npm run deploy` (it applies database migrations, then deploys). The project name must be `gameillion`.
4. **Admin:** in `wrangler.jsonc`, set `ADMIN_EMAILS` to your email, so `/admin.html` lets you approve showcase games.
5. **Sign-in email:** create a free Resend account, verify a sending domain, and create an API key. In the Worker's Settings → Variables and Secrets, add the secret `RESEND_API_KEY`. Set `EMAIL_FROM` in `wrangler.jsonc` (e.g. `Gameillion <hello@yourdomain.com>`). Until this is done, sign-in shows a friendly "not set up yet" message.
6. **Payments:** an adult must own the Stripe account (if you're under 18, a parent or guardian). In Stripe:
   - Developers → API keys → copy the **Secret key** → add a Worker secret `STRIPE_SECRET_KEY`.
   - Developers → Webhooks → Add endpoint `https://<your-worker>/api/stripe/webhook`, events `checkout.session.completed` and `checkout.session.async_payment_succeeded` → copy the **Signing secret** → add a Worker secret `STRIPE_WEBHOOK_SECRET`.
   - Test with Stripe's test mode keys first (card `4242 4242 4242 4242`).
7. Review `terms.html`, `privacy.html` and `refunds.html` (template text). Add a real contact email.

## Costs
- The Cloudflare Workers Free plan and D1 free tier cover a small site.
- Stripe charges a fee per sale. Resend's free tier covers small email volume.
- A custom domain is optional (about $10–12/year).
