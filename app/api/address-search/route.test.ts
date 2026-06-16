import { describe, it, expect, vi, afterEach } from "vitest";
import { GET } from "./route";

function req(q: string): Request {
  return new Request(`http://localhost/api/address-search?q=${encodeURIComponent(q)}`);
}

function mockGeoSearch(features: unknown[], ok = true) {
  const fn = vi.fn().mockResolvedValue({
    ok,
    json: async () => ({ features }),
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

const FEATURE = {
  geometry: { coordinates: [-73.9856, 40.7484] },
  properties: {
    name: "350 5 AVENUE",
    housenumber: "350",
    street: "5 AVENUE",
    label: "350 5 AVENUE, New York, NY, USA",
    borough: "Manhattan",
  },
};

describe("GET /api/address-search (NYC GeoSearch proxy)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns empty for queries shorter than 3 chars without calling the geocoder", async () => {
    const fetchFn = mockGeoSearch([FEATURE]);
    const res = await GET(req("ab"));
    const body = await res.json();
    expect(body).toEqual({ query: "ab", matches: [] });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("maps GeoSearch features to matches", async () => {
    const fetchFn = mockGeoSearch([FEATURE]);
    const res = await GET(req("350 5th ave"));
    const body = await res.json();

    expect(fetchFn).toHaveBeenCalled();
    expect(fetchFn.mock.calls[0][0]).toContain("geosearch.planninglabs.nyc");
    expect(body.matches).toHaveLength(1);
    expect(body.matches[0]).toEqual({
      address: "350 5th Avenue", // formatted: title-case + ordinal
      borough: "Manhattan",
      latitude: 40.7484,
      longitude: -73.9856,
    });
  });

  it("falls back to the label's first segment when name is absent", async () => {
    mockGeoSearch([
      { geometry: { coordinates: [-73.9, 40.7] }, properties: { label: "123 Main St, Brooklyn, NY, USA", borough: "Brooklyn" } },
    ]);
    const res = await GET(req("123 Main"));
    const body = await res.json();
    expect(body.matches[0].address).toBe("123 Main St");
  });

  it("skips features without valid coordinates", async () => {
    mockGeoSearch([
      { geometry: {}, properties: { name: "No Coords" } },
      FEATURE,
    ]);
    const res = await GET(req("anything"));
    const body = await res.json();
    expect(body.matches).toHaveLength(1);
    expect(body.matches[0].address).toBe("350 5th Avenue");
  });

  it("flags an error on a non-OK geocoder response", async () => {
    mockGeoSearch([], false);
    const res = await GET(req("whatever"));
    const body = await res.json();
    expect(body.matches).toEqual([]);
    expect(body.error).toBe(true);
  });

  it("flags an error when the geocoder throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    const res = await GET(req("whatever"));
    const body = await res.json();
    expect(body.matches).toEqual([]);
    expect(body.error).toBe(true);
  });

  it("dedupes identical address + borough pairs", async () => {
    mockGeoSearch([FEATURE, FEATURE]);
    const res = await GET(req("350 5th"));
    const body = await res.json();
    expect(body.matches).toHaveLength(1);
  });
});
