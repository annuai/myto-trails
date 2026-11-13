import { describe, expect, it } from 'vitest';
import { photoCardTokens } from './PhotoCard.tokens';

describe('photoCardTokens', () => {
  it('has an ink colour for both inks and they differ', () => {
    expect(photoCardTokens.ink.light).toBeTruthy();
    expect(photoCardTokens.ink.dark).toBeTruthy();
    expect(photoCardTokens.ink.light).not.toBe(photoCardTokens.ink.dark);
  });
  it('has a soft shadow spec for both inks', () => {
    for (const k of ['light', 'dark'] as const) {
      const s = photoCardTokens.shadow[k];
      expect(s.color).toContain('rgba');
      expect(s.dy).toBeGreaterThan(0);
    }
    expect(photoCardTokens.shadow.light.color).not.toBe(photoCardTokens.shadow.dark.color);
  });
});
