import { describe, expect, it } from 'vitest';
import { cellsOf, newGround } from './newGround';

/** A ride east along the equator from `from` degrees, `n` points a cell apart. */
const along = (from: number, n: number) => Array.from({ length: n }, (_, i) => ({ lat: 0, lng: from + i * 0.001 }));
const ride = (id: string, startedAt: number, points: { lat: number; lng: number }[], distanceKm = 10) => ({ id, startedAt, points, distanceKm });

describe('cellsOf', () => {
  it('fills the gap between two fixes far apart', () => {
    expect(cellsOf([{ lat: 0, lng: 0 }, { lat: 0, lng: 0.01 }]).size).toBeGreaterThanOrEqual(10);
  });
  it('does not fill across a GPS break', () => {
    const pts = [{ lat: 0, lng: 0 }, { lat: 0, lng: 0.001 }, { lat: 0, lng: 0.5 }, { lat: 0, lng: 0.501 }];
    expect(cellsOf(pts, [2]).size).toBe(4);
  });
});

describe('newGround', () => {
  it('has nothing to say about a first ride, a sample ride or an empty track', () => {
    const a = ride('a', 1, along(0, 20));
    expect(newGround(a, [a])).toBeUndefined();
    expect(newGround({ ...a, sample: true }, [a])).toBeUndefined();
    expect(newGround({ ...a, points: [] }, [a])).toBeUndefined();
  });
  it('is all new on ground nobody rode before, and none on a repeat', () => {
    const old = ride('old', 1, along(0, 20));
    expect(newGround(ride('b', 2, along(5, 20)), [old])!.share).toBe(1);
    expect(newGround(ride('c', 2, along(0, 20)), [old])!.share).toBe(0);
  });
  it('is the new share of the ride, and that share of its distance', () => {
    const old = ride('old', 1, along(0, 20));
    const half = newGround(ride('d', 2, along(0.01, 20), 8), [old])!;
    expect(half.share).toBeGreaterThan(0.4);
    expect(half.share).toBeLessThan(0.6);
    expect(half.km).toBeCloseTo(half.share * 8, 5);
  });
  it('ignores rides that came later', () => {
    const later = ride('later', 9, along(0, 20));
    expect(newGround(ride('e', 2, along(0, 20)), [later])).toBeUndefined();
  });
});
