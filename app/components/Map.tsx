"use client";

import { useEffect, useRef } from "react";
import maplibregl, { type GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  NYC_CENTER,
  NYC_ZOOM,
  NYC_BOUNDS,
  basemapStyle,
  categoryColorExpression,
  clusterColorExpression,
  type Resolved,
} from "@/lib/map";
import type { ObservationFeature } from "@/lib/types";
import { buildPopupHTML } from "./ObservationPopup";
import { useTheme } from "./ThemeProvider";

const SOURCE_ID = "observations";
const HIGHLIGHT_SOURCE_ID = "fly-highlight";
const HIGHLIGHT_LAYER_ID = "fly-highlight-circle";

// Every custom layer/source we add — used to tear down cleanly before re-adding
// after a basemap (theme) swap, so addDataLayers stays idempotent.
const DATA_LAYER_IDS = [
  "point-glow",
  "unclustered-point",
  "cluster-glow",
  "clusters",
  "cluster-count",
  HIGHLIGHT_LAYER_ID,
];

export interface MapFilters {
  since: string | null;
  categories: string[]; // empty = all
  boroughs: string[]; // empty = all
}

export interface FlyTarget {
  lng: number;
  lat: number;
  /** A token that changes each request so repeated flies to the same point fire. */
  nonce: number;
}

interface MapProps {
  filters: MapFilters;
  flyTarget: FlyTarget | null;
  onReady?: (map: maplibregl.Map) => void;
  onLoadingChange?: (loading: boolean) => void;
}

/**
 * Add the observation source + cluster/point layers and the search-highlight
 * layer. Called on first load AND after every basemap (theme) swap, since
 * setStyle() wipes all custom sources/layers. Paint that depends on the theme
 * (adaptive strokes) is keyed off `resolved`.
 */
function addDataLayers(map: maplibregl.Map, resolved: Resolved) {
  const dark = resolved === "dark";
  const heat = clusterColorExpression() as never;

  // Idempotent: clear any prior instances first so this is safe to call after a
  // style swap (or twice) without throwing "source already exists".
  for (const id of DATA_LAYER_IDS) {
    if (map.getLayer(id)) map.removeLayer(id);
  }
  for (const id of [SOURCE_ID, HIGHLIGHT_SOURCE_ID]) {
    if (map.getSource(id)) map.removeSource(id);
  }

  map.addSource(SOURCE_ID, {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
    cluster: true,
    clusterMaxZoom: 13,
    clusterRadius: 50,
    generateId: true, // stable ids so hover feature-state works
  });

  // Helper: pick a value when this feature is hovered, else a base value.
  const onHover = (hovered: unknown, base: unknown) =>
    ["case", ["boolean", ["feature-state", "hover"], false], hovered, base];

  // --- Individual observations (drawn beneath clusters) ---------------------

  // Soft category-colored glow so each dot reads like a city light. Brightens
  // on hover.
  map.addLayer({
    id: "point-glow",
    type: "circle",
    source: SOURCE_ID,
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-color": categoryColorExpression() as never,
      "circle-blur": 1,
      "circle-opacity": onHover(dark ? 0.85 : 0.4, dark ? 0.5 : 0.2) as never,
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        11,
        onHover(9, 6),
        16,
        onHover(18, 12),
      ] as never,
    },
  });

  // The dot body: a clean category-colored chip with a thin bright rim. No
  // inner bead — just a crisp glassy disc that grows a touch on hover.
  map.addLayer({
    id: "unclustered-point",
    type: "circle",
    source: SOURCE_ID,
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-color": categoryColorExpression() as never,
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        11,
        onHover(5.5, 4),
        16,
        onHover(11, 8.5),
      ] as never,
      "circle-stroke-color": "#FFFFFF",
      "circle-stroke-width": onHover(2.5, 1.5) as never,
      "circle-opacity": 0.96,
      "circle-stroke-opacity": dark ? 0.9 : 0.95,
    },
  });

  // --- Clusters (drawn on top): translucent glass chips with a count ---------

  // Heat-ramped bloom behind the chip — neon on dark, warm halo on light.
  map.addLayer({
    id: "cluster-glow",
    type: "circle",
    source: SOURCE_ID,
    filter: ["has", "point_count"],
    paint: {
      "circle-color": heat,
      "circle-blur": 1,
      "circle-opacity": onHover(dark ? 0.8 : 0.45, dark ? 0.55 : 0.3) as never,
      "circle-radius": [
        "step",
        ["get", "point_count"],
        28,
        25,
        34,
        100,
        42,
        500,
        54,
      ],
    },
  });

  // The glass chip: heat-tinted but translucent so the map shows through, with
  // a bright rim light. Reads as a frosted glass token, not a solid disc.
  map.addLayer({
    id: "clusters",
    type: "circle",
    source: SOURCE_ID,
    filter: ["has", "point_count"],
    paint: {
      "circle-color": heat,
      "circle-opacity": onHover(0.78, 0.62) as never,
      "circle-stroke-color": "#FFFFFF",
      "circle-stroke-opacity": dark ? 0.95 : 0.98,
      "circle-stroke-width": onHover(3, 2) as never,
      "circle-radius": [
        "step",
        ["get", "point_count"],
        16,
        25,
        20,
        100,
        26,
        500,
        34,
      ],
    },
  });

  map.addLayer({
    id: "cluster-count",
    type: "symbol",
    source: SOURCE_ID,
    filter: ["has", "point_count"],
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      // OpenFreeMap + MapTiler both host Noto Sans; MapLibre's default font
      // stack (Open Sans / Arial Unicode MS) 404s on these tile servers.
      "text-font": ["Noto Sans Regular"],
      "text-size": 13,
    },
    // Heat chips stay warm/light in both themes, so dark text always reads.
    paint: {
      "text-color": "#1A1A1A",
      "text-halo-color": "rgba(255,255,255,0.55)",
      "text-halo-width": 0.8,
    },
  });

  // Transient highlight ring for the search fly-to target.
  map.addSource(HIGHLIGHT_SOURCE_ID, {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });
  map.addLayer({
    id: HIGHLIGHT_LAYER_ID,
    type: "circle",
    source: HIGHLIGHT_SOURCE_ID,
    paint: {
      "circle-radius": [
        "interpolate",
        ["exponential", 2],
        ["zoom"],
        12,
        6,
        16,
        15,
        20,
        48,
      ],
      "circle-color": "#F5C518",
      "circle-opacity": 0.25,
      "circle-stroke-color": "#F5C518",
      "circle-stroke-width": 2,
      "circle-stroke-opacity": 0.9,
    },
  });
}

