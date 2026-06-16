"use client";

import { useTheme } from "./ThemeProvider";

/**
 * Glass sun/moon toggle. Flips between light and dark; the icon reflects the
 * theme you'll switch TO, which is the conventional, least-surprising affordance.
 */
export default function ThemeToggle({ className }: { className?: string }) {
  const { resolved, toggle } = useTheme();
  const next = resolved === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className={
        className ??
        "glass glass-interactive group flex h-11 w-11 items-center justify-center rounded-2xl text-content"
      }
    >
      <span className="relative block h-[18px] w-[18px]">
        {/* Sun — shown in dark mode (click to go light). Hidden by default. */}
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="absolute inset-0 -rotate-90 scale-0 opacity-0 transition-all duration-300 group-hover:rotate-45 dark:rotate-0 dark:scale-100 dark:opacity-100"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
        {/* Moon — shown in light mode (click to go dark). Default visible. */}
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="absolute inset-0 rotate-0 scale-100 opacity-100 transition-all duration-300 group-hover:-rotate-12 dark:rotate-90 dark:scale-0 dark:opacity-0"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </span>
    </button>
  );
}
