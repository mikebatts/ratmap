import { NextResponse } from "next/server";
import { formatAddress } from "@/lib/address";

export const dynamic = "force-dynamic";

interface AddressMatch {
  address: string;
  borough: string | null;
  latitude: number;
  longitude: number;
}

interface SearchResponse {
  query: string;
  matches: AddressMatch[];
  /** True when the geocoder failed (vs. a genuine no-results) — lets the UI
   *  show a "try again" message instead of "no matches". */
  error?: boolean;
}

// NYC Planning Labs GeoSearch (Pelias) — free, no API key, NYC-scoped address
// autocomplete. https://geosearch.planninglabs.nyc/docs/
const GEOSEARCH_URL = "https://geosearch.planninglabs.nyc/v2/autocomplete";

interface GeoFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    label?: string;
    name?: string;
    housenumber?: string;
    street?: string;
    borough?: string;
  };
}

/**
 * GET /api/address-search?q=350+5th+ave
 * Proxies NYC GeoSearch autocomplete so any NYC address resolves (not just ones
 * that already have a rat report). Returns matches with a representative point.
 * Always returns 200 — never throws on a geocoder hiccup.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  const empty: SearchResponse = { query: q, matches: [] };
  if (q.length < 3) return NextResponse.json(empty);

  // Don't let a slow geocoder hang the request.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);

  try {
    const url = `${GEOSEARCH_URL}?text=${encodeURIComponent(q)}&size=6`;
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return NextResponse.json({ ...empty, error: true });

    const data = (await res.json()) as { features?: GeoFeature[] };
    const matches: AddressMatch[] = [];
    const seen = new Set<string>();
    for (const f of data.features ?? []) {
      const coords = f.geometry?.coordinates;
      if (!coords || coords.length !== 2) continue;
      const [longitude, latitude] = coords;
      if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) continue;
      const p = f.properties ?? {};
      // Format ALL CAPS + ordinal-less GeoSearch output into a clean line.
      const address = formatAddress({
        housenumber: p.housenumber,
        street: p.street,
        name: p.name ?? p.label?.split(",")[0],
      });
      if (!address) continue;
      // Drop duplicate address+borough pairs.
      const key = `${address}|${p.borough ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      matches.push({
        address,
        borough: p.borough ?? null,
        latitude,
        longitude,
      });
    }

    return NextResponse.json({ query: q, matches });
  } catch {
    // Geocoder timed out / network error — flag it so the UI can offer a retry.
    return NextResponse.json({ ...empty, error: true });
  } finally {
    clearTimeout(timer);
  }
}
