import { findHabits } from '@/lib/habit';
import { planNudges } from '@/lib/nudge/planner';
import { isoOf } from '@/lib/nudge/time';
import type { NudgeWorld } from '@/lib/nudge/types';
import type { Reminder } from '@/lib/reminders';
import { useNudges } from '@/store/nudges';
import { usePlaces } from '@/store/places';
import { useRides } from '@/store/rides';
import { useTrailStore } from '@/store/trails';
import { useTrips } from '@/store/trips';
import { dayDate } from '@/lib/tripPlan';

/** What the engine reads, taken from the phone's stores as plain values. */
export function buildNudgeWorld(now: number, others: Reminder[]): NudgeWorld {
  const n = useNudges.getState();
  const real = useRides.getState().rides.filter((r) => !r.sample);
  const rides = real.map((r) => ({ startedAt: r.startedAt, endedAt: r.startedAt + (r.durationSec + (r.pausedSec ?? 0)) * 1000, distanceKm: r.distanceKm }));
  const year = new Date(now).getFullYear();
  const today = isoOf(now);
  const trips = useTrips.getState().trips;
  const tripDays = trips.flatMap((t) => (t.startDate ? [t.startDate, ...(t.days ?? []).map((_, i) => dayDate(t.startDate!, i))] : []));
  const next = useTrailStore.getState().nextTrip;
  const newest = real.reduce<(typeof real)[number] | undefined>((m, r) => (!m || r.startedAt > m.startedAt ? r : m), undefined);
  const end = newest?.points[newest.points.length - 1];
  const home = usePlaces.getState().home;
  return {
    now,
    level: n.level ?? 'off',
    muted: n.muted,
    firstSeenAt: n.firstSeenAt ?? now,
    rides,
    yearKm: rides.filter((r) => new Date(r.startedAt).getFullYear() === year).reduce((sum, r) => sum + r.distanceKm, 0),
    usualWeekdays: [...new Set(findHabits(real, now).flatMap((h) => h.weekdays))],
    forecast: (n.forecast?.days ?? []).filter((d) => d.iso >= today),
    clubRides: (n.clubs?.rides ?? []).filter((r) => r.startsAt > now),
    clubs: n.clubs?.count ?? 0,
    home: home ? { lat: home.lat, lng: home.lng } : undefined,
    lastRideEnd: end ? { lat: end.lat, lng: end.lng } : undefined,
    nextTrail: next ? { slug: next.slug, name: next.name } : undefined,
    history: n.history,
    others: others.map((o) => ({ id: o.id, fireAt: o.fireAt })),
    tripDays,
  };
}

/** The nudges for a sync, as reminders. Writes what has already come due into the history first, and keeps the plan so the app can show it. */
export function planForSync(now: number, others: Reminder[]): Reminder[] {
  const store = useNudges.getState();
  store.seenFirst(now);
  store.absorb(now);
  const plan = planNudges(buildNudgeWorld(now, others));
  useNudges.getState().setPlanned(plan);
  return plan.map((p) => ({ id: p.id, fireAt: p.fireAt, title: p.title, body: p.body, lock: p.lock, route: p.route, kind: 'nudge' as const }));
}
