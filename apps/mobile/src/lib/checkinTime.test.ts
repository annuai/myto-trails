import { describe, expect, it } from 'vitest';
import { defaultArrivalMinutes, nextOccurrence } from './checkinTime';

const at = (h: number, m: number) => new Date(2026, 9, 28, h, m, 0, 0);

describe('check-in arrival time', () => {
  it('starts two hours ahead on a 15-minute step', () => {
    expect(defaultArrivalMinutes(at(9, 10))).toBe(11 * 60 + 15);
    expect(defaultArrivalMinutes(at(9, 0))).toBe(11 * 60);
  });
  it('wraps past midnight', () => {
    expect(defaultArrivalMinutes(at(23, 30))).toBe(1 * 60 + 30);
  });
  it('a time still ahead today is today', () => {
    expect(nextOccurrence(at(9, 0), 17 * 60)).toBe(at(17, 0).getTime());
  });
  it('a time already gone (or right now) is tomorrow', () => {
    expect(nextOccurrence(at(18, 0), 17 * 60)).toBe(at(17, 0).getTime() + 24 * 3_600_000);
    expect(nextOccurrence(at(17, 0), 17 * 60)).toBe(at(17, 0).getTime() + 24 * 3_600_000);
  });
});
