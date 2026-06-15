import { describe, it, expect, vi, beforeEach } from "vitest";

const getServerClient = vi.fn();
vi.mock("@/lib/supabase", () => ({
  getServerClient: () => getServerClient(),
}));

import { GET } from "./route";

function req(qs: string): Request {
  return new Request(`http://localhost/api/observations${qs}`);
}

describe("GET /api/observations", () => {
  beforeEach(() => getServerClient.mockReset());

  it("returns empty FeatureCollection when Supabase is unconfigured", async () => {
    getServerClient.mockReturnValue(null);
    const res = await GET(req("?bbox=-74,40,-73,41"));
    const body = await res.json();
    expect(body).toEqual({ type: "FeatureCollection", features: [] });
  });

  it("returns empty when bbox is missing", async () => {
    getServerClient.mockReturnValue({ rpc: vi.fn() });
    const res = await GET(req(""));
    const body = await res.json();
    expect(body.features).toEqual([]);
  });

  it("returns empty when bbox is malformed", async () => {
    getServerClient.mockReturnValue({ rpc: vi.fn() });
    const res = await GET(req("?bbox=1,2,3"));
    const body = await res.json();
    expect(body.features).toEqual([]);
  });

  it("converts rows from the RPC into GeoJSON features", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          id: 1,
          source: "311",
          source_id: "k1",
          observed_at: "2024-01-01T00:00:00Z",
          address: "1 Main St",
          borough: "BROOKLYN",
          zipcode: "11201",
          latitude: 40.7,
          longitude: -73.9,
          category: "sighting",
          detail: "Rat Sighting",
        },
      ],
      error: null,
    });
    getServerClient.mockReturnValue({ rpc });

    const res = await GET(
      req("?bbox=-74,40,-73,41&since=2023-01-01&categories=sighting,baiting&boroughs=BROOKLYN"),
    );
    const body = await res.json();

    expect(body.type).toBe("FeatureCollection");
    expect(body.features).toHaveLength(1);
    expect(body.features[0]).toMatchObject({
      type: "Feature",
      geometry: { type: "Point", coordinates: [-73.9, 40.7] },
      properties: { id: 1, category: "sighting", source: "311" },
    });

    // Filters were forwarded to the RPC.
    const arg = rpc.mock.calls[0][1];
    expect(arg.min_lng).toBe(-74);
    expect(arg.max_lat).toBe(41);
    expect(arg.cats).toEqual(["sighting", "baiting"]);
    expect(arg.boroughs).toEqual(["BROOKLYN"]);
  });

  it("returns empty when the RPC reports an error", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: "boom" } });
    getServerClient.mockReturnValue({ rpc });
    const res = await GET(req("?bbox=-74,40,-73,41"));
    const body = await res.json();
    expect(body.features).toEqual([]);
  });

  it("caps the limit at 10000", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [], error: null });
    getServerClient.mockReturnValue({ rpc });
    await GET(req("?bbox=-74,40,-73,41&limit=99999"));
    expect(rpc.mock.calls[0][1].max_rows).toBe(10000);
  });
});
