"use client";

import { useEffect, useState } from "react";
import {
  CATEGORY_META,
  type ObservationFeature,
  type ObservationFeatureCollection,
} from "@/lib/types";
import type { AddressMatch } from "./AddressSearch";

interface AddressDetailProps {
  match: AddressMatch | null;
  onClose: () => void;
}

// Small bbox (~75m) around a point to gather observations at that location.
function bboxAround(lng: number, lat: number, meters = 75): string {
  const dLat = meters / 111_320;
  const dLng = meters / (111_320 * Math.cos((lat * Math.PI) / 180));
  return [lng - dLng, lat - dLat, lng + dLng, lat + dLat].join(",");
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

const REPORT_311_URL = "https://portal.311.nyc.gov/article/?kanumber=KA-01010";

export default function AddressDetail({ match, onClose }: AddressDetailProps) {
  const [features, setFeatures] = useState<ObservationFeature[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!match) return;
    setLoading(true);
    setFeatures([]);
    const bbox = bboxAround(match.longitude, match.latitude);
    fetch(`/api/observations?bbox=${bbox}&limit=200`)
      .then((r) => r.json())
      .then((data: ObservationFeatureCollection) => {
        const sorted = (data.features ?? []).sort((a, b) =>
          a.properties.observed_at < b.properties.observed_at ? 1 : -1,
        );
        setFeatures(sorted);
      })
      .catch(() => setFeatures([]))
      .finally(() => setLoading(false));
  }, [match]);

  if (!match) return null;

  return (
    <aside
      className="absolute right-0 top-0 z-30 flex h-full w-[min(24rem,100vw)] flex-col bg-cream shadow-2xl"
      aria-label="Address detail"
    >
      <div className="flex items-start justify-between gap-3 border-b border-black/10 p-5">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-bold leading-tight text-ink">
            {match.address}
          </h2>
          {match.borough && (
            <p className="text-sm capitalize text-gray-500">
              {match.borough.toLowerCase()}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="shrink-0 rounded-full p-1 text-2xl leading-none text-gray-500 hover:bg-black/5"
        >
          ×
        </button>
      </div>

      <div className="border-b border-black/10 p-5">
        <div className="text-sm text-gray-600">Reports at this location</div>
        <div className="font-display text-3xl font-bold text-ink">
          {match.count}
        </div>
        <div className="text-sm text-gray-500">
          Most recent: {formatDate(match.lastObservedAt)}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Timeline
        </h3>
        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {!loading && features.length === 0 && (
          <p className="text-sm text-gray-500">No nearby observations found.</p>
        )}
        <ul className="space-y-3">
          {features.map((f) => {
            const meta = CATEGORY_META[f.properties.category];
            return (
              <li key={f.properties.id} className="flex gap-3">
                <span
                  className="mt-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: meta.color }}
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-ink">
                    {meta.label}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDate(f.properties.observed_at)}
                    {f.properties.detail ? ` · ${f.properties.detail}` : ""}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="border-t border-black/10 p-5">
        <a
          href={REPORT_311_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full rounded-lg bg-hotdog px-4 py-3 text-center text-sm font-semibold text-ink transition-opacity hover:opacity-90"
        >
          Report a rat here → NYC 311
        </a>
        <p className="mt-2 text-center text-[11px] text-gray-400">
          We don&apos;t store reports. This opens the city&apos;s official 311 channel.
        </p>
      </div>
    </aside>
  );
}
