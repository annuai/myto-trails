import { describe, expect, it } from 'vitest';
import { easeAngle, headingDegrees, headingLetters, headingWord, sensorHeading, turnTo } from './compass';

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

describe('sensorHeading', () => {
  const heading = (a: [number, number, number], m: [number, number, number]) => sensorHeading({ x: a[0], y: a[1], z: a[2] }, { x: m[0], y: m[1], z: m[2] });
  it('reads the top edge of a phone lying flat', () => {
    expect(heading([0, 0, 1], [0, 20, -40])).toBeCloseTo(0, 5);
    expect(heading([0, 0, 1], [-20, 0, -40])).toBeCloseTo(90, 5);
    expect(heading([0, 0, 1], [0, -20, -40])).toBeCloseTo(180, 5);
    expect(heading([0, 0, 1], [20, 0, -40])).toBeCloseTo(270, 5);
  });
  it('reads the back of a phone standing upright, in portrait', () => {
    expect(heading([0, 1, 0], [0, -40, -20])).toBeCloseTo(0, 5);
    expect(heading([0, 1, 0], [-20, -40, 0])).toBeCloseTo(90, 5);
    expect(heading([0, 1, 0], [0, -40, 20])).toBeCloseTo(180, 5);
  });
  it('reads the back of a phone standing upright, in landscape', () => {
    // Turned a quarter: the phone's right edge is up.
    expect(heading([1, 0, 0], [-40, 0, -20])).toBeCloseTo(0, 5);
    expect(heading([-1, 0, 0], [40, 0, -20])).toBeCloseTo(0, 5);
  });
  it('is the same at any tilt between flat and upright', () => {
    const t = Math.PI / 4;
    const a: [number, number, number] = [0, Math.sin(t), Math.cos(t)];
    // North is straight ahead, so the field is horizontal north plus a downward part; both in the phone's axes at this tilt.
    const down: [number, number, number] = [0, -Math.sin(t), -Math.cos(t)];
    const ahead: [number, number, number] = [0, Math.cos(t), -Math.sin(t)];
    const m: [number, number, number] = [20 * ahead[0] + 40 * down[0], 20 * ahead[1] + 40 * down[1], 20 * ahead[2] + 40 * down[2]];
    expect(heading(a, m)).toBeCloseTo(0, 5);
  });
  it('gives up when there is no usable field or gravity', () => {
    expect(heading([0, 0, 1], [0, 0, 0])).toBeUndefined();
    expect(heading([0, 0, 0], [0, 20, -40])).toBeUndefined();
  });
});

describe('easeAngle', () => {
  it('moves a share of the short way and wraps at north', () => {
    expect(easeAngle(350, 10, 0.5)).toBeCloseTo(0, 5);
    expect(easeAngle(10, 350, 0.5)).toBeCloseTo(0, 5);
    expect(easeAngle(90, 100, 0.2)).toBeCloseTo(92, 5);
    expect(easeAngle(10, 10, 0.3)).toBeCloseTo(10, 5);
  });
});
