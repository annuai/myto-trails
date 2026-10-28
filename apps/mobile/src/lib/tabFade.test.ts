import { describe, expect, it } from 'vitest';
import { FADE_ZONE, fadeTarget, isTap, touchPoint } from './tabFade';

const maxY = 1000;

describe('fadeTarget', () => {
  it('scrolling up brings the bar fully back', () => {
    expect(fadeTarget({ y: 900, prevY: 920, maxY, current: 0.1 })).toBe(1);
  });

  it('scrolling down fades the bar in proportion to the distance left, and reaches 0 at the end', () => {
    expect(fadeTarget({ y: maxY - FADE_ZONE / 2, prevY: maxY - FADE_ZONE / 2 - 10, maxY, current: 1 })).toBeCloseTo(0.5);
    expect(fadeTarget({ y: maxY, prevY: maxY - 10, maxY, current: 1 })).toBe(0);
  });

  it('far from the end the bar stays fully visible', () => {
    expect(fadeTarget({ y: 300, prevY: 280, maxY, current: 1 })).toBe(1);
  });

  it('scrolling down never brings a faded bar back', () => {
    expect(fadeTarget({ y: maxY - FADE_ZONE / 2, prevY: maxY - FADE_ZONE / 2 - 10, maxY, current: 0.2 })).toBe(0.2);
  });

  it('tiny movement keeps the current value', () => {
    expect(fadeTarget({ y: 500, prevY: 500.5, maxY, current: 0.4 })).toBe(0.4);
  });

  it('a short page never fades the bar', () => {
    expect(fadeTarget({ y: 100, prevY: 80, maxY: 150, current: 1 })).toBe(1);
  });

  it('bouncing past the end gives 0, never a negative', () => {
    expect(fadeTarget({ y: maxY + 40, prevY: maxY + 20, maxY, current: 1 })).toBe(0);
  });
});

describe('isTap', () => {
  it('a touch that barely moved is a tap; a drag is not', () => {
    expect(isTap({ x: 10, y: 10 }, { x: 13, y: 12 })).toBe(true);
    expect(isTap({ x: 10, y: 10 }, { x: 10, y: 40 })).toBe(false);
  });
});

describe('touchPoint', () => {
  it('reads the point from changedTouches, as browsers report it, or from the event itself', () => {
    expect(touchPoint({ changedTouches: [{ pageX: 4, pageY: 9 }] })).toEqual({ x: 4, y: 9 });
    expect(touchPoint({ pageX: 7, pageY: 8 })).toEqual({ x: 7, y: 8 });
    expect(touchPoint({ pageX: 1, pageY: 2, changedTouches: [] })).toEqual({ x: 1, y: 2 });
  });
});
