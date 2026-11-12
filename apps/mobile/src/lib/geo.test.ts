import { describe, expect, it } from 'vitest';
import { haversine, travelHeading, trimNearPlaces, type LatLng } from './geo';

describe('travelHeading', () => {
  it('is undefined with no track or no movement', () => {
    expect(travelHeading([])).toBeUndefined();
    expect(travelHeading([{ lat: 12, lng: 77 }, { lat: 12.00001, lng: 77 }])).toBeUndefined();
  });

  it('points north, east and south along a track', () => {
    expect(travelHeading([{ lat: 12, lng: 77 }, { lat: 12.001, lng: 77 }])).toBeCloseTo(0, 0);
    expect(travelHeading([{ lat: 12, lng: 77 }, { lat: 12, lng: 77.001 }])).toBeCloseTo(90, 0);
    expect(travelHeading([{ lat: 12.001, lng: 77 }, { lat: 12, lng: 77 }])).toBeCloseTo(180, 0);
  });
});

describe('trimNearPlaces', () => {
  /** North from Home, a point every ~11 m. */
  const line = (n: number): LatLng[] => Array.from({ length: n }, (_, i) => ({ lat: 12 + i * 0.0001, lng: 77 }));
  const home = { lat: 12, lng: 77 };

  it('drops the leading and trailing points within 500 m of Home or Work', () => {
    const pts = line(1000);
    const work = pts[999]!;
    const out = trimNearPlaces(pts, [home, work]);
    expect(haversine(out[0]!, home)).toBeGreaterThan(500);
    expect(haversine(out[0]!, home)).toBeLessThan(520);
    expect(haversine(out[out.length - 1]!, work)).toBeGreaterThan(500);
    expect(out.length).toBeGreaterThan(890);
  });
  it('keeps a pass near a place in the middle of the ride', () => {
    const pts = line(1000);
    expect(trimNearPlaces(pts, [pts[500]!])).toEqual(pts);
  });
  it('is the route unchanged when no place is set', () => {
    const pts = line(100);
    expect(trimNearPlaces(pts, [])).toBe(pts);
  });
  it('is empty for a ride entirely within 500 m of a place', () => {
    expect(trimNearPlaces(line(40), [home])).toEqual([]);
  });
  it('takes another distance', () => {
    expect(haversine(trimNearPlaces(line(1000), [home], 100)[0]!, home)).toBeLessThan(120);
  });
});
