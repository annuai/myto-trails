import type { AccessClass } from "@moto-trails/domain";
import { statusFor } from "@/ui/StatusBadge/status-map";

export type MapPoint = {
  slug: string;
  name: string;
  place: string;
  lon: number | null;
  lat: number | null;
  accessClass: AccessClass;
};

export type MarkerShape = "circle" | "triangle" | "square" | "open-circle";

/** The marker shape carries the access class, so it never relies on colour. */
export function markerShape(access: AccessClass): MarkerShape {
  switch (access) {
    case "public":
      return "circle";
    case "permission_required":
      return "triangle";
    case "restricted":
    case "private_no_access":
      return "square";
    case "unknown":
      return "open-circle";
  }
}

export type TrailFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: { slug: string; name: string; place: string; shape: MarkerShape; access: string };
};

export function toFeatureCollection(points: MapPoint[]): { type: "FeatureCollection"; features: TrailFeature[] } {
  const features: TrailFeature[] = [];
  for (const p of points) {
    if (p.lon === null || p.lat === null || !Number.isFinite(p.lon) || !Number.isFinite(p.lat)) continue;
    if (Math.abs(p.lat) > 90 || Math.abs(p.lon) > 180) continue;
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.lon, p.lat] },
      properties: { slug: p.slug, name: p.name, place: p.place, shape: markerShape(p.accessClass), access: statusFor("access", p.accessClass).label },
    });
  }
  return { type: "FeatureCollection", features };
}
