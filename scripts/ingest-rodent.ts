// Backfill DOH rodent inspections (p937-wjvj). 24 months by default.
//
//   npm run ingest:rodent -- --dry-run --limit 100
//   npm run ingest:rodent              # full 24-month backfill
//
// Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local (unless --dry-run).

import { parseArgs, log } from "./_args";
import { ingestRodent } from "../lib/ingest";
import { getServiceClient } from "../lib/supabase";

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.dryRun && !getServiceClient()) {
    log("ERROR: Supabase not configured. Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY, or use --dry-run.");
    process.exit(1);
  }

  const result = await ingestRodent({
    dryRun: args.dryRun,
    limit: args.limit,
    since: args.since,
    log,
  });

  log(`DONE rodent — pulled ${result.pulled}, upserted ${result.upserted}, skipped ${result.skipped}, max observed_at ${result.maxObservedAt}`);
}

main().catch((err) => {
  log(`FATAL: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
