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
} from "@/lib/map";
import type { ObservationFeature } from "@/lib/types";
import { buildPopupHTML } from "./ObservationPopup";

const SOURCE_ID = "observations";

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

export default function Map({
  filters,
  flyTarget,
  onReady,
  onLoadingChange,
}: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const filtersRef = useRef(filters);
  const fetchSeq = useRef(0);

  filtersRef.current = filters;

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
      src.setData(geojson);
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
      style: basemapStyle(),
      center: NYC_CENTER,
      zoom: NYC_ZOOM,
      maxBounds: [
        [NYC_BOUNDS[0][0] - 0.5, NYC_BOUNDS[0][1] - 0.5],
        [NYC_BOUNDS[1][0] + 0.5, NYC_BOUNDS[1][1] + 0.5],
      ],
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    map.on("load", () => {
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterMaxZoom: 13,
        clusterRadius: 50,
      });

      // Clusters.
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#F5C518",
          "circle-stroke-color": "#1a1a1a",
          "circle-stroke-width": 1.5,
          "circle-radius": [
            "step",
            ["get", "point_count"],
            14,
            25,
            18,
            100,
            24,
            500,
            32,
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
          "text-size": 12,
        },
        paint: { "text-color": "#1a1a1a" },
      });

      // Individual observations, colored by category.
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
            3,
            16,
            7,
          ],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1,
          "circle-opacity": 0.85,
        },
      });

      // Interactions.
      map.on("click", "clusters", (e) => {
        const feats = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
        const clusterId = feats[0]?.properties?.cluster_id;
        const src = map.getSource(SOURCE_ID) as GeoJSONSource;
        if (clusterId == null || !src) return;
        src.getClusterExpansionZoom(clusterId).then((zoom) => {
          const geom = feats[0].geometry as GeoJSON.Point;
          map.easeTo({
            center: geom.coordinates as [number, number],
            zoom,
          });
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
        popupRef.current = new maplibregl.Popup({ closeButton: true, offset: 10 })
          .setLngLat(coords)
          .setHTML(buildPopupHTML(feature))
          .addTo(map);
      });

      const setPointer = (cursor: string) => () => {
        map.getCanvas().style.cursor = cursor;
      };
      map.on("mouseenter", "clusters", setPointer("pointer"));
      map.on("mouseleave", "clusters", setPointer(""));
      map.on("mouseenter", "unclustered-point", setPointer("pointer"));
      map.on("mouseleave", "unclustered-point", setPointer(""));

      map.on("moveend", refresh);

      onReady?.(map);
      refresh();
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch when filters change.
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.since, filters.categories, filters.boroughs]);

  // Fly to a search target + drop a highlight.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyTarget) return;
    map.flyTo({ center: [flyTarget.lng, flyTarget.lat], zoom: 16, speed: 1.2 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyTarget?.nonce]);

  return <div ref={containerRef} className="absolute inset-0 h-full w-full" />;
}
