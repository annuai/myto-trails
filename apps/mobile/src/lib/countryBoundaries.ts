import data from '../../assets/countries/boundaries.json';

type Ring = [number, number][];
const outlines = data.countries as unknown as Record<string, Ring[][]>;
const boxes = data.bboxes as unknown as Record<string, [number, number, number, number]>;

/** Even-odd test: is the point inside the ring? Rings are [lng, lat] pairs. */
function inRing(lat: number, lng: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!, [xj, yj] = ring[j]!;
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * The country with a bundled outline that contains this point, or null. Only countries whose emergency number we have checked are
 * bundled, so null means "somewhere we have no number for", not "in the sea". Works with no signal.
 */
export function countryAt(lat: number, lng: number): string | null {
  for (const [iso2, polys] of Object.entries(outlines)) {
    for (const [outer, ...holes] of polys) if (outer && inRing(lat, lng, outer) && !holes.some((h) => inRing(lat, lng, h))) return iso2;
  }
  return null;
}

/** [west, south, east, north] of a country's mainland, or null when we have none (or it crosses the date line). */
export const countryBox = (iso2: string | null | undefined): [number, number, number, number] | null => (iso2 ? boxes[iso2.toUpperCase()] ?? null : null);

/** Every country the app has a box for (ISO codes), for a "where do you live" list. */
export const knownCountryCodes = (): string[] => Object.keys(boxes);
