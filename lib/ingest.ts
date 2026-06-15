// Ingest logic shared by the CLI scripts. Pulls from Socrata, normalizes,
// upserts into Supabase, and tracks a per-source watermark.

import { getServiceClient } from "./supabase";
import {
  DATASETS,
  paginate,
  normalize311,
  normalizeRodent,
  type Raw311,
  type RawRodent,
} from "./socrata";
import type { RatObservationInsert, Source } from "./types";

export interface IngestOptions {
  /** Don't write anything; just report what would happen. */
  dryRun?: boolean;
  /** Cap total rows pulled (for testing). */
  limit?: number;
  /** Only pull rows on/after this ISO date. Defaults to 24 months ago. */
  since?: string;
  /** Page size for Socrata pulls. */
  pageSize?: number;
  /** Polite delay between requests (ms). */
  delayMs?: number;
  /** Optional logger. */
  log?: (msg: string) => void;
}

export interface IngestResult {
  source: Source;
  pulled: number;
  upserted: number;
  skipped: number;
  maxObservedAt: string | null;
  dryRun: boolean;
}

const UPSERT_BATCH = 500;

/** ISO timestamp for N months before now. */
export function monthsAgoISO(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString();
}

/** Read the stored watermark for a source (null if unset/unconfigured). */
export async function getWatermark(source: Source): Promise<string | null> {
  const db = getServiceClient();
  if (!db) return null;
  const { data } = await db
    .from("ingest_state")
    .select("last_observed_at")
    .eq("source", source)
    .maybeSingle();
  return data?.last_observed_at ?? null;
}

async function upsertBatch(rows: RatObservationInsert[]): Promise<number> {
  const db = getServiceClient();
  if (!db || rows.length === 0) return 0;
  const { error, count } = await db
    .from("rat_observations")
    .upsert(rows, { onConflict: "source,source_id", count: "exact" });
  if (error) throw new Error(`upsert failed: ${error.message}`);
  return count ?? rows.length;
}

async function writeWatermark(
  source: Source,
  maxObservedAt: string | null,
  rowsTotal: number,
): Promise<void> {
  const db = getServiceClient();
  if (!db) return;
  const { error } = await db.from("ingest_state").upsert(
    {
      source,
      last_observed_at: maxObservedAt,
      last_run_at: new Date().toISOString(),
      rows_total: rowsTotal,
    },
    { onConflict: "source" },
  );
  if (error) throw new Error(`watermark write failed: ${error.message}`);
}

/** Generic ingest driver for one source. */
async function ingest(
  source: Source,
  datasetId: string,
  dateField: string,
  whereExtra: string | null,
  normalize: (row: Record<string, string>) => RatObservationInsert | null,
  opts: IngestOptions,
): Promise<IngestResult> {
  const log = opts.log ?? (() => {});
  const since = opts.since ?? monthsAgoISO(24);
  const sinceFloating = since.replace("Z", "").replace(/\.\d+$/, "");

  const whereParts = [`${dateField} >= '${sinceFloating}'`];
  if (whereExtra) whereParts.push(whereExtra);

  let pulled = 0;
  let upserted = 0;
  let skipped = 0;
  let maxObservedAt: string | null = null;
  let buffer: RatObservationInsert[] = [];

  log(
    `[${source}] ingest from ${dataset(datasetId)} since ${sinceFloating}` +
      (opts.dryRun ? " (dry-run)" : ""),
  );

  for await (const page of paginate<Record<string, string>>(
    datasetId,
    {
      $where: whereParts.join(" AND "),
      $order: `${dateField} ASC`,
    },
    {
      pageSize: opts.pageSize ?? 5000,
      delayMs: opts.delayMs ?? 1000,
      maxRows: opts.limit ?? Infinity,
    },
  )) {
    pulled += page.length;
    for (const row of page) {
      const rec = normalize(row);
      if (!rec) {
        skipped += 1;
        continue;
      }
      if (!maxObservedAt || rec.observed_at > maxObservedAt) {
        maxObservedAt = rec.observed_at;
      }
      buffer.push(rec);
    }

    if (!opts.dryRun) {
      while (buffer.length >= UPSERT_BATCH) {
        upserted += await upsertBatch(buffer.splice(0, UPSERT_BATCH));
      }
    }
    log(`[${source}] pulled ${pulled}, upserted ${upserted}, skipped ${skipped}`);
  }

  if (!opts.dryRun && buffer.length > 0) {
    upserted += await upsertBatch(buffer);
  }

  if (!opts.dryRun) {
    await writeWatermark(source, maxObservedAt, upserted);
  }

  return { source, pulled, upserted, skipped, maxObservedAt, dryRun: !!opts.dryRun };
}

function dataset(id: string): string {
  return id === DATASETS.threeOneOne ? "311 (erm2-nwe9)" : `rodent (${id})`;
}

/** Ingest 311 rodent complaints. */
export function ingest311(opts: IngestOptions = {}): Promise<IngestResult> {
  return ingest(
    "311",
    DATASETS.threeOneOne,
    "created_date",
    "complaint_type = 'Rodent'",
    (row) => normalize311(row as Raw311),
    opts,
  );
}

/** Ingest DOH rodent inspections. */
export function ingestRodent(opts: IngestOptions = {}): Promise<IngestResult> {
  return ingest(
    "rodent_inspection",
    DATASETS.rodent,
    "inspection_date",
    null,
    (row) => normalizeRodent(row as RawRodent),
    opts,
  );
}
