import { afterEach, describe, expect, it } from 'vitest';
import { dueInfo, type Todo } from './todos';
import { rideSurfaceProps } from './rideActions';
import { speedKmh, distanceKm, elevationM, fromKm, roundedDistanceKm, setDistanceUnit, shortDistanceM, toKm, withUnit } from './units';
import { effectiveUnit } from '@/store/region';

afterEach(() => setDistanceUnit('km'));

describe('kilometres are the default', () => {
  it('does not turn into miles because of the rider\'s country', () => {
    expect(effectiveUnit({ unit: null })).toBe('km');
    expect(effectiveUnit({ unit: 'mi' })).toBe('mi');
    expect(effectiveUnit({ unit: 'km' })).toBe('km');
  });
});

describe('miles mode changes every distance the app shows', () => {
  it('converts distances, speeds and heights', () => {
    setDistanceUnit('mi');
    expect(withUnit(distanceKm(16.09344))).toBe('10 mi');
    expect(withUnit(speedKmh(80))).toBe('50 mph');
    expect(withUnit(elevationM(1000))).toBe('3,281 ft');
  });
  it('writes short distances in feet, then miles', () => {
    expect(withUnit(shortDistanceM(350))).toBe('350 m');
    expect(withUnit(shortDistanceM(1200))).toBe('1.2 km');
    setDistanceUnit('mi');
    expect(withUnit(shortDistanceM(100))).toBe('330 ft');
    expect(withUnit(shortDistanceM(1200))).toBe('0.7 mi');
  });
  it('round-trips a typed distance through kilometres', () => {
    setDistanceUnit('mi');
    expect(toKm(100)).toBeCloseTo(160.9344);
    expect(fromKm(toKm(100))).toBeCloseTo(100);
    setDistanceUnit('km');
    expect(toKm(100)).toBe(100);
  });
  it('rounds "about 150 km" tidily in either unit', () => {
    expect(withUnit(roundedDistanceKm(148))).toBe('150 km');
    setDistanceUnit('mi');
    expect(withUnit(roundedDistanceKm(148))).toBe('90 mi');
  });
  it('words a service reminder in the shown unit', () => {
    const todo: Todo = { id: 't', title: 'Chain lube', category: 'service', kind: 'service', done: false, everyKm: 500, everyMonths: 6, lastDate: '2026-10-01', lastKm: 0 };
    expect(dueInfo(todo, 200, '2026-10-30').text).toContain('300 km');
    setDistanceUnit('mi');
    expect(dueInfo(todo, 200, '2026-10-30').text).toContain('190 mi');
  });
  it('gives the ride notification its number and its unit', () => {
    const base = { paused: false, group: false, elapsedMs: 600_000, meters: 16_093, now: 0 };
    expect(rideSurfaceProps(base)).toMatchObject({ km: '16.1', unit: 'km' });
    setDistanceUnit('mi');
    expect(rideSurfaceProps(base)).toMatchObject({ km: '10', unit: 'mi' });
  });
});
