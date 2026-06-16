"use client";

import type maplibregl from "maplibre-gl";
import { NYC_CENTER, NYC_ZOOM } from "@/lib/map";

interface MapControlsProps {
  map: maplibregl.Map | null;
}

export default function MapControls({ map }: MapControlsProps) {
  const btn =
    "flex h-11 w-11 items-center justify-center text-content transition-[background-color,transform] duration-200 hover:bg-content/10 active:scale-90 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent";

  return (
    <div className="glass animate-rise-in absolute right-4 z-10 flex flex-col divide-y divide-hairline overflow-hidden rounded-2xl bottom-[calc(5.5rem+env(safe-area-inset-bottom))] sm:bottom-8">
      <button
        type="button"
        aria-label="Zoom in"
        className={btn}
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
        className={`${btn} text-xs font-semibold`}
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
