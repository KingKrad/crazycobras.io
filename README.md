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
