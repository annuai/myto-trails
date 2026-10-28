import { describe, expect, it } from 'vitest';
import { haversine, pathLength, type LatLng } from './geo';
import { forSharing, SHARE_TRIM_M, trimEnds } from './privacy';

// A straight north-south line of 21 points, about 111 m apart (0.001 degrees), roughly 2.2 km.
const line: LatLng[] = Array.from({ length: 21 }, (_, i) => ({ lat: 12 + i * 0.001, lng: 77 }));

describe('trimEnds', () => {
  it('cuts the track exactly N metres in from each end', () => {
    const out = trimEnds(line, 300);
    expect(haversine(line[0], out[0])).toBeCloseTo(300, -1);
    expect(haversine(line[20], out[out.length - 1])).toBeCloseTo(300, -1);
    expect(pathLength(out) / 1000).toBeCloseTo((pathLength(line) - 600) / 1000, 1);
  });
  it('trims a route of only two far-apart points, so a tapped route never shares where it starts', () => {
    const tapped: LatLng[] = [{ lat: 13, lng: 77.6 }, { lat: 13.1, lng: 77.6 }]; // about 11 km apart
    const out = trimEnds(tapped, 300);
    expect(out).toHaveLength(2);
    expect(haversine(tapped[0], out[0])).toBeCloseTo(300, -1);
    expect(haversine(tapped[1], out[1])).toBeCloseTo(300, -1);
    expect(trimEnds([tapped[0], { lat: 13.004, lng: 77.6 }], 300)).toEqual([]); // 440 m: nothing left to share
  });
  it('never returns a point of the original ends', () => {
    const out = trimEnds(line, 300);
    expect(out).not.toContainEqual(line[0]);
    expect(out).not.toContainEqual(line[20]);
  });
  it('leaves nothing when the ride is shorter than twice the trim', () => {
    expect(trimEnds(line.slice(0, 5), 300)).toEqual([]);
  });
  it('returns the track as it is when the trim is zero', () => {
    expect(trimEnds(line, 0)).toBe(line);
  });
});

describe('forSharing', () => {
  it('trims the standard distance from both ends', () => {
    const out = forSharing(line);
    expect(pathLength(out)).toBeLessThan(pathLength(line) - SHARE_TRIM_M * 2 + 120);
    expect(out.length).toBeLessThan(line.length);
  });
});
