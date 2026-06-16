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
  const [copied, setCopied] = useState(false);
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

  async function share() {
    if (!match) return;
    const text = `Rat reports near ${match.address} — RATMAP.NYC`;
    const url =
      typeof window !== "undefined" ? window.location.origin : "https://ratmap.nyc";
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "RATMAP.NYC", text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // User cancelled the share sheet, or clipboard was blocked — no-op.
    }
  }

  if (!match) return null;

  const count = features.length;
  const mostRecent = features[0]?.properties.observed_at;
  const mapsUrl = `https://maps.apple.com/?ll=${match.latitude},${match.longitude}&q=${encodeURIComponent(match.address)}`;

  const actionBtn =
    "flex flex-col items-center justify-center gap-1.5 rounded-2xl py-2.5 text-[11px] font-semibold transition-all duration-200 active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";
  const secondaryBtn =
    "bg-content/[0.07] text-content hover:bg-content/[0.12]";

  return (
    <aside
      className="glass-card animate-rise-in absolute z-30 flex flex-col overflow-hidden rounded-[28px]
                 inset-x-2 bottom-2 max-h-[76dvh]
                 sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-[4.75rem] sm:w-[22.5rem] sm:max-h-[calc(100dvh-6rem)]"
      role="dialog"
      aria-label={`Rat history for ${match.address}`}
    >
      {/* Mobile grabber */}
      <div
        aria-hidden="true"
        className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-content/20 sm:hidden"
      />

      {/* Header — sticky (doesn't scroll), Apple-Maps "place card" style */}
      <div className="safe-t relative shrink-0 px-5 pb-4 pt-4 sm:pt-5">
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3.5 top-3.5 grid h-7 w-7 place-items-center rounded-full bg-content/10 text-content-muted backdrop-blur-sm transition-all duration-200 hover:bg-content/20 hover:text-content focus:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-90"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <h2 className="pr-9 font-sans text-[22px] font-bold leading-[1.15] tracking-[-0.01em] text-content [overflow-wrap:anywhere]">
          {match.address}
        </h2>
        <p className="mt-1 text-[15px] text-content-muted">
          {match.borough ? (
            <span className="capitalize">{match.borough.toLowerCase()}</span>
          ) : (
            "New York City"
          )}
        </p>

        {/* Action row — Apple-Maps icon-over-label buttons: one filled primary
            + tinted secondaries, equal width. */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <a
            href={REPORT_311_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Report a rat to NYC 311"
            className={`${actionBtn} bg-accent text-accent-contrast shadow-[0_4px_16px_-5px_rgb(var(--accent)/0.85)] hover:-translate-y-0.5 hover:brightness-[1.04]`}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 22V4a2 2 0 0 1 2-2h10l-1.5 4L16 10H6" />
            </svg>
            Report
          </a>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open this location in Maps"
            className={`${actionBtn} ${secondaryBtn}`}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 11a3 3 0 1 0 6 0a3 3 0 0 0-6 0z" />
              <path d="M17.657 16.657 13.414 20.9a2 2 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0z" />
            </svg>
            Maps
          </a>
          <button
            type="button"
            onClick={share}
            aria-label={copied ? "Link copied" : "Share this location"}
            className={`${actionBtn} ${secondaryBtn}`}
          >
            {copied ? (
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12l4 4L19 7" />
              </svg>
            ) : (
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3v13" />
                <path d="M8 7l4-4 4 4" />
                <path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
              </svg>
            )}
            {copied ? "Copied" : "Share"}
          </button>
        </div>

        {/* Stat row — bracketed by hairlines, Apple's place-card metadata strip */}
        <dl className="mt-4 grid grid-cols-2 gap-3 border-y border-hairline py-3">
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.07em] text-content-muted">
              Reports nearby
            </dt>
            <dd className="mt-1 text-[15px] font-semibold leading-none text-content">
              {loading ? "…" : count}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.07em] text-content-muted">
              Most recent
            </dt>
            <dd className="mt-1 text-[15px] font-semibold leading-none text-content">
              {loading ? "…" : mostRecent ? formatDate(mostRecent) : "—"}
            </dd>
          </div>
        </dl>
      </div>

      {/* Scrollable activity */}
      <div className="safe-b themed-scroll flex-1 overflow-auto px-5 pb-4 pt-3">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-content-muted">
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
        <ul className="space-y-4">
          {features.map((f) => {
            const meta = CATEGORY_META[f.properties.category];
            return (
              <li key={f.properties.id} className="flex gap-3">
                <span
                  className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
                  style={{
                    background: meta.color,
                    boxShadow: `0 0 8px ${meta.color}80`,
                  }}
                />
                <div className="min-w-0">
                  <div className="text-[15px] font-medium leading-tight text-content">
                    {meta.label}
                  </div>
                  <div className="mt-0.5 text-[13px] text-content-muted">
                    {formatDate(f.properties.observed_at)}
                    {f.properties.detail ? ` · ${f.properties.detail}` : ""}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <p className="mt-6 text-[11px] leading-relaxed text-content-muted">
          We don&apos;t store reports — “Report a rat” opens NYC&apos;s official
          311 channel in a new tab.
        </p>
      </div>
    </aside>
  );
}
