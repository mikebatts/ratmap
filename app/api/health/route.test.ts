import { describe, it, expect, vi, beforeEach } from "vitest";

const getServerClient = vi.fn();
const getServiceClient = vi.fn();
vi.mock("@/lib/supabase", () => ({
  getServerClient: () => getServerClient(),
  getServiceClient: () => getServiceClient(),
}));

import { GET } from "./route";

// anon client mock: head count query → { count, error }
function anonReturning(count: number | null, error: unknown = null) {
  const select = vi.fn().mockResolvedValue({ count, error });
  return { from: vi.fn().mockReturnValue({ select }) };
}
// service client mock: ingest_state select → { data, error }
function svcReturning(rows: unknown[], error: unknown = null) {
  const select = vi.fn().mockResolvedValue({ data: rows, error });
  return { from: vi.fn().mockReturnValue({ select }) };
}

describe("GET /api/health", () => {
  beforeEach(() => {
    getServerClient.mockReset();
    getServiceClient.mockReset();
  });

  it("503 unconfigured when no anon client", async () => {
    getServerClient.mockReturnValue(null);
    const res = await GET();
    expect(res.status).toBe(503);
    expect((await res.json()).status).toBe("unconfigured");
  });

  it("503 down when the database is unreachable", async () => {
    getServerClient.mockReturnValue(anonReturning(null, { message: "boom" }));
    getServiceClient.mockReturnValue(null);
    const res = await GET();
    expect(res.status).toBe(503);
    expect((await res.json()).status).toBe("down");
  });

  it("200 ok when data is present and ingest is fresh", async () => {
    getServerClient.mockReturnValue(anonReturning(14000));
    getServiceClient.mockReturnValue(
      svcReturning([
        { source: "311", last_run_at: new Date().toISOString(), rows_total: 6000 },
      ]),
    );
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.total).toBe(14000);
    expect(body.freshness).toBe("fresh");
  });

  it("503 degraded when the last ingest is stale", async () => {
    getServerClient.mockReturnValue(anonReturning(14000));
    const old = new Date(Date.now() - 50 * 3.6e6).toISOString(); // 50h ago
    getServiceClient.mockReturnValue(
      svcReturning([{ source: "311", last_run_at: old, rows_total: 6000 }]),
    );
    const res = await GET();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.status).toBe("degraded");
    expect(body.freshness).toBe("stale");
  });
});
