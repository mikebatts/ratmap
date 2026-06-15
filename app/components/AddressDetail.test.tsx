import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import AddressDetail from "./AddressDetail";
import type { AddressMatch } from "./AddressSearch";
import type { ObservationFeature } from "@/lib/types";

const MATCH: AddressMatch = {
  address: "123 Main St",
  borough: "BROOKLYN",
  latitude: 40.7,
  longitude: -73.9,
  count: 3,
  lastObservedAt: "2024-03-01T00:00:00Z",
};

function feat(id: number, observed_at: string, detail: string | null = null): ObservationFeature {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [-73.9, 40.7] },
    properties: {
      id,
      source: "311",
      source_id: `k${id}`,
      observed_at,
      address: "123 Main St",
      borough: "BROOKLYN",
      zipcode: "11201",
      category: "sighting",
      detail,
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("AddressDetail", () => {
  it("renders nothing when no match is selected", () => {
    const { container } = render(<AddressDetail match={null} onClose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the address, borough, and report count", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ json: async () => ({ features: [] }) }),
    );
    render(<AddressDetail match={MATCH} onClose={vi.fn()} />);
    expect(screen.getByText("123 Main St")).toBeInTheDocument();
    expect(screen.getByText("brooklyn")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("shows the loading state while fetching", async () => {
    // A fetch that never resolves keeps the component in its loading state.
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));
    render(<AddressDetail match={MATCH} onClose={vi.fn()} />);
    expect(await screen.findByText("Loading…")).toBeInTheDocument();
  });

  it("renders a timeline sorted newest-first", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({
          features: [
            feat(1, "2024-01-01T12:00:00Z", "older-report"),
            feat(2, "2024-06-01T12:00:00Z", "newer-report"),
          ],
        }),
      }),
    );
    render(<AddressDetail match={MATCH} onClose={vi.fn()} />);

    await waitFor(() =>
      expect(screen.getAllByText("Rat sighting").length).toBe(2),
    );
    // Newest (June) should be rendered before oldest (January). Identify rows
    // by their detail text to stay timezone-independent.
    const body = document.body.textContent ?? "";
    expect(body.indexOf("newer-report")).toBeGreaterThanOrEqual(0);
    expect(body.indexOf("newer-report")).toBeLessThan(body.indexOf("older-report"));
  });

  it("shows an empty state when there are no nearby observations", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ json: async () => ({ features: [] }) }),
    );
    render(<AddressDetail match={MATCH} onClose={vi.fn()} />);
    expect(
      await screen.findByText("No nearby observations found."),
    ).toBeInTheDocument();
  });
});
