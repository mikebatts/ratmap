# Progress Log — ratmap.nyc

Durable state log. Append an entry every iteration. Newest at top.

---

## 2026-06-16 — Mobile optimization + iOS Safari pass (Claude Opus 4.8)

Grounded in Mobbin Apple Maps **iOS** refs (search-in-bottom-sheet, options-as-
bottom-sheet, floating right-side controls). Desktop layout unchanged.

- **Filter bug fixed:** on mobile the filter dropdown rendered under the address
  search. Extracted `FilterControls` (shared fields); desktop keeps the dropdown
  (`FilterPanel`), mobile now opens a **bottom sheet** (`FilterSheet` — grabber,
  Filters title, Done, dimmed map). No more overlap.
- **Reachability:** mobile search moved to a **thumb-reachable bottom bar** (with a
  Filters button beside it); its dropdown opens **upward**. Brand floats top-left,
  theme+About top-right, map controls raised to clear the bottom bar; footer hidden
  on mobile (credit is in About). Detail card is a bottom sheet and hides the search
  bar while open.
- **iOS Safari hardening:** all inputs **16px** (no focus-zoom), `-webkit-text-size-
  adjust`, killed tap-flash + rubber-band overscroll, `touch-action: manipulation`,
  safe-area insets via `env()` on the floating bars, `dvh`.
- Page overlays refactored into independent floating elements (single AddressSearch
  instance, positioned responsively) — more Apple-Maps-like, no duplicate state.

**Verified:** typecheck ✓, 115 tests ✓, lint ✓. Playwright iPhone 13 light+dark:
input font 16px, filter bottom sheet works, search opens upward, detail sheet hides
search bar, 0 console errors (`scripts/m-*.png`).

**Follow-up fix:** the `.safe-*` classes (defined after `@tailwind utilities`, so
they win the cascade) used `max(env(), 0px)` — which on desktop/narrow browsers
forced the floating bars' padding to **0** ("zero margins"). Raised the floor to
`0.75rem` so there's always a gap. Also swapped `safe-b/safe-x` for explicit
`pb-[max(...,env())]` on the detail + filter sheets so their `px-5` padding isn't
capped. Verified: narrow-width padding now 12px (`scripts/narrow-*.png`).

---

## 2026-06-16 — Production hardening: alerting, health, error handling (Claude Opus 4.8)

Live on ratmap.nyc (apex → www) serving 14k rows after Supabase env vars were set
in Vercel. Added operational safety:

- **Cron auth:** generated a `CRON_SECRET` (user added it to Vercel). Endpoint 401s
  without it.
- **Failure alerting:** new `lib/alert.ts` `notify()` posts to an optional
  `ALERT_WEBHOOK_URL` (Slack/Discord) — the cron alerts on failure / missing service
  key. New **`/api/health`** probe returns 200 ok / 503 degraded (stale = no ingest
  in >36h, or DB down) for uptime monitors; reports total + per-source last-run age.
- **Cron protections:** cold-start fallback capped to **3 months** (not 24) so a lost
  watermark can't trigger a millions-of-rows pull / timeout / free-tier blowup;
  **MAX_ROWS=20k** per source per run; alert on fatal error.
- **User-friendly errors:** Map surfaces fetch failures via `onError`; page shows a
  non-blocking glass toast "Couldn't load the latest reports" + **Retry** (re-runs the
  viewport fetch via a retry nonce). Non-2xx responses now count as errors.
- History intentionally kept at ~2.5 months (present/future-facing); no older backfill.

**Verified:** typecheck ✓, 115 tests ✓ (added health-route + cron alert mocks), lint ✓;
`/api/health` returns ok locally; error toast shows + clears on retry (Playwright).
Pushed to **staging** first.

---

## 2026-06-16 — Contrast/legibility sweep + branding pass (Claude Opus 4.8)

