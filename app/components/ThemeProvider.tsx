"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type ThemeChoice = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "ratmap-theme";

interface ThemeContextValue {
  /** The user's explicit choice (or "system" to follow the OS). */
  theme: ThemeChoice;
  /** The actual theme applied right now. */
  resolved: ResolvedTheme;
  setTheme: (t: ThemeChoice) => void;
  /** Flip between light and dark (collapses "system" to a concrete choice). */
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function readStored(): ThemeChoice {
  if (typeof window === "undefined") return "system";
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "light" || v === "dark" || v === "system" ? v : "system";
  } catch {
    return "system";
  }
}

function apply(resolved: ResolvedTheme): void {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // The inline pre-paint script in layout.tsx has already set the correct class
  // before hydration. Initialize from the same sources to stay in sync.
  const [theme, setThemeState] = useState<ThemeChoice>("system");
  const [resolved, setResolved] = useState<ResolvedTheme>("light");

  // On mount, hydrate state from storage + OS (no flash — class is already set).
  useEffect(() => {
    const stored = readStored();
    setThemeState(stored);
    setResolved(
      stored === "system" ? (systemPrefersDark() ? "dark" : "light") : stored,
    );
  }, []);

  // Follow the OS while in "system" mode.
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const next: ResolvedTheme = mq.matches ? "dark" : "light";
      setResolved(next);
      apply(next);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((t: ThemeChoice) => {
    setThemeState(t);
    const next: ResolvedTheme =
      t === "system" ? (systemPrefersDark() ? "dark" : "light") : t;
    setResolved(next);
    apply(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, t);
    } catch {
      // Private mode / storage disabled — theme still applies for this session.
    }
  }, []);

  const toggle = useCallback(() => {
    setTheme(resolved === "dark" ? "light" : "dark");
  }, [resolved, setTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolved, setTheme, toggle }),
    [theme, resolved, setTheme, toggle],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
