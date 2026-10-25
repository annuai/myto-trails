import type { LatLng } from './geo';

/** A looping test route (no real place). Used for "Simulate GPS" so recording can be tried on a laptop. */
export function simPoint(i: number, origin: LatLng = { lat: 13.0, lng: 77.6 }, rate = 0.012): LatLng {
  const a = i * rate;
  return { lat: origin.lat + 0.02 * Math.sin(a) * Math.cos(a * 0.5), lng: origin.lng + 0.03 * Math.sin(a * 0.5), t: Date.now(), ele: 900 + 20 * Math.sin(a * 2) };
}

import { pathLength } from './geo';
import type { Ride } from '@/store/rides';

/** One sample ride so the ride story, upload and export screens can be tried straight away. */
export function sampleRide(): Omit<Ride, 'id'> & { id: string } {
  const start = Date.now() - 2 * 86_400_000;
  const points = Array.from({ length: 320 }, (_, i) => ({ ...simPoint(i), t: start + i * 25_000 }));
  return { id: 'sample-ride', name: 'Sample morning loop', startedAt: start, durationSec: 319 * 25, distanceKm: +(pathLength(points) / 1000).toFixed(1), maxKmh: 62, points, waypoints: [{ name: 'Viewpoint', lat: points[120].lat, lng: points[120].lng }], sample: true };
}
