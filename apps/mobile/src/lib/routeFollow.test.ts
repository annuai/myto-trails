import { describe, expect, it } from 'vitest';
import type { LatLng } from './geo';
import { distanceToLine, nearestOnLine, startFollow, stepFollow } from './routeFollow';

// A line along the equator-ish: 0.01 degrees of longitude at 12 N is about 1.09 km.
const line: LatLng[] = [{ lat: 12, lng: 77 }, { lat: 12, lng: 77.01 }, { lat: 12, lng: 77.02 }];
const at = (lat: number, lng: number): LatLng => ({ lat, lng });

describe('nearestOnLine', () => {
  it('measures the distance from the line, not from the nearest vertex', () => {
    // 0.0009 degrees of latitude is about 100 m, half way between two vertices.
    expect(distanceToLine(line, at(12.0009, 77.005))).toBeGreaterThan(95);
    expect(distanceToLine(line, at(12.0009, 77.005))).toBeLessThan(105);
  });
  it('is zero on the line and reports how far along it is', () => {
    const p = nearestOnLine(line, at(12, 77.01))!;
    expect(p.distM).toBeLessThan(1);
    expect(p.alongM).toBeGreaterThan(1000);
    expect(p.alongM).toBeLessThan(1200);
  });
  it('handles an empty line and a single point', () => {
    expect(nearestOnLine([], at(12, 77))).toBeNull();
    expect(distanceToLine([], at(12, 77))).toBe(Infinity);
    expect(distanceToLine([at(12, 77)], at(12, 77))).toBe(0);
  });
});

describe('stepFollow', () => {
  it('stays on the route for a short excursion', () => {
    let r = stepFollow(startFollow, 150, 0);
    r = stepFollow(r.state, 150, 10_000);
    expect(r.wentOff).toBe(false);
    r = stepFollow(r.state, 40, 15_000);
    expect(r.state).toEqual(startFollow);
  });
  it('goes off once, after 20 s beyond 100 m', () => {
    let r = stepFollow(startFollow, 150, 0);
    r = stepFollow(r.state, 150, 19_000);
    expect(r.wentOff).toBe(false);
    r = stepFollow(r.state, 150, 20_000);
    expect(r.wentOff).toBe(true);
    r = stepFollow(r.state, 150, 30_000);
    expect(r.wentOff).toBe(false);
    expect(r.state.off).toBe(true);
  });
  it('comes back only within 60 m (80 m is not enough)', () => {
    let r = stepFollow({ off: true, farSince: null }, 80, 0);
    expect(r.backOn).toBe(false);
    r = stepFollow(r.state, 55, 1000);
    expect(r.backOn).toBe(true);
    expect(r.state.off).toBe(false);
  });
  it('restarts the wait after a return to within 100 m', () => {
    let r = stepFollow(startFollow, 150, 0);
    r = stepFollow(r.state, 90, 10_000);
    r = stepFollow(r.state, 150, 12_000);
    r = stepFollow(r.state, 150, 30_000);
    expect(r.wentOff).toBe(false);
  });
});
