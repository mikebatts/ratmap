"use client";

import { useEffect, useRef, useState } from "react";
import { TIME_RANGES, type TimeRange } from "@/lib/map";
import { BOROUGHS, CATEGORY_META, type Category } from "@/lib/types";

// Categories surfaced as filter checkboxes. Each checkbox controls a `group`
// of one or more underlying categories so the full taxonomy is reachable
// without a checkbox per fine-grained category. The `key` is the category
// whose color swatch represents the group.
const FILTER_CATEGORIES: { key: Category; label: string; group: Category[] }[] = [
  { key: "sighting", label: CATEGORY_META.sighting.label, group: ["sighting"] },
  {
    key: "inspection_fail",
    label: CATEGORY_META.inspection_fail.label,
    group: ["inspection_fail"],
  },
  {
    key: "inspection_pass",
    label: CATEGORY_META.inspection_pass.label,
    group: ["inspection_pass"],
  },
  { key: "baiting", label: "Baiting / cleanup", group: ["baiting", "cleanup"] },
  {
    key: "other_rodent",
    label: "Other (mice, conditions, etc.)",
    group: ["other_rodent", "condition", "other"],
  },
];

export interface FilterState {
  range: TimeRange;
  categories: Category[]; // empty = all
  boroughs: string[]; // empty = all
}

interface FilterPanelProps {
  value: FilterState;
  onChange: (next: FilterState) => void;
  /** Override the trigger button's classes (e.g. to render as a capsule segment). */
  triggerClassName?: string;
}

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

  function toggleGroup(group: Category[]) {
    // A group is "on" when its representative (first) category is selected.
    const has = value.categories.includes(group[0]);
    const next = has
      ? value.categories.filter((c) => !group.includes(c))
      : [...value.categories, ...group.filter((c) => !value.categories.includes(c))];
    onChange({ ...value, categories: next });
  }

  function toggleBorough(boro: string) {
    const has = value.boroughs.includes(boro);
    onChange({
      ...value,
      boroughs: has
        ? value.boroughs.filter((b) => b !== boro)
        : [...value.boroughs, boro],
    });
  }

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
          <fieldset className="mb-4">
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-content-muted">
              Time range
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {TIME_RANGES.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => onChange({ ...value, range: r.key })}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-all duration-200 active:scale-95 ${
                    value.range === r.key
                      ? "bg-accent text-accent-contrast shadow-[0_2px_10px_-2px_rgb(var(--accent)/0.8)]"
                      : "bg-content/5 text-content hover:bg-accent/25"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="mb-4">
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-content-muted">
              Category
            </legend>
            <div className="space-y-1.5">
              {FILTER_CATEGORIES.map((c) => {
                const selected = value.categories.includes(c.key);
                const checked = value.categories.length === 0 || selected;
                return (
                  <label
                    key={c.key}
                    className="-mx-2 flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-sm transition-colors hover:bg-content/5"
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleGroup(c.group)}
                      className="h-4 w-4 accent-[#F5C518]"
                    />
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-black/10"
                      style={{ background: CATEGORY_META[c.key].color }}
                    />
                    <span className={checked ? "text-content" : "text-content-muted"}>
                      {c.label}
                    </span>
                  </label>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px] text-content-muted">
              None checked = show all categories.
            </p>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-content-muted">
              Borough
            </legend>
            <div className="grid grid-cols-2 gap-1.5">
              {BOROUGHS.map((b) => (
                <label
                  key={b}
                  className="-mx-1 flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1 text-sm capitalize transition-colors hover:bg-content/5"
                >
                  <input
                    type="checkbox"
                    checked={value.boroughs.includes(b)}
                    onChange={() => toggleBorough(b)}
                    className="h-4 w-4 accent-[#F5C518]"
                  />
                  <span className="text-content">{b.toLowerCase()}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      )}
    </div>
  );
}
