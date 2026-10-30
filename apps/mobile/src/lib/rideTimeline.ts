import { haversine } from './geo';
import type { LatLng } from './geo';
import type { JournalEntry } from './journalEntries';
import type { Waypoint } from '@/store/rides';

export type TimelineKind = 'start' | 'finish' | 'break' | 'waypoint' | 'note' | 'voice' | 'photo';
export type TimelineEvent = { key: string; kind: TimelineKind; at: number; lat?: number; lng?: number; text?: string; entryId?: string; /** How long a stop lasted. */ durationSec?: number };

type TimelineRide = { id: string; startedAt: number; durationSec: number; pausedSec?: number; points: LatLng[]; breaks?: number[]; waypoints: Waypoint[] };

const RANK: Record<TimelineKind, number> = { start: 0, break: 1, waypoint: 1, note: 1, voice: 1, photo: 1, finish: 2 };

/**
 * One ride as a list of things that happened, oldest first: the start, each stop where the track has a gap, each waypoint (placed at the time of
 * the nearest point on the track, since a waypoint has no time of its own), each moment the rider wrote, spoke or photographed, and the finish.
 */
export function rideTimeline(ride: TimelineRide, entries: JournalEntry[]): TimelineEvent[] {
  const last = ride.points[ride.points.length - 1];
  const finishAt = last?.t ?? ride.startedAt + (ride.durationSec + (ride.pausedSec ?? 0)) * 1000;
  const out: TimelineEvent[] = [{ key: 'start', kind: 'start', at: ride.startedAt, ...(ride.points[0] ? { lat: ride.points[0].lat, lng: ride.points[0].lng } : {}) }];

  for (const i of ride.breaks ?? []) {
    const before = ride.points[i - 1]; const after = ride.points[i];
    if (before?.t === undefined || after?.t === undefined || after.t <= before.t) continue;
    out.push({ key: `break-${i}`, kind: 'break', at: before.t, lat: before.lat, lng: before.lng, durationSec: Math.round((after.t - before.t) / 1000) });
  }

  ride.waypoints.forEach((w, n) => {
    let best: LatLng | undefined; let bestD = Infinity;
    for (const pt of ride.points) { const d = haversine(pt, w); if (d < bestD) { bestD = d; best = pt; } }
    out.push({ key: `waypoint-${n}`, kind: 'waypoint', at: best?.t ?? ride.startedAt, lat: w.lat, lng: w.lng, text: w.name });
  });

  for (const e of entries) {
    if (e.rideId !== ride.id && e.rideKey !== ride.startedAt) continue;
    out.push({ key: `entry-${e.id}`, kind: e.kind, at: e.at, entryId: e.id, ...(e.text ? { text: e.text } : {}), ...(e.lat !== undefined && e.lng !== undefined ? { lat: e.lat, lng: e.lng } : {}), ...(e.kind === 'voice' && e.durationSec ? { durationSec: e.durationSec } : {}) });
  }

  out.push({ key: 'finish', kind: 'finish', at: finishAt, ...(last ? { lat: last.lat, lng: last.lng } : {}) });
  return out.map((e, i) => ({ e, i })).sort((a, b) => a.e.at - b.e.at || RANK[a.e.kind] - RANK[b.e.kind] || a.i - b.i).map((x) => x.e);
}