**Dark popup bug:** clicking a dot in dark mode showed a WHITE popup with near-
white text (invisible). Cause — MapLibre's default `.maplibregl-popup-content
{ background:#fff }` outranked our themed rule by load order. Fixed with a
double-class selector (`.maplibregl-popup .maplibregl-popup-content`) + ~0.95
opacity; tip/close-button selectors bumped to match. Dark popup now legible.

**Contrast / glass legibility (the "too transparent" complaint):**
- Bumped glass opacity tokens: `--glass-a` 0.3→0.6 (light) / 0.42→0.64 (dark);
  `--glass-strong-a` 0.66→0.86 / 0.72→0.84. Frosted but text-legible (Apple
  "Regular" material). Slightly darker light `--content`, brighter dark muted.
- Search field: bumps to ~0.9 opacity on `:focus` so typed text is crisp.

**Branding pass (iOS-26 Liquid Glass + Apple Maps):**
- Wordmark refined: `🐭 RATMAP` + accent-yellow `.NYC`, rounded-full capsule.
- Top-right controls grouped into ONE segmented glass capsule (About · theme ·
  Filters) — the iOS-26 "floating grouped controls" pattern. ThemeToggle +
  FilterPanel got optional className/triggerClassName props to render as bare
  segments. Filters dropdown still anchors below.
- Search field: Apple-Maps magnifying-glass icon, rounded-full, focus ring.

**Verified:** typecheck ✓, 111 tests ✓, lint ✓; UX + toggle regressions PASS;
dark popup + focused search legible; brand bar Apple-grade light + dark + mobile
(`scripts/brand-*.png`, `contrast-*.png`); 0 console errors.

---

## 2026-06-16 — Mobbin-matched Apple-Maps card refinement (Claude Opus 4.8)

**Goal:** With Mobbin authenticated (paid), compare the place card against real
Apple Maps reference frames and refine to match.

Mobbin Apple Maps refs showed the canonical pattern: a row of EQUAL-WIDTH
icon-over-label buttons (one filled primary + tinted secondaries) and a stat strip
bracketed by hairlines — not a capsule + circular icons. Applied:
- Action row → 3-up grid: **Report** (filled accent) / **Maps** / **Share**
  (tinted), icon-over-label, equal width.
- Added a bracketed **REPORTS NEARBY · MOST RECENT** stat strip (Apple's metadata
  row), moving the count out of the subtitle. Subtitle is now a clean category line.
- Kept the `.glass-card` Liquid Glass material, circular close, mobile grabber.

**Verified:** typecheck ✓, 111 tests ✓ (stat-row assertion updated), lint ✓; UX
regressions PASS; matches Apple Maps in light + dark (`scripts/card-*.png`); 0 errors.

---

## 2026-06-16 — Apple-Maps Liquid Glass place-card pixel pass (Claude Opus 4.8)

**Goal:** Refine the location side sheet to an iOS-26 Liquid-Glass, Apple-Maps
place card (desktop focus). NOTE: first attempt — Mobbin search was paywalled, so
this was grounded in Apple's published Liquid Glass guidance.

- New `.glass-card` material (globals.css): deep Regular glass — blur(36) +
  saturate(200%), bright specular rim, top bloom, layered float shadow; refraction
  override for Chromium; @supports fallback. Concentric 28px container radius.
- `AddressDetail` rebuilt as the place card: SF-like bold title (font-sans,
  tracking-tight) + "borough · N reports nearby" subtitle; circular glass close;
  **capsule primary "Report a rat"** + circular glass **Open-in-Maps** and
  **Share** (Web Share API + clipboard fallback w/ copied check); "Recent activity
  · latest <date>" section; mobile grabber + bottom-sheet, desktop floating card.

**Verified:** typecheck ✓, 111 tests ✓, lint ✓. Playwright: card looks Apple-grade
in light + dark + mobile (`scripts/card-*.png`); UX regressions PASS; 0 console errors.

---

## 2026-06-16 — Address formatting, search hardening, 311 fix, Apple-Maps side sheet (Claude Opus 4.8)

**Address formatting:** GeoSearch returns ALL-CAPS, ordinal-less names. New
`lib/address.ts` (`ordinal`/`formatStreet`/`formatAddress`) → "20 WEST 34 STREET"
becomes **"20 West 34th Street"**; preserves acronyms (FDR), lowercases minor words
("Avenue of the Americas"), keeps hyphenated Queens house numbers ("145-03"). Unit-
tested. Applied in the route.

**Search hardening (UX / edge cases / errors):**
- Out-of-order response guard (`reqSeq`) + `AbortController` on each keystroke.
- Distinct **error state** — route returns `{error:true}` on geocoder timeout/non-OK;
  UI shows "Couldn't reach address search…" vs. "No matches…".
- Dedupe identical address+borough; 4s geocoder timeout; always 200.

**“Report a rat” CTA fix:** was `KA-01010` (wrong); now **`KA-01107` — NYC311 "Rat or
Mouse Complaint"** (the actual report flow).

**Side sheet → Apple-Maps liquid-glass place card:** floating rounded-3xl glass card
(desktop top-right, mobile bottom sheet) instead of an edge-to-edge panel. Circular
glass close button, activity summary pill, action row (primary "Report a rat → 311" +
circular "Open in Maps" via `maps.apple.com`), sticky header, scrollable "Recent
activity". Count/most-recent derived from fetched features.

**Mobbin MCP** added to user config (`api.mobbin.com/mcp`) for design reference —
connects via OAuth on next restart.

**Verified:** typecheck ✓, **111 tests** ✓ (added `lib/address.test.ts`, geocoder +
error + dedupe cases; updated sheet copy assertions), lint ✓. Live: addresses format
correctly; sheet looks Apple-Maps-grade both themes; UX + toggle + popup regressions
PASS; 0 console errors.

---

## 2026-06-16 — Real address autocomplete (NYC GeoSearch) (Claude Opus 4.8)

**Problem:** address search only matched addresses that already had a rat report
(ILIKE over `rat_observations`), so typing your home address returned nothing.

**Fix:** `/api/address-search` now proxies **NYC Planning Labs GeoSearch** (Pelias)
— free, no API key, NYC-scoped autocomplete — so any NYC address resolves. Proxied
server-side (no CORS), 4s timeout, defensive (always 200). `AddressMatch` slimmed to
`{address, borough, latitude, longitude}` (no rat count from the geocoder).
`AddressDetail` now derives the count + most-recent date from the observations it
fetches near the point (bbox widened to ~150m ≈ one block), and shows a graceful
"No rat reports recorded nearby." empty state. Search dropdown shows a location pin
instead of a count badge. (The unused trigram index in `0001_init.sql` is now
dormant — harmless.)

**Verified:** typecheck ✓, 101 tests ✓ (rewrote route test to mock GeoSearch; added
geocoder cases), lint ✓. Live: "20 W 34th St" → resolves → flies there → panel shows
nearby reports; addresses with no reports resolve cleanly. 0 console errors.

---

## 2026-06-16 — Theme-toggle marker bug + About modal + attribution (Claude Opus 4.8)

**Critical bug:** toggling the theme made all dots/markers vanish (and stay gone).
Root cause — `map.once("style.load", …)` but **MapLibre has no `style.load`
event** (only `styledata`/`load`), so layers were never re-added after `setStyle`.
A `styledata` + `isStyleLoaded()` attempt still raced (old style lingers, then the
event stream goes quiet before isStyleLoaded flips true). Final fix: a short poll
that re-adds the instant the new style is loaded AND our source is wiped. Also made
`addDataLayers` idempotent (tears down `DATA_LAYER_IDS` + sources first). Regression:
`scripts/qa-toggle.mjs` (markers survive light→dark→light).

**UX requests:**
- Footer (“Made with ♥ in NYC …”) moved to `bottom-8` to match the legend's gap.
- Removed the on-map MapLibre attribution (`attributionControl: false`); OSM /
  OpenFreeMap credit now lives in the About content.
- **About is now a liquid-glass modal** over the live map (dimmed + blurred
  backdrop, glass-strong card, Escape/backdrop/✕ close, focus-on-open). Shared
  `AboutContent` powers both the modal and the `/about` route.

**Verified:** typecheck ✓, 100 tests ✓, lint ✓. Playwright: toggle regression PASS,
9 UX checks PASS, popup-anchor PASS; About modal opens + Esc-closes both themes; 0
console errors.

---

## 2026-06-16 — Production UX sweep + popup bug fix (Claude Opus 4.8)

**Goal:** Catch bugs and polish to production quality across functionality + CSS/UX.

**Critical bug fixed:** clicking a dot opened the popup in the top-left corner.
Cause — `rm-rise-in` animated `transform` on `.maplibregl-popup`, overriding
MapLibre's inline positioning transform (`transform: none` at keyframe end). Fix:
animate the inner `.maplibregl-popup-content` + fade the container only. Locked in
with a Playwright regression (`scripts/qa-popup-anchor.mjs`).

**Keyboard / a11y / focus:**
- Escape closes popup, detail panel, and filter panel; filter panel also closes
  on outside click. Detail panel is `role="dialog"`, focuses its close button on
  open. All gated with proper cleanup.
- AddressSearch is now a real ARIA combobox: arrow-key nav, Enter selects,
  Escape closes, `aria-expanded/activedescendant`, `role=listbox/option`.
- focus-visible rings on glass controls, close button, report CTA.

**Mobile / responsive:** safe-area insets (`.safe-t/.safe-b/.safe-x`) for notch +
home indicator on header, footer, detail panel, and MapLibre controls. Header
reflows so brand + tools share one row with search below on mobile (single row on
sm+). Popup `maxWidth: min(290px, 100vw-28px)`; long addresses wrap.

**CSS audit:** global `prefers-reduced-motion` safety net (covers inline Tailwind
transitions, not just `.animate-*`); `scrollIntoView` guarded for SSR/jsdom.

**Verified:** typecheck ✓, **100 tests** ✓ (added keyboard/ARIA/Escape tests),
lint ✓, **`next build` ✓**. Playwright: popup-anchor regression PASS; 9 UX
interaction checks PASS (Escape/outside-click/keyboard/mobile); 0 console errors
light + dark + mobile.

---

## 2026-06-16 — Authentic Liquid Glass + creative/motion pass (Claude Opus 4.8)

**Goal:** Make the glass read like Apple's iOS 26 Liquid Glass and take the whole
UI up a tier — interactions, motion, marker craft, hierarchy, NYC pride.

**Liquid Glass (researched — Mobbin MCP not available):**
- The "glass" read = clear/transparent pane + saturation lift + bright specular
  rim + EDGE REFRACTION. Rebuilt `.glass`/`.glass-strong` accordingly (low tint
  alpha via `--glass-a`, layered specular box-shadows, top sheen).
- Real refraction via an SVG `feTurbulence → feDisplacementMap` filter
  (`#liquid-glass` in `layout.tsx`) applied through `backdrop-filter: url(#…)`.
  **Chromium-only** (Safari/Firefox don't support SVG-in-backdrop, confirmed
  June 2026) → gated behind a `.glass-refract` class set by a JS Chromium check;
  everyone else gets the rich static-glass fallback. No one sees a broken effect.

**Markers fixed + elevated (`Map.tsx`, `lib/map.ts`):**
- Removed the weird white specular bead on dots (the user's complaint).
- Clusters are now translucent **glass chips** (heat-tinted, see-through, bright
  rim, glow) with the count. Dots are clean glassy discs + soft glow.
- Hover lights up + grows the feature under the cursor (`feature-state` hover,
  `generateId: true`).

**Motion + interaction system (`globals.css`):**
- Keyframes (fade/pop/slide/rise/pulse) + `prefers-reduced-motion` guard.
- `.glass-interactive` press/hover physics; popup rises in (`.rm-popup`); panels
  slide/pop in; theme toggle cross-fades sun/moon; chips/rows have hover+active.

**Hierarchy + NYC love (`page.tsx`):**
- Top bar reorganized into clear groups: brand · search · tools (About + theme +
  Filters) as one cohesive 44px cluster; Filters dropdown now floats (absolute).
- Polished popup into a glass report card (category chip + accent source link).
- Footer: "Made with ♥ in NYC". Legend swatches glow.
- Wordmark locked to `SITE_WORDMARK = "RATMAP.NYC"` (no more dev-host leak).

**Verified:** typecheck ✓, 97 tests ✓, lint ✓. Playwright light+dark+mobile +
high-DPI close-ups: **0 console errors** both themes; refraction active in
Chromium; dot-bead gone; cluster chips + popup confirmed.

---

## 2026-06-16 — Data wired live + font fix + major design/branding pass (Claude Opus 4.8)

**Session goal:** Local QA against real data, then a high-bar design & branding pass.

**Data wired (real Supabase, project `ratmap` / ref `vanwbtatebyykqxznrqv`):**
- Applied `0001_init.sql` over Postgres; verified `rat_observations`, `ingest_state`,
  PostGIS, trigram index, `observations_in_bbox` RPC, RLS read policy.
- Ingested ~14k recent observations (bounded `--since 2026-04-01`, not the full 24-mo
  backfill): 6,132 from 311 + 7,868 rodent inspections.
- Verified end-to-end: `/api/stats` (14k), `/api/observations` (GeoJSON), address
  search (25 matches), cron route 401 without auth. Flipped 16 verified P0/P1 flags.

**Bug fixed:** map cluster labels 404'd on `Open Sans` glyphs (MapLibre default) — the
tile servers only host **Noto Sans**. Pinned `text-font: ["Noto Sans Regular"]`.

**Design & branding pass (full send, all surfaces):**
- **Theming engine** — `ThemeProvider` (follows OS, manual toggle, localStorage),
  no-flash inline script in `layout.tsx`, `darkMode: "class"`, semantic CSS-var tokens
  in `globals.css` mapped to Tailwind (`surface`/`content`/`accent`/`hairline`).
- **Liquid glass** — `.glass` / `.glass-strong` utilities (blur + saturate + specular
  edge + `@supports` fallback) applied to every overlay (header, search, filters,
  controls, legend, footer, popup, detail panel, about).
- **Map** — `basemapStyle(resolved)` swaps positron ↔ dark (OpenFreeMap; note: the dark
  style is `/styles/dark`, **not** `dark-matter` which 404s). `setStyle` re-adds layers
  on theme change. Redesigned clusters (neon glow halo) + adaptive dot strokes.
- **Brand** — `🐭 RATMAP.NYC` wordmark, emoji favicon (`icon.svg`), refreshed OG image.
- **VISION.md** — rewrote the "no emoji / not a meme" non-negotiable into the warm,
  human, love-letter-to-NYC principle (keeps no-fear/no-shame/no-tracking).
- Added features `theme-dark-light`, `brand-refresh` (both pass).

**Verified:** typecheck ✓, 97 tests ✓ (added `ThemeProvider.test.tsx`), lint ✓.
Playwright light+dark+mobile sweep: **0 console errors / 0 real failed requests** both
themes; basemap confirmed swapping with the UI.

**Still open (P0):** full 24-mo backfill, `daily-ingest` live, `mobile-responsive`
sign-off, production deploy + `daily-cron-live`.

**Note:** ingest scripts read `.env` (via `dotenv/config`), not `.env.local` — see the
session memory. Worked around by sourcing `.env.local` inline.

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
- Repo cloned + connected to `mikebatts/ratmap`, working on `main`.
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
