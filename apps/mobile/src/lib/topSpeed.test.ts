import { describe, expect, it } from 'vitest';
import type { LatLng } from './geo';
import { medianOf, topSpeedKmh } from './topSpeed';
import { fixSpeedKmh } from './liveSpeed';

const M = 1 / 111_320;
/** A straight northbound track at `mps`, one fix a second. */
const ride = (mps: number, seconds: number, from = 0): LatLng[] => Array.from({ length: seconds + 1 }, (_, i) => ({ lat: 13 + (from + i * mps) * M, lng: 77.6, t: 1_700_000_000_000 + i * 1000, acc: 5 }));

describe('top speed', () => {
  it('reads a steady ride', () => expect(topSpeedKmh([ride(20, 30)])).toBeCloseTo(72, 0));
  it('ignores one fix that jumps 45 m in a second (a 162 km/h reading)', () => {
    const t = ride(10, 30);
    t[15] = { ...t[15]!, lat: t[15]!.lat + 45 * M };
    expect(topSpeedKmh([t])).toBeLessThan(45);
  });
  it('ignores two fixes a fifth of a second apart', () => {
    const t = ride(10, 30);
    t.splice(10, 0, { ...t[9]!, t: t[9]!.t! + 200, lat: t[9]!.lat + 9 * M });
    expect(topSpeedKmh([t])).toBeLessThan(45);
  });
  it('ignores fixes of poor accuracy', () => {
    const t = ride(10, 30);
    for (let i = 12; i < 20; i++) t[i] = { ...t[i]!, lat: t[i]!.lat + (i % 2 ? 80 : 0) * M, acc: 60 };
    expect(topSpeedKmh([t])).toBeLessThan(45);
  });
  it('still finds a real burst held for several seconds', () => {
    const t = [...ride(10, 15), ...ride(30, 12, 150).slice(1).map((p, i) => ({ ...p, t: 1_700_000_000_000 + (16 + i) * 1000 }))];
    expect(topSpeedKmh([t])).toBeGreaterThan(100);
  });
  it('is zero for a track too short to judge', () => expect(topSpeedKmh([ride(10, 2)])).toBe(0));
  it('median of the middle', () => expect(medianOf([5, 1, 100, 3, 4])).toBe(4));
});

describe('speed of a fix', () => {
  it('prefers the position when the phone claims far more than the track shows', () =>
    expect(fixSpeedKmh({ stepM: 10, dtSec: 1, inside: false, reportedMps: 45 })).toBeCloseTo(36, 0));
  it('trusts the phone when it agrees with the track', () =>
    expect(fixSpeedKmh({ stepM: 10, dtSec: 1, inside: false, reportedMps: 10.5 })).toBeCloseTo(37.8, 1));
});
