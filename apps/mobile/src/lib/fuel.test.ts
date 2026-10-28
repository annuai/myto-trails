import { describe, expect, it } from 'vitest';
import type { LatLng } from './geo';
import { bboxOf, buildOverpassQuery, fuelGaps, parseOverpass } from './fuel';

// North along longitude 77: 0.1 degrees of latitude is about 11.06 km, so this line is about 55 km.
const line: LatLng[] = Array.from({ length: 6 }, (_, i) => ({ lat: 12 + i * 0.1, lng: 77 }));

describe('bboxOf and buildOverpassQuery', () => {
  it('pads the route and writes a fuel query for that box', () => {
    const b = bboxOf(line)!;
    expect(b.south).toBeLessThan(12);
    expect(b.north).toBeGreaterThan(12.5);
    const q = buildOverpassQuery(b);
    expect(q).toContain('[out:json]');
    expect(q).toContain('"amenity"="fuel"');
    expect(q).toContain(`(${b.south.toFixed(5)},${b.west.toFixed(5)},${b.north.toFixed(5)},${b.east.toFixed(5)})`);
  });
  it('has no box for an empty route', () => {
    expect(bboxOf([])).toBeNull();
  });
});

describe('parseOverpass', () => {
  it('reads nodes and the centre of ways, naming unnamed stations', () => {
    const out = parseOverpass({ elements: [
      { type: 'node', lat: 12.1, lon: 77, tags: { name: 'HP Pump' } },
      { type: 'way', center: { lat: 12.2, lon: 77.001 }, tags: { brand: 'Indian Oil' } },
      { type: 'node', lat: 12.3, lon: 77 },
      { type: 'relation' },
    ] });
    expect(out).toEqual([{ name: 'HP Pump', lat: 12.1, lng: 77 }, { name: 'Indian Oil', lat: 12.2, lng: 77.001 }, { name: 'Fuel', lat: 12.3, lng: 77 }]);
  });
  it('is empty for anything that is not an Overpass answer', () => {
    expect(parseOverpass(null)).toEqual([]);
    expect(parseOverpass({ remark: 'timeout' })).toEqual([]);
  });
});

describe('fuelGaps', () => {
  it('finds the stops in order and the longest stretch between them', () => {
    const g = fuelGaps(line, [{ name: 'B', lat: 12.4, lng: 77 }, { name: 'A', lat: 12.1, lng: 77 }]);
    expect(g.stops.map((s) => s.name)).toEqual(['A', 'B']);
    expect(g.totalKm).toBeGreaterThan(54);
    expect(g.totalKm).toBeLessThan(56);
    // Start to A is 11 km, A to B is 33 km, B to the end is 11 km.
    expect(g.longestGapKm).toBeGreaterThan(32);
    expect(g.longestGapKm).toBeLessThan(34);
    expect(g.longestGap.fromKm).toBeCloseTo(g.stops[0].km, 5);
  });
  it('ignores a station far from the route', () => {
    const g = fuelGaps(line, [{ name: 'Far', lat: 12.2, lng: 77.1 }]);
    expect(g.stops).toEqual([]);
    expect(g.longestGapKm).toBeCloseTo(g.totalKm, 5);
  });
  it('reports the whole route as the gap when there is no station at all', () => {
    expect(fuelGaps(line, []).longestGapKm).toBeGreaterThan(54);
  });

  it('counts the whole length of a loop, so a long stretch after the last pump is not lost', () => {
    // Out 22 km and back to the start: the last point is also the first, so "how far along" says 0.
    const loop: LatLng[] = [{ lat: 12, lng: 77 }, { lat: 12.1, lng: 77 }, { lat: 12.2, lng: 77 }, { lat: 12.1, lng: 77 }, { lat: 12, lng: 77 }];
    const g = fuelGaps(loop, [{ name: 'Pump', lat: 12.1, lng: 77 }]);
    expect(g.totalKm).toBeGreaterThan(43);
    expect(g.longestGapKm).toBeGreaterThan(30);
  });
});
