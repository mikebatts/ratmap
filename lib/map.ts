// Map constants + shared helpers for the MapLibre layer.
import type { Category } from "./types";
import { CATEGORY_META } from "./types";

export const NYC_CENTER: [number, number] = [-74.006, 40.7128];
export const NYC_ZOOM = 11;
export const NYC_BOUNDS: [[number, number], [number, number]] = [
  [-74.2591, 40.4774], // SW
  [-73.7004, 40.9176], // NE
];

/**
 * Basemap style URL. Uses MapTiler if a key is provided, otherwise falls back
 * to OpenFreeMap's free, no-key Positron style — clean light basemap that
 * keeps the colored pins readable.
 */
export function basemapStyle(): string {
  const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  if (key) {
    return `https://api.maptiler.com/maps/dataviz-light/style.json?key=${key}`;
  }
  return "https://tiles.openfreemap.org/styles/positron";
}

/**
 * MapLibre data-driven color expression: pick the pin color from the
 * observation's category property. Keep in sync with CATEGORY_META.
 */
export function categoryColorExpression(): unknown[] {
  const expr: unknown[] = ["match", ["get", "category"]];
  for (const cat of Object.keys(CATEGORY_META) as Category[]) {
    expr.push(cat, CATEGORY_META[cat].color);
  }
  expr.push("#868E96"); // default (gray)
  return expr;
}

/** Build the time threshold ISO string from a UI time-range key. */
export function sinceFromRange(range: TimeRange): string | null {
  if (range === "all") return null;
  const now = new Date();
  const days: Record<Exclude<TimeRange, "all">, number> = {
    "30d": 30,
    "90d": 90,
    "1y": 365,
    "2y": 730,
  };
  now.setDate(now.getDate() - days[range]);
  return now.toISOString();
}

export type TimeRange = "30d" | "90d" | "1y" | "2y" | "all";

export const TIME_RANGES: { key: TimeRange; label: string }[] = [
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "1y", label: "1 year" },
  { key: "2y", label: "2 years" },
  { key: "all", label: "All time" },
];
