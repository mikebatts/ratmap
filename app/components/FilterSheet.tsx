"use client";

import { useEffect, useRef } from "react";
import FilterControls, { type FilterState } from "./FilterControls";

interface FilterSheetProps {
  open: boolean;
  value: FilterState;
  onChange: (next: FilterState) => void;
  onClose: () => void;
}

/**
 * Mobile filter UI — an Apple-Maps-style bottom sheet (grabber, title, Done)
 * over a dimmed map. Replaces the desktop dropdown on phones so it can't get
 * hidden behind the bottom search bar. Filters apply live; Done just closes.
 */
export default function FilterSheet({
  open,
  value,
  onChange,
  onClose,
}: FilterSheetProps) {
  const doneRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    doneRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 sm:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Filters"
    >
      {/* Backdrop — dims + blurs the map, tap to dismiss */}
      <button
        type="button"
        aria-label="Close filters"
        tabIndex={-1}
        onClick={onClose}
        className="animate-fade-in absolute inset-0 cursor-default bg-black/30 backdrop-blur-[2px]"
      />

      {/* Sheet */}
      <div className="glass-card animate-sheet-up themed-scroll safe-b safe-x absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-auto rounded-t-[28px] px-5 pb-6 pt-3">
        <div
          aria-hidden="true"
          className="mx-auto mb-3 h-1 w-9 rounded-full bg-content/20"
        />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-sans text-xl font-bold tracking-tight text-content">
            Filters
          </h2>
          <button
            ref={doneRef}
            type="button"
            onClick={onClose}
            className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-accent-contrast transition-transform active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-content"
          >
            Done
          </button>
        </div>
        <FilterControls value={value} onChange={onChange} />
      </div>
    </div>
  );
}
