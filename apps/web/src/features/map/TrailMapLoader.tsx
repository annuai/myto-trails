"use client";

import dynamic from "next/dynamic";
import type { MapPoint } from "./geojson";

// The map library is large, so it loads only when the map view is opened.
const TrailMap = dynamic(() => import("./TrailMap").then((m) => m.TrailMap), {
  ssr: false,
  loading: () => <p className="border border-border p-6 text-muted">Loading map…</p>,
});

export function TrailMapLoader({ points }: { points: MapPoint[] }) {
  return <TrailMap points={points} />;
}
