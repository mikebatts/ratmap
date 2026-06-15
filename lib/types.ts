// Shared types for deadrat.nyc — mirror the `rat_observations` schema in
// supabase/migrations/0001_init.sql. Keep these in sync with the migration.

export type Source = "311" | "rodent_inspection";

export type Category =
  | "sighting"
  | "inspection_pass"
  | "inspection_fail"
  | "baiting"
  | "cleanup"
  | "condition"
  | "other_rodent"
  | "other";

/** A single normalized observation, as stored in Postgres. */
export interface RatObservation {
  id: number;
  source: Source;
  source_id: string;
  observed_at: string; // ISO timestamp
  ingested_at: string;
  address: string | null;
  borough: string | null;
  zipcode: string | null;
  latitude: number;
  longitude: number;
  category: Category;
  detail: string | null;
  raw_data: Record<string, unknown> | null;
}

/** Shape inserted on ingest (no server-generated columns). */
export type RatObservationInsert = Omit<
  RatObservation,
  "id" | "ingested_at"
>;

/** Ingest watermark row. */
export interface IngestState {
  source: Source;
  last_observed_at: string | null;
  last_run_at: string;
  rows_total: number;
}

/** GeoJSON Feature for a single observation (what the map consumes). */
export interface ObservationFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: {
    id: number;
    source: Source;
    source_id: string;
    observed_at: string;
    address: string | null;
    borough: string | null;
    zipcode: string | null;
    category: Category;
    detail: string | null;
  };
}

export interface ObservationFeatureCollection {
  type: "FeatureCollection";
  features: ObservationFeature[];
}

export const ALL_CATEGORIES: Category[] = [
  "sighting",
  "inspection_fail",
  "inspection_pass",
  "baiting",
  "cleanup",
  "condition",
  "other_rodent",
  "other",
];

export const BOROUGHS = [
  "MANHATTAN",
  "BROOKLYN",
  "QUEENS",
  "BRONX",
  "STATEN ISLAND",
] as const;

export type Borough = (typeof BOROUGHS)[number];

/** Plain-English labels + colors for each category (used in UI + legend). */
export const CATEGORY_META: Record<
  Category,
  { label: string; description: string; color: string }
> = {
  sighting: {
    label: "Rat sighting",
    description: "A 311 caller reported seeing a rat.",
    color: "#E03131",
  },
  inspection_fail: {
    label: "Inspection failed",
    description: "A DOH inspection found active rat signs.",
    color: "#F08C00",
  },
  inspection_pass: {
    label: "Inspection passed",
    description: "A DOH inspection found no active rat signs.",
    color: "#868E96",
  },
  baiting: {
    label: "Baiting",
    description: "DOH applied rodenticide bait at this location.",
    color: "#1971C2",
  },
  cleanup: {
    label: "Clean up",
    description: "DOH performed a clean-up at this location.",
    color: "#1971C2",
  },
  condition: {
    label: "Conditions",
    description: "A 311 caller reported conditions attractive to rodents.",
    color: "#F5C518",
  },
  other_rodent: {
    label: "Other rodent",
    description: "A 311 report of mice or other rodent signs.",
    color: "#F5C518",
  },
  other: {
    label: "Other",
    description: "Another rodent-related report.",
    color: "#F5C518",
  },
};
