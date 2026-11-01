import { describe, expect, it } from 'vitest';
import { atTrailStart, START_RADIUS_M, trailStartPoint } from './trailStart';

describe('trailStartPoint', () => {
  it('prefers the published location, then lat/lon, else nothing', () => {
    expect(trailStartPoint({ location: { lat: 1, lon: 2 }, lat: 9, lon: 9 })).toEqual({ lat: 1, lng: 2 });
    expect(trailStartPoint({ lat: 3, lon: 4 })).toEqual({ lat: 3, lng: 4 });
    expect(trailStartPoint({})).toBeUndefined();
  });
});
describe('atTrailStart', () => {
  it('is true only with a position inside the radius', () => {
    expect(atTrailStart(START_RADIUS_M)).toBe(true);
    expect(atTrailStart(START_RADIUS_M + 1)).toBe(false);
    expect(atTrailStart(undefined)).toBe(false);
  });
});
