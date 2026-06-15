# AGENTS.md — ratmap.nyc

Read `VISION.md` (goal, non-negotiables, stop condition) and `features.json`
(per-feature `passes` state) at the start of every session. Append to
`progress.md` at the end of every session. Work one feature at a time; leave
clean state (commit + progress note).

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS · MapLibre GL JS ·
Supabase (Postgres + PostGIS) · Socrata (NYC Open Data) ingest.

## Hard constraints (from the brief)

- No accounts, no auth, no tracking, no analytics, no ads, no monetization.
- No emoji or cartoon rats in the UI. No fear-mongering or shaming copy.
- Do not change the data model in `supabase/migrations/0001_init.sql` without
  updating `lib/types.ts` and the brief.
- Data is public NYC Open Data — always attributed in the footer + about page.

## Local dev

```bash
npm install
cp .env.example .env.local   # fill in Supabase + Socrata values
npm run dev
```

## Ingest

```bash
npm run ingest:311 -- --dry-run --limit 100     # smoke test
npm run ingest:311                              # 24-month backfill
npm run ingest:rodent                           # 24-month backfill
npm run ingest:daily                            # delta since last watermark (cron)
```

Backfill is heavy (~50K–1.5M rows, 30+ min). Run only against a wired Supabase.
