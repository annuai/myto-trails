import { describe, expect, it } from 'vitest';
import { CLEAR_AFTER_MS, isWeak, LOST_AFTER_MS, startGpsHealth, stepGpsHealth, type GpsHealth } from './gpsHealth';

const run = (fixAt: (t: number) => number, from: number, to: number, start: GpsHealth = startGpsHealth) => {
  let s = start; const seen: boolean[] = [];
  for (let t = from; t <= to; t += 1000) { s = stepGpsHealth(s, { now: t, lastFixAt: fixAt(t) }); seen.push(s.lost); }
  return { s, seen };
};

describe('gps health', () => {
  it('says nothing before the first fix', () => expect(stepGpsHealth(startGpsHealth, { now: 99_000, lastFixAt: 0 }).lost).toBe(false));
  it('does not warn for a stop: fixes keep arriving every second', () => expect(run((t) => t, 1000, 600_000).seen.some(Boolean)).toBe(false));
  it('does not warn for a silence shorter than the limit', () => expect(run(() => 0 + 1000, 2000, 1000 + LOST_AFTER_MS - 1000).seen.some(Boolean)).toBe(false));
  it('warns after a long silence', () => expect(run(() => 1000, 2000, 1000 + LOST_AFTER_MS).s.lost).toBe(true));
  it('one late fix does not clear the warning at once', () => {
    const lost = run(() => 1000, 2000, 30_000).s;
    const after = stepGpsHealth(lost, { now: 31_000, lastFixAt: 31_000 });
    expect(after.lost).toBe(true);
  });
  it('clears after a steady run of fresh fixes', () => {
    const lost = run(() => 1000, 2000, 30_000).s;
    expect(run((t) => t, 31_000, 31_000 + CLEAR_AFTER_MS, lost).s.lost).toBe(false);
  });
  it('a gap in the middle of clearing starts the count again', () => {
    let s = run(() => 1000, 2000, 30_000).s;
    s = stepGpsHealth(s, { now: 31_000, lastFixAt: 31_000 });
    s = stepGpsHealth(s, { now: 40_000, lastFixAt: 31_000 });
    expect(s).toEqual({ lost: true, freshSince: null });
  });
  it('time spent with the app away does not count as silence', () => expect(stepGpsHealth(startGpsHealth, { now: 100_000, lastFixAt: 10_000, resumedAt: 98_000 }).lost).toBe(false));
  it('a poor fix is weak, not lost', () => { expect(isWeak(80)).toBe(true); expect(isWeak(20)).toBe(false); expect(isWeak(undefined)).toBe(false); });
});
