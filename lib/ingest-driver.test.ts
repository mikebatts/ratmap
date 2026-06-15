import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RatObservationInsert } from "./types";

// --- Mocks ---------------------------------------------------------------

const pages: Record<string, string>[][] = [];
async function* fakePaginate() {
  for (const p of pages) yield p;
}

const normalize311 = vi.fn();
const normalizeRodent = vi.fn();

vi.mock("./socrata", () => ({
  DATASETS: { threeOneOne: "erm2-nwe9", rodent: "p937-wjvj" },
  paginate: () => fakePaginate(),
  normalize311: (r: Record<string, string>) => normalize311(r),
  normalizeRodent: (r: Record<string, string>) => normalizeRodent(r),
}));

const getServiceClient = vi.fn();
vi.mock("./supabase", () => ({
  getServiceClient: () => getServiceClient(),
}));

import { ingest311, ingestRodent } from "./ingest";

function rec(observed_at: string): RatObservationInsert {
  return {
    source: "311",
    source_id: observed_at,
    observed_at,
    address: null,
    borough: null,
    zipcode: null,
    latitude: 40.7,
    longitude: -73.9,
    category: "sighting",
    detail: null,
    raw_data: {},
  };
}

beforeEach(() => {
  pages.length = 0;
  normalize311.mockReset();
  normalizeRodent.mockReset();
  getServiceClient.mockReset();
});

describe("ingest driver (via ingest311)", () => {
  it("dry-run normalizes without writing, tracking max observed date + skips", async () => {
    pages.push([{ x: "1" }, { x: "2" }, { x: "bad" }]);
    normalize311
      .mockReturnValueOnce(rec("2024-01-01T00:00:00.000Z"))
      .mockReturnValueOnce(rec("2024-03-01T00:00:00.000Z"))
      .mockReturnValueOnce(null); // skipped

    const result = await ingest311({ dryRun: true });

    expect(result.dryRun).toBe(true);
    expect(result.pulled).toBe(3);
    expect(result.skipped).toBe(1);
    expect(result.upserted).toBe(0);
    expect(result.maxObservedAt).toBe("2024-03-01T00:00:00.000Z");
    // No client needed for a dry run.
    expect(getServiceClient).not.toHaveBeenCalled();
  });

  it("upserts normalized rows and writes a watermark", async () => {
    pages.push([{ x: "1" }, { x: "2" }]);
    normalize311
      .mockReturnValueOnce(rec("2024-01-01T00:00:00.000Z"))
      .mockReturnValueOnce(rec("2024-02-01T00:00:00.000Z"));

    const upsert = vi.fn().mockResolvedValue({ error: null, count: 2 });
    getServiceClient.mockReturnValue({ from: () => ({ upsert }) });

    const result = await ingest311({});
    expect(result.upserted).toBe(2);
    // Once for rat_observations, once for the watermark row.
    expect(upsert).toHaveBeenCalledTimes(2);
  });

  it("throws when the upsert reports an error", async () => {
    pages.push([{ x: "1" }]);
    normalize311.mockReturnValue(rec("2024-01-01T00:00:00.000Z"));
    const upsert = vi.fn().mockResolvedValue({ error: { message: "nope" }, count: null });
    getServiceClient.mockReturnValue({ from: () => ({ upsert }) });

    await expect(ingest311({})).rejects.toThrow(/upsert failed/);
  });
});

describe("ingestRodent", () => {
  it("uses the rodent normalizer", async () => {
    pages.push([{ x: "1" }]);
    normalizeRodent.mockReturnValue(rec("2024-05-01T00:00:00.000Z"));
    const result = await ingestRodent({ dryRun: true });
    expect(result.source).toBe("rodent_inspection");
    expect(normalizeRodent).toHaveBeenCalled();
  });
});
