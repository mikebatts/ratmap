"use client";

import { TIME_RANGES, type TimeRange } from "@/lib/map";
import { BOROUGHS, CATEGORY_META, type Category } from "@/lib/types";

export interface FilterState {
  range: TimeRange;
  categories: Category[]; // empty = all
  boroughs: string[]; // empty = all
}

// Categories surfaced as filter checkboxes. Each checkbox controls a `group` of
// one or more underlying categories so the full taxonomy is reachable without a
// checkbox per fine-grained category. The `key` is the category whose color
// swatch represents the group.
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

interface FilterControlsProps {
  value: FilterState;
  onChange: (next: FilterState) => void;
}

/**
 * The filter fields (time range / category / borough). Pure controlled UI,
 * shared by the desktop dropdown (FilterPanel) and the mobile bottom sheet
 * (FilterSheet). Touch targets are generous so it works well on phones.
 */
export default function FilterControls({ value, onChange }: FilterControlsProps) {
  function toggleGroup(group: Category[]) {
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
    <>
      <fieldset className="mb-5">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-content-muted">
          Time range
        </legend>
        <div className="flex flex-wrap gap-2">
          {TIME_RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => onChange({ ...value, range: r.key })}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-200 active:scale-95 ${
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

      <fieldset className="mb-5">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-content-muted">
          Category
        </legend>
        <div className="space-y-0.5">
          {FILTER_CATEGORIES.map((c) => {
            const selected = value.categories.includes(c.key);
            const checked = value.categories.length === 0 || selected;
            return (
              <label
                key={c.key}
                className="-mx-2 flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-2 text-[15px] transition-colors hover:bg-content/5"
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggleGroup(c.group)}
                  className="h-[18px] w-[18px] accent-[#F5C518]"
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
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
          {BOROUGHS.map((b) => (
            <label
              key={b}
              className="-mx-2 flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-2 text-[15px] capitalize transition-colors hover:bg-content/5"
            >
              <input
                type="checkbox"
                checked={value.boroughs.includes(b)}
                onChange={() => toggleBorough(b)}
                className="h-[18px] w-[18px] accent-[#F5C518]"
              />
              <span className="text-content">{b.toLowerCase()}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </>
  );
}
