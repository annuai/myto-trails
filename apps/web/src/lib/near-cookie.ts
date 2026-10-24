import type { LatLon } from "@moto-trails/domain";

/**
 * "Near me" keeps the rider's position out of URLs: the browser stores a point rounded to about 1 km in a
 * short-lived cookie that only the trails pages read. It is never written to the database or to logs.
 */
export const NEAR_COOKIE = "mt_near";
export const NEAR_COOKIE_MAX_AGE = 1800;

export function roundPoint(p: LatLon): LatLon {
  return { lat: Math.round(p.lat * 100) / 100, lon: Math.round(p.lon * 100) / 100 };
}

export function serializeNearCookie(p: LatLon): string {
  const r = roundPoint(p);
  return `${r.lat},${r.lon}`;
}

const COORD = /^-?\d{1,3}(\.\d{1,6})?$/;

export function parseNearCookie(value: string | undefined): LatLon | undefined {
  if (!value) return undefined;
  const parts = decodeURIComponent(value).split(",");
  if (parts.length !== 2 || !parts.every((p) => COORD.test(p))) return undefined;
  const lat = Number(parts[0]);
  const lon = Number(parts[1]);
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return undefined;
  return { lat, lon };
}
