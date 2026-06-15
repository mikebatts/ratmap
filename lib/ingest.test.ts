import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Supabase layer so getWatermark can be exercised without a backend.
const getServiceClient = vi.fn();
vi.mock("./supabase", () => ({
  getServiceClient: () => getServiceClient(),
}));

import { monthsAgoISO, getWatermark } from "./ingest";

describe("monthsAgoISO", () => {
  it("returns a valid ISO timestamp", () => {
    const iso = monthsAgoISO(24);
    expect(() => new Date(iso).toISOString()).not.toThrow();
    expect(new Date(iso).toISOString()).toBe(iso);
  });

  it("is in the past and roughly N months back", () => {
    const months = 12;
    const then = new Date(monthsAgoISO(months)).getTime();
    const now = Date.now();
    expect(then).toBeLessThan(now);
    const approxDays = (now - then) / 86_400_000;
    // 12 months ≈ 365 days, allow generous slack for month-length variance.
    expect(approxDays).toBeGreaterThan(330);
    expect(approxDays).toBeLessThan(400);
  });
});

describe("getWatermark", () => {
  beforeEach(() => {
    getServiceClient.mockReset();
  });

  it("returns null when Supabase is not configured", async () => {
    getServiceClient.mockReturnValue(null);
    expect(await getWatermark("311")).toBeNull();
  });

  it("returns the stored last_observed_at", async () => {
    const maybeSingle = vi
      .fn()
      .mockResolvedValue({ data: { last_observed_at: "2024-05-01T00:00:00.000Z" } });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    getServiceClient.mockReturnValue({ from });

    const wm = await getWatermark("311");
    expect(wm).toBe("2024-05-01T00:00:00.000Z");
    expect(from).toHaveBeenCalledWith("ingest_state");
    expect(eq).toHaveBeenCalledWith("source", "311");
  });

  it("returns null when no row exists", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    getServiceClient.mockReturnValue({ from: () => ({ select }) });

    expect(await getWatermark("rodent_inspection")).toBeNull();
  });
});
