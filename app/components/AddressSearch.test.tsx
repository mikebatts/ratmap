import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddressSearch, { type AddressMatch } from "./AddressSearch";

const MATCH: AddressMatch = {
  address: "123 Main St",
  borough: "BROOKLYN",
  latitude: 40.7,
  longitude: -73.9,
  count: 4,
  lastObservedAt: "2024-01-01T00:00:00Z",
};

function mockFetch(matches: AddressMatch[]) {
  const fn = vi.fn().mockResolvedValue({
    json: async () => ({ query: "x", matches }),
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("AddressSearch", () => {
  beforeEach(() => vi.useRealTimers());
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("does not query for fewer than 3 characters", async () => {
    const fetchFn = mockFetch([]);
    const user = userEvent.setup();
    render(<AddressSearch onSelect={vi.fn()} />);

    await user.type(screen.getByRole("searchbox"), "ab");
    // Give the debounce window a chance to (not) fire.
    await new Promise((r) => setTimeout(r, 350));
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("debounces, fetches, and shows matches for 3+ characters", async () => {
    const fetchFn = mockFetch([MATCH]);
    const user = userEvent.setup();
    render(<AddressSearch onSelect={vi.fn()} />);

    await user.type(screen.getByRole("searchbox"), "Main");

    await waitFor(() => expect(fetchFn).toHaveBeenCalled());
    expect(fetchFn.mock.calls[0][0]).toContain("q=Main");
    expect(await screen.findByText("123 Main St")).toBeInTheDocument();
  });

  it("fires onSelect when a match is clicked", async () => {
    mockFetch([MATCH]);
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<AddressSearch onSelect={onSelect} />);

    await user.type(screen.getByRole("searchbox"), "Main");
    const option = await screen.findByText("123 Main St");
    await user.click(option);
    expect(onSelect).toHaveBeenCalledWith(MATCH);
  });

  it("clears matches when the query is emptied", async () => {
    mockFetch([MATCH]);
    const user = userEvent.setup();
    render(<AddressSearch onSelect={vi.fn()} />);

    const input = screen.getByRole("searchbox");
    await user.type(input, "Main");
    await screen.findByText("123 Main St");

    await user.clear(input);
    await waitFor(() =>
      expect(screen.queryByText("123 Main St")).not.toBeInTheDocument(),
    );
  });

  it("closes the dropdown on outside click", async () => {
    mockFetch([MATCH]);
    const user = userEvent.setup();
    render(
      <div>
        <AddressSearch onSelect={vi.fn()} />
        <button type="button">outside</button>
      </div>,
    );

    await user.type(screen.getByRole("searchbox"), "Main");
    await screen.findByText("123 Main St");

    await user.click(screen.getByText("outside"));
    await waitFor(() =>
      expect(screen.queryByText("123 Main St")).not.toBeInTheDocument(),
    );
  });
});
