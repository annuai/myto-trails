import { describe, expect, it } from 'vitest';
import { withAlpha } from './color';

describe('withAlpha', () => {
  it('writes a six digit colour with the opacity', () => {
    expect(withAlpha('#e7ebee', 0)).toBe('rgba(231, 235, 238, 0)');
    expect(withAlpha('#ffffff', 0.5)).toBe('rgba(255, 255, 255, 0.5)');
  });
  it('writes a three digit colour', () => {
    expect(withAlpha('#f80', 1)).toBe('rgba(255, 136, 0, 1)');
  });
});
