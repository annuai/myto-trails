import { describe, expect, it } from 'vitest';
import { chooseRider } from './pullBikeRider';

describe('chooseRider', () => {
  it('always shows the woman to a rider who said she is a woman, whatever the roll', () => {
    for (const roll of [0, 0.1, 0.49, 0.5, 0.9, 0.999]) expect(chooseRider('female', roll)).toBe('woman');
  });
  it('picks the man or the woman by the roll for everyone else', () => {
    for (const g of ['male', 'other', null, undefined] as const) {
      expect(chooseRider(g, 0)).toBe('man');
      expect(chooseRider(g, 0.49)).toBe('man');
      expect(chooseRider(g, 0.5)).toBe('woman');
      expect(chooseRider(g, 0.99)).toBe('woman');
    }
  });
  it('shows both over many pulls', () => {
    const seen = new Set(Array.from({ length: 20 }, (_, i) => chooseRider(null, i / 20)));
    expect(seen).toEqual(new Set(['man', 'woman']));
  });
});
