import { describe, expect, it } from 'vitest';
import { AUTO_PAUSE_MS, RESUME_GRACE_MS, startAutoPause, stepAutoPause, type AutoPauseState } from './autoPause';

const base = { enabled: true, running: true, paused: false, stopped: true, movingFast: false };
const run = (steps: { at: number; over?: Partial<typeof base> }[], from: AutoPauseState = startAutoPause) => {
  let s = from; const actions: (string | null)[] = [];
  for (const { at, over } of steps) { const r = stepAutoPause(s, { now: at, ...base, ...over }); s = r.state; actions.push(r.action); }
  return { s, actions };
};

describe('auto-pause', () => {
  it('pauses once the bike has been still for five minutes, not before', () => {
    expect(run([{ at: 0 }, { at: AUTO_PAUSE_MS - 1 }, { at: AUTO_PAUSE_MS }]).actions).toEqual([null, null, 'pause']);
  });
  it('moving again before then starts the count over', () => {
    expect(run([{ at: 0 }, { at: 200_000, over: { stopped: false } }, { at: 300_000 }, { at: 300_000 + AUTO_PAUSE_MS - 1 }]).actions).toEqual([null, null, null, null]);
  });
  it('does nothing when it is switched off, or the ride is not running, or already paused by hand', () => {
    expect(run([{ at: 0, over: { enabled: false } }, { at: AUTO_PAUSE_MS, over: { enabled: false } }]).actions).toEqual([null, null]);
    expect(run([{ at: 0, over: { running: false } }, { at: AUTO_PAUSE_MS, over: { running: false } }]).actions).toEqual([null, null]);
    expect(run([{ at: 0, over: { paused: true } }, { at: AUTO_PAUSE_MS, over: { paused: true } }]).actions).toEqual([null, null]);
  });
  it('resumes by itself only after a fast fix, and only after the grace time', () => {
    const paused = { stoppedSince: null, pausedAt: 1000 };
    expect(run([{ at: 1000 + RESUME_GRACE_MS - 1, over: { paused: true, stopped: false, movingFast: true } }], paused).actions).toEqual([null]);
    expect(run([{ at: 1000 + RESUME_GRACE_MS, over: { paused: true, stopped: false, movingFast: false } }], paused).actions).toEqual([null]);
    expect(run([{ at: 1000 + RESUME_GRACE_MS, over: { paused: true, stopped: false, movingFast: true } }], paused).actions).toEqual(['resume']);
  });
  it('leaves a resume the rider made alone and starts watching again', () => {
    const paused = { stoppedSince: null, pausedAt: 1000 };
    const r = stepAutoPause(paused, { now: 5000, ...base, paused: false, stopped: false });
    expect(r).toEqual({ state: startAutoPause, action: null });
  });
});
