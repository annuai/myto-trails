import { describe, expect, it } from 'vitest';
import { loneRatio, photoRows } from './photoLayout';

describe('photoRows', () => {
  it('lays out one to four photos, and shows only four however many there are', () => {
    expect(photoRows(0)).toEqual([]);
    expect(photoRows(1)).toEqual([[0]]);
    expect(photoRows(2)).toEqual([[0, 1]]);
    expect(photoRows(3)).toEqual([[0], [1, 2]]);
    expect(photoRows(4)).toEqual([[0, 1], [2, 3]]);
    expect(photoRows(10)).toEqual([[0, 1], [2, 3]]);
  });
});
describe('loneRatio', () => {
  it('keeps a photo\'s shape inside limits', () => {
    expect(loneRatio(4, 3)).toBeCloseTo(1.333, 2);
    expect(loneRatio(3, 4)).toBe(0.8);
    expect(loneRatio(4000, 1000)).toBe(1.6);
    expect(loneRatio(100, 0)).toBe(1.6);
  });
});
