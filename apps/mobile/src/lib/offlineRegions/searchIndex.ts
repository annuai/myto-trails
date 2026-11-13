import type { Place } from '../placeSearch';

/** The pure half of offline place search: no native imports, so it runs under vitest. The SQLite half is `searchLocal.ts`. */

/** One row of the search file as `searchLocal` reads it. */
export type PlaceRow = { name: string; detail: string | null; lat: number; lng: number };

export const rowToPlace = (r: PlaceRow): Place => ({ name: r.name, detail: r.detail ?? '', point: { lat: r.lat, lng: r.lng } });

/**
 * An FTS5 MATCH string for what the rider typed. Every token is reduced to letters, digits and marks (so `"`, `*`, `-`, `:`, `(`, `)` can never reach FTS5 as syntax),
 * quoted, and the last one gets a prefix star. Null when nothing searchable is left.
 */
export function ftsQuery(text: string): string | null {
  const tokens = text.split(/\s+/).map((t) => t.replace(/[^\p{L}\p{N}\p{M}]/gu, '')).filter((t) => t.length > 0);
  if (tokens.length === 0) return null;
  return tokens.map((t, i) => (i === tokens.length - 1 ? `"${t}"*` : `"${t}"`)).join(' ');
}

const SAME_PLACE_DEG = 0.01;

/** Local places first, then online ones that are not the same place (same name, within 0.01 degrees), cut to `limit`. */
export function mergePlaces(local: Place[], online: Place[], limit: number): Place[] {
  const fresh = online.filter(
    (o) => !local.some((l) => l.name.toLowerCase() === o.name.toLowerCase() && Math.abs(l.point.lat - o.point.lat) <= SAME_PLACE_DEG && Math.abs(l.point.lng - o.point.lng) <= SAME_PLACE_DEG),
  );
  return [...local, ...fresh].slice(0, limit);
}

/** Local results plus the online outcome: merged on success; on failure the local results stand, and with none the online error is rethrown. */
export function combine(local: Place[], online: Place[] | Error, limit: number): Place[] {
  if (!(online instanceof Error)) return mergePlaces(local, online, limit);
  if (local.length > 0) return local.slice(0, limit);
  throw online;
}

/** Splits an absolute path or `file://` URI into the directory and file name expo-sqlite wants. */
export function splitPath(path: string): { dir: string; file: string } {
  const plain = path.replace(/^file:\/\//, '');
  const i = plain.lastIndexOf('/');
  return { dir: plain.slice(0, i), file: plain.slice(i + 1) };
}
