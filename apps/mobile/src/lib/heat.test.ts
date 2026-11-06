import { describe, expect, it } from 'vitest';
import { heatBounds, heatDotFeatures, heatLineFeatures, heatMap, heatSummary, ridesIn } from './heat';

const NOW = new Date('2026-11-06T10:00:00Z').getTime();
const DAY = 86_400_000;
const ride = (points: { lat: number; lng: number }[], over: { startedAt?: number; breaks?: number[]; sample?: boolean; distanceKm?: number } = {}) =>
  ({ startedAt: NOW - DAY, distanceKm: 10, points, ...over });

describe('heatMap', () => {
  /** A road about 1.1 km north from `lat`, recorded as dense points like a real ride. */
  const road = (lat: number, lng = 77.6) => Array.from({ length: 111 }, (_, i) => ({ lat: lat + i * 0.0001, lng }));
  const heats = (m: ReturnType<typeof heatMap>) => [...new Set(m.lines.map((l) => l.heat))].sort();

  it('draws a ride that was ridden once as a visible line at the lowest heat, end to end', () => {
    const m = heatMap([ride(road(12.9))]);
    expect(heats(m)).toEqual([0]);
    const pts = m.lines.flatMap((l) => l.points);
    expect(Math.min(...pts.map((p) => p.lat))).toBeCloseTo(12.9, 3);
    expect(Math.max(...pts.map((p) => p.lat))).toBeCloseTo(12.911, 3);
  });

  it('draws the rider\'s own track, not a grid: a straight road is a handful of points, a bend is kept', () => {
    const m = heatMap([ride([...road(12.9), ...road(12.91, 77.6).map((p, i) => ({ lat: 12.91, lng: 77.6 + i * 0.0001 }))])]);
    const pts = m.lines.flatMap((l) => l.points);
    expect(pts.some((p) => Math.abs(p.lat - 12.91) < 0.0002 && Math.abs(p.lng - 77.6) < 0.0002)).toBe(true);
    expect(pts.length).toBeLessThan(120);
  });

  it('makes a road ridden more often hotter than one ridden once, scaled to the busiest', () => {
    const m = heatMap([ride(road(12.9)), ride(road(12.9)), ride(road(12.9)), ride(road(12.9, 77.7))]);
    expect(Math.max(...heats(m))).toBe(1);
    expect(Math.min(...heats(m))).toBe(0);
  });

  it('keeps a once-ridden road in the map when other roads are ridden many times', () => {
    const m = heatMap([ride(road(12.9)), ride(road(12.9)), ride(road(12.9)), ride(road(12.9, 77.7))]);
    const lonely = m.lines.filter((l) => l.heat === 0).flatMap((l) => l.points);
    expect(lonely.length).toBeGreaterThan(1);
    expect(lonely.every((p) => Math.abs(p.lng - 77.7) < 0.001)).toBe(true);
  });

  it('cuts a road where its heat changes, and the pieces meet so the line is unbroken', () => {
    const half = road(12.9).slice(0, 56);
    const m = heatMap([ride(road(12.9)), ride(half), ride(half)]);
    expect(heats(m).length).toBeGreaterThan(1);
    const hot = m.lines.filter((l) => l.heat > 0), cold = m.lines.filter((l) => l.heat === 0);
    const meets = hot.some((h) => cold.some((c) => [h.points[0]!, h.points.at(-1)!].some((e) => c.points.some((p) => p.lat === e.lat && p.lng === e.lng))));
    expect(meets).toBe(true);
  });

  it('sorts lines coolest first, so the busiest are drawn on top', () => {
    const m = heatMap([ride(road(12.9)), ride(road(12.9)), ride(road(12.9, 77.7))]);
    expect(m.lines.every((l, i) => i === 0 || l.heat >= m.lines[i - 1]!.heat)).toBe(true);
  });

  it('counts a cell once per ride, even when the ride crossed it twice', () => {
    const twice = ride([...road(12.9), ...road(12.9).reverse()]);
    expect(Math.max(...heatMap([twice]).dots.map((d) => d.heat))).toBe(0);
    expect(heats(heatMap([twice, ride(road(12.9))]))).toEqual([1]);
  });

  it('gives the glow one dot per cell ridden, with the same heat scale', () => {
    const m = heatMap([ride(road(12.9)), ride(road(12.9)), ride(road(12.9, 77.7))]);
    expect(m.dots.length).toBeGreaterThan(10);
    expect(Math.max(...m.dots.map((d) => d.heat))).toBe(1);
    expect(Math.min(...m.dots.map((d) => d.heat))).toBe(0);
  });

  it('does not draw across a break in the track', () => {
    const track = [...road(12.9), ...road(12.95)];
    const inGap = (m: ReturnType<typeof heatMap>) => m.lines.flatMap((l) => l.points).filter((p) => p.lat > 12.92 && p.lat < 12.94).length;
    expect(inGap(heatMap([ride(track, { breaks: [111] })]))).toBe(0);
    expect(inGap(heatMap([ride(track)]))).toBeGreaterThan(0);
  });

  it('ignores the sample ride, and for a long history coarsens the glow cells instead of dropping roads', () => {
    expect(heatMap([ride(road(12.9), { sample: true })])).toEqual({ lines: [], dots: [] });
    const many = ride(Array.from({ length: 400 }, (_, i) => ({ lat: 12.9 + i * 0.002, lng: 77.6 + (i % 2) * 0.001 })));
    const m = heatMap([many], 0.0006, 300);
    expect(m.dots.length).toBeLessThanOrEqual(300);
    expect(m.lines.length).toBeGreaterThan(0);
  });
});

