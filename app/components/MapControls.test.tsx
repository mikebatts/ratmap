import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type maplibregl from "maplibre-gl";
import MapControls from "./MapControls";

function fakeMap() {
  return {
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    flyTo: vi.fn(),
  } as unknown as maplibregl.Map;
}

describe("MapControls", () => {
  it("renders zoom and recenter buttons", () => {
    render(<MapControls map={fakeMap()} />);
    expect(screen.getByLabelText("Zoom in")).toBeInTheDocument();
    expect(screen.getByLabelText("Zoom out")).toBeInTheDocument();
    expect(screen.getByLabelText("Recenter to NYC")).toBeInTheDocument();
  });

  it("calls the matching map method on click", async () => {
    const map = fakeMap();
    render(<MapControls map={map} />);
    const user = userEvent.setup();

    await user.click(screen.getByLabelText("Zoom in"));
    expect(map.zoomIn).toHaveBeenCalledOnce();

    await user.click(screen.getByLabelText("Zoom out"));
    expect(map.zoomOut).toHaveBeenCalledOnce();

    await user.click(screen.getByLabelText("Recenter to NYC"));
    expect(map.flyTo).toHaveBeenCalledOnce();
  });

  it("does not throw when map is null", async () => {
    render(<MapControls map={null} />);
    const user = userEvent.setup();
    await user.click(screen.getByLabelText("Zoom in"));
    expect(screen.getByLabelText("Zoom in")).toBeInTheDocument();
  });
});
