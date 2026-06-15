import { describe, it, expect } from "vitest";
import { buildPopupHTML } from "./ObservationPopup";
import type { ObservationFeature } from "@/lib/types";

function feature(props: Partial<ObservationFeature["properties"]>): ObservationFeature {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [-73.9, 40.7] },
    properties: {
      id: 1,
      source: "311",
      source_id: "k1",
      observed_at: "2024-01-15T00:00:00Z",
      address: "123 Main St",
      borough: "BROOKLYN",
      zipcode: "11201",
      category: "sighting",
      detail: "Rat Sighting",
      ...props,
    },
  };
}

describe("buildPopupHTML", () => {
  it("includes the category label, address, borough, and source link", () => {
    const html = buildPopupHTML(feature({}));
    expect(html).toContain("Rat sighting");
    expect(html).toContain("123 Main St");
    expect(html).toContain("BROOKLYN");
    expect(html).toContain("311 Service Requests");
    expect(html).toContain("data.cityofnewyork.us/d/erm2-nwe9");
  });

  it("shows a fallback when the address is missing", () => {
    const html = buildPopupHTML(feature({ address: null }));
    expect(html).toContain("Address not recorded");
  });

  it("omits the detail block when detail is null", () => {
    const html = buildPopupHTML(feature({ detail: null }));
    expect(html).not.toContain("font-style:italic");
  });

  it("escapes HTML in address and detail to prevent injection", () => {
    const html = buildPopupHTML(
      feature({
        address: `<img src=x onerror=alert(1)>`,
        detail: `"quote" & <b>bold</b>`,
      }),
    );
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x");
    expect(html).toContain("&amp;");
    expect(html).toContain("&quot;quote&quot;");
  });

  it("links to the DOH dataset for rodent inspections", () => {
    const html = buildPopupHTML(
      feature({ source: "rodent_inspection", category: "inspection_fail" }),
    );
    expect(html).toContain("DOHMH Rodent Inspection");
    expect(html).toContain("p937-wjvj");
  });
});
