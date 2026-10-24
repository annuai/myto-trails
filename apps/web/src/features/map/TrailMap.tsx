"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toFeatureCollection, type MapPoint, type MarkerShape } from "./geojson";

const DEMO_STYLE = "https://demotiles.maplibre.org/style.json";
const INDIA_CENTER: [number, number] = [78.9, 22.5];

type Status = "loading" | "ready" | "failed";
type Selected = { slug: string; name: string; place: string; access: string };

function cssVar(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

/** Draws a marker for each access shape: the shape, not the colour, carries the meaning. */
function drawMarker(shape: MarkerShape, color: string): ImageData {
  const size = 28;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.lineWidth = 3;
  ctx.strokeStyle = "white";
  ctx.fillStyle = color;
  ctx.beginPath();
  if (shape === "triangle") {
    ctx.moveTo(14, 3);
    ctx.lineTo(25, 24);
    ctx.lineTo(3, 24);
    ctx.closePath();
  } else if (shape === "square") {
    ctx.rect(5, 5, 18, 18);
  } else {
    ctx.arc(14, 14, 9, 0, Math.PI * 2);
  }
  if (shape === "open-circle") {
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();
  } else {
    ctx.stroke();
    ctx.fill();
  }
  return ctx.getImageData(0, 0, size, size);
}

export function TrailMap({ points, styleUrl = process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? DEMO_STYLE }: { points: MapPoint[]; styleUrl?: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [selected, setSelected] = useState<Selected | null>(null);
  const collection = toFeatureCollection(points);
  const empty = collection.features.length === 0;

  useEffect(() => {
    if (empty || !container.current) return;
    let map: import("maplibre-gl").Map | undefined;
    let cancelled = false;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    (async () => {
      try {
        const maplibregl = await import("maplibre-gl");
        maplibregl.setWorkerUrl("/vendor/maplibre/maplibre-gl-worker.mjs");
        if (cancelled || !container.current) return;
        const m = new maplibregl.Map({ container: container.current, style: styleUrl, center: INDIA_CENTER, zoom: 3.5, attributionControl: { compact: true } });
        map = m;
        m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
        m.on("error", (e) => {
          // A style or tile failure before the map is usable means we fall back to the list.
          if (!m.isStyleLoaded()) setStatus("failed");
          console.warn("Map error", e.error?.message);
        });
        m.on("load", () => {
          try {
          const color = cssVar("--color-accent", "royalblue");
          for (const shape of ["circle", "triangle", "square", "open-circle"] as const) {
            m.addImage(`marker-${shape}`, drawMarker(shape, color), { pixelRatio: 2 });
          }
          m.addSource("trails", { type: "geojson", data: collection, cluster: true, clusterRadius: 40, clusterMaxZoom: 11 });
          m.addLayer({
            id: "clusters", type: "circle", source: "trails", filter: ["has", "point_count"],
            paint: { "circle-color": color, "circle-opacity": 0.85, "circle-radius": ["step", ["get", "point_count"], 14, 10, 18, 50, 24], "circle-stroke-width": 2, "circle-stroke-color": "white" },
          });
          m.addLayer({
            id: "cluster-count", type: "symbol", source: "trails", filter: ["has", "point_count"],
            layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": ["Open Sans Semibold"], "text-size": 12 },
            paint: { "text-color": "white" },
          });
          m.addLayer({
            id: "trail-points", type: "symbol", source: "trails", filter: ["!", ["has", "point_count"]],
            layout: { "icon-image": ["concat", "marker-", ["get", "shape"]], "icon-allow-overlap": true, "icon-size": 1 },
          });
          m.on("click", "clusters", async (e) => {
            const f = e.features?.[0];
            if (!f) return;
            const zoom = await (m.getSource("trails") as import("maplibre-gl").GeoJSONSource).getClusterExpansionZoom(f.properties.cluster_id);
            m.easeTo({ center: (f.geometry as unknown as { coordinates: [number, number] }).coordinates, zoom, animate: !reduceMotion });
          });
          m.on("click", "trail-points", (e) => {
            const p = e.features?.[0]?.properties as Selected | undefined;
            if (p) setSelected({ slug: p.slug, name: p.name, place: p.place, access: p.access });
          });
          for (const layer of ["clusters", "trail-points"]) {
            m.on("mouseenter", layer, () => { m.getCanvas().style.cursor = "pointer"; });
            m.on("mouseleave", layer, () => { m.getCanvas().style.cursor = ""; });
          }
          const coords = collection.features.map((f) => f.geometry.coordinates);
          if (coords.length === 1) {
            m.jumpTo({ center: coords[0]!, zoom: 9 });
          } else {
            const b = new maplibregl.LngLatBounds(coords[0]!, coords[0]!);
            for (const c of coords) b.extend(c);
            m.fitBounds(b, { padding: 48, maxZoom: 10, animate: !reduceMotion });
          }
          setStatus("ready");
          } catch (err) {
            console.error("Map setup failed", err);
            setStatus("failed");
          }
        });
      } catch {
        if (!cancelled) setStatus("failed");
      }
    })();

    // If the map has not become usable after 20 seconds, fall back to the list.
    const timeout = setTimeout(() => setStatus((s) => (s === "loading" ? "failed" : s)), 20_000);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      map?.remove();
    };
    // The collection is derived from `points`; re-create the map only when the data or style changes.
  }, [empty, styleUrl, points]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section role="region" aria-label="Map of trails" className="flex flex-col gap-3">
      <Link href="#results" className="sr-only focus:not-sr-only focus:inline-flex focus:min-h-11 focus:items-center focus:underline">
        Skip the map and go to the list
      </Link>
      {empty ? (
        <p className="border border-border p-6 text-muted">No trails with a public location match these filters.</p>
      ) : status === "failed" ? (
        <p className="border border-border p-6 text-muted">The map couldn&apos;t load. The list below has the same trails.</p>
      ) : (
        <div className="relative h-[60vh] min-h-80 w-full border border-border">
          <div ref={container} className="absolute inset-0" />
          {status === "loading" ? <p className="absolute left-3 top-3 bg-surface px-2 py-1 text-sm">Loading map…</p> : null}
        </div>
      )}
      {!empty && status !== "failed" ? (
        <p className="text-xs text-muted">{process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ?? "Development map tiles. Set NEXT_PUBLIC_MAP_STYLE_URL and NEXT_PUBLIC_MAP_ATTRIBUTION for production."}</p>
      ) : null}
      {selected ? (
        <div role="status" className="border-l-4 border-accent py-1 pl-4">
          <p className="font-medium">{selected.name}</p>
          <p className="text-sm text-muted">{selected.place} · {selected.access}</p>
          <Link href={`/trails/${selected.slug}`} className="inline-flex min-h-11 items-center underline underline-offset-4">Open trail</Link>
        </div>
      ) : null}
    </section>
  );
}
