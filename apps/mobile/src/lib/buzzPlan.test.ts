import { describe, expect, it } from 'vitest';
import { BUZZ_MS, BUZZ_STARTS_MS } from './buzzPlan';

describe('buzz plan', () => {
  it('is three buzzes, each starting after the last has finished', () => {
    expect(BUZZ_STARTS_MS).toHaveLength(3);
    BUZZ_STARTS_MS.slice(1).forEach((start, i) => expect(start).toBeGreaterThanOrEqual(BUZZ_STARTS_MS[i]! + BUZZ_MS));
  });
});
