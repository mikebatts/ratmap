import { describe, it, expect, vi, beforeEach } from "vitest";

const getServerClient = vi.fn();
vi.mock("@/lib/supabase", () => ({
  getServerClient: () => getServerClient(),
}));

import { GET } from "./route";

function req(q: string): Request {
  return new Request(`http://localhost/api/address-search?q=${encodeURIComponent(q)}`);
}

// Build a Supabase query-builder mock whose terminal .limit() resolves to result.
function clientReturning(result: { data: unknown; error: unknown }) {
  const limit = vi.fn().mockResolvedValue(result);
  const order = vi.fn().mockReturnValue({ limit });
  const ilike = vi.fn().mockReturnValue({ order });
  const select = vi.fn().mockReturnValue({ ilike });
  const from = vi.fn().mockReturnValue({ select });
  return { client: { from }, ilike };
}

describe("GET /api/address-search", () => {
  beforeEach(() => getServerClient.mockReset());

  it("returns empty for queries shorter than 3 chars without hitting the DB", async () => {
    getServerClient.mockReturnValue(clientReturning({ data: [], error: null }).client);
    const res = await GET(req("ab"));
    const body = await res.json();
    expect(body).toEqual({ query: "ab", matches: [] });
  });

  it("returns empty when Supabase is unconfigured", async () => {
    getServerClient.mockReturnValue(null);
    const res = await GET(req("main street"));
    const body = await res.json();
    expect(body.matches).toEqual([]);
  });

  it("groups rows by address with counts and most-recent date", async () => {
    const { client, ilike } = clientReturning({
      data: [
        {
          address: "123 Main St",
          borough: "BROOKLYN",
          latitude: 40.7,
          longitude: -73.9,
          observed_at: "2024-01-01T00:00:00Z",
        },
        {
          address: "123 Main St",
          borough: "BROOKLYN",
          latitude: 40.7,
          longitude: -73.9,
          observed_at: "2024-03-01T00:00:00Z",
        },
        {
          address: "999 Side Ave",
          borough: "QUEENS",
          latitude: 40.8,
          longitude: -73.8,
          observed_at: "2024-02-01T00:00:00Z",
        },
      ],
      error: null,
    });
    getServerClient.mockReturnValue(client);

    const res = await GET(req("Main"));
    const body = await res.json();

    // ILIKE needle is lower-cased.
    expect(ilike).toHaveBeenCalledWith("address", "%main%");

    expect(body.matches).toHaveLength(2);
    const top = body.matches[0]; // sorted by count desc
    expect(top.address).toBe("123 Main St");
    expect(top.count).toBe(2);
    expect(top.lastObservedAt).toBe("2024-03-01T00:00:00Z");
  });

  it("returns empty on DB error", async () => {
    getServerClient.mockReturnValue(
      clientReturning({ data: null, error: { message: "boom" } }).client,
    );
    const res = await GET(req("Main"));
    const body = await res.json();
    expect(body.matches).toEqual([]);
  });

  it("skips rows with no address", async () => {
    getServerClient.mockReturnValue(
      clientReturning({
        data: [{ address: null, borough: null, latitude: 0, longitude: 0, observed_at: "x" }],
        error: null,
      }).client,
    );
    const res = await GET(req("Main"));
    const body = await res.json();
    expect(body.matches).toEqual([]);
  });
});
