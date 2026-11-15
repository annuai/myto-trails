import { describe, expect, it } from 'vitest';
import { MAX_STEPS, pickGoal, planLadder, READY_MIN, type RideContext } from './ladder';
import { planAlarms, rideContexts, type AlarmWorld } from './plan';

const MIN = 60_000;
const at = (h: number, m: number, day = 16) => new Date(2026, 10, day, h, m).getTime();
const hhmm = (ms: number) => { const d = new Date(ms); return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; };
const ride = (o: Partial<RideContext> = {}): RideContext => ({ id: 'trip:t1:2026-11-16', title: 'Nandi Hills', startsAt: at(5, 30), group: false, ...o });
const sunrise = { sunriseMs: at(6, 18), sunsetMs: at(17, 50) };

describe('pickGoal', () => {
  it('aims at a sunrise the ride is timed for', () => expect(pickGoal(ride({ sun: sunrise }), 'auto').kind).toBe('sunrise'));
  it('aims at a sunset soon after the start', () => expect(pickGoal(ride({ startsAt: at(16, 30), sun: sunrise }), 'auto').kind).toBe('sunset'));
  it('is the start for a midday ride, without the sun, or when the rider asks', () => {
    expect(pickGoal(ride({ startsAt: at(11, 0), sun: sunrise }), 'auto').kind).toBe('start');
    expect(pickGoal(ride(), 'auto').kind).toBe('start');
    expect(pickGoal(ride({ sun: sunrise }), 'start').kind).toBe('start');
  });
});

describe('planLadder', () => {
  const sunRide = planLadder(ride({ sun: sunrise, weather: { rainPct: 10, minC: 12, maxC: 24 }, packLeft: 2 }), { leadMin: 30, goal: 'auto', now: 0, clock: hhmm });

  it('rings first at the lead time, with the day in the first ring', () => {
    expect(sunRide[0].fireAt).toBe(at(5, 0));
    expect(sunRide[0].title).toBe('Nandi Hills at 5:30');
    expect(sunRide[0].body).toBe('Sunrise 6:18. Dry, 24° later. 2 things still to pack.');
  });

  it('shortens the snoozes as the latest wake-up nears and never goes past the start', () => {
    expect(sunRide.map((s) => hhmm(s.fireAt))).toEqual(['5:00', '5:09', '5:15', '5:18', '5:21', '5:24']);
    const gaps = sunRide.slice(1).map((s, k) => s.fireAt - sunRide[k].fireAt);
    expect(gaps.every((g, k) => k === 0 || g <= gaps[k - 1])).toBe(true);
    expect(sunRide.every((s) => s.fireAt < at(5, 30))).toBe(true);
  });

  it('warns on the ring after which one more snooze loses the sunrise, then says it is tight once', () => {
    const wakeBy = at(5, 30) - READY_MIN * MIN;
    const warn = sunRide.findIndex((s) => s.title === 'Snooze again and you miss the sunrise');
    expect(warn).toBe(3);
    expect(sunRide[warn].fireAt).toBeLessThanOrEqual(wakeBy);
    expect(sunRide[warn + 1].fireAt).toBeGreaterThan(wakeBy);
    expect(sunRide[warn + 1].title).toBe('No time to spare for the sunrise');
    expect(sunRide.filter((s) => s.title.startsWith('No time to spare'))).toHaveLength(1);
  });

  it('ends on a ring with no snooze, and caps the number of rings', () => {
    expect(sunRide.length).toBeLessThanOrEqual(MAX_STEPS);
    expect(sunRide.at(-1)?.snooze).toBe(false);
    expect(sunRide.slice(0, -1).every((s) => s.snooze)).toBe(true);
    expect(sunRide.at(-1)?.title).toBe('Nandi Hills starts in 6 min');
  });

  it('talks about the start, and the waiting group, when there is no sun to catch', () => {
    const club = planLadder(ride({ group: true, startsAt: at(9, 0) }), { leadMin: 15, goal: 'auto', now: 0, clock: hhmm });
    expect(club.some((s) => s.title === 'Snooze again and the group waits')).toBe(true);
    expect(club.at(-1)?.title).toMatch(/^The group leaves in \d+ min$/);
    expect(club.some((s) => /sun/i.test(s.title + s.body))).toBe(false);
  });

  it('gives each ring a stable id and the pre-ride screen', () => {
    expect(sunRide[1].id).toBe('alarm:trip:t1:2026-11-16:1');
    expect(sunRide[1].route).toBe(`/alarm/${encodeURIComponent('trip:t1:2026-11-16')}`);
  });

  it('leaves out rings already past', () => {
    const late = planLadder(ride({ sun: sunrise }), { leadMin: 30, goal: 'auto', now: at(5, 16), clock: hhmm });
    expect(late.map((s) => hhmm(s.fireAt))).toEqual(['5:18', '5:21', '5:24']);
  });

  it('mentions rain and the cold', () => {
    const wet = planLadder(ride({ weather: { rainPct: 70, minC: 12, maxC: 20 } }), { leadMin: 30, goal: 'auto', now: 0, clock: hhmm });
    expect(wet[0].body).toContain('Rain likely (70%)');
    const cold = planLadder(ride({ weather: { rainPct: 0, minC: 3, maxC: 9 } }), { leadMin: 30, goal: 'auto', now: 0, clock: hhmm });
    expect(cold[0].body).toContain('Cold start, 3°');
  });
});

