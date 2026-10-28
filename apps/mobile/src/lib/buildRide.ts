import { formatShort } from './dates';
import type { JournalRide } from './journal';
import { cleanTrack, splitSegments, trackStats } from './track';
import type { Ride } from '@/store/rides';

const part = (h: number) => (h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening');

/** Turn the journal of a finished recording into a ride to save. Returns undefined when there is nothing worth keeping. */
export function buildRide(raw: JournalRide, now: number): Omit<Ride, 'id'> | undefined {
  const points = cleanTrack(raw.points);
  if (points.length < 2) return undefined;
  const segments = splitSegments(points);
  const stats = trackStats(segments);
  const d = new Date(raw.meta.startedAt);
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const endedAt = points[points.length - 1].t ?? now;
  let at = 0;
  const breaks = segments.slice(0, -1).map((s) => (at += s.length));
  return {
    name: `${formatShort(iso)} ${part(d.getHours())} ride`, startedAt: raw.meta.startedAt, durationSec: Math.max(0, Math.round((endedAt - raw.meta.startedAt) / 1000)),
    distanceKm: +(stats.distanceM / 1000).toFixed(1), maxKmh: Math.round(stats.maxKmh), points, breaks, waypoints: raw.waypoints,
  };
}
