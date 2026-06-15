# Data Sources

All data is public, from [NYC Open Data](https://opendata.cityofnewyork.us/),
served via the Socrata Open Data API (SoDA). No auth required; an app token is
optional and only raises rate limits.

## A. 311 Service Requests (2020–present)

- **Dataset ID:** `erm2-nwe9`
- **URL:** https://data.cityofnewyork.us/Social-Services/311-Service-Requests-from-2020-to-Present/erm2-nwe9
- **Rows:** ~21.5M total, ~50K rat-related
- **Updated:** daily
- **Rat filter:** `complaint_type = 'Rodent'`
- **Key fields:** `unique_key`, `created_date`, `closed_date`, `complaint_type`,
  `descriptor`, `incident_zip`, `incident_address`, `street_name`, `borough`,
  `latitude`, `longitude`, `location_type`, `status`

### Category mapping (311 → `rat_observations.category`)

| `descriptor` (contains)            | category    |
| ---------------------------------- | ----------- |
| "Rat Sighting"                     | `sighting`  |
| "Mouse Sighting", "Signs of Rodents", "Other rodent" | `other_rodent` |
| "Condition Attractive to Rodents"  | `condition` |
| (anything else under Rodent)       | `other`     |

## B. DOHMH Rodent Inspection

- **Dataset ID:** `p937-wjvj`
- **URL:** https://data.cityofnewyork.us/Health/Rodent-Inspection/p937-wjvj
- **Rows:** ~3.07M total
- **Updated:** daily
- **Key fields:** `inspection_type`, `job_ticket_or_work_order_id`, `job_id`,
  `job_progress`, `bbl`, `boro_code`, `block`, `lot`, `house_number`,
  `street_name`, `zip_code`, `latitude`, `longitude`, `result`, `inspection_date`

### Category mapping (inspection → `rat_observations.category`)

The category is derived from `inspection_type` and `result`:

| condition                                          | category          |
| -------------------------------------------------- | ----------------- |
| `inspection_type` = "Baiting"                      | `baiting`         |
| `inspection_type` = "Clean Up"                     | `cleanup`         |
| `result` contains "Passed" / "Rat Activity" (none) | `inspection_pass` |
| `result` contains "Failed" / "Rat Activity"        | `inspection_fail` |
| (anything else)                                    | `other`           |

> Verify exact `result` string values against live data before the backfill —
> the city occasionally changes wording. The mapping lives in
> `lib/socrata.ts` (`categorizeInspection`) and is the one place to adjust.

## C. (v2) 311 Rat Sightings — curated subset

- **Dataset ID:** `gj6a-xguv` — pre-filtered to rat-only. Not used in v1.

## Caveats (the city's own)

- Reports reflect **complaints and inspections, not rat populations.** A block
  with many reports may simply have engaged residents; a block with none may be
  under-reported.
- Geocoding is approximate. Some rows lack lat/long and are skipped on ingest.
- Inspection results are point-in-time and can change on re-inspection.
- This is **not** a measure of a building's cleanliness or a tenant's fault.

## Ingest mechanics

- Pull pages of 5,000 via `$limit` + `$offset`, ordered by the date field.
- Backfill window: 24 months (`observed_at >= now() - 24 months`).
- Delta runs: `observed_at > ingest_state.last_observed_at`.
- Upsert on `UNIQUE(source, source_id)` so re-runs are idempotent.
- Polite rate limit: ~1 request/sec.
