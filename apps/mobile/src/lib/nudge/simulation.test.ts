import { describe, expect, it } from 'vitest';
import { planNudges } from './planner';
import { SEND_FROM_MIN, SEND_TO_MIN } from './governor';
import { at, DAY, isoOf, minuteOfDay, sameDay } from './time';
import { NUDGE_META, type DayForecast, type Nudge, type NudgeHistory, type NudgeLevel, type NudgeType, type NudgeWorld } from './types';

const START = new Date(2026, 8, 1, 9, 0).getTime();
const DAYS = 180;

type Rider = {
  level: NudgeLevel;
  /** Days (from the start) on which the rider rides. */
  rides: (day: number) => boolean;
  /** Whether the app is opened on a day (a new plan is made). */
  opens: (day: number) => boolean;
  /** Whether the rider opens a nudge that was shown. */
  taps: (n: Nudge) => boolean;
  weather?: boolean;
  clubRideEvery?: number;
  standing?: boolean;
  muted?: NudgeType[];
};

/** Pretends to be a rider for DAYS days: plans on the days the app is opened, lets the phone show what was scheduled, and records what the rider did. */
function simulate(r: Rider) {
  const rides: NudgeWorld['rides'] = [];
  let history: NudgeHistory[] = [];
  let scheduled: Nudge[] = [];
  const fired: (Nudge & { opened: boolean })[] = [];
  for (let day = 0; day < DAYS; day++) {
    const now = at(START, day, 9);
    if (r.rides(day)) { const startedAt = at(START, day, 7); rides.push({ startedAt, endedAt: startedAt + 90 * 60_000, distanceKm: 40 }); }
    if (r.opens(day)) {
      const forecast: DayForecast[] = r.weather ? Array.from({ length: 7 }, (_, i) => ({ iso: isoOf(at(now, i, 12)), code: 0, tempMax: 28, rainPct: 5 })) : [];
      const clubRides = r.clubRideEvery ? Array.from({ length: 5 }, (_, i) => at(now, i, 6, 30)).filter((_, i) => (day + i) % r.clubRideEvery! === 0).map((startsAt, i) => ({ id: `e${day}:${i}`, title: 'Ride', clubName: 'Club', startsAt, going: 5 })) : [];
      const w: NudgeWorld = { now, level: r.level, muted: r.muted ?? [], firstSeenAt: START, rides: [...rides], yearKm: rides.length * 40, usualWeekdays: [6], forecast, clubRides, clubs: 1, ...(r.standing ? { standing: { aheadOf: 70, nextGap: 8, region: 'your area' } } : {}), history: [...history], others: [], tripDays: [] };
      scheduled = planNudges(w);
    }
    const until = at(START, day + 1, 9);
    for (const n of scheduled.filter((x) => x.fireAt > now - DAY && x.fireAt <= until && x.fireAt >= at(START, day, 9) )) {
      const opened = r.taps(n);
      fired.push({ ...n, opened });
      history.push({ id: n.id, type: n.type, fireAt: n.fireAt, ...(opened ? { opened: n.fireAt + 600_000 } : {}) });
    }
    scheduled = scheduled.filter((x) => x.fireAt > until);
  }
  return fired;
}

const checkInvariants = (fired: ReturnType<typeof simulate>, level: Exclude<NudgeLevel, 'off'>) => {
  const gap = (level === 'occasional' ? 7 : 3.5) * DAY;
  for (const n of fired) {
    expect(minuteOfDay(n.fireAt)).toBeGreaterThanOrEqual(SEND_FROM_MIN);
    expect(minuteOfDay(n.fireAt)).toBeLessThan(SEND_TO_MIN);
  }
  for (let i = 1; i < fired.length; i++) {
    expect(sameDay(fired[i]!.fireAt, fired[i - 1]!.fireAt)).toBe(false);
  }
  const ride = fired.filter((n) => NUDGE_META[n.type].cls === 'ride');
  for (let i = 1; i < ride.length; i++) expect(ride[i]!.fireAt - ride[i - 1]!.fireAt).toBeGreaterThanOrEqual(gap - 1);
};

