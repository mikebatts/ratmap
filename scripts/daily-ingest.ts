// Cron entry point — delta-only ingest since the last watermark for both
// sources. Intended to run daily (e.g. Vercel Cron / GitHub Actions at 6am ET).
//
//   npm run ingest:daily -- --dry-run
//
// Falls back to a 24-month window the first time (no watermark yet).

import { parseArgs, log } from "./_args";
import { ingest311, ingestRodent, getWatermark, monthsAgoISO } from "../lib/ingest";
import { getServiceClient } from "../lib/supabase";

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.dryRun && !getServiceClient()) {
    log("ERROR: Supabase not configured. Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY, or use --dry-run.");
    process.exit(1);
  }

  const [wm311, wmRodent] = await Promise.all([
    getWatermark("311"),
    getWatermark("rodent_inspection"),
  ]);

  const fallback = monthsAgoISO(24);

  log(`Daily ingest — 311 since ${wm311 ?? fallback}, rodent since ${wmRodent ?? fallback}`);

  const r311 = await ingest311({
    dryRun: args.dryRun,
    since: wm311 ?? fallback,
    log,
  });
  const rRodent = await ingestRodent({
    dryRun: args.dryRun,
    since: wmRodent ?? fallback,
    log,
  });

  log(`DONE daily — 311 upserted ${r311.upserted}, rodent upserted ${rRodent.upserted}`);
}

main().catch((err) => {
  log(`FATAL: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
