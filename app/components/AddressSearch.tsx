"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

export interface AddressMatch {
  address: string;
  borough: string | null;
  latitude: number;
  longitude: number;
}

interface AddressSearchProps {
  onSelect: (match: AddressMatch) => void;
}

export default function AddressSearch({ onSelect }: AddressSearchProps) {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<AddressMatch[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [active, setActive] = useState(-1); // keyboard-highlighted result
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqSeq = useRef(0); // ignore out-of-order responses
  const boxRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const LIST_ID = "address-results";

  useEffect(() => {
    if (query.trim().length < 3) {
      setMatches([]);
      setOpen(false);
      setActive(-1);
      setError(false);
      return;
    }
    if (debounce.current) clearTimeout(debounce.current);
    const ac = new AbortController();
    debounce.current = setTimeout(async () => {
      const seq = ++reqSeq.current;
      setLoading(true);
      setError(false);
      try {
        const res = await fetch(
          `/api/address-search?q=${encodeURIComponent(query.trim())}`,
          { signal: ac.signal },
        );
        const data = await res.json();
        if (seq !== reqSeq.current) return; // a newer query already fired
        setMatches(data.matches ?? []);
        setError(Boolean(data.error));
        setActive(-1);
        setOpen(true);
      } catch {
        if (ac.signal.aborted || seq !== reqSeq.current) return;
        setMatches([]);
        setError(true);
        setOpen(true);
      } finally {
        if (seq === reqSeq.current) setLoading(false);
      }
    }, 300);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
      ac.abort();
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

  // Keep the keyboard-highlighted row scrolled into view.
  useEffect(() => {
    if (active < 0 || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${active}"]`);
    (el as HTMLElement | null)?.scrollIntoView?.({ block: "nearest" });
  }, [active]);

  function select(m: AddressMatch) {
    onSelect(m);
    setQuery(m.address);
    setOpen(false);
    setActive(-1);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
      return;
    }
    if (!open || matches.length === 0) {
      if (e.key === "ArrowDown" && matches.length) setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? matches.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      select(matches[active >= 0 ? active : 0]);
    }
  }

  return (
    <div ref={boxRef} className="relative w-full">
      {/* Search icon — Apple Maps style */}
      <svg
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        type="search"
        inputMode="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => matches.length && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search an address or block…"
        aria-label="Search an address"
        role="combobox"
        aria-expanded={open}
        aria-controls={LIST_ID}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `addr-opt-${active}` : undefined}
        autoComplete="off"
        className="glass w-full rounded-full py-3 pl-10 pr-4 text-base font-medium text-content placeholder:font-normal placeholder:text-content-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-0 [&:focus]:bg-[rgb(var(--glass)/0.92)]"
      />
      {open && (
        <ul
          ref={listRef}
          id={LIST_ID}
          role="listbox"
          aria-label="Address results"
          className="glass-strong animate-pop-in themed-scroll absolute z-20 max-h-[min(20rem,40dvh)] w-full overflow-auto rounded-2xl p-1
                     bottom-full mb-2 [transform-origin:bottom]
                     sm:bottom-auto sm:top-full sm:mb-0 sm:mt-2 sm:[transform-origin:top]"
        >
          {loading && (
            <li className="px-4 py-3 text-sm text-content-muted">Searching…</li>
          )}
          {!loading && error && (
            <li className="px-4 py-3 text-sm text-content-muted">
              Couldn&apos;t reach address search. Check your connection and try
              again.
            </li>
          )}
          {!loading && !error && matches.length === 0 && (
            <li className="px-4 py-3 text-sm text-content-muted">
              No matches. Try a street and number, e.g. “20 W 34th St”.
            </li>
          )}
          {matches.map((m, i) => (
            <li key={`${m.address}-${m.latitude}-${m.longitude}`}>
              <button
                type="button"
                id={`addr-opt-${i}`}
                data-idx={i}
                role="option"
                aria-selected={i === active}
                onClick={() => select(m)}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors focus:outline-none ${
                  i === active ? "bg-accent/15" : "hover:bg-content/5"
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-content">
                    {m.address}
                  </span>
                  {m.borough && (
                    <span className="block truncate text-xs capitalize text-content-muted">
                      {m.borough.toLowerCase()}
                    </span>
                  )}
                </span>
                {/* Location pin — signals "fly here" */}
                <svg
                  className="shrink-0 text-content-muted"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
