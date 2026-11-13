import { describe, expect, it } from 'vitest';
import { stepLook, swipeStep, DEFAULT_INTENSITY, IDENTITY, LOOKS, applyMatrix, clampIntensity, lookParams, matrixValues, multiply, saturation, type LookId } from './filmLook';

const gray = [0.5, 0.5, 0.5] as const;
const ids = LOOKS.map((l) => l.id);

describe('filmLook maths', () => {
  it('offers none and six looks, with none first', () => {
    expect(ids).toEqual(['none', 'colour-negative', 'faded-slide', 'mono', 'sepia', 'cross-process', 'halftone']);
  });
  it('multiplying by the identity changes nothing', () => {
    const m = saturation(0.5);
    expect(multiply(IDENTITY, m)).toEqual(m);
    expect(multiply(m, IDENTITY)).toEqual(m);
  });
  it('saturation 0 makes every channel the same grey; 1 is the identity', () => {
    const [r, g, b] = applyMatrix(saturation(0), [0.9, 0.2, 0.4]);
    expect(r).toBeCloseTo(g, 6);
    expect(g).toBeCloseTo(b, 6);
    applyMatrix(saturation(1), [0.9, 0.2, 0.4]).forEach((v, i) => expect(v).toBeCloseTo([0.9, 0.2, 0.4][i], 6));
  });
  it('clamps intensity to 0..1 and falls back to the default for junk', () => {
    expect(clampIntensity(-1)).toBe(0);
    expect(clampIntensity(3)).toBe(1);
    expect(clampIntensity(Number.NaN)).toBe(DEFAULT_INTENSITY);
  });
  it('none, and intensity 0, leave the picture untouched with no grain or vignette', () => {
    for (const id of ['none', ...ids] as LookId[]) {
      const p = lookParams(id, id === 'none' ? 1 : 0);
      expect(p.matrix).toEqual(IDENTITY);
      expect(p.grain).toBe(0);
      expect(p.vignette).toBe(0);
      expect(p.dots).toBe(0);
      expect(p.neutral).toBe(true);
    }
  });
  it('full intensity is the look itself; half is halfway', () => {
    const full = lookParams('sepia', 1).matrix;
    const half = lookParams('sepia', 0.5).matrix;
    full.forEach((v, i) => expect(half[i]).toBeCloseTo((IDENTITY[i] + v) / 2, 9));
    expect(lookParams('sepia', 1).neutral).toBe(false);
  });
  it('grain and vignette grow with intensity and stay gentle', () => {
    for (const l of LOOKS.filter((x) => x.id !== 'none')) {
      const lo = lookParams(l.id, 0.3);
      const hi = lookParams(l.id, 1);
      expect(hi.grain).toBeGreaterThan(lo.grain);
      expect(hi.vignette).toBeGreaterThan(lo.vignette);
      expect(hi.grain).toBeLessThanOrEqual(0.5);
      expect(hi.vignette).toBeLessThanOrEqual(0.4);
    }
  });
  it('black and white has no colour left and more contrast than the original', () => {
    const m = lookParams('mono', 1).matrix;
    const [r, g, b] = applyMatrix(m, [0.8, 0.3, 0.2]);
    expect(r).toBeCloseTo(g, 6);
    expect(g).toBeCloseTo(b, 6);
    expect(applyMatrix(m, [0.7, 0.7, 0.7])[0]).toBeGreaterThan(0.7);
    expect(applyMatrix(m, [0.3, 0.3, 0.3])[0]).toBeLessThan(0.3);
  });
  it('sepia turns grey warm; faded slide lifts the blacks; cross process cools shadows and warms highlights', () => {
    const [sr, , sb] = applyMatrix(lookParams('sepia', 1).matrix, gray);
    expect(sr).toBeGreaterThan(sb);
    expect(applyMatrix(lookParams('faded-slide', 1).matrix, [0, 0, 0])[0]).toBeGreaterThan(0.03);
    const cross = lookParams('cross-process', 1).matrix;
    const shadow = applyMatrix(cross, [0.1, 0.1, 0.1]);
    const light = applyMatrix(cross, [0.9, 0.9, 0.9]);
    expect(shadow[2]).toBeGreaterThan(shadow[0]);
    expect(light[0]).toBeGreaterThan(light[2]);
  });
  it('every look keeps values in range on black and white', () => {
    for (const l of LOOKS) for (const px of [[0, 0, 0], [1, 1, 1]] as const) {
      const out = applyMatrix(lookParams(l.id, 1).matrix, px).map((v) => Math.min(1, Math.max(0, v)));
      out.forEach((v) => expect(Number.isFinite(v)).toBe(true));
    }
  });
  it('writes the matrix as the 20 numbers SVG wants', () => {
    expect(matrixValues(IDENTITY).split(' ')).toHaveLength(20);
  });
  it('only halftone has a dot screen, and it grows with intensity', () => {
    expect(lookParams('sepia', 1).dots).toBe(0);
    expect(lookParams('halftone', 1).dots).toBeGreaterThan(lookParams('halftone', 0.4).dots);
    expect(lookParams('halftone', 1).dots).toBeLessThanOrEqual(0.6);
    const [r, g, b] = applyMatrix(lookParams('halftone', 1).matrix, [0.8, 0.3, 0.2]);
    expect(Math.abs(r - g)).toBeLessThan(0.1);
    expect(Math.abs(g - b)).toBeLessThan(0.1);
  });
  it('steps through the looks and stops at the ends', () => {
    expect(stepLook('none', 1)).toBe('colour-negative');
    expect(stepLook('colour-negative', -1)).toBe('none');
    expect(stepLook('none', -1)).toBe('none');
    expect(stepLook('cross-process', 1)).toBe('halftone');
    expect(stepLook('halftone', 1)).toBe('halftone');
  });
  it('reads a long sideways drag as a swipe: left is next, right is previous, short or steep drags are nothing', () => {
    expect(swipeStep(-80, 5, 40)).toBe(1);
    expect(swipeStep(80, -5, 40)).toBe(-1);
    expect(swipeStep(20, 0, 40)).toBe(0);
    expect(swipeStep(60, 60, 40)).toBe(0);
  });
});