export default function Map({
  filters,
  flyTarget,
  onReady,
  onLoadingChange,
}: MapProps) {
  const { resolved } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const filtersRef = useRef(filters);
  const resolvedRef = useRef(resolved);
  const fetchSeq = useRef(0);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  filtersRef.current = filters;
  resolvedRef.current = resolved;

  // Fetch observations for the current viewport + filters, update the source.
  async function refresh() {
    const map = mapRef.current;
    if (!map) return;
    const src = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    if (!src) return;

    const b = map.getBounds();
    const bbox = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].join(",");
    const f = filtersRef.current;

    const params = new URLSearchParams({ bbox });
    if (f.since) params.set("since", f.since);
    if (f.categories.length) params.set("categories", f.categories.join(","));
    if (f.boroughs.length) params.set("boroughs", f.boroughs.join(","));

    const seq = ++fetchSeq.current;
    onLoadingChange?.(true);
    try {
      const res = await fetch(`/api/observations?${params.toString()}`);
      const geojson = await res.json();
      // Drop stale responses (a newer fetch already fired).
      if (seq !== fetchSeq.current) return;
      const liveSrc = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
      liveSrc?.setData(geojson);
    } catch {
      // Defensive: leave the existing data in place on error.
    } finally {
      if (seq === fetchSeq.current) onLoadingChange?.(false);
    }
  }

  // Initialize the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: basemapStyle(resolvedRef.current),
      center: NYC_CENTER,
      zoom: NYC_ZOOM,
      maxBounds: [
        [NYC_BOUNDS[0][0] - 0.5, NYC_BOUNDS[0][1] - 0.5],
        [NYC_BOUNDS[1][0] + 0.5, NYC_BOUNDS[1][1] + 0.5],
      ],
      // Attribution is relocated into the About dialog (kept off the map for a
      // clean canvas). OSM/OpenFreeMap credit lives in <AboutContent>.
      attributionControl: false,
    });
    mapRef.current = map;

    map.on("load", () => {
      addDataLayers(map, resolvedRef.current);

      // Interactions — bound once. Delegated layer listeners survive setStyle,
      // so they keep working after a theme swap re-adds the same layer ids.
      map.on("click", "clusters", (e) => {
        const feats = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
        const clusterId = feats[0]?.properties?.cluster_id;
        const src = map.getSource(SOURCE_ID) as GeoJSONSource;
        if (clusterId == null || !src) return;
        src.getClusterExpansionZoom(clusterId).then((zoom) => {
          const geom = feats[0].geometry as GeoJSON.Point;
          map.easeTo({ center: geom.coordinates as [number, number], zoom });
        });
      });

      map.on("click", "unclustered-point", (e) => {
        const feature = e.features?.[0] as unknown as ObservationFeature;
        if (!feature) return;
        const coords = (feature.geometry.coordinates as [number, number]).slice() as [
          number,
          number,
        ];
        popupRef.current?.remove();
        popupRef.current = new maplibregl.Popup({
          closeButton: true,
          offset: 14,
          className: "rm-popup",
          maxWidth: "min(290px, calc(100vw - 28px))",
        })
          .setLngLat(coords)
          .setHTML(buildPopupHTML(feature))
          .addTo(map);
      });

      // Hover state: each layer lights up + grows the feature under the cursor
      // (driven by ["feature-state","hover"] in the paint above).
      const hovered: { layer: string; id: string | number }[] = [];
      const setHover = (layer: string) => (e: maplibregl.MapLayerMouseEvent) => {
        map.getCanvas().style.cursor = "pointer";
        const id = e.features?.[0]?.id;
        if (id == null) return;
        const top = hovered[hovered.length - 1];
        if (top && top.layer === layer && top.id === id) return;
        if (top) map.setFeatureState({ source: SOURCE_ID, id: top.id }, { hover: false });
        hovered.push({ layer, id });
        map.setFeatureState({ source: SOURCE_ID, id }, { hover: true });
      };
      const clearHover = () => () => {
        map.getCanvas().style.cursor = "";
        const top = hovered.pop();
        if (top) map.setFeatureState({ source: SOURCE_ID, id: top.id }, { hover: false });
      };
      map.on("mousemove", "clusters", setHover("clusters"));
      map.on("mouseleave", "clusters", clearHover());
      map.on("mousemove", "unclustered-point", setHover("unclustered-point"));
      map.on("mouseleave", "unclustered-point", clearHover());

      map.on("moveend", refresh);

      // Dev-only: expose the map for local QA/debugging tools. Never in prod.
      if (process.env.NODE_ENV !== "production") {
        (window as unknown as { __ratmapMap?: maplibregl.Map }).__ratmapMap = map;
      }

      onReady?.(map);
      refresh();
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Escape closes an open observation popup (map click already closes it).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Swap the basemap when the theme changes. setStyle preserves the camera but
  // wipes custom sources/layers, so we re-add them after the new style loads.
  // `appliedResolved` guards against the very first render + React StrictMode's
  // double-invoke (only swap on a real theme change).
  const appliedResolved = useRef<Resolved | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (appliedResolved.current === null) {
      appliedResolved.current = resolved; // init's "load" handler adds layers
      return;
    }
    if (appliedResolved.current === resolved) return;
    appliedResolved.current = resolved;

    map.setStyle(basemapStyle(resolved));
    // MapLibre has no reliable "new style ready" event: `styledata` fires while
    // the OLD style (with our layers) still lingers, and once it's gone the
    // event stream goes quiet before isStyleLoaded() flips true — so an
    // event-driven re-add races and loses the markers. Poll instead: re-add the
    // instant the new style is loaded AND our source has been wiped.
    let cancelled = false;
    const tryReadd = () => {
      if (cancelled || !mapRef.current) return;
      if (map.isStyleLoaded() && !map.getSource(SOURCE_ID)) {
        addDataLayers(map, resolved);
        refresh();
        return;
      }
      setTimeout(tryReadd, 50); // ~retry until the swap settles
    };
    tryReadd();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved]);

  // Refetch when filters change.
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.since, filters.categories, filters.boroughs]);

  // Fly to a search target + drop a transient highlight ring at the target.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyTarget) return;

    map.flyTo({ center: [flyTarget.lng, flyTarget.lat], zoom: 16, speed: 1.2 });

    const setHighlight = (features: GeoJSON.Feature[]) => {
      const src = map.getSource(HIGHLIGHT_SOURCE_ID) as GeoJSONSource | undefined;
      if (src) src.setData({ type: "FeatureCollection", features });
    };

    const clear = () => {
      setHighlight([]);
      if (highlightTimer.current) {
        clearTimeout(highlightTimer.current);
        highlightTimer.current = null;
      }
      map.off("moveend", clear);
    };

    const drop = () => {
      setHighlight([
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [flyTarget.lng, flyTarget.lat] },
          properties: {},
        },
      ]);
      // Clear after ~5s, or on the next manual pan/zoom (whichever comes first).
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
      highlightTimer.current = setTimeout(clear, 5000);
      map.once("moveend", () => map.once("moveend", clear));
    };

    // Source may not exist yet if the map is still loading.
    if (map.getSource(HIGHLIGHT_SOURCE_ID)) drop();
    else map.once("load", drop);

    return () => {
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyTarget?.nonce]);

  return <div ref={containerRef} className="absolute inset-0 h-full w-full" />;
}
