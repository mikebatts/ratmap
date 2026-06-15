"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type maplibregl from "maplibre-gl";
import Map, { type FlyTarget, type MapFilters } from "./components/Map";
import MapControls from "./components/MapControls";
import AddressSearch, { type AddressMatch } from "./components/AddressSearch";
import FilterPanel, { type FilterState } from "./components/FilterPanel";
import AddressDetail from "./components/AddressDetail";
import { sinceFromRange } from "@/lib/map";
import { CATEGORY_META } from "@/lib/types";

const LEGEND = [
  { key: "sighting", label: "Sighting" },
  { key: "inspection_fail", label: "Inspection failed" },
  { key: "inspection_pass", label: "Inspection passed" },
  { key: "baiting", label: "Baiting / cleanup" },
  { key: "other_rodent", label: "Other rodent" },
] as const;

export default function Home() {
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [flyTarget, setFlyTarget] = useState<FlyTarget | null>(null);
  const [selected, setSelected] = useState<AddressMatch | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    range: "1y",
    categories: [],
    boroughs: [],
  });

  const mapFilters: MapFilters = useMemo(
    () => ({
      since: sinceFromRange(filters.range),
      categories: filters.categories,
      boroughs: filters.boroughs,
    }),
    [filters],
  );

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => setTotal(d.total ?? 0))
      .catch(() => setTotal(null));
  }, []);

  function handleSelect(match: AddressMatch) {
    setSelected(match);
    setFlyTarget({ lng: match.longitude, lat: match.latitude, nonce: Date.now() });
  }

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden">
      <Map
        filters={mapFilters}
        flyTarget={flyTarget}
        onReady={setMap}
        onLoadingChange={setLoading}
      />

      {/* Header: brand + search + about */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 p-4">
        <div className="pointer-events-auto mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex items-baseline gap-2 rounded-lg bg-ink px-3 py-2 shadow-md">
              <span className="font-display text-lg font-bold text-hotdog">
                Rats.nyc
              </span>
              <span className="hidden text-xs text-white/70 sm:inline">
                {total !== null && total > 0
                  ? `${total.toLocaleString()} reports`
                  : "NYC's rat map"}
              </span>
            </div>
            <Link
              href="/about"
              className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-ink shadow-md hover:bg-cream sm:hidden"
            >
              About
            </Link>
          </div>
          <div className="flex-1">
            <AddressSearch onSelect={handleSelect} />
          </div>
          <Link
            href="/about"
            className="hidden rounded-lg bg-white px-4 py-3 text-sm font-medium text-ink shadow-md hover:bg-cream sm:block"
          >
            About
          </Link>
        </div>
      </header>

      <FilterPanel value={filters} onChange={setFilters} />
      <MapControls map={map} />

      {/* Loading pill */}
      {loading && (
        <div className="absolute left-1/2 top-20 z-10 -translate-x-1/2 rounded-full bg-ink/90 px-3 py-1 text-xs font-medium text-white shadow-md">
          Loading observations…
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-8 left-4 z-10 hidden rounded-lg bg-white/95 p-3 text-xs shadow-md sm:block">
        <div className="mb-1.5 font-semibold uppercase tracking-wide text-gray-500">
          Legend
        </div>
        <ul className="space-y-1">
          {LEGEND.map((l) => (
            <li key={l.key} className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: CATEGORY_META[l.key].color }}
              />
              <span className="text-ink">{l.label}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Footer attribution — always visible */}
      <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-2 text-center">
        <p className="pointer-events-auto inline-block rounded bg-white/80 px-2 py-1 text-[11px] text-gray-600">
          Data from{" "}
          <a
            href="https://opendata.cityofnewyork.us/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            NYC Open Data
          </a>{" "}
          (311) &amp; DOHMH (Rodent Inspection). Updated daily.
        </p>
      </footer>

      <AddressDetail match={selected} onClose={() => setSelected(null)} />
    </main>
  );
}
