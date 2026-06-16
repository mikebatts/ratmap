// Map constants + shared helpers for the MapLibre layer.
import type { Category } from "./types";
import { CATEGORY_META } from "./types";

export const NYC_CENTER: [number, number] = [-74.006, 40.7128];
export const NYC_ZOOM = 11;
export const NYC_BOUNDS: [[number, number], [number, number]] = [
  [-74.2591, 40.4774], // SW
  [-73.7004, 40.9176], // NE
];

export type Resolved = "light" | "dark";

/**
 * Basemap style URL for the given theme. Uses MapTiler's dataviz styles if a
 * key is provided, otherwise OpenFreeMap's free, no-key Positron (light) /
 * Dark Matter (dark) — both clean basemaps that keep the colored pins readable
 * and both serve Noto Sans glyphs (see Map.tsx cluster-count text-font).
 */
export function basemapStyle(resolved: Resolved = "light"): string {
  const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  if (key) {
    const map = resolved === "dark" ? "dataviz-dark" : "dataviz-light";
    return `https://api.maptiler.com/maps/${map}/style.json?key=${key}`;
  }
  return resolved === "dark"
    ? "https://tiles.openfreemap.org/styles/dark"
    : "https://tiles.openfreemap.org/styles/positron";
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

/**
 * Density heat ramp for clusters: hotdog yellow → amber → orange → NYC red as
 * the count climbs. Reads as a heatmap of where the city's rats cluster, and
 * gives the glowing bubbles real drama.
 */
export function clusterColorExpression(): unknown[] {
  return [
    "step",
    ["get", "point_count"],
    "#F5C518", // < 25  — hotdog yellow
    25,
    "#F7A50C", // 25+   — amber
    100,
    "#F2691E", // 100+  — orange
    500,
    "#E8412A", // 500+  — NYC red
  ];
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
