"use client";

import type maplibregl from "maplibre-gl";
import { NYC_CENTER, NYC_ZOOM } from "@/lib/map";

interface MapControlsProps {
  map: maplibregl.Map | null;
}

export default function MapControls({ map }: MapControlsProps) {
  const btn =
    "flex h-10 w-10 items-center justify-center bg-white text-ink shadow-md transition-colors hover:bg-cream focus:outline-none focus:ring-2 focus:ring-hotdog";

  return (
    <div className="absolute bottom-24 right-4 z-10 flex flex-col gap-px overflow-hidden rounded-lg sm:bottom-8">
      <button
        type="button"
        aria-label="Zoom in"
        className={`${btn} rounded-t-lg`}
        onClick={() => map?.zoomIn()}
      >
        <span className="text-xl leading-none">+</span>
      </button>
      <button
        type="button"
        aria-label="Zoom out"
        className={btn}
        onClick={() => map?.zoomOut()}
      >
        <span className="text-xl leading-none">−</span>
      </button>
      <button
        type="button"
        aria-label="Recenter to NYC"
        className={`${btn} rounded-b-lg text-xs font-semibold`}
        onClick={() =>
          map?.flyTo({ center: NYC_CENTER, zoom: NYC_ZOOM, speed: 1.2 })
        }
        title="Recenter to NYC"
      >
        NYC
      </button>
    </div>
  );
}
