import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FilterPanel, { type FilterState } from "./FilterPanel";

// Stateful harness so toggles round-trip through value/onChange like in the app.
function Harness({
  initial,
  onChangeSpy,
}: {
  initial?: Partial<FilterState>;
  onChangeSpy?: (s: FilterState) => void;
}) {
  const [value, setValue] = useState<FilterState>({
    range: "1y",
    categories: [],
    boroughs: [],
    ...initial,
  });
  return (
    <FilterPanel
      value={value}
      onChange={(next) => {
        onChangeSpy?.(next);
        setValue(next);
      }}
    />
  );
}

async function openPanel() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /filters/i }));
  return user;
}

describe("FilterPanel", () => {
  it("is collapsed until the Filters button is clicked", async () => {
    render(<Harness />);
    expect(screen.queryByText("Time range")).not.toBeInTheDocument();
    await openPanel();
    expect(screen.getByText("Time range")).toBeInTheDocument();
  });

  it("selects a time range", async () => {
    const spy = vi.fn();
    render(<Harness onChangeSpy={spy} />);
    const user = await openPanel();
    await user.click(screen.getByRole("button", { name: "30 days" }));
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ range: "30d" }));
  });

  it("toggles a single category on and off", async () => {
    const spy = vi.fn();
    render(<Harness onChangeSpy={spy} />);
    const user = await openPanel();
    const sighting = screen.getByLabelText(/Rat sighting/i);

    await user.click(sighting);
    expect(spy).toHaveBeenLastCalledWith(
      expect.objectContaining({ categories: ["sighting"] }),
    );

    await user.click(sighting);
    expect(spy).toHaveBeenLastCalledWith(
      expect.objectContaining({ categories: [] }),
    );
  });

  it("baiting checkbox implies cleanup", async () => {
    const spy = vi.fn();
    render(<Harness onChangeSpy={spy} />);
    const user = await openPanel();
    await user.click(screen.getByLabelText(/Baiting/i));
    const arg = spy.mock.calls.at(-1)![0] as FilterState;
    expect(arg.categories).toEqual(expect.arrayContaining(["baiting", "cleanup"]));
  });

  it("the Other checkbox toggles other_rodent, condition, and other together", async () => {
    const spy = vi.fn();
    render(<Harness onChangeSpy={spy} />);
    const user = await openPanel();
    const other = screen.getByLabelText(/Other \(mice/i);

    await user.click(other);
    let arg = spy.mock.calls.at(-1)![0] as FilterState;
    expect(arg.categories).toEqual(
      expect.arrayContaining(["other_rodent", "condition", "other"]),
    );

    await user.click(other);
    arg = spy.mock.calls.at(-1)![0] as FilterState;
    expect(arg.categories).not.toContain("other_rodent");
    expect(arg.categories).not.toContain("condition");
    expect(arg.categories).not.toContain("other");
  });

  it("toggles a borough", async () => {
    const spy = vi.fn();
    render(<Harness onChangeSpy={spy} />);
    const user = await openPanel();
    const boroughGroup = screen.getByText("Borough").closest("fieldset")!;
    await user.click(within(boroughGroup).getByLabelText("brooklyn"));
    expect(spy).toHaveBeenLastCalledWith(
      expect.objectContaining({ boroughs: ["BROOKLYN"] }),
    );
  });
});
