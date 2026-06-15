import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";
// Cache the header counts for a few minutes — they change at most daily.
export const revalidate = 300;

interface StatsResponse {
  total: number;
  by_source: { source: string; count: number }[];
  updated_at: string | null;
}

const EMPTY: StatsResponse = { total: 0, by_source: [], updated_at: null };

/**
 * GET /api/stats — total observation count (for the header).
 * Always returns 200 — never throws on missing backend.
 */
export async function GET() {
  const db = getServerClient();
  if (!db) return NextResponse.json(EMPTY);

  try {
    const { count, error } = await db
      .from("rat_observations")
      .select("*", { count: "exact", head: true });

    if (error) return NextResponse.json(EMPTY);

    return NextResponse.json({
      total: count ?? 0,
      by_source: [],
      updated_at: null,
    });
  } catch {
    return NextResponse.json(EMPTY);
  }
}
