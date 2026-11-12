import { findHabits } from '@/lib/habit';
import { planNudges } from '@/lib/nudge/planner';
import { isoOf } from '@/lib/nudge/time';
import type { NudgeWorld } from '@/lib/nudge/types';
import type { Reminder } from '@/lib/reminders';
import { percentileBelow, type CohortRow } from '@moto-trails/domain';
import { useNudges } from '@/store/nudges';
import { usePlaces } from '@/store/places';
import { useRides } from '@/store/rides';
import { useTrailStore } from '@/store/trails';
import { useStandingPref } from '@/store/standingPref';
import { useTrips } from '@/store/trips';
import { dayDate } from '@/lib/tripPlan';

/** Kilometres more to the next decile cut point above `value`; none when the rider is above the last one. */
export const nextGapKm = (value: number, row: CohortRow): number | undefined => {
  const cut = row.deciles.find((d) => d > value);
  return cut === undefined ? undefined : cut - value;
};

/** Standing for the engine: only for a rider who opted in, from this month's cohort, and only when the cohort is big enough to show. */
export function standingFor(now: number): NudgeWorld['standing'] {
  const { optIn, cohort } = useStandingPref.getState();
  const d = new Date(now);
  if (!optIn || !cohort || cohort.period !== `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`) return undefined;
  const aheadOf = percentileBelow(cohort.value, cohort.row);
  if (aheadOf === null) return undefined;
  const nextGap = nextGapKm(cohort.value, cohort.row);
  return { aheadOf, region: cohort.region, ...(nextGap !== undefined ? { nextGap } : {}) };
}

/** What the engine reads, taken from the phone's stores as plain values. */
export function buildNudgeWorld(now: number, others: Reminder[]): NudgeWorld {
  const n = useNudges.getState();
  // Neither the demo ride nor a simulated one is a ride the rider made.
  const real = useRides.getState().rides.filter((r) => !r.sample && !r.simulated);
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
    lastRideGroup: !!newest?.groupId,
    nextTrail: next ? { slug: next.slug, name: next.name } : undefined,
    history: n.history,
    others: others.map((o) => ({ id: o.id, fireAt: o.fireAt })),
    tripDays,
    standing: standingFor(now),
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
