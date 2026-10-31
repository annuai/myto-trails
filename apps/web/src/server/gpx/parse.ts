import { XMLParser } from "fast-xml-parser";

export type TrackPoint = { lat: number; lon: number; ele?: number; time?: number };
export type Waypoint = { lat: number; lon: number; name: string };

export type ParseError = "doctype_not_allowed" | "not_gpx" | "no_track_points" | "invalid_coordinates" | "too_complex";
export type ParseResult =
  | { ok: true; tracks: TrackPoint[][]; waypoints: Waypoint[]; name?: string }
  | { ok: false; error: ParseError };

const MAX_TAGS = 1_000_000;
const MAX_DEPTH = 100;

// Untrusted XML: DOCTYPE and ENTITY declarations are refused outright (no XXE, no entity bombs), entities are never
// expanded, and nesting and tag counts are bounded before the parser runs.
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  processEntities: false,
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  isArray: (name) => ["trk", "trkseg", "trkpt", "wpt", "rte", "rtept"].includes(name),
});

function tooComplex(xml: string): boolean {
  let tags = 0;
  for (let i = xml.indexOf("<"); i !== -1; i = xml.indexOf("<", i + 1)) if (++tags > MAX_TAGS) return true;
  let depth = 0;
  for (const m of xml.matchAll(/<(\/?)([A-Za-z_][^\s>/]*)[^>]*?(\/?)>/g)) {
    if (m[1]) depth--;
    else if (!m[3]) depth++;
    if (depth > MAX_DEPTH) return true;
  }
  return false;
}

const num = (v: unknown): number | undefined => {
  if (typeof v !== "string" || v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

type Node = Record<string, unknown>;
const asNode = (v: unknown): Node | undefined => (v && typeof v === "object" ? (v as Node) : undefined);
const text = (v: unknown): string | undefined => (typeof v === "string" ? v : asNode(v)?.["#text"] != null ? String(asNode(v)!["#text"]) : undefined);

function point(node: unknown): TrackPoint | null {
  const n = asNode(node);
  if (!n) return null;
  const lat = num(n["@_lat"]);
  const lon = num(n["@_lon"]);
  if (lat === undefined || lon === undefined || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  const time = text(n.time) ? Date.parse(text(n.time)!) : NaN;
  return { lat, lon, ele: num(text(n.ele)), time: Number.isFinite(time) ? time : undefined };
}

/** A point with a latitude or longitude that exists as a number but is not on Earth: corrupt data, not an empty file. */
function offEarth(node: unknown): boolean {
  const n = asNode(node);
  if (!n) return false;
  const lat = num(n["@_lat"]);
  const lon = num(n["@_lon"]);
  return lat !== undefined && lon !== undefined && (Math.abs(lat) > 90 || Math.abs(lon) > 180);
}

export function parseGpx(xml: string): ParseResult {
  if (typeof xml !== "string" || xml.trim() === "") return { ok: false, error: "not_gpx" };
  if (/<!\s*(DOCTYPE|ENTITY)/i.test(xml)) return { ok: false, error: "doctype_not_allowed" };
  if (!xml.includes("<gpx")) return { ok: false, error: "not_gpx" };
  if (tooComplex(xml)) return { ok: false, error: "too_complex" };

  let doc: Node;
  try {
    doc = parser.parse(xml) as Node;
  } catch {
    return { ok: false, error: "not_gpx" };
  }
  const gpx = asNode(doc.gpx);
  if (!gpx) return { ok: false, error: "not_gpx" };

  const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : v === undefined ? [] : [v]);
  const trks = arr(gpx.trk).map(asNode).filter((t): t is Node => Boolean(t));
  let tracks = trks.flatMap((t) => arr(t.trkseg).map(asNode)).map((seg) => arr(seg?.trkpt).map(point).filter((p): p is TrackPoint => p !== null));
  if (tracks.every((t) => t.length === 0)) {
    tracks = arr(gpx.rte).map(asNode).map((r) => arr(r?.rtept).map(point).filter((p): p is TrackPoint => p !== null));
  }
  tracks = tracks.filter((t) => t.length > 0);
  if (tracks.length === 0) {
    const raw = [...trks.flatMap((t) => arr(t.trkseg).map(asNode)).flatMap((seg) => arr(seg?.trkpt)), ...arr(gpx.rte).map(asNode).flatMap((r) => arr(r?.rtept))];
    return { ok: false, error: raw.some(offEarth) ? "invalid_coordinates" : "no_track_points" };
  }

  const waypoints: Waypoint[] = arr(gpx.wpt).flatMap((w) => {
    const p = point(w);
    return p ? [{ lat: p.lat, lon: p.lon, name: (text(asNode(w)?.name) ?? "").slice(0, 120) }] : [];
  });
  const name = text(trks[0]?.name) ?? text(asNode(gpx.metadata)?.name);
  return { ok: true, tracks, waypoints, name: name?.slice(0, 200) };
}
