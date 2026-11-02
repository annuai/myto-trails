import { describe, expect, it } from 'vitest';
import { isSideways, swipeOffset, swipeTarget } from './swipePanes';

const t = { distance: 0.25, flick: 0.5, flickMin: 20, edge: 0.25, edgeMax: 40 };

describe('swipeOffset', () => {
  it('follows the finger between panes', () => {
    expect(swipeOffset(-80, 0, 2, t)).toBe(-80);
    expect(swipeOffset(60, 1, 2, t)).toBe(60);
  });
  it('gives only a little past the first or last pane, and never more than the cap', () => {
    expect(swipeOffset(80, 0, 2, t)).toBe(20);
    expect(swipeOffset(-80, 1, 2, t)).toBe(-20);
    expect(swipeOffset(400, 0, 2, t)).toBe(40);
  });
});

describe('swipeTarget', () => {
  it('goes to the next pane on a long pull to the left and the previous on a long pull to the right', () => {
    expect(swipeTarget(-120, 0, 400, 0, 2, t)).toBe(1);
    expect(swipeTarget(120, 0, 400, 1, 2, t)).toBe(0);
  });
  it('stays for a short, slow pull', () => {
    expect(swipeTarget(-60, -0.1, 400, 0, 2, t)).toBe(0);
  });
  it('changes on a short quick flick in the same direction as the pull', () => {
    expect(swipeTarget(-40, -0.9, 400, 0, 2, t)).toBe(1);
    expect(swipeTarget(-40, 0.9, 400, 0, 2, t)).toBe(0);
  });
  it('ignores a tiny twitch even if it was quick', () => {
    expect(swipeTarget(-10, -2, 400, 0, 2, t)).toBe(0);
  });
  it('never goes past the first or last pane', () => {
    expect(swipeTarget(300, 1, 400, 0, 2, t)).toBe(0);
    expect(swipeTarget(-300, -1, 400, 1, 2, t)).toBe(1);
  });
});

describe('isSideways', () => {
  it('takes over only when the move is clearly more sideways than up or down', () => {
    expect(isSideways(20, 4, 8, 1.5)).toBe(true);
    expect(isSideways(20, 15, 8, 1.5)).toBe(false);
    expect(isSideways(5, 0, 8, 1.5)).toBe(false);
  });
});
