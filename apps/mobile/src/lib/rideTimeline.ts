import { haversine } from './geo';
import type { LatLng } from './geo';
import type { JournalEntry } from './journalEntries';
import type { Waypoint } from '@/store/rides';

export type TimelineKind = 'start' | 'finish' | 'break' | 'wait' | 'waypoint' | 'note' | 'voice' | 'photo';
export type TimelineEvent = { key: string; kind: TimelineKind; at: number; lat?: number; lng?: number; text?: string; entryId?: string; /** How long a stop lasted. */ durationSec?: number };

/** A stop at least this long is shown on its own row as a long wait; shorter ones only count towards the total. */
export const LONG_WAIT_SEC = 300;
/** The shortest stop that counts as a wait. */
export const WAIT_SEC = 60;
/** The bike counts as standing while the two points either side of the gap are this close: stored points skip GPS wander, so a stop is one gap. */
const WAIT_RADIUS_M = 50;

type TimelineRide = { id: string; startedAt: number; durationSec: number; pausedSec?: number; points: LatLng[]; breaks?: number[]; waypoints: Waypoint[] };

const RANK: Record<TimelineKind, number> = { start: 0, break: 1, wait: 1, waypoint: 1, note: 1, voice: 1, photo: 1, finish: 2 };

export type Wait = { at: number; lat: number; lng: number; durationSec: number };
export type WaitSummary = { waits: Wait[]; count: number; longCount: number; totalSec: number };

/**
 * Where the bike stood still for a minute or more (traffic lights, a level crossing, a queue). Saving a ride drops points that have not moved,
 * so a stop is two neighbouring points with a long time between them and almost no distance. A gap the track already marks as a break (a pause
 * or a lost signal) is not a wait.
 */
export function rideWaits(points: LatLng[], breaks: number[] = []): WaitSummary {
  const split = new Set(breaks);
  const waits: Wait[] = [];
  for (let i = 1; i < points.length; i++) {
    const before = points[i - 1]!; const after = points[i]!;
    if (split.has(i) || before.t === undefined || after.t === undefined) continue;
    const durationSec = Math.round((after.t - before.t) / 1000);
    if (durationSec >= WAIT_SEC && haversine(before, after) <= WAIT_RADIUS_M) waits.push({ at: before.t, lat: before.lat, lng: before.lng, durationSec });
  }
  return { waits, count: waits.length, longCount: waits.filter((w) => w.durationSec >= LONG_WAIT_SEC).length, totalSec: waits.reduce((n, w) => n + w.durationSec, 0) };
}

/**
 * One ride as a list of things that happened, oldest first: the start, each stop where the track has a gap, each long wait (shorter ones are left to `rideWaits`' total), each waypoint (placed at the time of
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

  for (const w of rideWaits(ride.points, ride.breaks).waits) {
    if (w.durationSec >= LONG_WAIT_SEC) out.push({ key: `wait-${w.at}`, kind: 'wait', at: w.at, lat: w.lat, lng: w.lng, durationSec: w.durationSec });
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
