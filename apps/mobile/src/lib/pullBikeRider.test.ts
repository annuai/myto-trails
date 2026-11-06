import { describe, expect, it } from 'vitest';
import { chooseRider } from './pullBikeRider';

describe('chooseRider', () => {
  it('shows a rider who said she is a woman only the women, one or the other by the roll', () => {
    for (const roll of [0, 0.1, 0.49]) expect(chooseRider('female', roll)).toBe('woman');
    for (const roll of [0.5, 0.75, 0.999]) expect(chooseRider('female', roll)).toBe('womanLime');
    expect(new Set(Array.from({ length: 40 }, (_, i) => chooseRider('female', i / 40)))).toEqual(new Set(['woman', 'womanLime']));
  });
  it('shows everyone else the man half the time and the two women a quarter each', () => {
    for (const g of ['male', 'other', null, undefined] as const) {
      expect(chooseRider(g, 0)).toBe('man');
      expect(chooseRider(g, 0.49)).toBe('man');
      expect(chooseRider(g, 0.5)).toBe('woman');
      expect(chooseRider(g, 0.74)).toBe('woman');
      expect(chooseRider(g, 0.75)).toBe('womanLime');
      expect(chooseRider(g, 0.99)).toBe('womanLime');
    }
  });
  it('shows all three over many pulls', () => {
    expect(new Set(Array.from({ length: 40 }, (_, i) => chooseRider(null, i / 40)))).toEqual(new Set(['man', 'woman', 'womanLime']));
  });
});
