// Tiny shared CLI arg parser + env loader for the ingest scripts.
import "dotenv/config";

export interface CliArgs {
  dryRun: boolean;
  limit?: number;
  since?: string;
}

export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--limit") args.limit = Number(argv[++i]);
    else if (a.startsWith("--limit=")) args.limit = Number(a.split("=")[1]);
    else if (a === "--since") args.since = argv[++i];
    else if (a.startsWith("--since=")) args.since = a.split("=")[1];
  }
  return args;
}

export function log(msg: string): void {
  // eslint-disable-next-line no-console
  console.log(`${new Date().toISOString()}  ${msg}`);
}
