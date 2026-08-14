# Swedle

A backend-authoritative daily software-company guessing game. Players compare founding year, current US new-grad SWE compensation, company size, domains, and main engineering offices across five guesses. Persistence uses a strictly namespaced Upstash Redis keyspace.

## Local setup

1. Create or reuse an Upstash Redis database.
2. Copy `.env.example` to `.env.local` and fill in its REST credentials and secrets.
3. Install dependencies with `npm install` and start the app with `npm run dev`.

The app intentionally has no browser-side puzzle clock. `GET /api/game` and every guess call resolve the active UTC puzzle in Postgres. The browser receives an opaque run token and renders the returned state.

## Vercel setup

- Add all variables from `.env.example` to the relevant environments.
- Connect preview and production to the same Upstash resource as required for the live admin workflow.
- Enable Vercel Deployment Protection for preview deployments.
- Keep `SWEDLE_ADMIN_SECRET`, `PLAYER_COOKIE_SECRET`, `KV_REST_API_TOKEN`, and `CRON_SECRET` server-only.
- Vercel invokes `/api/cron/daily` at 00:00 UTC. The request-time database resolver is a fallback if the cron is delayed.

`/debug` and every `/api/admin/*` endpoint return 404 unless `VERCEL_ENV=preview`. The debug screen additionally requires the admin passphrase.

## Data maintenance

The initial catalog in `data/companies.sql` is deliberately curated rather than scraped. `npm run generate:data` converts it into typed application data. Compensation and company-size values are estimates with an as-of date and should be reviewed before launch and periodically afterward. Domain arrays use set semantics: exact sets are green, any overlap is orange, and disjoint sets are red.

All application keys begin with `swedle:v1:`. This allows the database to be shared safely with unrelated applications without overwriting or scanning their keys.

## Verification

```sh
npm test
npm run typecheck
npm run lint
npm run build
```
