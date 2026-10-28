import { describe, expect, it } from 'vitest';
import type { LatLng } from './geo';
import { elevationProfile } from './elevation';

const at = (i: number, ele?: number): LatLng => ({ lat: 12 + i * 0.001, lng: 77, ...(ele !== undefined ? { ele } : {}) });

describe('elevationProfile', () => {
  it('adds up climbs and descents and finds the lowest and highest point', () => {
    const p = elevationProfile([at(0, 100), at(1, 150), at(2, 130), at(3, 200)])!;
    expect(p).toMatchObject({ gainM: 120, lossM: 20, minM: 100, maxM: 200 });
  });
  it('ignores wobble smaller than 3 m', () => {
    const p = elevationProfile([at(0, 100), at(1, 101), at(2, 99.5), at(3, 100.5), at(4, 100)])!;
    expect(p.gainM).toBe(0);
    expect(p.lossM).toBe(0);
  });
  it('is null without at least two heights', () => {
    expect(elevationProfile([at(0), at(1), at(2)])).toBeNull();
    expect(elevationProfile([at(0, 100)])).toBeNull();
  });
  it('gives distance in km from the start and downsamples long tracks, keeping the last point', () => {
    const pts = Array.from({ length: 1000 }, (_, i) => at(i, 100 + i));
    const p = elevationProfile(pts, 50)!;
    expect(p.samples.length).toBeLessThanOrEqual(51);
    expect(p.samples[0]).toEqual({ d: 0, e: 100 });
    expect(p.samples[p.samples.length - 1].e).toBe(1099);
    expect(p.samples[p.samples.length - 1].d).toBeGreaterThan(100);
  });
  it('uses only the points that have a height', () => {
    const p = elevationProfile([at(0, 100), at(1), at(2, 160)])!;
    expect(p.gainM).toBe(60);
    expect(p.samples).toHaveLength(2);
  });
});
