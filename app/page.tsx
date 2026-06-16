"use client";

import { useEffect, useMemo, useState } from "react";
import type maplibregl from "maplibre-gl";
import Map, { type FlyTarget, type MapFilters } from "./components/Map";
import MapControls from "./components/MapControls";
import AddressSearch, { type AddressMatch } from "./components/AddressSearch";
import FilterPanel, { type FilterState } from "./components/FilterPanel";
import AddressDetail from "./components/AddressDetail";
import AboutModal from "./components/AboutModal";
import ThemeToggle from "./components/ThemeToggle";
import { sinceFromRange } from "@/lib/map";
import { CATEGORY_META } from "@/lib/types";
import { SITE_WORDMARK } from "@/lib/site";

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
  const [aboutOpen, setAboutOpen] = useState(false);

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

      {/* Top bar: brand (left) · search (center) · control cluster (right).
          One clear hierarchy — identity, the primary action, then tools. */}
      <header className="safe-t safe-x pointer-events-none absolute inset-x-0 top-0 z-20 p-3 sm:p-4">
        <div className="pointer-events-auto mx-auto flex max-w-5xl flex-col gap-2.5 sm:flex-row sm:items-start sm:gap-3">
          {/* On mobile this wraps brand + tools onto one row (search below);
              on sm+ it dissolves (contents) so it's brand · search · tools. */}
          <div className="flex items-start justify-between gap-2 sm:contents">
            {/* Brand */}
            <div className="glass animate-rise-in flex shrink-0 items-baseline gap-2 self-start rounded-2xl px-3.5 py-2.5 sm:order-1">
              <span className="font-display text-lg font-bold tracking-tight text-content">
                <span aria-hidden="true">🐭</span>{" "}
                <span className="text-content">{SITE_WORDMARK}</span>
              </span>
              <span className="hidden text-xs font-medium text-content-muted sm:inline">
                {total !== null && total > 0
                  ? `${total.toLocaleString()} reports`
                  : "NYC's rat map"}
              </span>
            </div>

            {/* Tools — one cohesive cluster, consistent 44px controls */}
            <div className="animate-rise-in flex shrink-0 items-start gap-2 self-start sm:order-3">
              <button
                type="button"
                onClick={() => setAboutOpen(true)}
                className="glass glass-interactive flex h-11 items-center rounded-2xl px-4 text-sm font-medium text-content"
              >
                About
              </button>
              <ThemeToggle />
              <FilterPanel value={filters} onChange={setFilters} />
            </div>
          </div>

          {/* Primary action — address search */}
          <div className="animate-rise-in order-2 min-w-0 flex-1 sm:order-2">
            <AddressSearch onSelect={handleSelect} />
          </div>
        </div>
      </header>

      <MapControls map={map} />

      {/* Loading pill */}
      {loading && (
        <div className="glass animate-pop-in absolute left-1/2 top-20 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium text-content">
          <span className="inline-block h-1.5 w-1.5 animate-pulse-soft rounded-full bg-accent" />
          Loading observations…
        </div>
      )}

      {/* Legend */}
      <div className="glass animate-rise-in absolute bottom-8 left-4 z-10 hidden rounded-2xl p-3.5 text-xs sm:block">
        <div className="mb-2 font-semibold uppercase tracking-wider text-content-muted">
          Legend
        </div>
        <ul className="space-y-1.5">
          {LEGEND.map((l) => (
            <li key={l.key} className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-black/10"
                style={{
                  background: CATEGORY_META[l.key].color,
                  boxShadow: `0 0 8px ${CATEGORY_META[l.key].color}99`,
                }}
              />
              <span className="text-content">{l.label}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Footer attribution — always visible. Sits the same distance off the
          bottom edge as the legend (bottom-8) for a balanced baseline. */}
      <footer className="safe-b safe-x pointer-events-none absolute inset-x-0 bottom-8 z-10 px-2 text-center">
        <p className="glass pointer-events-auto inline-block rounded-full px-3 py-1 text-[11px] text-content-muted">
          Made with{" "}
          <span aria-hidden="true" className="text-accent">
            ♥
          </span>{" "}
          in NYC · Data from{" "}
          <a
            href="https://opendata.cityofnewyork.us/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-accent decoration-2 underline-offset-2"
          >
            NYC Open Data
          </a>{" "}
          &amp; DOHMH. Updated daily.
        </p>
      </footer>

      <AddressDetail match={selected} onClose={() => setSelected(null)} />
      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </main>
  );
}
