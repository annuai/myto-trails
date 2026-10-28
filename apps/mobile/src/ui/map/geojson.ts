import type { LatLng } from '@/lib/geo';
import { segmentsOf } from '@/lib/track';

/** A recorded track as one line per GPS segment, so the map never draws a line across a gap. */
export function trackFeature(points: LatLng[] = [], breaks: number[] = []) {
  const coordinates = segmentsOf(points, breaks).filter((s) => s.length >= 2).map((s) => s.map((p) => [p.lng, p.lat] as [number, number]));
  return { type: 'Feature' as const, properties: {}, geometry: { type: 'MultiLineString' as const, coordinates } };
}
