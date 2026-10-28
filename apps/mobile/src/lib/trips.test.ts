import { describe, expect, it } from 'vitest';
import { tripDays, tripTotals } from './trips';

const at = (day: number, h: number) => new Date(2026, 9, day, h, 0, 0).getTime();
const ride = (day: number, h: number, km: number, sec: number) => ({ startedAt: at(day, h), distanceKm: km, durationSec: sec });

describe('trips', () => {
  const rides = [ride(2, 9, 80, 7200), ride(1, 8, 120.4, 10800), ride(1, 16, 30, 1800)];
  it('groups rides by day, first day first, rides in time order', () => {
    const days = tripDays(rides);
    expect(days.map((d) => d.date)).toEqual(['2026-10-01', '2026-10-02']);
    expect(days[0]!.rides.map((r) => r.startedAt)).toEqual([at(1, 8), at(1, 16)]);
  });
  it('totals each day', () => {
    expect(tripDays(rides)[0]).toMatchObject({ distanceKm: 150.4, durationSec: 12600 });
  });
  it('totals the whole trip', () => {
    expect(tripTotals(rides)).toEqual({ days: 2, distanceKm: 230.4, durationSec: 19800 });
  });
  it('an empty trip has nothing', () => {
    expect(tripDays([])).toEqual([]);
    expect(tripTotals([])).toEqual({ days: 0, distanceKm: 0, durationSec: 0 });
  });
});
