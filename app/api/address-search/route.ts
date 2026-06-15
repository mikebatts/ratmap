import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import type { RatObservation } from "@/lib/types";

export const dynamic = "force-dynamic";

interface AddressMatch {
  address: string;
  borough: string | null;
  latitude: number;
  longitude: number;
  count: number;
  lastObservedAt: string;
}

interface SearchResponse {
  query: string;
  matches: AddressMatch[];
}

/**
 * GET /api/address-search?q=123+Main+St
 * Returns distinct matching addresses (v1: simple ILIKE text match) with a
 * representative coordinate, observation count, and most recent date.
 * Always returns 200 — never throws on missing backend.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  const empty: SearchResponse = { query: q, matches: [] };
  if (q.length < 3) return NextResponse.json(empty);

  const db = getServerClient();
  if (!db) return NextResponse.json(empty);

  // Normalize: lowercase. The trigram index is on lower(address).
  const needle = q.toLowerCase();

  try {
    const { data, error } = await db
      .from("rat_observations")
      .select("address,borough,latitude,longitude,observed_at")
      .ilike("address", `%${needle}%`)
      .order("observed_at", { ascending: false })
      .limit(500);

    if (error || !data) return NextResponse.json(empty);

    // Group by normalized address → representative point + count.
    const byAddress = new Map<string, AddressMatch>();
    for (const row of data as Pick<
      RatObservation,
      "address" | "borough" | "latitude" | "longitude" | "observed_at"
    >[]) {
      if (!row.address) continue;
      const key = row.address.toLowerCase();
      const existing = byAddress.get(key);
      if (existing) {
        existing.count += 1;
        if (row.observed_at > existing.lastObservedAt) {
          existing.lastObservedAt = row.observed_at;
        }
      } else {
        byAddress.set(key, {
          address: row.address,
          borough: row.borough,
          latitude: row.latitude,
          longitude: row.longitude,
          count: 1,
          lastObservedAt: row.observed_at,
        });
      }
    }

    const matches = Array.from(byAddress.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 25);

    return NextResponse.json({ query: q, matches });
  } catch {
    return NextResponse.json(empty);
  }
}