describe('simulated riders over six months', () => {
  it('a weekly rider who opens the app every day gets at most about one nudge a week, none outside 08:00 to 21:00, never two in a day', () => {
    const fired = simulate({ level: 'occasional', rides: (d) => d % 7 === 5, opens: () => true, taps: () => true, weather: true, clubRideEvery: 14 });
    checkInvariants(fired, 'occasional');
    expect(fired.length).toBeLessThanOrEqual(Math.ceil(DAYS / 7));
    expect(fired.length).toBeGreaterThan(3);
  });

  it('with the standing nudge on, a rider still gets at most one a day, the gaps and the window', () => {
    for (const level of ['occasional', 'regular'] as const) {
      const fired = simulate({ level, rides: (d) => d % 6 === 0, opens: () => true, taps: () => true, weather: true, clubRideEvery: 14, standing: true });
      checkInvariants(fired, level);
      const quiet = simulate({ level, rides: (d) => d % 6 === 0, opens: () => true, taps: () => true, standing: true, muted: ['weekend', 'lapse'] });
      checkInvariants(quiet, level);
      expect(quiet.some((n) => n.type === 'standing')).toBe(true);
    }
  });

  it('Regular allows twice as many, with the same hard rules', () => {
    const occasional = simulate({ level: 'occasional', rides: (d) => d % 5 === 0, opens: () => true, taps: () => true, weather: true, clubRideEvery: 10 });
    const regular = simulate({ level: 'regular', rides: (d) => d % 5 === 0, opens: () => true, taps: () => true, weather: true, clubRideEvery: 10 });
    checkInvariants(regular, 'regular');
    expect(regular.length).toBeLessThanOrEqual(Math.ceil(DAYS / 3.5));
    expect(regular.length).toBeGreaterThan(occasional.length);
  });

  it('someone who never rides gets the two first-ride nudges and then nothing, ever', () => {
    const fired = simulate({ level: 'regular', rides: () => false, opens: (d) => d === 0, taps: () => false });
    expect(fired.map((n) => n.type)).toEqual(['first', 'first']);
  });

  it('someone who rode once and never opened the app again gets the lapse ladder, three in all, and then nothing for months', () => {
    const fired = simulate({ level: 'occasional', rides: (d) => d === 1, opens: (d) => d <= 1, taps: () => false });
    expect(fired.map((n) => n.type)).toEqual(['lapse', 'lapse', 'lapse']);
    expect(fired.every((n) => n.fireAt < at(START, 70, 0))).toBe(true);
  });

  it('a rider who ignores every nudge gets fewer and fewer: once tired, the gap doubles', () => {
    const fired = simulate({ level: 'occasional', rides: (d) => d % 45 === 0, opens: () => true, taps: () => false, weather: true });
    checkInvariants(fired, 'occasional');
    const ride = fired.filter((n) => NUDGE_META[n.type].cls === 'ride');
    const early = ride.filter((n) => n.fireAt < at(START, 60, 0)).length;
    const late = ride.filter((n) => n.fireAt >= at(START, 120, 0)).length;
    expect(late).toBeLessThanOrEqual(early);
    for (let i = 4; i < ride.length; i++) {
      const judged = ride.slice(i - 3, i).every((n) => n.opened === false) && ride[i - 1]!.fireAt < ride[i]!.fireAt - DAY;
      if (judged) expect(ride[i]!.fireAt - ride[i - 1]!.fireAt).toBeGreaterThanOrEqual(7 * DAY);
    }
    expect(fired.length).toBeLessThanOrEqual(Math.ceil(DAYS / 7));
  });

  it('a rider who opens every nudge keeps getting them', () => {
    const fired = simulate({ level: 'occasional', rides: (d) => d % 9 === 0, opens: () => true, taps: () => true, weather: true });
    const late = fired.filter((n) => n.fireAt >= at(START, 120, 0)).length;
    expect(late).toBeGreaterThanOrEqual(3);
  });
});
