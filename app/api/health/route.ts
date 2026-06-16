import { NextResponse } from "next/server";
import { getServerClient, getServiceClient } from "@/lib/supabase";

// Public health probe for uptime monitors (UptimeRobot, BetterStack, etc.) and
// quick manual checks. Returns 200 when healthy, 503 when the data is stale or
// the backend is unreachable — so a monitor pinging this URL will alert you if
// the daily ingest silently stops.
export const dynamic = "force-dynamic";

// The cron runs daily; if no source has ingested in this long, something's wrong.
const STALE_HOURS = 36;

interface SourceHealth {
  source: string;
  lastRunAt: string | null;
  ageHours: number | null;
  rows: number | null;
}

export async function GET() {
  const checkedAt = new Date().toISOString();

  const anon = getServerClient();
  if (!anon) {
    return NextResponse.json(
      { status: "unconfigured", checkedAt },
      { status: 503 },
    );
  }

  // Total count via the public (anon) client.
  let total = 0;
  try {
    const { count, error } = await anon
      .from("rat_observations")
      .select("*", { count: "exact", head: true });
    if (error) throw error;
    total = count ?? 0;
  } catch {
    return NextResponse.json(
      { status: "down", checkedAt, error: "database unreachable" },
      { status: 503 },
    );
  }

  // Ingest freshness via the service client (ingest_state is service-only).
  // If the service key isn't set we can't assess freshness — report it as
  // unknown rather than failing the probe.
  let sources: SourceHealth[] = [];
  let freshness: "fresh" | "stale" | "unknown" = "unknown";
  const svc = getServiceClient();
  if (svc) {
    try {
      const { data, error } = await svc
        .from("ingest_state")
        .select("source,last_run_at,rows_total");
      if (error) throw error;
      const now = Date.now();
      sources = (data ?? []).map((r) => {
        const ageMs = r.last_run_at ? now - new Date(r.last_run_at).getTime() : null;
        return {
          source: r.source,
          lastRunAt: r.last_run_at ?? null,
          ageHours: ageMs == null ? null : Math.round((ageMs / 3.6e6) * 10) / 10,
          rows: r.rows_total ?? null,
        };
      });
      if (sources.length === 0) {
        freshness = "stale"; // never ingested
      } else {
        const stale = sources.some(
          (s) => s.ageHours == null || s.ageHours > STALE_HOURS,
        );
        freshness = stale ? "stale" : "fresh";
      }
    } catch {
      freshness = "unknown";
    }
  }

  const healthy = total > 0 && freshness !== "stale";
  return NextResponse.json(
    { status: healthy ? "ok" : "degraded", total, freshness, sources, checkedAt },
    { status: healthy ? 200 : 503 },
  );
}
