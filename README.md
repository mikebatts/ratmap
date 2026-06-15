# Rats.nyc

A free, no-account, no-ads map of every publicly-reported rat sighting,
inspection, and 311 complaint in New York City.

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
