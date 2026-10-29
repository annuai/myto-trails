import { describe, expect, it } from 'vitest';
import { yearRecap, yearsWithRides } from './yearRecap';

const ride = (when: Date, km: number, over: Partial<Parameters<typeof yearRecap>[0][number]> = {}) => ({ name: `Ride ${km}`, startedAt: when.getTime(), durationSec: Math.round(km * 90), distanceKm: km, maxKmh: 60, ...over });
const rides = [
  ride(new Date(2026, 0, 5, 7), 40),
  ride(new Date(2026, 0, 5, 16), 20, { maxKmh: 82 }),
  ride(new Date(2026, 2, 14, 6), 120, { name: 'Coorg loop' }),
  ride(new Date(2025, 11, 20, 8), 55),
  ride(new Date(2026, 5, 1, 8), 10, { sample: true }),
];

describe('yearRecap', () => {
  it('totals the year: rides, distance, time, days and the average', () => {
    const r = yearRecap(rides, 2026);
    expect(r).toMatchObject({ year: 2026, rides: 3, distanceKm: 180, durationSec: 16_200, daysRidden: 2, averageKm: 60, topSpeedKmh: 82 });
  });
  it('finds the longest ride and the busiest month by distance', () => {
    const r = yearRecap(rides, 2026);
    expect(r.longest).toEqual({ name: 'Coorg loop', distanceKm: 120 });
    expect(r.busiestMonth).toEqual({ name: 'March', distanceKm: 120 });
  });
  it('leaves out the sample ride that comes with the app', () => {
    expect(yearRecap(rides, 2026).rides).toBe(3);
    expect(yearsWithRides([ride(new Date(2020, 3, 1), 5, { sample: true })])).toEqual([]);
  });
  it('puts a ride in the year on the rider\'s own clock: 23:30 on 31 December and 00:30 on 1 January', () => {
    const edge = [ride(new Date(2026, 11, 31, 23, 30), 30), ride(new Date(2027, 0, 1, 0, 30), 50)];
    expect(yearRecap(edge, 2026)).toMatchObject({ rides: 1, distanceKm: 30 });
    expect(yearRecap(edge, 2027)).toMatchObject({ rides: 1, distanceKm: 50 });
  });
  it('is zeros and nothing for a year with no rides', () => {
    expect(yearRecap(rides, 2024)).toEqual({ year: 2024, rides: 0, distanceKm: 0, durationSec: 0, daysRidden: 0, longest: null, topSpeedKmh: 0, busiestMonth: null, averageKm: 0 });
  });
  it('has no busiest month when no distance was ridden', () => {
    expect(yearRecap([ride(new Date(2026, 4, 1), 0)], 2026).busiestMonth).toBeNull();
  });
});

describe('yearsWithRides', () => {
  it('lists each year once, newest first', () => {
    expect(yearsWithRides(rides)).toEqual([2026, 2025]);
    expect(yearsWithRides([])).toEqual([]);
  });
});
