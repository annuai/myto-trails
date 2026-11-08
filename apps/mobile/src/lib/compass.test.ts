import { describe, expect, it } from 'vitest';
import { headingDegrees, headingLetters, headingWord, turnTo } from './compass';

describe('headingWord', () => {
  it('names the nearest of the eight winds, wrapping at north', () => {
    expect(headingWord(0)).toBe('north');
    expect(headingWord(350)).toBe('north');
    expect(headingWord(44)).toBe('north-east');
    expect(headingWord(100)).toBe('east');
    expect(headingWord(181)).toBe('south');
    expect(headingWord(270)).toBe('west');
    expect(headingWord(-45)).toBe('north-west');
    expect(headingLetters(225)).toBe('SW');
  });
});

describe('headingDegrees', () => {
  it('stays within 0 to 359', () => {
    expect(headingDegrees(359.6)).toBe(0);
    expect(headingDegrees(-10)).toBe(350);
    expect(headingDegrees(48.4)).toBe(48);
  });
});

describe('turnTo', () => {
  it('takes the short way round north', () => {
    expect(turnTo(350, 10)).toBe(370);
    expect(turnTo(10, 350)).toBe(-10);
  });
  it('carries on from an angle already past a full turn', () => {
    expect(turnTo(370, 20)).toBe(380);
    expect(turnTo(-350, 5)).toBe(-355);
  });
  it('stays put when already there and never turns more than half a circle', () => {
    expect(turnTo(90, 90)).toBe(90);
    for (const [a, b] of [[0, 179], [0, 181], [123, 300], [-200, 45]] as const) expect(Math.abs(turnTo(a, b) - a)).toBeLessThanOrEqual(180);
  });
});
