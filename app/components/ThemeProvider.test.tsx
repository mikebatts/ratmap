import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider, useTheme } from "./ThemeProvider";

// jsdom (opaque origin) doesn't expose a working localStorage — install a
// simple in-memory mock on window so the provider can read/write it.
function installLocalStorageMock() {
  const store = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => void store.set(k, String(v)),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    },
  });
}

// jsdom has no real matchMedia — provide a controllable stub.
function stubMatchMedia(dark: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: dark,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

function Probe() {
  const { resolved, theme, toggle, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="resolved">{resolved}</span>
      <span data-testid="theme">{theme}</span>
      <button onClick={toggle}>toggle</button>
      <button onClick={() => setTheme("dark")}>set-dark</button>
    </div>
  );
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    installLocalStorageMock();
    window.localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("follows the OS preference when no stored choice (dark)", async () => {
    stubMatchMedia(true);
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(await screen.findByTestId("resolved")).toHaveTextContent("dark");
    expect(screen.getByTestId("theme")).toHaveTextContent("system");
  });

  it("toggling sets the .dark class on <html> and persists to localStorage", async () => {
    stubMatchMedia(false); // OS = light
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(await screen.findByTestId("resolved")).toHaveTextContent("light");

    await userEvent.click(screen.getByText("toggle"));

    expect(screen.getByTestId("resolved")).toHaveTextContent("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("ratmap-theme")).toBe("dark");
  });

  it("hydrates from a stored explicit choice over the OS", async () => {
    localStorage.setItem("ratmap-theme", "dark");
    stubMatchMedia(false); // OS prefers light, but stored = dark wins
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(await screen.findByTestId("resolved")).toHaveTextContent("dark");
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
  });
});
