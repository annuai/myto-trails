import { describe, expect, it } from 'vitest';
import { earnedMarks, MARKS, markDef, newMarks, type MarkRide } from './marks';

const at = (h: number, m = 0) => new Date(2026, 5, 10, h, m).getTime();
const ride = (o: Partial<MarkRide> = {}): MarkRide => ({ distanceKm: 20, startedAt: at(9), durationSec: 3600, ...o });
const none = { servicesDone: 0, fixesDone: 0 };

describe('earnedMarks', () => {
  it('earns nothing with no rides, and ignores the sample ride', () => {
    expect(earnedMarks({ rides: [], ...none })).toEqual([]);
    expect(earnedMarks({ rides: [ride({ sample: true, distanceKm: 900 })], ...none })).toEqual([]);
  });
  it('earns the first ride', () => {
    expect(earnedMarks({ rides: [ride()], ...none })).toEqual(['first-ride']);
  });
  it('earns distance marks from the running total', () => {
    const rides = [ride({ distanceKm: 60 }), ride({ distanceKm: 60 })];
    expect(earnedMarks({ rides, ...none })).toEqual(['first-ride', 'km-100']);
    expect(earnedMarks({ rides: [ride({ distanceKm: 5000 })], ...none })).toEqual(['first-ride', 'km-100', 'km-500', 'km-1000', 'km-5000']);
  });
  it('earns a night ride when the ride is out past 8 pm or before 5 am', () => {
    expect(earnedMarks({ rides: [ride({ startedAt: at(19, 30), durationSec: 3 * 3600 })], ...none })).toContain('first-night');
    expect(earnedMarks({ rides: [ride({ startedAt: at(4, 0), durationSec: 1800 })], ...none })).toContain('first-night');
    expect(earnedMarks({ rides: [ride({ startedAt: at(10), durationSec: 3600 })], ...none })).not.toContain('first-night');
  });
  it('counts paused time as part of the trip', () => {
    expect(earnedMarks({ rides: [ride({ startedAt: at(18), durationSec: 3600, pausedSec: 3600 })], ...none })).toContain('first-night');
  });
  it('earns group, service and fix marks from what was done', () => {
    expect(earnedMarks({ rides: [ride({ groupId: 'g' })], servicesDone: 1, fixesDone: 2 })).toEqual(['first-ride', 'first-group', 'first-service', 'first-fix']);
  });
});

describe('newMarks', () => {
  it('returns only what is not held yet, in list order', () => {
    expect(newMarks(['first-ride'], ['first-ride', 'km-100'])).toEqual(['km-100']);
    expect(newMarks([], [])).toEqual([]);
  });
});

describe('the list', () => {
  it('has unique ids and a definition for each', () => {
    expect(new Set(MARKS.map((m) => m.id)).size).toBe(MARKS.length);
    expect(markDef('km-500')?.title).toBe('500 km');
    expect(markDef('nope')).toBeUndefined();
  });
});
