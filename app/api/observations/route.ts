import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import type {
  Category,
  ObservationFeature,
  ObservationFeatureCollection,
  RatObservation,
} from "@/lib/types";

export const dynamic = "force-dynamic";

const EMPTY: ObservationFeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

function toFeature(o: RatObservation): ObservationFeature {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [o.longitude, o.latitude] },
    properties: {
      id: o.id,
      source: o.source,
      source_id: o.source_id,
      observed_at: o.observed_at,
      address: o.address,
      borough: o.borough,
      zipcode: o.zipcode,
      category: o.category,
      detail: o.detail,
    },
  };
}

/**
 * GET /api/observations?bbox=minLng,minLat,maxLng,maxLat&since=ISO&categories=a,b&boroughs=BROOKLYN
 * Returns observations in the viewport as a GeoJSON FeatureCollection.
 * Always returns 200 with (possibly empty) GeoJSON — never throws on missing backend.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const db = getServerClient();
  if (!db) return NextResponse.json(EMPTY);

  const bbox = searchParams.get("bbox");
  if (!bbox) return NextResponse.json(EMPTY);

  const parts = bbox.split(",").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
    return NextResponse.json(EMPTY);
  }
  const [minLng, minLat, maxLng, maxLat] = parts;

  const since = searchParams.get("since");
  const categories = searchParams.get("categories");
  const boroughs = searchParams.get("boroughs");
  const limit = Math.min(Number(searchParams.get("limit")) || 5000, 10000);

  const cats = categories
    ? (categories.split(",").filter(Boolean) as Category[])
    : null;
  const boros = boroughs ? boroughs.split(",").filter(Boolean) : null;

  try {
    const { data, error } = await db.rpc("observations_in_bbox", {
      min_lng: minLng,
      min_lat: minLat,
      max_lng: maxLng,
      max_lat: maxLat,
      since: since || null,
      cats,
      boroughs: boros,
      max_rows: limit,
    });

    if (error || !data) return NextResponse.json(EMPTY);

    const features = (data as RatObservation[]).map(toFeature);
    return NextResponse.json({ type: "FeatureCollection", features });
  } catch {
    return NextResponse.json(EMPTY);
  }
}
