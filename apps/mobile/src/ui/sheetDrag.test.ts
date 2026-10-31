import { describe, expect, it } from 'vitest';
import { MAX_PULL, dragOffset, shouldDismiss } from './sheetDrag';

describe('sheet drag', () => {
  it('follows the finger one for one on the way down', () => {
    expect(dragOffset(0)).toBe(0);
    expect(dragOffset(80)).toBe(80);
    expect(dragOffset(700)).toBe(700);
  });
  it('gives a little on the way up, like a rubber band, and stops', () => {
    expect(dragOffset(-50)).toBeLessThan(0);
    expect(dragOffset(-50)).toBeGreaterThan(-50);
    expect(dragOffset(-5000)).toBe(-MAX_PULL);
  });
  it('closes when dragged far enough down', () => {
    expect(shouldDismiss(60, 0)).toBe(false);
    expect(shouldDismiss(130, 0)).toBe(true);
  });
  it('closes on a quick downward flick, even a short one', () => {
    expect(shouldDismiss(40, 1.2)).toBe(true);
    expect(shouldDismiss(5, 2)).toBe(false);
  });
  it('never closes on an upward drag, however fast', () => {
    expect(shouldDismiss(-200, -3)).toBe(false);
  });
});
