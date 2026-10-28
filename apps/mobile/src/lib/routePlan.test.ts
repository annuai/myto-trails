import { describe, expect, it } from 'vitest';
import type { LatLng } from './geo';
import { planRoute, simplify, simplifyTo } from './routePlan';

const p = (lat: number, lng: number): LatLng => ({ lat, lng });

describe('planRoute', () => {
  it('adds up the straight lines and estimates the time at the given speed', () => {
    // 0.1 degrees of latitude is about 11.1 km.
    const r = planRoute([p(12, 77), p(12.1, 77)], 40);
    expect(r.distanceKm).toBeGreaterThan(11);
    expect(r.distanceKm).toBeLessThan(11.2);
    expect(r.etaMin).toBe(17);
  });
  it('is zero for fewer than two points', () => {
    expect(planRoute([p(12, 77)])).toMatchObject({ distanceKm: 0, etaMin: 0 });
  });
});

describe('simplify', () => {
  it('drops points on a straight line and keeps a real corner', () => {
    const out = simplify([p(12, 77), p(12, 77.001), p(12, 77.002), p(12.01, 77.002)], 5);
    expect(out).toEqual([p(12, 77), p(12, 77.002), p(12.01, 77.002)]);
  });
  it('always keeps both ends', () => {
    const pts = [p(12, 77), p(12.0001, 77.0001), p(12.0002, 77.0002)];
    const out = simplify(pts, 1000);
    expect(out[0]).toEqual(pts[0]);
    expect(out[out.length - 1]).toEqual(pts[2]);
  });
});

describe('simplifyTo', () => {
  it('caps a long wiggly track at the limit and keeps the ends', () => {
    const pts = Array.from({ length: 5000 }, (_, i) => p(12 + i * 0.0001, 77 + Math.sin(i / 20) * 0.01));
    const out = simplifyTo(pts, 300);
    expect(out.length).toBeLessThanOrEqual(300);
    expect(out.length).toBeGreaterThan(50);
    expect(out[0]).toEqual(pts[0]);
    expect(out[out.length - 1]).toEqual(pts[pts.length - 1]);
  });
  it('returns a short track untouched', () => {
    const pts = [p(12, 77), p(12.1, 77.1)];
    expect(simplifyTo(pts, 10)).toBe(pts);
  });
});
