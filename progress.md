# Progress Log — ratmap.nyc

Durable state log. Append an entry every iteration. Newest at top.

---

## 2026-06-15 — Map UI verified + first commit (Claude Opus 4.8)

**Session goal:** Finish + verify the map UI from the prior scaffold and land
the first commit. The scaffold session built every file but never committed.

**Verified this session:**
- MapLibre `4.7.1` present in `package.json` and installed (ships its own
  types — no separate `@types/maplibre-gl` needed/added).
- All six components present and complete: `Map.tsx` (clustered, color-coded
  pins, popup on click, fly-to on search), `MapControls.tsx` (zoom + recenter
  to NYC), `AddressSearch.tsx` (debounced), `ObservationPopup.tsx`,
  `FilterPanel.tsx` (time range / category / borough), `AddressDetail.tsx`
  (right slide-out, P1).
- `app/page.tsx` (map page w/ search, about link, legend, footer attribution)
  and `app/about/page.tsx` (minimal — `@mikebatts_` + attribution + source).
- `lib/map.ts` constants/helpers wired to all components.
- `npm run build` ✓ — `npm run lint` ✓ (no warnings/errors) — `npm run dev`
  boots, `/` and `/about` both return 200.
- Defensive fetching confirmed: builds + renders with empty/placeholder Supabase.

**First commit:** "Add map UI, components, about page, /api/* routes ready".

---

## 2026-06-15 — Initial scaffold (Claude Opus 4.8)

**Session goal:** Scaffold the full MVP per the 2026-06-15 brief + Mike's
adjustments. Code only — no Vercel, no domain, no deploy. Supabase migration
ready but not run. Ingest scripts ready but not executed.

**Done:**
- Repo cloned + connected to `mikebatts/rats-nyc`, working on `main`.
- Next.js 15 (App Router) + React 19 + TypeScript + Tailwind + MapLibre scaffold.
- Loop-pattern files: `VISION.md`, `features.json`, `progress.md`, `AGENTS.md`.
- `README.md`, `LICENSE` (MIT), `.env.example` with placeholders.
- Supabase migration `supabase/migrations/0001_init.sql` (schema from brief §3).
- Data layer: `lib/supabase.ts`, `lib/types.ts`, `lib/socrata.ts`, `lib/ingest.ts`.
- Ingest scripts: `scripts/ingest-311.ts`, `scripts/ingest-rodent.ts`,
  `scripts/daily-ingest.ts` (all support `--dry-run` and `--limit N`).
- API routes: `app/api/observations`, `app/api/address-search`, `app/api/stats`.
- Map UI: `Map.tsx`, `MapControls.tsx`, `AddressSearch.tsx`,
  `ObservationPopup.tsx`, `FilterPanel.tsx`, `AddressDetail.tsx`.
- About page: `app/about/page.tsx` (minimal — @mikebatts_ link + attribution).
- Brand: hot dog yellow accent, Inter body, Space Grotesk headers, dark on cream.
- Defensive data fetching — build succeeds even with placeholder/empty Supabase.

**Deferred to Mike (explicit per hand-off):**
- Wiring real Supabase credentials (env vars).
- Running migration `0001_init.sql`.
- Running the 24-month backfill (`ingest:311`, `ingest:rodent`).
- Vercel deploy, custom domain, daily cron in production.

**Next iteration:** Once Supabase is wired + backfill run, verify each P0
feature end-to-end against real data and flip `passes` to `true` in features.json.
