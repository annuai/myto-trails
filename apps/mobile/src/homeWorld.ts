import { quickPos } from '@/features/home/quickPosition';
import { cachedSunset } from '@/features/home/sunsetCache';
import { findHabits } from '@/lib/habit';
import { FIX_MAX_AGE_MS, type HomeWorld } from '@/lib/homeRoute/types';
import { isoOf } from '@/lib/nudge/time';
import { dayDate } from '@/lib/tripPlan';
import { useCompanion } from '@/store/companion';
import { useHomeOffer } from '@/store/homeOffer';
import { useLocation } from '@/store/location';
import { usePlaces } from '@/store/places';
import { useRecorder } from '@/store/recorder';
import { useRides } from '@/store/rides';
import { useTrips } from '@/store/trips';

/** What the "Ride home" offer reads, from the phone's stores as plain values. Reads positions only: it never starts a GPS watch. */
export function buildHomeWorld(now: number): HomeWorld {
  const home = usePlaces.getState().home;
  const real = useRides.getState().rides.filter((r) => !r.sample);
  const ends = real.map((r) => r.startedAt + (r.durationSec + (r.pausedSec ?? 0)) * 1000);
  const rec = useRecorder.getState();
  const loc = useLocation.getState();
  const quick = quickPos();
  let pos: HomeWorld['pos'];
  let posAt: number | undefined;
  const last = rec.points[rec.points.length - 1];
  if (rec.status === 'running' && last) { pos = { lat: last.lat, lng: last.lng }; posAt = rec.lastFixAt || now; }
  else if (loc.fix && loc.fixAt !== undefined && now - loc.fixAt <= FIX_MAX_AGE_MS) { pos = { lat: loc.fix.lat, lng: loc.fix.lng }; posAt = loc.fixAt; }
  else if (quick.lat !== undefined && quick.lng !== undefined && quick.at !== undefined) { pos = { lat: quick.lat, lng: quick.lng }; posAt = quick.at; }
  const today = isoOf(now);
  const tripActive = useTrips.getState().trips.some((t) => t.startDate && [t.startDate, ...(t.days ?? []).map((_, i) => dayDate(t.startDate!, i))].includes(today));
  return {
    now,
    ...(home ? { home: { lat: home.lat, lng: home.lng } } : {}),
    ...(pos ? { pos, posAt } : {}),
    ...(ends.length ? { lastRide: { endedAt: Math.max(...ends), sample: undefined } } : {}),
    rideRunning: rec.status === 'running',
    inGroupRide: useCompanion.getState().group != null,
    tripActive,
    ...(pos && home ? { sunsetMs: cachedSunset(pos.lat, pos.lng, now) } : {}),
    usualStartMins: findHabits(real, now).map((h) => h.startMin),
    dismissals: useHomeOffer.getState().dismissals,
  };
}

/** Whether the one-shot position read is needed: not when a ride is recording a point or a fresh fix is already held. */
export function needsQuickReading(now: number): boolean {
  const rec = useRecorder.getState();
  if (rec.status === 'running' && rec.points.length > 0) return false;
  const fixAt = useLocation.getState().fixAt;
  return !(fixAt !== undefined && now - fixAt <= FIX_MAX_AGE_MS);
}
