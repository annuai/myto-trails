import { AWAY_M } from '@/lib/homeRoute/types';
import { haversine } from '@/lib/geo';
import type { CopyData } from './copy';
import { at, dayStart, DAY, HOUR, isoOf, isoWeekOf, MIN, weekdayOf } from './time';
import type { NudgeType, NudgeWorld } from './types';
import { badRidingDay, goodRidingDay } from './weather';

/** An idea for a nudge, before the governor decides whether it may be shown. */
export type Candidate = { type: NudgeType; key: string; fireAt: number; score: number; route: string; data: CopyData };

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MILESTONES = [100, 250, 500, 750, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 7500, 10000];
/** The days a lapse nudge is sent after the last ride, and how much each is worth. */
export const LAPSE_DAYS: readonly [number, number][] = [[7, 0.75], [21, 0.65], [60, 0.55]];
/** The first-ride nudges: days after the rider was first seen. */
export const FIRST_DAYS: readonly number[] = [2, 9];

const lastRide = (w: NudgeWorld) => w.rides.reduce<NudgeWorld['rides'][number] | undefined>((m, r) => (!m || r.startedAt > m.startedAt ? r : m), undefined);
const forecastFor = (w: NudgeWorld, iso: string) => w.forecast.find((d) => d.iso === iso);

/** "tomorrow", "Saturday" ... for a day `offset` days from today. */
const dayName = (now: number, offset: number) => (offset === 1 ? 'tomorrow' : DAY_NAMES[weekdayOf(at(now, offset, 12))]!);

function first(w: NudgeWorld): Candidate[] {
  if (w.rides.length) return [];
  return FIRST_DAYS.map((d, i) => ({ type: 'first' as const, key: `first:${i + 1}`, fireAt: at(w.firstSeenAt, d, 10), score: 0.6, route: '/ride', data: {} }));
}

function lapse(w: NudgeWorld): Candidate[] {
  const r = lastRide(w);
  if (!r) return [];
  const rideDay = isoOf(r.startedAt);
  return LAPSE_DAYS.map(([days, score]) => ({ type: 'lapse' as const, key: `lapse:${days}:${rideDay}`, fireAt: at(r.startedAt, days, 9, 30), score, route: '/ride', data: { daysSince: days } }));
}

function weekend(w: NudgeWorld): Candidate[] {
  const out: Candidate[] = [];
  const taken = new Set(w.tripDays);
  for (const c of w.clubRides) taken.add(isoOf(c.startsAt));
  for (let i = 0; i <= 7; i++) {
    const friday = at(w.now, i, 17, 30);
    if (weekdayOf(friday) !== 5) continue;
    const sat = isoOf(at(friday, 1, 12)), sun = isoOf(at(friday, 2, 12));
    if (taken.has(sat) || taken.has(sun)) continue;
    const days = [forecastFor(w, sat), forecastFor(w, sun)].filter((d) => d !== undefined);
    if (days.length && days.every((d) => badRidingDay(d))) continue;
    const good = days.find((d) => goodRidingDay(d));
    out.push({ type: 'weekend', key: `weekend:${isoOf(friday)}`, fireAt: friday, score: 0.55 + (good ? 0.1 : 0), route: w.nextTrail ? `/trail/${w.nextTrail.slug}` : '/trails', data: { trail: w.nextTrail?.name, ...(good ? { sky: good.code, temp: good.tempMax } : {}) } });
  }
  return out;
}

function weather(w: NudgeWorld): Candidate[] {
  const out: Candidate[] = [];
  const r = lastRide(w);
  for (let i = 1; i <= 6; i++) {
    const day = at(w.now, i, 12);
    const f = forecastFor(w, isoOf(day));
    if (!f || !goodRidingDay(f)) continue;
    // Just ridden the day before: no need to be told.
    if (r && dayStart(r.startedAt) === dayStart(at(w.now, i - 1, 12))) continue;
    const usual = [0, 6].includes(weekdayOf(day)) || w.usualWeekdays.includes(weekdayOf(day));
    out.push({ type: 'weather', key: `weather:${f.iso}`, fireAt: at(w.now, i - 1, 18, 30), score: usual ? 0.8 : 0.35, route: '/ride', data: { day: dayName(w.now, i), sky: f.code, temp: f.tempMax } });
  }
  return out;
}

