import { describe, expect, it } from 'vitest';
import type { LatLng } from './geo';
import { withCorrectTopSpeeds } from './fixTopSpeeds';

const M = 1 / 111_320;
const track = (glitch: boolean): LatLng[] => Array.from({ length: 40 }, (_, i) => ({ lat: 13 + (i * 10 + (glitch && i === 20 ? 45 : 0)) * M, lng: 77.6, t: 1_700_000_000_000 + i * 1000, acc: 5 }));
const ride = (extra: object = {}) => ({ maxKmh: 162, points: track(true), ...extra });

describe('withCorrectTopSpeeds', () => {
  it('replaces a glitch top speed with the real one', () => { const [r] = withCorrectTopSpeeds([ride()]); expect(r!.maxKmh).toBeGreaterThan(30); expect(r!.maxKmh).toBeLessThan(40); });
  it('leaves the sample ride alone', () => expect(withCorrectTopSpeeds([ride({ sample: true })])[0]!.maxKmh).toBe(162));
  it('leaves a ride with no times alone', () => expect(withCorrectTopSpeeds([ride({ maxKmh: 0, points: track(false).map(({ t, ...p }) => p) })])[0]!.maxKmh).toBe(0));
  it('returns the same ride when nothing changes', () => { const a = withCorrectTopSpeeds([ride()]); expect(withCorrectTopSpeeds(a)[0]).toBe(a[0]); });
});
