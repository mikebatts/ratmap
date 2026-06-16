"use client";

import { useEffect, useRef, useState } from "react";
import FilterControls, { type FilterState } from "./FilterControls";

export type { FilterState };

interface FilterPanelProps {
  value: FilterState;
  onChange: (next: FilterState) => void;
  /** Override the trigger button's classes (e.g. to render as a capsule segment). */
  triggerClassName?: string;
}

/**
 * Desktop filter control: a trigger button with a glass dropdown. On mobile we
 * use FilterSheet (a bottom sheet) instead — a dropdown would collide with the
 * search bar, so this component is rendered `hidden sm:*` from the page.
 */
export default function FilterPanel({
  value,
  onChange,
  triggerClassName,
}: FilterPanelProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on Escape or a click/tap outside the panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={
          triggerClassName ??
          "glass glass-interactive flex h-11 items-center gap-2 rounded-2xl px-4 text-sm font-semibold text-content"
        }
      >
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_8px_rgb(var(--accent)/0.7)]" />
        <span className="hidden sm:inline">Filters</span>
        <span
          className={`text-content-muted transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="glass-strong animate-pop-in themed-scroll absolute right-0 mt-2 max-h-[calc(100dvh-7rem)] w-[min(20rem,calc(100vw-2rem))] overflow-auto rounded-2xl p-4">
          <FilterControls value={value} onChange={onChange} />
        </div>
      )}
    </div>
  );
}
