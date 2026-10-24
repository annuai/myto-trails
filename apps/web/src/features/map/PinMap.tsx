"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import { OSM_ATTRIBUTION, OSM_STYLE } from "./osm-style";

/** One point on a map: where a trail starts (or its approximate position for a sensitive trail). */
export function PinMap({ lon, lat, label, styleUrl = process.env.NEXT_PUBLIC_MAP_STYLE_URL }: { lon: number; lat: number; label: string; styleUrl?: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");

  useEffect(() => {
    if (!container.current) return;
    let map: import("maplibre-gl").Map | undefined;
    let cancelled = false;
    (async () => {
      try {
        const maplibregl = await import("maplibre-gl");
        maplibregl.setWorkerUrl("/vendor/maplibre/maplibre-gl-worker.mjs");
        if (cancelled || !container.current) return;
        const m = new maplibregl.Map({ container: container.current, style: styleUrl || OSM_STYLE, center: [lon, lat], zoom: 13, attributionControl: { compact: true } });
        map = m;
        m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
        const pin = document.createElement("div");
        pin.setAttribute("role", "img");
        pin.setAttribute("aria-label", label);
        pin.className = "size-5 rounded-full border-[3px] border-white bg-accent shadow-lg";
        new maplibregl.Marker({ element: pin }).setLngLat([lon, lat]).addTo(m);
        m.on("load", () => setStatus("ready"));
        m.on("error", () => {
          if (!m.isStyleLoaded()) setStatus("failed");
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
  }, [lon, lat, label, styleUrl]);

  if (status === "failed") return <p className="rounded-3xl bg-card-cream p-6 text-muted">The map couldn&apos;t load. The coordinates and links above still work.</p>;
  return (
    <div className="flex flex-col gap-2">
      <div role="region" aria-label={`Map showing ${label}`} className="relative h-72 w-full overflow-hidden rounded-3xl border border-border">
        <div ref={container} className="h-full w-full" />
        {status === "loading" ? <p className="absolute left-3 top-3 rounded-lg bg-surface px-2 py-1 text-sm">Loading map…</p> : null}
      </div>
      <p className="text-xs text-muted">{process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ?? OSM_ATTRIBUTION}</p>
    </div>
  );
}
