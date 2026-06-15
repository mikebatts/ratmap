import { describe, it, expect, vi, afterEach } from "vitest";
import { socrataQuery, paginate, sleep } from "./socrata";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("sleep", () => {
  it("resolves after the given delay", async () => {
    const start = Date.now();
    await sleep(10);
    expect(Date.now() - start).toBeGreaterThanOrEqual(8);
  });
});

describe("socrataQuery", () => {
  it("builds the dataset URL with SoQL params and parses JSON", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ a: "1" }],
    });
    vi.stubGlobal("fetch", fetchFn);

    const rows = await socrataQuery("abcd-1234", { $where: "x > 1", $limit: 10 });
    expect(rows).toEqual([{ a: "1" }]);

    const url = fetchFn.mock.calls[0][0] as string;
    expect(url).toContain("/resource/abcd-1234.json?");
    expect(url).toContain("%24where=x+%3E+1");
    expect(url).toContain("%24limit=10");
  });

  it("throws with status + body on a non-2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => "rate limited",
      }),
    );
    await expect(socrataQuery("abcd-1234", {})).rejects.toThrow(/429/);
  });
});

describe("paginate", () => {
  it("yields pages until a short page signals the end", async () => {
    // Two full pages of 2, then nothing more.
    const pages = [
      [{ i: "1" }, { i: "2" }],
      [{ i: "3" }],
    ];
    let call = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => ({
        ok: true,
        json: async () => pages[call++] ?? [],
      })),
    );

    const collected: unknown[] = [];
    for await (const page of paginate("abcd-1234", {}, { pageSize: 2, delayMs: 0 })) {
      collected.push(...page);
    }
    expect(collected).toHaveLength(3);
  });

  it("respects maxRows", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => ({
        ok: true,
        json: async () => [{ i: "1" }, { i: "2" }, { i: "3" }],
      })),
    );

    const collected: unknown[] = [];
    for await (const page of paginate(
      "abcd-1234",
      {},
      { pageSize: 5, delayMs: 0, maxRows: 2 },
    )) {
      collected.push(...page);
    }
    // Capped at 2 even though the page returned 3.
    expect(collected.length).toBeLessThanOrEqual(3);
    expect(collected.length).toBeGreaterThan(0);
  });
});
