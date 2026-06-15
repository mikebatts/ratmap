// Typed Socrata (SoDA) client for the two NYC Open Data datasets, plus the
// row → RatObservation normalizers. No external dependency; uses fetch.
//
// Docs: https://dev.socrata.com/docs/queries/

import type { Category, RatObservationInsert } from "./types";

export const DATASETS = {
  threeOneOne: "erm2-nwe9", // 311 Service Requests 2020–present
  rodent: "p937-wjvj", // DOHMH Rodent Inspection
} as const;

const SOCRATA_BASE = "https://data.cityofnewyork.us/resource";
const APP_TOKEN = process.env.SOCRATA_APP_TOKEN ?? "";

export interface SoqlQuery {
  $select?: string;
  $where?: string;
  $order?: string;
  $limit?: number;
  $offset?: number;
}

/** Low-level SoQL fetch for a dataset. Throws on non-2xx. */
export async function socrataQuery<T = Record<string, string>>(
  datasetId: string,
  query: SoqlQuery,
): Promise<T[]> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) params.set(key, String(value));
  }
  const url = `${SOCRATA_BASE}/${datasetId}.json?${params.toString()}`;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (APP_TOKEN) headers["X-App-Token"] = APP_TOKEN;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Socrata ${datasetId} ${res.status}: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T[];
}

/** Sleep helper for polite rate limiting. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Page through a dataset, yielding each page. Caller decides when to stop
 * (e.g. an empty page). Rate-limited to ~1 req/sec by default.
 */
export async function* paginate<T = Record<string, string>>(
  datasetId: string,
  query: Omit<SoqlQuery, "$offset">,
  opts: { pageSize?: number; delayMs?: number; maxRows?: number } = {},
): AsyncGenerator<T[], void, unknown> {
  const pageSize = opts.pageSize ?? 5000;
  const delayMs = opts.delayMs ?? 1000;
  const maxRows = opts.maxRows ?? Infinity;

  let offset = 0;
  let pulled = 0;
  while (pulled < maxRows) {
    const limit = Math.min(pageSize, maxRows - pulled);
    const page = await socrataQuery<T>(datasetId, {
      ...query,
      $limit: limit,
      $offset: offset,
    });
    if (page.length === 0) return;
    yield page;
    pulled += page.length;
    offset += page.length;
    if (page.length < limit) return; // last page
    await sleep(delayMs);
  }
}

// --- Normalizers -----------------------------------------------------------

function num(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Map a 311 Rodent descriptor to our category taxonomy. */
export function categorize311(descriptor: string | undefined): Category {
  const d = (descriptor ?? "").toLowerCase();
  if (d.includes("rat sighting")) return "sighting";
  if (d.includes("mouse") || d.includes("signs of rodents")) return "other_rodent";
  if (d.includes("condition attractive")) return "condition";
  return "other";
}

/** Map a DOH inspection (type + result) to our category taxonomy. */
export function categorizeInspection(
  inspectionType: string | undefined,
  result: string | undefined,
): Category {
  const t = (inspectionType ?? "").toLowerCase();
  const r = (result ?? "").toLowerCase();
  if (t.includes("bait")) return "baiting";
  if (t.includes("clean")) return "cleanup";
  // "Rat Activity" / "Failed for Other R..." → active signs → fail.
  if (r.includes("rat activity") || r.includes("failed")) return "inspection_fail";
  if (r.includes("passed") || r.includes("no problem") || r.includes("monitoring"))
    return "inspection_pass";
  return "other";
}

export type Raw311 = Record<string, string>;
export type RawRodent = Record<string, string>;

/** Normalize one 311 row. Returns null if it lacks coordinates. */
export function normalize311(row: Raw311): RatObservationInsert | null {
  const latitude = num(row.latitude);
  const longitude = num(row.longitude);
  if (latitude === null || longitude === null) return null;
  if (!row.unique_key || !row.created_date) return null;

  return {
    source: "311",
    source_id: row.unique_key,
    observed_at: new Date(row.created_date).toISOString(),
    address: row.incident_address ?? row.street_name ?? null,
    borough: row.borough ? row.borough.toUpperCase() : null,
    zipcode: row.incident_zip ?? null,
    latitude,
    longitude,
    category: categorize311(row.descriptor),
    detail: row.descriptor ?? null,
    raw_data: row,
  };
}

/** Normalize one DOH rodent inspection row. Returns null if invalid. */
export function normalizeRodent(row: RawRodent): RatObservationInsert | null {
  const latitude = num(row.latitude);
  const longitude = num(row.longitude);
  if (latitude === null || longitude === null) return null;
  const sourceId = row.job_ticket_or_work_order_id ?? row.job_id;
  if (!sourceId || !row.inspection_date) return null;

  const address = [row.house_number, row.street_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    source: "rodent_inspection",
    source_id: String(sourceId),
    observed_at: new Date(row.inspection_date).toISOString(),
    address: address || null,
    borough: boroFromCode(row.boro_code),
    zipcode: row.zip_code ?? null,
    latitude,
    longitude,
    category: categorizeInspection(row.inspection_type, row.result),
    detail: row.result ?? row.inspection_type ?? null,
    raw_data: row,
  };
}

/** DOH boro_code (1–5) → borough name. */
export function boroFromCode(code: string | undefined): string | null {
  switch (code) {
    case "1":
      return "MANHATTAN";
    case "2":
      return "BRONX";
    case "3":
      return "BROOKLYN";
    case "4":
      return "QUEENS";
    case "5":
      return "STATEN ISLAND";
    default:
      return null;
  }
}
