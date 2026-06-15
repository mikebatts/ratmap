import { describe, it, expect, vi, beforeEach } from "vitest";

const getServerClient = vi.fn();
vi.mock("@/lib/supabase", () => ({
  getServerClient: () => getServerClient(),
}));

import { GET } from "./route";

describe("GET /api/stats", () => {
  beforeEach(() => getServerClient.mockReset());

  it("returns zeroed stats when Supabase is unconfigured", async () => {
    getServerClient.mockReturnValue(null);
    const body = await (await GET()).json();
    expect(body).toEqual({ total: 0, by_source: [], updated_at: null });
  });

  it("returns the exact count from a head/count query", async () => {
    const select = vi.fn().mockResolvedValue({ count: 42_137, error: null });
    getServerClient.mockReturnValue({ from: () => ({ select }) });

    const body = await (await GET()).json();
    expect(body.total).toBe(42_137);
    expect(body.by_source).toEqual([]);
    expect(select).toHaveBeenCalledWith("*", { count: "exact", head: true });
  });

  it("returns empty stats on DB error", async () => {
    const select = vi.fn().mockResolvedValue({ count: null, error: { message: "x" } });
    getServerClient.mockReturnValue({ from: () => ({ select }) });
    const body = await (await GET()).json();
    expect(body.total).toBe(0);
  });

  it("treats a null count as zero", async () => {
    const select = vi.fn().mockResolvedValue({ count: null, error: null });
    getServerClient.mockReturnValue({ from: () => ({ select }) });
    const body = await (await GET()).json();
    expect(body.total).toBe(0);
  });
});
