-- Rats.nyc — initial schema
-- Unified observations from 311 (erm2-nwe9) and DOHMH Rodent Inspection (p937-wjvj).
-- Run against a Supabase Postgres project with PostGIS available.

-- Extensions ---------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS postgis;

-- Unified observations table ----------------------------------------------
CREATE TABLE IF NOT EXISTS rat_observations (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL,                          -- '311' | 'rodent_inspection'
  source_id TEXT NOT NULL,                       -- original unique_key or job_ticket_or_work_order_id
  observed_at TIMESTAMPTZ NOT NULL,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  address TEXT,
  borough TEXT,
  zipcode TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  category TEXT NOT NULL,                         -- 'sighting' | 'inspection_pass' | 'inspection_fail' | 'baiting' | 'cleanup' | 'condition' | 'other_rodent' | 'other'
  detail TEXT,                                    -- raw descriptor / result
  raw_data JSONB,                                 -- full source row for transparency
  UNIQUE(source, source_id)
);

-- Indexes ------------------------------------------------------------------
-- Spatial index on a generated point so bbox queries use GIST.
CREATE INDEX IF NOT EXISTS rat_obs_geo_idx
  ON rat_observations
  USING GIST (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326));

CREATE INDEX IF NOT EXISTS rat_obs_observed_at_idx ON rat_observations (observed_at DESC);
CREATE INDEX IF NOT EXISTS rat_obs_borough_idx ON rat_observations (borough);
CREATE INDEX IF NOT EXISTS rat_obs_category_idx ON rat_observations (category);

-- Trigram index to make address ILIKE search fast (v1 address search).
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS rat_obs_address_trgm_idx
  ON rat_observations
  USING GIN (lower(address) gin_trgm_ops);

-- Ingest watermark (delta-only pulls) --------------------------------------
CREATE TABLE IF NOT EXISTS ingest_state (
  source TEXT PRIMARY KEY,
  last_observed_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ DEFAULT NOW(),
  rows_total BIGINT DEFAULT 0
);

-- RPC: observations within a bounding box ----------------------------------
-- Used by /api/observations. SECURITY DEFINER not needed (read-only public data).
CREATE OR REPLACE FUNCTION observations_in_bbox(
  min_lng DOUBLE PRECISION,
  min_lat DOUBLE PRECISION,
  max_lng DOUBLE PRECISION,
  max_lat DOUBLE PRECISION,
  since TIMESTAMPTZ DEFAULT NULL,
  cats TEXT[] DEFAULT NULL,
  boroughs TEXT[] DEFAULT NULL,
  max_rows INTEGER DEFAULT 5000
)
RETURNS SETOF rat_observations
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM rat_observations o
  WHERE o.longitude BETWEEN min_lng AND max_lng
    AND o.latitude BETWEEN min_lat AND max_lat
    AND (since IS NULL OR o.observed_at >= since)
    AND (cats IS NULL OR o.category = ANY(cats))
    AND (boroughs IS NULL OR o.borough = ANY(boroughs))
  ORDER BY o.observed_at DESC
  LIMIT max_rows;
$$;

-- Row Level Security: data is public + read-only from the anon key ----------
ALTER TABLE rat_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingest_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read observations" ON rat_observations;
CREATE POLICY "public read observations"
  ON rat_observations FOR SELECT
  USING (true);

-- ingest_state is written only by the service-role key (bypasses RLS), so no
-- anon policies are granted here. Reads of ingest_state are not exposed.
