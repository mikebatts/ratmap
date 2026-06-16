import { describe, it, expect } from "vitest";
import { ordinal, formatStreet, formatAddress } from "./address";

describe("ordinal", () => {
  it("adds the right suffix", () => {
    expect(ordinal(1)).toBe("1st");
    expect(ordinal(2)).toBe("2nd");
    expect(ordinal(3)).toBe("3rd");
    expect(ordinal(4)).toBe("4th");
    expect(ordinal(11)).toBe("11th");
    expect(ordinal(12)).toBe("12th");
    expect(ordinal(13)).toBe("13th");
    expect(ordinal(21)).toBe("21st");
    expect(ordinal(22)).toBe("22nd");
    expect(ordinal(23)).toBe("23rd");
    expect(ordinal(111)).toBe("111th");
    expect(ordinal(101)).toBe("101st");
  });
});

describe("formatStreet", () => {
  it("title-cases and ordinalizes numbered streets", () => {
    expect(formatStreet("WEST 34 STREET")).toBe("West 34th Street");
    expect(formatStreet("3 AVENUE")).toBe("3rd Avenue");
    expect(formatStreet("EAST 3 STREET")).toBe("East 3rd Street");
    expect(formatStreet("BEACH 116 STREET")).toBe("Beach 116th Street");
  });

  it("leaves named streets alone (just title-cased)", () => {
    expect(formatStreet("BEDFORD AVENUE")).toBe("Bedford Avenue");
    expect(formatStreet("BROADWAY")).toBe("Broadway");
  });

  it("preserves acronyms and lowercases minor words", () => {
    expect(formatStreet("FDR DRIVE")).toBe("FDR Drive");
    expect(formatStreet("AVENUE OF THE AMERICAS")).toBe("Avenue of the Americas");
  });

  it("handles lettered avenues and hyphenated names", () => {
    expect(formatStreet("AVENUE A")).toBe("Avenue A");
    expect(formatStreet("MALCOLM X BOULEVARD")).toBe("Malcolm X Boulevard");
  });
});

describe("formatAddress", () => {
  it("uses structured house number + street", () => {
    expect(formatAddress({ housenumber: "20", street: "WEST 34 STREET" })).toBe(
      "20 West 34th Street",
    );
  });

  it("keeps hyphenated Queens house numbers verbatim", () => {
    expect(formatAddress({ housenumber: "145-03", street: "3 AVENUE" })).toBe(
      "145-03 3rd Avenue",
    );
  });

  it("falls back to parsing name when no structured fields", () => {
    expect(formatAddress({ name: "350 5 AVENUE" })).toBe("350 5th Avenue");
    expect(formatAddress({ name: "BROADWAY" })).toBe("Broadway");
  });

  it("returns empty string for empty input", () => {
    expect(formatAddress({})).toBe("");
    expect(formatAddress({ name: "" })).toBe("");
  });
});
