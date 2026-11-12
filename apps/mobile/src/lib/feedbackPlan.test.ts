import { describe, expect, it } from 'vitest';
import { bandOf, bandsCrossed, rollTickTimes, tickDue } from './feedbackPlan';

describe('tickDue', () => {
  it('waits for the gap', () => {
    expect(tickDue(1000, 1030, 60)).toBe(false);
    expect(tickDue(1000, 1060, 60)).toBe(true);
  });
});

describe('bands', () => {
  it('groups speeds into bands', () => {
    expect(bandOf(0, 10)).toBe(0);
    expect(bandOf(9.9, 10)).toBe(0);
    expect(bandOf(10, 10)).toBe(1);
    expect(bandOf(-3, 10)).toBe(0);
  });
  it('counts the edges crossed, up or down', () => {
    expect(bandsCrossed(8, 12, 10)).toBe(1);
    expect(bandsCrossed(12, 8, 10)).toBe(1);
    expect(bandsCrossed(8, 35, 10)).toBe(3);
    expect(bandsCrossed(11, 14, 10)).toBe(0);
  });
  it('does not click when a reading is missing', () => {
    expect(bandsCrossed(null, 40, 10)).toBe(0);
    expect(bandsCrossed(40, null, 10)).toBe(0);
  });
});

describe('rollTickTimes', () => {
  it('gives nothing for a roll that goes nowhere', () => {
    expect(rollTickTimes(1, 700, 60)).toEqual([]);
    expect(rollTickTimes(10, 0, 60)).toEqual([]);
  });
  it('spaces ticks evenly and never closer than the gap', () => {
    const t = rollTickTimes(500, 700, 60);
    expect(t.length).toBe(11);
    expect(t[0]).toBe(0);
    for (let i = 1; i < t.length; i++) expect(t[i]! - t[i - 1]!).toBeGreaterThanOrEqual(60);
  });
  it('ticks once per step on a short roll', () => {
    expect(rollTickTimes(3, 700, 60)).toHaveLength(3);
  });
});
