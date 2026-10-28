import { describe, expect, it } from 'vitest';
import { initialMotion, isStopped, stepMotion, type MotionFix, type MotionState } from './motion';

const M = 1 / 111_320;
const T0 = 1_700_000_000_000;
const KMH = 1 / 3.6;
/** Feed fixes one second apart; `at(i)` gives each fix. */
function run(n: number, at: (i: number) => Partial<MotionFix> & { north?: number }, from: MotionState = initialMotion, start = 0) {
  let s = from;
  for (let i = start; i < start + n; i++) {
    const { north = 0, ...rest } = at(i);
    s = stepMotion(s, { t: T0 + i * 1000, lat: 13 + north * M, lng: 77.6, speed: 0, acc: 5, ...rest });
  }
  return s;
}
const stoppedAt = (s: MotionState, sec: number) => isStopped(s, T0 + sec * 1000);

describe('stopped detection', () => {
  it('riding at 40 km/h is moving', () => {
    const s = run(20, (i) => ({ north: i * 11, speed: 40 * KMH }));
    expect(stoppedAt(s, 19)).toBe(false);
  });
  it('parked with a persistent 1 km/h reading and 5 m of wander is stopped after 8 s, and not before', () => {
    const wander = (i: number) => ({ north: i % 2 ? 4 : -3, speed: 1 * KMH });
    expect(stoppedAt(run(5, wander), 4)).toBe(false);
    expect(stoppedAt(run(7, wander), 6)).toBe(false);
    expect(stoppedAt(run(10, wander), 9)).toBe(true);
  });
  it('is moving again at once on a fix of 6 km/h or more', () => {
    const parked = run(15, () => ({ speed: 0 }));
    expect(stoppedAt(parked, 14)).toBe(true);
    const going = run(1, () => ({ speed: 8 * KMH, north: 3 }), parked, 15);
    expect(stoppedAt(going, 15)).toBe(false);
  });
  it('is moving again when the position leaves the stopped radius, even if the speed reads low', () => {
    const parked = run(15, () => ({ speed: 0.5 * KMH }));
    const drifted = run(1, () => ({ speed: 0.5 * KMH, north: 40 }), parked, 15);
    expect(stoppedAt(drifted, 15)).toBe(false);
  });
  it('creeping at 3 km/h never becomes stopped', () => {
    const s = run(30, (i) => ({ north: i * 0.83, speed: 3 * KMH }));
    expect(stoppedAt(s, 29)).toBe(false);
  });
  it('between 2 and 6 km/h keeps an existing stop (no flicker)', () => {
    const parked = run(15, () => ({ speed: 0 }));
    const nudge = run(3, () => ({ speed: 4 * KMH, north: 1 }), parked, 15);
    expect(stoppedAt(nudge, 17)).toBe(true);
  });
  it('poor accuracy (80 m) is never declared stopped', () => {
    const s = run(30, () => ({ speed: 0, acc: 80 }));
    expect(stoppedAt(s, 29)).toBe(false);
  });
  it('a missing speed with a still position becomes stopped, and -1 counts as missing', () => {
    expect(stoppedAt(run(12, () => ({ speed: null })), 11)).toBe(true);
    expect(stoppedAt(run(12, () => ({ speed: -1 })), 11)).toBe(true);
  });
  it('a missing speed with a moving position is not stopped', () => {
    expect(stoppedAt(run(12, (i) => ({ speed: null, north: i * 6 })), 11)).toBe(false);
  });
  it('no fix for 6 s means not stopped, and no fixes yet means not stopped', () => {
    const parked = run(15, () => ({ speed: 0 }));
    expect(stoppedAt(parked, 14)).toBe(true);
    expect(stoppedAt(parked, 14 + 6)).toBe(false);
    expect(isStopped(initialMotion, T0)).toBe(false);
  });
  it('a stop is not declared by fixes that arrive out of time order', () => {
    let s = run(15, () => ({ speed: 0 }));
    s = stepMotion(s, { t: T0, lat: 13, lng: 77.6, speed: 0, acc: 5 });
    expect(stoppedAt(s, 14)).toBe(true);
  });

  // Review finding C1: a moving vehicle must never read as stopped, whatever the GPS reports.
  it('20 km/h with no speed reading and 35 m accuracy is never stopped', () => {
    for (const speed of [null, -1]) {
      const s = run(40, (i) => ({ north: i * 5.6, speed, acc: 35 }));
      for (let sec = 8; sec < 40; sec++) expect(stoppedAt(run(sec + 1, (i) => ({ north: i * 5.6, speed, acc: 35 })), sec)).toBe(false);
      expect(stoppedAt(s, 39)).toBe(false);
    }
  });
  it('5 km/h with no speed reading and 10 m accuracy is never stopped', () => {
    for (let n = 9; n < 40; n++) expect(stoppedAt(run(n, (i) => ({ north: i * 1.39, speed: -1, acc: 10 })), n - 1)).toBe(false);
  });
  it('a phone that reports speed 0 while moving at 4 km/h with 8 m accuracy is not stopped', () => {
    for (let n = 9; n < 40; n++) expect(stoppedAt(run(n, (i) => ({ north: i * 1.11, speed: 0, acc: 8 })), n - 1)).toBe(false);
  });
  it('3 km/h with no speed reading is not stopped', () => {
    for (let n = 9; n < 40; n++) expect(stoppedAt(run(n, (i) => ({ north: i * 0.83, speed: null, acc: 5 })), n - 1)).toBe(false);
  });
  it('with no speed reading, a fix worse than 10 m accuracy never starts a stop', () => {
    expect(stoppedAt(run(30, () => ({ speed: null, acc: 20 })), 29)).toBe(false);
  });
  it('a fix worse than 25 m accuracy is never stopped even with speed 0', () => {
    expect(stoppedAt(run(30, () => ({ speed: 0, acc: 30 })), 29)).toBe(false);
  });
});
