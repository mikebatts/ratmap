"use client";

import { useEffect, useRef } from "react";
import AboutContent from "./AboutContent";

interface AboutModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * About shown as a liquid-glass card floating over the live map (the map stays
 * visible, gently dimmed + blurred behind). Closes on Escape, backdrop click,
 * or the close button. Focus moves into the dialog on open.
 */
export default function AboutModal({ open, onClose }: AboutModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="animate-fade-in absolute inset-0 z-40 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="About ratmap.nyc"
    >
      {/* Backdrop — dims + blurs the map so the card reads, map still visible. */}
      <button
        type="button"
        aria-label="Close about"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/30 backdrop-blur-[2px]"
      />

      {/* The glass card. */}
      <div className="glass-strong animate-pop-in relative w-full max-w-lg rounded-3xl p-8 [transform-origin:center] sm:p-10">
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-2xl leading-none text-content-muted transition-all duration-200 hover:rotate-90 hover:bg-content/5 hover:text-content focus:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-90"
        >
          ×
        </button>
        <AboutContent />
      </div>
    </div>
  );
}
