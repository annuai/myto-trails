import { describe, expect, it } from 'vitest';
import type { Habit } from './habit';
import { ALL_TITLES, rideTitle, TITLE_MAX } from './rideTitle';

// 2026-11-02 is a Monday.
const at = (iso: string) => new Date(`${iso}:00`);
const commuteHabits = (startMin: number): Habit[] => [{ startMin, weekdays: [1, 2, 3, 4, 5], days: 5 }];
const base = { habits: [] as Habit[], rides: 40, planned: false };

describe('rideTitle', () => {
  it('welcomes a rider with no rides', () => expect(rideTitle({ ...base, rides: 0, now: at('2026-11-02T09:00') })).toBe('Ready for your first ride?'));
  it('asks "Back to office?" on a Monday morning when the rider has a weekday morning habit', () => {
    expect(rideTitle({ ...base, habits: commuteHabits(9 * 60), now: at('2026-11-02T08:30') })).toBe('Back to office?');
  });
  it('asks "Off to the office?" on the other weekday mornings', () => {
    expect(rideTitle({ ...base, habits: commuteHabits(9 * 60), now: at('2026-11-04T08:45') })).toBe('Off to the office?');
  });
  it('asks about home in the evening, with the weekend on a Friday', () => {
    expect(rideTitle({ ...base, habits: commuteHabits(18 * 60), now: at('2026-11-03T18:10') })).toBe('Heading home?');
    expect(rideTitle({ ...base, habits: commuteHabits(18 * 60), now: at('2026-11-06T18:10') })).toBe('Heading home for the weekend?');
  });
  it('does not call a habit a commute on a weekend, or one that includes weekends', () => {
    expect(rideTitle({ ...base, habits: commuteHabits(9 * 60), now: at('2026-11-07T09:00') })).toBe('Weekend. Where to?');
    expect(rideTitle({ ...base, habits: [{ startMin: 9 * 60, weekdays: [0, 1, 2, 3, 6], days: 5 }], now: at('2026-11-03T09:00') })).not.toMatch(/office/);
  });
  it('does not guess a commute at an hour far from the usual one', () => {
    expect(rideTitle({ ...base, habits: commuteHabits(9 * 60), now: at('2026-11-03T15:00') })).not.toMatch(/office|home/);
  });
  it('speaks to the hour and the day otherwise', () => {
    expect(rideTitle({ ...base, now: at('2026-11-03T22:30') })).toBe('Riding after dark?');
    expect(rideTitle({ ...base, now: at('2026-11-03T05:30') })).toBe('Chasing the sunrise?');
    expect(rideTitle({ ...base, now: at('2026-11-08T13:00') })).toBe('Sunday ride?');
    expect(rideTitle({ ...base, now: at('2026-11-07T17:00') })).toBe('Golden hour ride?');
    expect(rideTitle({ ...base, planned: true, now: at('2026-11-03T12:00') })).toBe('Your ride is planned.');
  });
  it('gives one plain greeting that holds all day', () => {
    const a = rideTitle({ ...base, now: at('2026-11-03T10:00') }), b = rideTitle({ ...base, now: at('2026-11-03T14:00') });
    expect(a).toBe(b);
  });
  it('never returns a title that could wrap to a third line', () => {
    for (const t of ALL_TITLES) expect(t.length).toBeLessThanOrEqual(TITLE_MAX);
    for (let d = 0; d < 14; d++) for (let h = 0; h < 24; h++) {
      const t = rideTitle({ ...base, habits: commuteHabits(9 * 60), now: new Date(2026, 10, 1 + d, h, 30) });
      expect(ALL_TITLES).toContain(t);
    }
  });
});
