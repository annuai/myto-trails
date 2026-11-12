import { describe, expect, it } from 'vitest';
import { closingAt, prepareClosing } from './closing';

/** A straight ride east along the equator: 0.001 degrees is about 111 m. */
const line = (n: number) => Array.from({ length: n }, (_, i) => ({ lat: 0, lng: i * 0.001 }));

describe('prepareClosing', () => {
  it('thins a long track and keeps the first and last points', () => {
    const c = prepareClosing(line(2000), [], [], 100);
    expect(c.points.length).toBeLessThanOrEqual(101);
    expect(c.points[0]).toEqual({ lat: 0, lng: 0 });
    expect(c.points[c.points.length - 1]).toEqual({ lat: 0, lng: 1.999 });
  });
  it('keeps both sides of a GPS gap and spends no distance on it', () => {
    const pts = [...line(5), ...line(5).map((p) => ({ ...p, lng: p.lng + 1 }))];
    const c = prepareClosing(pts, [5], [], 4);
    expect(c.breaks).toHaveLength(1);
    const b = c.breaks[0]!;
    expect(c.along[b]).toBe(c.along[b - 1]);
  });
  it('places each waypoint along the track', () => {
    const c = prepareClosing(line(11), [], [{ lat: 0, lng: 0.005 }]);
    expect(c.waypointAt[0]).toBeGreaterThan(c.totalM * 0.4);
    expect(c.waypointAt[0]).toBeLessThan(c.totalM * 0.6);
  });
});

describe('closingAt', () => {
  const c = prepareClosing(line(11), [], [{ lat: 0, lng: 0.002 }, { lat: 0, lng: 0.009 }]);
  it('has no head at the start and the whole track at the end', () => {
    expect(closingAt(c, 0).head).toBeUndefined();
    const end = closingAt(c, 1);
    expect(end.track).toHaveLength(11);
    expect(end.head).toBeUndefined();
    expect(end.passed).toEqual([0, 1]);
  });
  it('ends the ink at an interpolated head part way along', () => {
    const f = closingAt(c, 0.55);
    expect(f.head!.lng).toBeCloseTo(0.0055, 4);
    expect(f.track[f.track.length - 1]).toEqual(f.head);
    expect(f.passed).toEqual([0]);
  });
  it('only ever grows', () => {
    let last = 0;
    for (let i = 0; i <= 20; i++) { const n = closingAt(c, i / 20).track.length; expect(n).toBeGreaterThanOrEqual(last); last = n; }
  });
  it('does not draw across a gap while the head is before it', () => {
    const pts = [...line(5), ...line(5).map((p) => ({ ...p, lng: p.lng + 1 }))];
    const g = prepareClosing(pts, [5]);
    const half = closingAt(g, 0.4);
    expect(half.head!.lng).toBeLessThan(0.1);
    const near = closingAt(g, 0.99);
    expect(near.breaks).toEqual([5]);
  });
  it('is the whole track when there is nothing to draw along', () => {
    const one = prepareClosing([{ lat: 0, lng: 0 }]);
    expect(closingAt(one, 0.5).track).toHaveLength(1);
  });
});
