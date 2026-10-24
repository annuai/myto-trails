"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { OSM_ATTRIBUTION, OSM_STYLE } from "./osm-style";
import { useEffect, useRef, useState } from "react";


/** One trail's line on a map. The elevation table and statistics beside it carry the same information. */
export function RouteMap({ line, styleUrl = process.env.NEXT_PUBLIC_MAP_STYLE_URL }: { line: [number, number][]; styleUrl?: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    if (line.length < 2 || !container.current) return;
    let map: import("maplibre-gl").Map | undefined;
    let cancelled = false;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    (async () => {
      try {
        const maplibregl = await import("maplibre-gl");
        maplibregl.setWorkerUrl("/vendor/maplibre/maplibre-gl-worker.mjs");
        if (cancelled || !container.current) return;
        const m = new maplibregl.Map({ container: container.current, style: styleUrl || OSM_STYLE, center: line[0], zoom: 10, attributionControl: { compact: true } });
        map = m;
        m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
        m.on("error", (e) => {
          // Tile or style trouble is shown under the map so it can be reported, instead of leaving a silent blank.
          setProblem(e.error?.message?.slice(0, 160) ?? "The map reported an error.");
          if (!m.isStyleLoaded()) setStatus("failed");
        });
        m.on("load", () => {
          const color = getComputedStyle(document.documentElement).getPropertyValue("--color-accent").trim() || "royalblue";
          m.addSource("route", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: line } } });
          m.addLayer({ id: "route-casing", type: "line", source: "route", paint: { "line-color": "white", "line-width": 6 }, layout: { "line-cap": "round", "line-join": "round" } });
          m.addLayer({ id: "route-line", type: "line", source: "route", paint: { "line-color": color, "line-width": 3 }, layout: { "line-cap": "round", "line-join": "round" } });
          const b = new maplibregl.LngLatBounds(line[0]!, line[0]!);
          for (const c of line) b.extend(c);
          m.fitBounds(b, { padding: 32, animate: !reduceMotion, maxZoom: 14 });
          setStatus("ready");
        });
      } catch {
        if (!cancelled) setStatus("failed");
      }
    })();

    const timeout = setTimeout(() => setStatus((s) => (s === "loading" ? "failed" : s)), 20_000);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      map?.remove();
    };
  }, [line, styleUrl]);

  if (line.length < 2) return null;
  if (status === "failed") return <p className="border border-border p-6 text-muted">The map couldn&apos;t load. The numbers and elevation profile below are still correct.</p>;
  return (
    <div className="flex flex-col gap-2">
      <div role="region" aria-label="Map of the route" className="relative h-80 w-full border border-border">
        <div ref={container} className="h-full w-full" />
        {status === "loading" ? <p className="absolute left-3 top-3 bg-surface px-2 py-1 text-sm">Loading map…</p> : null}
      </div>
      <p className="text-xs text-muted">{process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ?? OSM_ATTRIBUTION}</p>
      {problem ? <p role="status" className="text-xs text-status-caution">Map note: {problem}</p> : null}
    </div>
  );
}
