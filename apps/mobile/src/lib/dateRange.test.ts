import { describe, expect, it } from 'vitest';
import { inRange, tapDay } from './dateRange';

describe('tapDay', () => {
  it('the first tap starts a range, the second ends it', () => {
    const one = tapDay({}, '2026-10-05');
    expect(one).toEqual({ start: '2026-10-05' });
    expect(tapDay(one, '2026-10-12')).toEqual({ start: '2026-10-05', end: '2026-10-12' });
  });
  it('an earlier second tap swaps the two, and a tap on the same day is a one-day range', () => {
    expect(tapDay({ start: '2026-10-12' }, '2026-10-05')).toEqual({ start: '2026-10-05', end: '2026-10-12' });
    expect(tapDay({ start: '2026-10-12' }, '2026-10-12')).toEqual({ start: '2026-10-12', end: '2026-10-12' });
  });
  it('a tap on a complete range starts a new one', () => {
    expect(tapDay({ start: '2026-10-05', end: '2026-10-12' }, '2026-11-01')).toEqual({ start: '2026-11-01' });
  });
});

describe('inRange', () => {
  it('includes both ends and everything between, and nothing outside', () => {
    const r = { start: '2026-10-05', end: '2026-10-12' };
    expect(['2026-10-04', '2026-10-05', '2026-10-09', '2026-10-12', '2026-10-13'].map((d) => inRange(r, d))).toEqual([false, true, true, true, false]);
  });
  it('a range with only a start is that one day, and an empty one has none', () => {
    expect(inRange({ start: '2026-10-05' }, '2026-10-05')).toBe(true);
    expect(inRange({ start: '2026-10-05' }, '2026-10-06')).toBe(false);
    expect(inRange({}, '2026-10-05')).toBe(false);
  });
});
