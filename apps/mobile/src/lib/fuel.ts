import type { LatLng } from './geo';
import { nearestOnLine } from './routeFollow';

export type Bbox = { south: number; west: number; north: number; east: number };
export type FuelStation = { name: string; lat: number; lng: number };
export type FuelStop = FuelStation & { /** Kilometres from the start of the route. */ km: number };
export type FuelGaps = { totalKm: number; stops: FuelStop[]; longestGapKm: number; /** Where the longest stretch without fuel begins and ends, in km along the route. */ longestGap: { fromKm: number; toKm: number } };

/** Stations further than this from the route are not on the way. */
export const MAX_OFF_ROUTE_M = 1500;

/** The box around a route, widened by `padM` so a station just off the line is found. Null for an empty route. */
export function bboxOf(line: LatLng[], padM: number = MAX_OFF_ROUTE_M): Bbox | null {
  if (!line.length) return null;
  const lats = line.map((p) => p.lat), lngs = line.map((p) => p.lng);
  const south = Math.min(...lats), north = Math.max(...lats);
  const dLat = padM / 110_540, dLng = padM / (111_320 * Math.cos(((south + north) / 2) * (Math.PI / 180)));
  return { south: south - dLat, north: north + dLat, west: Math.min(...lngs) - dLng, east: Math.max(...lngs) + dLng };
}

/** An Overpass QL query for every fuel station in the box (points and building outlines). */
export const buildOverpassQuery = (b: Bbox): string => {
  const box = [b.south, b.west, b.north, b.east].map((n) => n.toFixed(5)).join(',');
  return `[out:json][timeout:25];(node["amenity"="fuel"](${box});way["amenity"="fuel"](${box}););out center;`;
};

type Element = { type?: string; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> };

/** Stations from an Overpass answer. Anything without a position is skipped; a missing name is called "Fuel". */
export function parseOverpass(json: unknown): FuelStation[] {
  const elements = (json as { elements?: Element[] } | null)?.elements;
  if (!Array.isArray(elements)) return [];
  const out: FuelStation[] = [];
  for (const e of elements) {
    const lat = e.lat ?? e.center?.lat, lng = e.lon ?? e.center?.lon;
    if (typeof lat !== 'number' || typeof lng !== 'number') continue;
    out.push({ name: e.tags?.name || e.tags?.brand || 'Fuel', lat, lng });
  }
  return out;
}

/** Fuel stops along a route and the longest stretch between two of them (the start and end count as stops). */
export function fuelGaps(line: LatLng[], stations: FuelStation[], maxOffM: number = MAX_OFF_ROUTE_M): FuelGaps {
  const totalKm = (nearestOnLine(line, line[line.length - 1] ?? { lat: 0, lng: 0 })?.alongM ?? 0) / 1000;
  const stops: FuelStop[] = [];
  for (const s of stations) {
    const near = nearestOnLine(line, s);
    if (near && near.distM <= maxOffM) stops.push({ ...s, km: near.alongM / 1000 });
  }
  stops.sort((a, b) => a.km - b.km);
  const marks = [0, ...stops.map((s) => s.km), totalKm];
  let longest = { fromKm: 0, toKm: 0 };
  for (let i = 1; i < marks.length; i++) if (marks[i] - marks[i - 1] > longest.toKm - longest.fromKm) longest = { fromKm: marks[i - 1], toKm: marks[i] };
  return { totalKm, stops, longestGapKm: longest.toKm - longest.fromKm, longestGap: longest };
}
