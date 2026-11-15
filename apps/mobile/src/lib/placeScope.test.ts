import { describe, expect, it } from 'vitest';
import { boxAround, kmFrom, NEARBY_KM, searchCentre, withinKm } from './placeScope';

const mysuru = { lat: 12.3, lng: 76.65 };
const paris = { lat: 48.85, lng: 2.35 };
const bengaluru = { lat: 12.97, lng: 77.59 };

describe('boxAround', () => {
  it('is about the radius wide on each side', () => {
    const [w, s, e, n] = boxAround(mysuru, 500);
    expect(n - mysuru.lat).toBeCloseTo(4.49, 1);
    expect(mysuru.lat - s).toBeCloseTo(4.49, 1);
    expect(e - mysuru.lng).toBeCloseTo(w === 0 ? 0 : mysuru.lng - w, 5);
  });
  it('is wider in longitude far from the equator', () => {
    const eq = boxAround({ lat: 0, lng: 0 }); const hi = boxAround({ lat: 60, lng: 0 });
    expect(hi[2] - hi[0]).toBeGreaterThan(eq[2] - eq[0]);
  });
  it('stays inside the world', () => {
    const [w, s, e, n] = boxAround({ lat: 89, lng: 179 }, 2000);
    expect(w).toBeGreaterThanOrEqual(-180); expect(e).toBeLessThanOrEqual(180); expect(s).toBeGreaterThanOrEqual(-90); expect(n).toBeLessThanOrEqual(90);
  });
  it('does not blow up at the pole', () => { expect(boxAround({ lat: 90, lng: 0 }).every(Number.isFinite)).toBe(true); });
});

describe('withinKm', () => {
  const places = [{ name: 'Bengaluru', point: bengaluru }, { name: 'Paris', point: paris }];
  it('drops what is beyond the radius', () => { expect(withinKm(places, mysuru).map((p) => p.name)).toEqual(['Bengaluru']); });
  it('keeps everything with no centre', () => { expect(withinKm(places, undefined)).toHaveLength(2); });
  it('the default radius is the nearby one', () => { expect(kmFrom(mysuru, bengaluru)).toBeLessThan(NEARBY_KM); expect(kmFrom(mysuru, paris)).toBeGreaterThan(NEARBY_KM); });
});

describe('searchCentre', () => {
  it('takes the first one present', () => { expect(searchCentre(undefined, mysuru, paris)).toEqual(mysuru); });
  it('skips non-finite points', () => { expect(searchCentre({ lat: NaN, lng: 1 }, paris)).toEqual(paris); });
  it('is nothing when nothing is known', () => { expect(searchCentre(undefined, null)).toBeUndefined(); });
});
