import { describe, it, expect } from "vitest";
import {
  ALL_CATEGORIES,
  BOROUGHS,
  CATEGORY_META,
  type Category,
} from "./types";

describe("CATEGORY_META", () => {
  it("has an entry for every category in ALL_CATEGORIES", () => {
    for (const cat of ALL_CATEGORIES) {
      expect(CATEGORY_META[cat]).toBeDefined();
    }
  });

  it("every entry has a label, description, and hex color", () => {
    for (const cat of Object.keys(CATEGORY_META) as Category[]) {
      const meta = CATEGORY_META[cat];
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.description.length).toBeGreaterThan(0);
      expect(meta.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("covers exactly the ALL_CATEGORIES set (no orphans)", () => {
    expect(Object.keys(CATEGORY_META).sort()).toEqual([...ALL_CATEGORIES].sort());
  });
});

describe("BOROUGHS", () => {
  it("lists the five boroughs in upper case", () => {
    expect(BOROUGHS).toHaveLength(5);
    expect(BOROUGHS).toContain("MANHATTAN");
    expect(BOROUGHS).toContain("STATEN ISLAND");
    for (const b of BOROUGHS) expect(b).toBe(b.toUpperCase());
  });
});

describe("ALL_CATEGORIES", () => {
  it("has no duplicates", () => {
    expect(new Set(ALL_CATEGORIES).size).toBe(ALL_CATEGORIES.length);
  });
});
