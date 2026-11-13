import { describe, expect, it } from 'vitest';
import { decodeTrack, encodeTrack } from './trackCodec';
import type { LatLng } from '@/lib/geo';

const near = (a: number | undefined, b: number | undefined, eps: number) => expect(Math.abs((a ?? NaN) - (b ?? NaN))).toBeLessThanOrEqual(eps);

describe('track codec', () => {
  it('round-trips positions, times, heights, speeds and breaks', () => {
    const pts: LatLng[] = [
      { lat: 12.971599, lng: 77.594566, t: 1_700_000_000_000, ele: 920.4, speed: 0, acc: 4.5 },
      { lat: 12.971733, lng: 77.594701, t: 1_700_000_001_000, ele: 920.9, speed: 31.25, acc: 5 },
      { lat: -33.8688, lng: 151.2093 },
      { lat: -33.86881, lng: 151.20931, t: 1_700_000_009_500, speed: null },
    ];
    const { points, breaks } = decodeTrack(encodeTrack(pts, [2]));
    expect(breaks).toEqual([2]);
    expect(points).toHaveLength(4);
    pts.forEach((p, i) => {
      near(points[i]!.lat, p.lat, 1e-6); near(points[i]!.lng, p.lng, 1e-6);
      expect(points[i]!.t).toBe(p.t);
      if (p.ele !== undefined) near(points[i]!.ele, p.ele, 0.05);
      if (typeof p.speed === 'number') near(points[i]!.speed ?? undefined, p.speed, 0.005);
    });
    expect(points[2]).toEqual({ lat: -33.8688, lng: 151.2093 });
  });

  it('handles an empty ride', () => {
    expect(decodeTrack(encodeTrack([]))).toEqual({ points: [], breaks: [] });
  });

  it('keeps a three hour ride well under the 400 KB limit', () => {
    const pts: LatLng[] = Array.from({ length: 10_800 }, (_, i) => ({ lat: 12.9 + i * 0.00003 + Math.sin(i / 50) * 0.0002, lng: 77.5 + i * 0.00004, t: 1_700_000_000_000 + i * 1000, ele: 900 + Math.sin(i / 90) * 20, speed: 40 + Math.sin(i / 30) * 10, acc: 5 }));
    const bytes = encodeTrack(pts);
    expect(bytes.byteLength).toBeLessThan(200 * 1024);
    expect(decodeTrack(bytes).points).toHaveLength(10_800);
  });

  it('refuses a version it does not know', () => {
    const { gzipSync, strToU8 } = require('fflate') as typeof import('fflate');
    expect(() => decodeTrack(gzipSync(strToU8(JSON.stringify({ v: 99 }))))).toThrow(/newer version/);
  });
});