describe('ridesIn', () => {
  const rides = [ride([], { startedAt: NOW - 10 * DAY }), ride([], { startedAt: NOW - 200 * DAY }), ride([], { startedAt: NOW - 400 * DAY })];
  it('all keeps every ride', () => expect(ridesIn(rides, 'all', NOW)).toHaveLength(3));
  it('quarter keeps the last 90 days', () => expect(ridesIn(rides, 'quarter', NOW)).toHaveLength(1));
  it('year keeps this calendar year', () => expect(ridesIn(rides, 'year', NOW)).toHaveLength(2));
});

describe('heatSummary and heatBounds', () => {
  it('counts real rides and their distance', () => {
    expect(heatSummary([ride([], { distanceKm: 12.5 }), ride([], { distanceKm: 7.5 }), ride([], { sample: true, distanceKm: 99 })])).toEqual({ rides: 2, distanceKm: 20 });
  });
  it('bounds what is drawn, and is nothing for an empty map', () => {
    expect(heatBounds({ lines: [{ points: [{ lat: 1, lng: 5 }, { lat: 3, lng: 2 }], heat: 0 }], dots: [] })).toEqual([2, 1, 5, 3]);
    expect(heatBounds({ lines: [], dots: [{ lat: 4, lng: 6, heat: 0 }] })).toEqual([6, 4, 6, 4]);
    expect(heatBounds({ lines: [], dots: [] })).toBeUndefined();
  });
  it('turns lines and dots into map features that carry their heat', () => {
    const m = { lines: [{ points: [{ lat: 1, lng: 2 }, { lat: 3, lng: 4 }], heat: 0.5 }], dots: [{ lat: 1, lng: 2, heat: 1 }] };
    expect(heatLineFeatures(m).features[0]).toEqual({ type: 'Feature', properties: { heat: 0.5 }, geometry: { type: 'LineString', coordinates: [[2, 1], [4, 3]] } });
    expect(heatDotFeatures(m).features[0]).toEqual({ type: 'Feature', properties: { heat: 1 }, geometry: { type: 'Point', coordinates: [2, 1] } });
    expect(heatLineFeatures().features).toEqual([]);
  });
});
