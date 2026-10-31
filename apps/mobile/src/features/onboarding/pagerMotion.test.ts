import { describe, expect, it } from 'vitest';
import { driftStops, fadeInStops, fadeOutStops, fadeStops, frameHeights } from './pagerMotion';

const increasing = (xs: number[]) => xs.every((x, i) => i === 0 || x >= xs[i - 1]!);

describe('pager motion', () => {
  it('shows a page whole when it is centred, and not at all a span before or after', () => {
    expect(fadeStops(2, 100, 0.5)).toEqual({ inputRange: [150, 200, 250], outputRange: [0, 1, 0] });
  });
  it('keeps every input range in order, for any page and width', () => {
    for (const page of [0, 1, 4]) for (const width of [320, 390, 430]) {
      for (const s of [fadeStops(page, width, 0.55), fadeOutStops(page, width, 0.55), fadeInStops(page, width, 0.55), driftStops(page, width, 0.12)]) {
        expect(increasing(s.inputRange)).toBe(true);
      }
    }
  });
  it('lets a frame stay up through its last page, then dissolve; and the next frame arrive by its page', () => {
    expect(fadeOutStops(3, 100, 0.5)).toEqual({ inputRange: [300, 350], outputRange: [1, 0] });
    expect(fadeInStops(4, 100, 0.5)).toEqual({ inputRange: [350, 400], outputRange: [0, 1] });
  });
  it('makes the leaving and arriving frames cross at the same place', () => {
    const out = fadeOutStops(3, 100, 0.5).inputRange[1];
    const into = fadeInStops(4, 100, 0.5).inputRange[0];
    expect(out).toBe(into);
  });
  it('drifts a picture in from the right and out to the left by the same distance', () => {
    expect(driftStops(1, 400, 0.1)).toEqual({ inputRange: [0, 400, 800], outputRange: [40, 0, -40] });
  });
  it('sizes each frame from what the words need, and never below zero', () => {
    expect(frameHeights({ container: 600, wordsBelow: 150, setupBelow: 330, gap: 24 })).toEqual({ tall: 426, short: 246 });
    expect(frameHeights({ container: 300, wordsBelow: 150, setupBelow: 330, gap: 24 })).toEqual({ tall: 126, short: 0 });
  });
});
