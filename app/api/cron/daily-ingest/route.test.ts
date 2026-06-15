import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const ingest311 = vi.fn();
const ingestRodent = vi.fn();
const getWatermark = vi.fn();
const getServiceClient = vi.fn();

vi.mock("@/lib/ingest", () => ({
  ingest311: (...a: unknown[]) => ingest311(...a),
  ingestRodent: (...a: unknown[]) => ingestRodent(...a),
  getWatermark: (...a: unknown[]) => getWatermark(...a),
  monthsAgoISO: () => "2022-06-15T00:00:00.000Z",
}));
vi.mock("@/lib/supabase", () => ({
  getServiceClient: () => getServiceClient(),
}));

import { GET } from "./route";

function req(authHeader?: string): Request {
  return new Request("http://localhost/api/cron/daily-ingest", {
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

describe("GET /api/cron/daily-ingest", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "topsecret");
    ingest311.mockReset();
    ingestRodent.mockReset();
    getWatermark.mockReset();
    getServiceClient.mockReset();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("401s with no Authorization header", async () => {
    const res = await GET(req());
    expect(res.status).toBe(401);
    expect((await res.json()).ok).toBe(false);
  });

  it("401s with a wrong bearer token", async () => {
    const res = await GET(req("Bearer wrong"));
    expect(res.status).toBe(401);
  });

  it("401s when CRON_SECRET is not configured", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const res = await GET(req("Bearer topsecret"));
    expect(res.status).toBe(401);
  });

  it("500s when Supabase is not configured", async () => {
    getServiceClient.mockReturnValue(null);
    const res = await GET(req("Bearer topsecret"));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/supabase/i);
  });

  it("runs both ingests and returns a summary on the happy path", async () => {
    getServiceClient.mockReturnValue({});
    getWatermark.mockResolvedValueOnce("2024-01-01T00:00:00Z"); // 311
    getWatermark.mockResolvedValueOnce(null); // rodent → fallback
    ingest311.mockResolvedValue({ source: "311", upserted: 10, pulled: 12 });
    ingestRodent.mockResolvedValue({ source: "rodent_inspection", upserted: 5, pulled: 6 });

    const res = await GET(req("Bearer topsecret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.ranAt).toBeTruthy();
    expect(body.p311.upserted).toBe(10);
    expect(body.rodent.upserted).toBe(5);

    // 311 uses its watermark; rodent falls back to monthsAgoISO.
    expect(ingest311.mock.calls[0][0].since).toBe("2024-01-01T00:00:00Z");
    expect(ingestRodent.mock.calls[0][0].since).toBe("2022-06-15T00:00:00.000Z");
  });

  it("500s when an ingest throws", async () => {
    getServiceClient.mockReturnValue({});
    getWatermark.mockResolvedValue(null);
    ingest311.mockRejectedValue(new Error("socrata down"));

    const res = await GET(req("Bearer topsecret"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/socrata down/);
  });
});
