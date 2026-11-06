import { describe, expect, it } from 'vitest';
import { fitLongSide, lowerQuality, MIN_QUALITY, PHOTO_MAX_BYTES, PHOTO_SIZES } from './photoSizes';

describe('fitLongSide', () => {
  it('shrinks a landscape photo by its width and a portrait one by its height', () => {
    expect(fitLongSide(4032, 3024, 2048)).toEqual({ width: 2048 });
    expect(fitLongSide(3024, 4032, 2048)).toEqual({ height: 2048 });
    expect(fitLongSide(3000, 3000, 1080)).toEqual({ width: 1080 });
  });
  it('leaves a photo alone that already fits, so a small picture is never blown up', () => {
    expect(fitLongSide(800, 600, 2048)).toBeUndefined();
    expect(fitLongSide(400, 300, 400)).toBeUndefined();
  });
});

describe('lowerQuality', () => {
  it('steps down until it reaches the floor, then stops', () => {
    expect(lowerQuality(0.82)).toBe(0.7);
    expect(lowerQuality(0.7)).toBe(0.58);
    let q: number | undefined = 0.82, steps = 0;
    while (q !== undefined) { expect(q).toBeGreaterThanOrEqual(MIN_QUALITY); q = lowerQuality(q); steps++; }
    expect(steps).toBeLessThan(6);
  });
});

describe('the sizes', () => {
  it('agree with the site: 400, 1080 and 2048 pixels, and a limit that grows with the size', () => {
    expect(Object.values(PHOTO_SIZES)).toEqual([400, 1080, 2048]);
    expect(PHOTO_MAX_BYTES.thumb).toBeLessThan(PHOTO_MAX_BYTES.view);
    expect(PHOTO_MAX_BYTES.view).toBeLessThan(PHOTO_MAX_BYTES.full);
  });
});
