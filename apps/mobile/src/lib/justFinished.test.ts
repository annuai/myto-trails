import { describe, expect, it } from 'vitest';
import { justFinishedRide } from './justFinished';

const NOW = 1_700_000_000_000;
const HOUR = 3_600_000;
const ride = (id: string, endedAgoMs: number, extra: { sample?: boolean; pausedSec?: number } = {}) => ({ id, name: id, startedAt: NOW - endedAgoMs - 3600_000, durationSec: 3600 - (extra.pausedSec ?? 0), pausedSec: extra.pausedSec, sample: extra.sample });

describe('justFinishedRide', () => {
  it('is the newest ride when it ended in the last day', () => {
    expect(justFinishedRide([ride('a', 2 * HOUR), ride('b', 30 * HOUR)], NOW)?.id).toBe('a');
  });
  it('is nothing once a day has passed', () => {
    expect(justFinishedRide([ride('a', 25 * HOUR)], NOW)).toBeUndefined();
  });
  it('counts paused time as part of the ride, so the end is when it really ended', () => {
    expect(justFinishedRide([ride('a', 23 * HOUR, { pausedSec: 600 })], NOW)?.id).toBe('a');
  });
  it('never offers the sample ride, and looks past it to a real one', () => {
    expect(justFinishedRide([ride('s', HOUR, { sample: true })], NOW)).toBeUndefined();
    expect(justFinishedRide([ride('s', HOUR, { sample: true }), ride('real', 2 * HOUR)], NOW)?.id).toBe('real');
  });
  it('is nothing for a rider with no rides', () => {
    expect(justFinishedRide([], NOW)).toBeUndefined();
  });
});
