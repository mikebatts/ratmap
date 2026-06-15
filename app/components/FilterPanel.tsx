"use client";

import { useState } from "react";
import { TIME_RANGES, type TimeRange } from "@/lib/map";
import { BOROUGHS, CATEGORY_META, type Category } from "@/lib/types";

// Categories surfaced as filter checkboxes (grouped — we collapse the long
// taxonomy into the five the brief calls out).
const FILTER_CATEGORIES: { key: Category; label: string }[] = [
  { key: "sighting", label: CATEGORY_META.sighting.label },
  { key: "inspection_fail", label: CATEGORY_META.inspection_fail.label },
  { key: "inspection_pass", label: CATEGORY_META.inspection_pass.label },
  { key: "baiting", label: "Baiting / cleanup" },
  { key: "other_rodent", label: "Other rodent" },
];

export interface FilterState {
  range: TimeRange;
  categories: Category[]; // empty = all
  boroughs: string[]; // empty = all
}

interface FilterPanelProps {
  value: FilterState;
  onChange: (next: FilterState) => void;
}

export default function FilterPanel({ value, onChange }: FilterPanelProps) {
  const [open, setOpen] = useState(false);

  function toggleCategory(cat: Category) {
    const has = value.categories.includes(cat);
    // "baiting" filter also implies "cleanup".
    const group: Category[] = cat === "baiting" ? ["baiting", "cleanup"] : [cat];
    const next = has
      ? value.categories.filter((c) => !group.includes(c))
      : [...value.categories, ...group];
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
    <div className="absolute right-4 top-4 z-10 w-[min(20rem,calc(100vw-2rem))]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="ml-auto flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-ink shadow-md hover:bg-cream focus:outline-none focus:ring-2 focus:ring-hotdog"
      >
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-hotdog" />
        Filters
        <span className="text-gray-400">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-2 rounded-lg bg-white p-4 shadow-xl">
          <fieldset className="mb-4">
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Time range
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {TIME_RANGES.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => onChange({ ...value, range: r.key })}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    value.range === r.key
                      ? "bg-ink text-white"
                      : "bg-cream text-ink hover:bg-hotdog/30"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="mb-4">
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Category
            </legend>
            <div className="space-y-1.5">
              {FILTER_CATEGORIES.map((c) => {
                const checked =
                  value.categories.length === 0 ||
                  value.categories.includes(c.key);
                return (
                  <label
                    key={c.key}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={value.categories.includes(c.key)}
                      onChange={() => toggleCategory(c.key)}
                      className="h-4 w-4 accent-hotdog"
                    />
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ background: CATEGORY_META[c.key].color }}
                    />
                    <span className={checked ? "text-ink" : "text-gray-400"}>
                      {c.label}
                    </span>
                  </label>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px] text-gray-400">
              None checked = show all categories.
            </p>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Borough
            </legend>
            <div className="grid grid-cols-2 gap-1.5">
              {BOROUGHS.map((b) => (
                <label
                  key={b}
                  className="flex cursor-pointer items-center gap-2 text-sm capitalize"
                >
                  <input
                    type="checkbox"
                    checked={value.boroughs.includes(b)}
                    onChange={() => toggleBorough(b)}
                    className="h-4 w-4 accent-hotdog"
                  />
                  <span className="text-ink">{b.toLowerCase()}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      )}
    </div>
  );
}
