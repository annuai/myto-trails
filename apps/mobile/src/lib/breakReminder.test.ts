import { describe, expect, it } from 'vitest';
import { BREAK_AFTER_MS, BREAK_COUNTS_MS, startBreak, stepBreak, type BreakState } from './breakReminder';

const MIN = 60_000;
const base = { running: true, paused: false, stopped: false };
const run = (steps: { at: number; over?: Partial<typeof base> }[], from: BreakState = startBreak) => {
  let s = from; const out: boolean[] = [];
  for (const { at, over } of steps) { const r = stepBreak(s, { now: at, ...base, ...over }); s = r.state; out.push(r.remind); }
  return { s, out };
};

describe('break reminder', () => {
  it('reminds after two hours of riding, not before', () => {
    expect(run([{ at: 0 }, { at: BREAK_AFTER_MS - 1 }, { at: BREAK_AFTER_MS }]).out).toEqual([false, false, true]);
  });
  it('reminds again after another two hours of riding without a stop', () => {
    expect(run([{ at: 0 }, { at: BREAK_AFTER_MS }, { at: BREAK_AFTER_MS + 1 }, { at: 2 * BREAK_AFTER_MS }]).out).toEqual([false, true, false, true]);
  });
  it('a short stop (a traffic light, a photo) does not restart the count', () => {
    const r = run([{ at: 0 }, { at: 60 * MIN, over: { stopped: true } }, { at: 65 * MIN, over: { stopped: true } }, { at: 66 * MIN }, { at: BREAK_AFTER_MS }]);
    expect(r.out[4]).toBe(true);
  });
  it('a stop of ten minutes or more is a break: the count starts over when riding resumes', () => {
    const resume = 100 * MIN;
    const r = run([{ at: 0 }, { at: 60 * MIN, over: { stopped: true } }, { at: 60 * MIN + BREAK_COUNTS_MS, over: { stopped: true } }, { at: resume }, { at: resume + BREAK_AFTER_MS - 1 }, { at: resume + BREAK_AFTER_MS }]);
    expect(r.out).toEqual([false, false, false, false, false, true]);
  });
  it('a pause of ten minutes counts as a break too', () => {
    const r = run([{ at: 0 }, { at: 30 * MIN, over: { paused: true } }, { at: 41 * MIN, over: { paused: true } }, { at: 50 * MIN }, { at: 50 * MIN + BREAK_AFTER_MS }]);
    expect(r.out[4]).toBe(true);
    expect(r.out[3]).toBe(false);
  });
  it('does nothing while no ride is recording', () => {
    expect(run([{ at: 0, over: { running: false } }, { at: BREAK_AFTER_MS, over: { running: false } }]).out).toEqual([false, false]);
  });
});
