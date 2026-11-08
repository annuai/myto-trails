import { describe, expect, it } from 'vitest';
import { BUZZ_MS, BUZZ_STARTS_MS, enginePattern } from './buzzPlan';

describe('buzz plan', () => {
  it('is three buzzes, each starting after the last has finished', () => {
    expect(BUZZ_STARTS_MS).toHaveLength(3);
    BUZZ_STARTS_MS.slice(1).forEach((start, i) => expect(start).toBeGreaterThanOrEqual(BUZZ_STARTS_MS[i]! + BUZZ_MS));
  });
});

describe('enginePattern', () => {
  it('starts with a firm buzz and alternates off and on, ending on an on', () => {
    const p = enginePattern(3600);
    expect(p.slice(0, 2)).toEqual([0, 90]);
    expect(p.length % 2).toBe(0);
    expect(p.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(3600);
    expect(p.reduce((a, b) => a + b, 0)).toBeGreaterThan(3400);
  });
});
