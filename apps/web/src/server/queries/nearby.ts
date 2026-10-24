import type { Sql } from "postgres";
import { parseSearchParams } from "@/features/discovery/search-params";
import { withPublicRole } from "../db/client";
import { searchTrails, type SearchItem } from "./search.sql";

const BOUNDS = { minLat: 6, maxLat: 37, minLon: 68, maxLon: 98 };
export const NEARBY_COUNT = 6;
export const NEARBY_RADIUS_KM = 300;

/**
 * The trails closest to a visitor, with distance and travel estimate. The position is rounded to about a kilometre
 * before use and is never stored. Positions outside India return `outside` so the page can say so.
 */
export async function nearbyTrails(
  sql: Sql,
  point: { lat: unknown; lon: unknown },
  now: Date,
): Promise<{ ok: true; items: SearchItem[] } | { ok: false; reason: "invalid" | "outside" }> {
  const lat = typeof point.lat === "number" ? point.lat : NaN;
  const lon = typeof point.lon === "number" ? point.lon : NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return { ok: false, reason: "invalid" };
  if (lat < BOUNDS.minLat - 2 || lat > BOUNDS.maxLat + 2 || lon < BOUNDS.minLon - 2 || lon > BOUNDS.maxLon + 2) return { ok: false, reason: "outside" };
  const rounded = { lat: Math.round(lat * 100) / 100, lon: Math.round(lon * 100) / 100 };
  const params = parseSearchParams({ near: "me", sort: "nearest", radius: String(NEARBY_RADIUS_KM) });
  const result = await withPublicRole(sql, (tx) => searchTrails(tx, params, now, { point: rounded }));
  return { ok: true, items: result.items.slice(0, NEARBY_COUNT) };
}
