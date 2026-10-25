import { pathLength } from './geo';
import { formatShort } from './dates';
import { useRecorder } from '@/store/recorder';
import { useRides } from '@/store/rides';

const part = (h: number) => (h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening');

/** Turn the live recording into a saved ride. Returns undefined when there is nothing worth keeping. */
export function finishRide(): string | undefined {
  const r = useRecorder.getState();
  const points = r.points;
  r.reset();
  if (points.length < 2) return undefined;
  const d = new Date(r.startedAt);
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return useRides.getState().addRide({
    name: `${formatShort(iso)} ${part(d.getHours())} ride`, startedAt: r.startedAt, durationSec: Math.round((Date.now() - r.startedAt) / 1000),
    distanceKm: +(pathLength(points) / 1000).toFixed(1), maxKmh: Math.round(r.maxKmh), points, waypoints: r.waypoints,
  });
}
