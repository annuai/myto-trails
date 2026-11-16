import type { LatLng } from '@/lib/geo';
import { segmentsOf } from '@/lib/track';

/**
 * Map data is always a FeatureCollection, empty when there is nothing to draw. Android's map refuses a line with fewer than two points
 * ("A line string must have two or more coordinate points") and then draws nothing on that source, so an empty line is never sent.
 */
const collection = <G>(geometry?: G) => ({ type: 'FeatureCollection' as const, features: geometry ? [{ type: 'Feature' as const, properties: {}, geometry }] : [] });

/** A route or guide line; empty below two points. */
export function lineFeature(points: LatLng[] = []) {
  return collection(points.length >= 2 ? { type: 'LineString' as const, coordinates: points.map((p) => [p.lng, p.lat] as [number, number]) } : undefined);
}

/** A recorded track as one line per GPS segment, so the map never draws a line across a gap. */
export function trackFeature(points: LatLng[] = [], breaks: number[] = []) {
  const coordinates = segmentsOf(points, breaks).filter((s) => s.length >= 2).map((s) => s.map((p) => [p.lng, p.lat] as [number, number]));
  return collection(coordinates.length ? { type: 'MultiLineString' as const, coordinates } : undefined);
}
