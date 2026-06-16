"use client";

import { useEffect, useRef, useState } from "react";
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

// Bbox (~150m ≈ one NYC block) around a point to gather nearby observations.
function bboxAround(lng: number, lat: number, meters = 150): string {
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

// NYC311 "Rat or Mouse Complaint" — the page with the online report flow.
const REPORT_311_URL = "https://portal.311.nyc.gov/article/?kanumber=KA-01107";

export default function AddressDetail({ match, onClose }: AddressDetailProps) {
  const [features, setFeatures] = useState<ObservationFeature[]>([]);
  const [loading, setLoading] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

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

  // Close on Escape, and move focus to the close button when the panel opens
  // (so keyboard users land inside the new context).
  useEffect(() => {
    if (!match) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [match, onClose]);

  if (!match) return null;

  const count = features.length;
  const mostRecent = features[0]?.properties.observed_at;
  const mapsUrl = `https://maps.apple.com/?ll=${match.latitude},${match.longitude}&q=${encodeURIComponent(match.address)}`;

  return (
    <aside
      className="glass-strong animate-rise-in absolute z-30 flex flex-col overflow-hidden rounded-3xl
                 inset-x-2 bottom-2 max-h-[74dvh]
                 sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-[4.75rem] sm:w-[23rem] sm:max-h-[calc(100dvh-6rem)]"
      role="dialog"
      aria-label={`Rat history for ${match.address}`}
    >
      {/* Header — sticky (doesn't scroll), Apple-Maps "place card" style */}
      <div className="safe-t relative shrink-0 px-5 pb-4 pt-5">
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-content/10 text-content-muted transition-all duration-200 hover:bg-content/20 hover:text-content focus:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-90"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <h2 className="pr-9 font-display text-2xl font-bold leading-tight text-content [overflow-wrap:anywhere]">
          {match.address}
        </h2>
        <p className="mt-0.5 text-sm text-content-muted">
          {match.borough ? (
            <span className="capitalize">{match.borough.toLowerCase()}</span>
          ) : (
            "New York City"
          )}
        </p>

        {/* Activity summary pill */}
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-content/5 px-2.5 py-1 font-medium text-content">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
            {loading
              ? "Checking…"
              : `${count} ${count === 1 ? "report" : "reports"} nearby`}
          </span>
          {!loading && mostRecent && (
            <span className="text-content-muted">
              latest {formatDate(mostRecent)}
            </span>
          )}
        </div>

        {/* Action row */}
        <div className="mt-4 flex items-stretch gap-2">
          <a
            href={REPORT_311_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-contrast shadow-[0_4px_18px_-4px_rgb(var(--accent)/0.8)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_8px_24px_-4px_rgb(var(--accent)/0.9)] focus:outline-none focus-visible:ring-2 focus-visible:ring-content focus-visible:ring-offset-2 focus-visible:ring-offset-transparent active:translate-y-0 active:scale-[0.98]"
          >
            Report a rat → 311
          </a>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open this location in Maps"
            title="Open in Maps"
            className="glass glass-interactive grid w-11 shrink-0 place-items-center rounded-2xl text-content"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 11a3 3 0 1 0 6 0a3 3 0 0 0-6 0z" />
              <path d="M17.657 16.657 13.414 20.9a2 2 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0z" />
            </svg>
          </a>
        </div>
      </div>

      <div className="mx-5 h-px bg-hairline" />

      {/* Scrollable activity */}
      <div className="safe-b themed-scroll flex-1 overflow-auto px-5 py-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-content-muted">
          Recent activity
        </h3>
        {loading && (
          <p className="text-sm text-content-muted">Looking up nearby reports…</p>
        )}
        {!loading && count === 0 && (
          <p className="text-sm text-content-muted">
            No rat reports recorded within a block of here.
          </p>
        )}
        <ul className="space-y-3.5">
          {features.map((f) => {
            const meta = CATEGORY_META[f.properties.category];
            return (
              <li key={f.properties.id} className="flex gap-3">
                <span
                  className="mt-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
                  style={{
                    background: meta.color,
                    boxShadow: `0 0 8px ${meta.color}80`,
                  }}
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-content">
                    {meta.label}
                  </div>
                  <div className="text-xs text-content-muted">
                    {formatDate(f.properties.observed_at)}
                    {f.properties.detail ? ` · ${f.properties.detail}` : ""}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <p className="mt-5 text-[11px] leading-relaxed text-content-muted">
          We don&apos;t store reports — “Report a rat” opens NYC&apos;s official
          311 channel in a new tab.
        </p>
      </div>
    </aside>
  );
}
