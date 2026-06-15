"use client";

import { useEffect, useRef, useState } from "react";

export interface AddressMatch {
  address: string;
  borough: string | null;
  latitude: number;
  longitude: number;
  count: number;
  lastObservedAt: string;
}

interface AddressSearchProps {
  onSelect: (match: AddressMatch) => void;
}

export default function AddressSearch({ onSelect }: AddressSearchProps) {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<AddressMatch[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 3) {
      setMatches([]);
      setOpen(false);
      return;
    }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/address-search?q=${encodeURIComponent(query.trim())}`,
        );
        const data = await res.json();
        setMatches(data.matches ?? []);
        setOpen(true);
      } catch {
        setMatches([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query]);

  // Close dropdown on outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function select(m: AddressMatch) {
    onSelect(m);
    setQuery(m.address);
    setOpen(false);
  }

  return (
    <div ref={boxRef} className="relative w-full">
      <input
        type="search"
        inputMode="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => matches.length && setOpen(true)}
        placeholder="Search an address or block…"
        aria-label="Search an address"
        className="w-full rounded-lg border border-black/10 bg-white px-4 py-3 text-sm text-ink shadow-md placeholder:text-gray-400 focus:border-hotdog focus:outline-none focus:ring-2 focus:ring-hotdog"
      />
      {open && (
        <ul className="absolute z-20 mt-1 max-h-80 w-full overflow-auto rounded-lg border border-black/10 bg-white shadow-xl">
          {loading && (
            <li className="px-4 py-3 text-sm text-gray-500">Searching…</li>
          )}
          {!loading && matches.length === 0 && (
            <li className="px-4 py-3 text-sm text-gray-500">
              No matches. Try a street name.
            </li>
          )}
          {matches.map((m) => (
            <li key={`${m.address}-${m.latitude}-${m.longitude}`}>
              <button
                type="button"
                onClick={() => select(m)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-cream focus:bg-cream focus:outline-none"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-ink">
                    {m.address}
                  </span>
                  {m.borough && (
                    <span className="block text-xs text-gray-500">
                      {m.borough}
                    </span>
                  )}
                </span>
                <span className="shrink-0 rounded-full bg-hotdog/20 px-2 py-0.5 text-xs font-semibold text-ink">
                  {m.count}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
