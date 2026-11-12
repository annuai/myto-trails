import { describe, expect, it } from 'vitest';
import { digitsOf, rollPlan, rollSteps } from './odometer';

describe('digitsOf', () => {
  it('pads to the minimum and floors', () => {
    expect(digitsOf(142.9)).toEqual([0, 0, 1, 4, 2]);
    expect(digitsOf(123456, 5)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(digitsOf(-4)).toEqual([0, 0, 0, 0, 0]);
  });
});

describe('rollPlan', () => {
  it('rolls each column forward, wrapping through 9', () => {
    const p = rollPlan(12480, 12622);
    expect(p.map((r) => [r.from, r.to])).toEqual([[1, 1], [2, 2], [4, 6], [8, 12], [0, 2]]);
  });
  it('grows a column when the total gains a digit', () => {
    const p = rollPlan(99999, 100002);
    expect(p).toHaveLength(6);
    expect(p[0]).toEqual({ from: 0, to: 1 });
  });
  it('sits still when the total did not change or shrank', () => {
    expect(rollPlan(500, 500).every((r) => r.from === r.to)).toBe(true);
    expect(rollPlan(500, 300).map((r) => r.to)).toEqual([0, 0, 3, 0, 0]);
  });
});

describe('rollSteps', () => {
  it('is the longest travel of any column', () => {
    expect(rollSteps(rollPlan(12480, 12622))).toBe(4);
    expect(rollSteps(rollPlan(7, 7))).toBe(0);
  });
});
