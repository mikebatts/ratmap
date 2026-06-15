import { describe, it, expect } from "vitest";
import {
  sinceFromRange,
  categoryColorExpression,
  basemapStyle,
  TIME_RANGES,
} from "./map";
import { CATEGORY_META } from "./types";

describe("sinceFromRange", () => {
  it("returns null for 'all'", () => {
    expect(sinceFromRange("all")).toBeNull();
  });

  it("returns an ISO timestamp in the past for bounded ranges", () => {
    for (const range of ["30d", "90d", "1y", "2y"] as const) {
      const iso = sinceFromRange(range);
      expect(iso).not.toBeNull();
      expect(new Date(iso as string).getTime()).toBeLessThan(Date.now());
    }
  });

  it("orders ranges so longer windows reach further back", () => {
    const d30 = new Date(sinceFromRange("30d") as string).getTime();
    const d90 = new Date(sinceFromRange("90d") as string).getTime();
    const y1 = new Date(sinceFromRange("1y") as string).getTime();
    const y2 = new Date(sinceFromRange("2y") as string).getTime();
    expect(d90).toBeLessThan(d30);
    expect(y1).toBeLessThan(d90);
    expect(y2).toBeLessThan(y1);
  });

  it("30d is ~30 days back", () => {
    const ms = Date.now() - new Date(sinceFromRange("30d") as string).getTime();
    const days = ms / 86_400_000;
    expect(days).toBeGreaterThan(29);
    expect(days).toBeLessThan(31);
  });
});

describe("categoryColorExpression", () => {
  it("is a MapLibre 'match' expression with a color per category + default", () => {
    const expr = categoryColorExpression();
    expect(expr[0]).toBe("match");
    expect(expr[1]).toEqual(["get", "category"]);

    const cats = Object.keys(CATEGORY_META);
    // ["match", ["get","category"], cat1, color1, ..., default]
    expect(expr.length).toBe(2 + cats.length * 2 + 1);

    // Each category appears followed by its meta color.
    for (const cat of cats) {
      const idx = expr.indexOf(cat);
      expect(idx).toBeGreaterThan(1);
      expect(expr[idx + 1]).toBe(CATEGORY_META[cat as keyof typeof CATEGORY_META].color);
    }
  });
});

describe("basemapStyle", () => {
  it("falls back to the free no-key style when no MapTiler key is set", () => {
    delete process.env.NEXT_PUBLIC_MAPTILER_KEY;
    expect(basemapStyle()).toContain("openfreemap.org");
  });
});

describe("TIME_RANGES", () => {
  it("includes all five range keys", () => {
    expect(TIME_RANGES.map((r) => r.key)).toEqual(["30d", "90d", "1y", "2y", "all"]);
  });
});
