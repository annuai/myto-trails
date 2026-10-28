import { describe, expect, it } from 'vitest';
import { pathLength, type LatLng } from './geo';
import { forSharing, SHARE_TRIM_M, trimEnds } from './privacy';

// A straight north-south line of 21 points, about 111 m apart (0.001 degrees), roughly 2.2 km.
const line: LatLng[] = Array.from({ length: 21 }, (_, i) => ({ lat: 12 + i * 0.001, lng: 77 }));

describe('trimEnds', () => {
  it('removes the first and last N metres', () => {
    const out = trimEnds(line, 300);
    expect(out[0]).toEqual(line[3]);
    expect(out[out.length - 1]).toEqual(line[17]);
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