function club(w: NudgeWorld): Candidate[] {
  const out: Candidate[] = [];
  for (const c of w.clubRides) {
    if (c.startsAt <= w.now || c.startsAt - w.now > 4 * DAY) continue;
    const twoBefore = at(c.startsAt, -2, 18), dayBefore = at(c.startsAt, -1, 18);
    const fireAt = twoBefore > w.now + HOUR ? twoBefore : dayBefore;
    if (fireAt <= w.now + HOUR) continue;
    const offset = Math.round((dayStart(c.startsAt) - dayStart(w.now)) / DAY);
    out.push({ type: 'club', key: `club:${c.id}`, fireAt, score: 0.9, route: `/event/${c.id}`, data: { club: c.clubName, rideTitle: c.title, going: c.going, when: offset <= 1 ? (offset === 0 ? 'today' : 'tomorrow') : `on ${DAY_NAMES[weekdayOf(c.startsAt)]}` } });
  }
  return out;
}

function milestone(w: NudgeWorld): Candidate[] {
  const target = MILESTONES.find((m) => m > w.yearKm);
  if (!target) return [];
  const toGo = target - w.yearKm;
  if (toGo > Math.max(30, target * 0.06) || w.yearKm < 20) return [];
  const slot = at(w.now, 0, 9, 30) > w.now + HOUR ? at(w.now, 0, 9, 30) : at(w.now, 1, 9, 30);
  return [{ type: 'milestone', key: `milestone:${target}`, fireAt: slot, score: 0.5, route: '/ride', data: { toGo, target } }];
}

function photos(w: NudgeWorld): Candidate[] {
  const r = lastRide(w);
  if (!r || w.clubs < 1) return [];
  // Only just after a ride finishes: the plan is rebuilt then, and a ride that ended long ago is not worth a message.
  if (w.now - r.endedAt > 20 * MIN || w.now < r.endedAt) return [];
  return [{ type: 'photos', key: `photos:${r.startedAt}`, fireAt: r.endedAt + 30 * MIN, score: 0.5, route: '/clubs', data: {} }];
}

function homeNudge(w: NudgeWorld): Candidate[] {
  const r = lastRide(w);
  if (!r || !w.home || !w.lastRideEnd) return [];
  // Like photos: only just after a ride finishes, from the plan rebuilt then.
  if (w.now - r.endedAt > 20 * MIN || w.now < r.endedAt) return [];
  // Like the Ride home offer: not on a trip day and not after a group ride.
  if (w.lastRideGroup || w.tripDays.includes(isoOf(r.endedAt))) return [];
  if (haversine(w.lastRideEnd, w.home) <= AWAY_M) return [];
  return [{ type: 'home', key: `home:${r.endedAt}`, fireAt: r.endedAt + 10 * MIN, score: 0.6, route: '/(tabs)', data: {} }];
}

/** A Monday note on where the rider stands, only when it is good news: a rider is never nudged about a poor standing. */
function standing(w: NudgeWorld): Candidate[] {
  const s = w.standing;
  if (!s || s.aheadOf < 50) return [];
  for (let i = 0; i <= 7; i++) {
    const monday = at(w.now, i, 9, 30);
    if (weekdayOf(monday) !== 1 || monday <= w.now) continue;
    // The copy says "this month": a Monday in the next month would be about a month just begun.
    if (new Date(monday).getMonth() !== new Date(w.now).getMonth()) return [];
    return [{ type: 'standing', key: `standing:${isoWeekOf(monday)}`, fireAt: monday, score: 0.5, route: '/ride', data: { aheadOf: s.aheadOf, region: s.region, nextGap: s.nextGap } }];
  }
  return [];
}

/** Every nudge the rider's situation suggests, in no particular order. */
export const candidates = (w: NudgeWorld): Candidate[] => [...first(w), ...lapse(w), ...weekend(w), ...weather(w), ...club(w), ...milestone(w), ...photos(w), ...homeNudge(w), ...standing(w)];