describe('planAlarms', () => {
  const world = (o: Partial<AlarmWorld> = {}): AlarmWorld => ({
    now: at(20, 0, 15),
    settings: [{ key: 'trip:t1', kind: 'trip', refId: 't1', leadMin: 30, goal: 'auto' }],
    trips: [{ id: 't1', name: 'Coast run', startDate: '2026-11-16', startTime: 6 * 60, days: [{}, {}] }],
    packLeft: () => 1,
    forecast: [],
    place: { lat: 12.97, lng: 77.59 },
    woke: {},
    clock: hhmm,
    ...o,
  });

  it('plans each day of a trip and stands in for its start reminders', () => {
    const p = planAlarms(world());
    expect(new Set(p.steps.map((s) => s.group))).toEqual(new Set(['trip:t1:2026-11-16', 'trip:t1:2026-11-17']));
    expect(p.steps[0].title).toBe('Day 1: Coast run at 6:00');
    expect(p.replaces).toEqual(['trip:t1:2026-11-16:day0:pre', 'trip:t1:2026-11-16:day1:pre']);
  });

  it('works out the sun on the phone when the forecast has none', () => {
    const c = rideContexts(world())[0].ctx;
    // Bangalore on 16 November: about 06:15 IST (00:45 UTC).
    expect(Math.abs((c.sun?.sunriseMs ?? 0) - Date.UTC(2026, 10, 16, 0, 45))).toBeLessThan(10 * MIN);
  });

  it('skips a day the rider already got up for, a started first day and an ended trip', () => {
    expect(planAlarms(world({ woke: { 'trip:t1:2026-11-16': 1 } })).steps.every((s) => s.group.endsWith('11-17'))).toBe(true);
    expect(planAlarms(world({ trips: [{ id: 't1', name: 'Coast run', startDate: '2026-11-16', startTime: 360, days: [{}, {}], startedAt: 1 }] })).steps.every((s) => s.group.endsWith('11-17'))).toBe(true);
    expect(planAlarms(world({ trips: [{ id: 't1', name: 'Coast run', startDate: '2026-11-16', startTime: 360, endedAt: 1 }] })).steps).toEqual([]);
  });

  it('plans a club ride from what was kept when the alarm was set', () => {
    const p = planAlarms(world({ settings: [{ key: 'event:e1', kind: 'event', refId: 'e1', leadMin: 15, goal: 'start', title: 'Dust Devils breakfast', startsAt: at(7, 0, 16) }] }));
    expect(p.steps[0].group).toBe('event:e1:2026-11-16');
    expect(p.steps[0].title).toBe('Dust Devils breakfast at 7:00');
  });

  it('plans nothing past the horizon', () => {
    expect(planAlarms(world({ trips: [{ id: 't1', name: 'Later', startDate: '2026-12-20', startTime: 360 }] })).steps).toEqual([]);
  });
});
