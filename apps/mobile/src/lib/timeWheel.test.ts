import { describe, expect, it } from 'vitest';
import { fromWheel, toWheel } from './timeWheel';

describe('time wheel', () => {
  it('round trips every five minutes of the day', () => {
    for (let m = 0; m < 1440; m += 5) { const w = toWheel(m); expect(fromWheel(w.hour, w.minute, w.period)).toBe(m); }
  });
  it('puts midnight and noon on 12', () => {
    expect(toWheel(0)).toEqual({ hour: 11, minute: 0, period: 0 });
    expect(toWheel(12 * 60)).toEqual({ hour: 11, minute: 0, period: 1 });
  });
  it('reads 7:00 AM and 6:35 PM', () => {
    expect(toWheel(7 * 60)).toEqual({ hour: 6, minute: 0, period: 0 });
    expect(fromWheel(5, 7, 1)).toBe(18 * 60 + 35);
  });
  it('rounds a time off the step', () => { expect(toWheel(7 * 60 + 12)).toEqual(toWheel(7 * 60 + 10)); });
});
