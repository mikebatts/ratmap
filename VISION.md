# VISION — Rats.nyc

## Goal

Ship a v1 of **Rats.nyc**: a free, map-based web app that surfaces every
publicly-reported rat sighting, inspection, and 311 complaint in New York City,
plotted on a fast interactive map. New Yorkers can search an address and see the
rat history of that exact building or block. The data is all public; the app's
job is to make it actually usable.

Loads in <2s. Address search in <500ms. Updates daily via cron with no manual
ops. Open source. No accounts. No tracking. No ads. No monetization (v1).

## Success criteria

- Loads in <2s on 3G (Lighthouse mobile audit)
- Address search returns <500ms
- Data refreshes daily via cron, no manual intervention
- 99% uptime via Vercel + Supabase free tier
- All data is public NYC Open Data, attributed at the bottom of the page
- Map is mobile-first, fully responsive
- 100% of 311 + DOH rodent observations from the last 24 months are in the DB

## Non-negotiables

- **No accounts.** No login. No "sign up to save."
- **No tracking** beyond what Vercel provides by default. No analytics scripts.
  No Google Analytics. No Meta Pixel. No ad-tech. No selling user data — there
  is no user data to sell.
- **No fear-mongering** in copy. The voice is NYC-direct, not "shock value."
- **No shame.** Rats are part of the city. Residents aren't to blame.
- **100% open source.** Repo public from day 1.
- No emoji in the UI. No cartoon rats. The product is a *tool*, not a meme.

## Stop condition

All P0 features in `features.json` are `passes: true`, all 311 rat complaints
and DOH rodent inspections from the last 24 months are in the DB, the address
search returns expected results on a manual test, and a staging URL is live.

## Data sources (public, verified)

- **311 Service Requests** — Socrata `erm2-nwe9`, filtered to
  `complaint_type = 'Rodent'` (~50K rat-related rows).
- **DOHMH Rodent Inspection** — Socrata `p937-wjvj` (3.07M rows).

See `docs/data-sources.md` for field-level detail.
