# ratmap.nyc

A free, no-account, no-ads map of every publicly-reported rat sighting,
inspection, and 311 complaint in New York City.

> The product ships as **ratmap.nyc**. The git repo is `rats-nyc` (and so is
> the npm package name). The live domain is set via `NEXT_PUBLIC_SITE_URL` and
> can be swapped in one place.

The data is all public — 311 Service Requests and DOHMH Rodent Inspection,
straight from [NYC Open Data](https://opendata.cityofnewyork.us/). This app's
job is to make it actually usable: fast, mobile-first, and searchable by
address. Free forever. No accounts. No tracking. No ads.

> Built by [@mikebatts_](https://x.com/mikebatts_) on X.

## Stack

| Layer       | Choice                              |
| ----------- | ----------------------------------- |
| Framework   | Next.js 15 (App Router) + React 19  |
| Language    | TypeScript                          |
| Styling     | Tailwind CSS                        |
| Map         | MapLibre GL JS                      |
| Database    | Supabase (Postgres + PostGIS)       |
| Data ingest | Socrata (NYC Open Data) → daily cron |
| Hosting     | Vercel                              |

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase + Socrata values
npm run dev                  # http://localhost:3000
```

The UI is defensive: it builds and runs even with no backend wired up, showing
an empty map until Supabase is configured and data is ingested.

## Data

Two public datasets, normalized into a single `rat_observations` table:

- **311 Service Requests** — Socrata `erm2-nwe9`, filtered to
  `complaint_type = 'Rodent'`.
- **DOHMH Rodent Inspection** — Socrata `p937-wjvj`.

See [`docs/data-sources.md`](docs/data-sources.md) for field-level detail and
the city's own caveats about the data.

### Database setup

```bash
# Apply the schema to your Supabase project (Postgres + PostGIS):
supabase db push           # or run supabase/migrations/0001_init.sql manually
```

### Ingest

```bash
npm run ingest:311 -- --dry-run --limit 100   # smoke test, no writes
npm run ingest:311                            # 24-month backfill
npm run ingest:rodent                         # 24-month backfill
npm run ingest:daily                          # delta since last watermark (cron)
```

The backfill pulls ~24 months of history and can take 30+ minutes. The daily
job pulls only deltas since the last watermark.

## Deploy to Vercel

This app is Vercel-native. The repo includes [`vercel.json`](vercel.json),
which registers a daily cron that hits `/api/cron/daily-ingest`.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/mikebatts/rats-nyc)

### Environment variables

Set these in **Vercel → Project → Settings → Environment Variables**:

| Variable                     | Required | Notes                                                            |
| ---------------------------- | -------- | ---------------------------------------------------------------- |
| `SUPABASE_URL`               | ✅       | Supabase project URL.                                            |
| `SUPABASE_ANON_KEY`          | ✅       | Read-only key, used by API routes.                               |
| `SUPABASE_SERVICE_ROLE_KEY`  | ✅       | Write key, used **only** by the cron ingest. Never sent to the browser. |
| `CRON_SECRET`                | ✅       | Long random string. Vercel sends it as a bearer token to the cron route. |
| `NEXT_PUBLIC_SITE_URL`       | ✅       | Canonical URL, e.g. `https://ratmap.nyc`. Drives metadata + OG image. |
| `SOCRATA_APP_TOKEN`          | optional | Raises NYC Open Data rate limits.                                |
| `NEXT_PUBLIC_MAPTILER_KEY`   | optional | Basemap tiles; falls back to a free no-key style.                |

### Custom domain

Add your domain (e.g. `ratmap.nyc`) under **Vercel → Project → Settings →
Domains**, then set `NEXT_PUBLIC_SITE_URL` to match. To switch domains later,
change only that one variable and redeploy.

### Cron: daily data refresh

`vercel.json` schedules `/api/cron/daily-ingest` at `0 10 * * *`
(10:00 UTC ≈ 06:00 ET) every day. The route:

1. Requires `Authorization: Bearer ${CRON_SECRET}` — Vercel adds this header
   automatically once `CRON_SECRET` is set; manual/anonymous hits get a `401`.
2. Reads the per-source watermark and pulls only newer rows (24-month window on
   the first run).
3. Returns a JSON summary: `{ ok, ranAt, p311, rodent }`.

Vercel Cron is included on the **Hobby** plan (1 cron job, up to 2 runs/day).
This project uses 1 job × 1 run/day — well within the limit.

**Verify it runs:** Vercel dashboard → your project → **Logs** (or the
**Cron Jobs** tab) shows each invocation. You can also trigger it manually:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://ratmap.nyc/api/cron/daily-ingest
```

## Project conventions

This repo follows the AGENT-LOOPS pattern:

- [`VISION.md`](VISION.md) — goal, non-negotiables, stop condition.
- [`features.json`](features.json) — per-feature `passes` state.
- [`progress.md`](progress.md) — durable state log, appended every iteration.

## License

[MIT](LICENSE). 100% open source.

---

Data from NYC Open Data (311 Service Requests) and DOHMH (Rodent Inspection).
Updated daily.
