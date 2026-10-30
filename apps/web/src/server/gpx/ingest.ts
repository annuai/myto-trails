import type { TransactionSql } from "postgres";
import { analyzeTrack, type TrackAnalysis } from "./analyze";
import { parseGpx, type ParseError, type Waypoint } from "./parse";
import { writeGpx } from "./write";

export const PARSE_MESSAGES: Record<ParseError, string> = {
  doctype_not_allowed: "This file contains declarations that are not allowed in a GPX file, so it was refused for safety.",
  not_gpx: "This does not look like a GPX file.",
  no_track_points: "No track points were found. Export the recorded track (not just waypoints or a planned route).",
  invalid_coordinates: "The track has positions that are not on Earth, so the GPS data looks corrupt.",
  too_complex: "This file is too large or too deeply nested to process.",
};

export type Ingested = {
  analysis: TrackAnalysis;
  /** The full line without consecutive repeats. */
  points: { lat: number; lon: number; ele?: number }[];
  waypoints: Waypoint[];
  /** Our own plain GPX 1.1 rewrite of the track; this is what is kept for export. */
  cleanGpx: string;
};
export type IngestResult = ({ ok: true } & Ingested) | { ok: false; code: string; message: string };

/** Parses, validates and measures an untrusted GPX, and writes the sanitised copy. Pure: no storage, no database. */
export function ingestGpx(bytes: Uint8Array): IngestResult {
  const parsed = parseGpx(new TextDecoder().decode(bytes));
  if (!parsed.ok) return { ok: false, code: parsed.error, message: PARSE_MESSAGES[parsed.error] };
  const analyzed = analyzeTrack(parsed.tracks);
  if (!analyzed.ok) return { ok: false, code: analyzed.error, message: analyzed.message };

  const points: Ingested["points"] = [];
  for (const p of parsed.tracks.flat()) {
    const last = points[points.length - 1];
    if (!last || last.lat !== p.lat || last.lon !== p.lon) points.push({ lat: p.lat, lon: p.lon, ele: p.ele });
  }
  const cleanGpx = writeGpx({ name: parsed.name?.slice(0, 120) || "Track", points, waypoints: parsed.waypoints });
  return { ok: true, analysis: analyzed.analysis, points, waypoints: parsed.waypoints, cleanGpx };
}

const wkt = (points: { lat: number; lon: number }[]) => `LINESTRING(${points.map((p) => `${p.lon.toFixed(6)} ${p.lat.toFixed(6)}`).join(",")})`;
const int = (n: number | null | undefined) => (n == null ? null : Math.round(n));

/** Inserts the route and its GPX file record. `tx` is an open transaction. */
export async function insertRoute(
  tx: TransactionSql,
  i: { ingested: Ingested; revisionId: string | null; userId: string | null; originalKey: string; cleanKey: string; sha256: string; sizeBytes: number },
): Promise<{ routeId: string; simplifiedWkt: string }> {
  const { analysis: a, points, waypoints } = i.ingested;
  const simplifiedWkt = wkt(a.simplified);
  const [route] = await tx`
    insert into route (revision_id, geometry, simplified, distance_km, elev_gain_m, elev_loss_m, min_elev_m, max_elev_m, point_count,
      has_timestamps, moving_time_s, stopped_time_s, avg_moving_speed_kmh, profile, waypoints, fingerprint, created_by)
    values (${i.revisionId}, ST_GeomFromText(${wkt(points)}, 4326), ST_GeomFromText(${simplifiedWkt}, 4326), ${a.distanceKm},
      ${int(a.elevation?.gainM)}, ${int(a.elevation?.lossM)}, ${int(a.elevation?.minM)}, ${int(a.elevation?.maxM)}, ${a.pointCount},
      ${a.timing !== null}, ${int(a.timing?.movingSeconds)}, ${int(a.timing?.stoppedSeconds)}, ${a.timing?.avgMovingSpeedKmh ?? null},
      ${a.profile ? tx.json(a.profile) : null}, ${tx.json(waypoints)}, ${a.fingerprint}, ${i.userId})
    returning id`;
  const routeId = route!.id as string;
  await tx`
    insert into gpx_file (route_id, uploaded_by, storage_key_original, storage_key_sanitised, sha256, size_bytes)
    values (${routeId}, ${i.userId}, ${i.originalKey}, ${i.cleanKey}, ${i.sha256}, ${i.sizeBytes})`;
  return { routeId, simplifiedWkt };
}
