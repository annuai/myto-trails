import { describe, expect, it } from 'vitest';
import { initialCrash, stepCrash, type CrashEvidence, type CrashState } from './crashDetect';

/** Feeds evidence in order and returns the time of the first crash, if any. */
function run(events: CrashEvidence[], from: CrashState = initialCrash): number | undefined {
  let s = from;
  for (const e of events) {
    const r = stepCrash(s, e);
    s = r.state;
    if (r.crash) return e.t;
  }
  return undefined;
}

const fix = (t: number, kmh: number): CrashEvidence => ({ k: 'gps', t, kmh });
const win = (t: number, peak: number, stepHz = 0): CrashEvidence => ({ k: 'window', t, peak, stepHz });
const tick = (t: number): CrashEvidence => ({ k: 'tick', t });
const ticks = (from: number, to: number) => Array.from({ length: Math.floor((to - from) / 1000) + 1 }, (_, i) => tick(from + i * 1000));
const cruise = [fix(0, 60), fix(1000, 60), fix(2000, 60), fix(3000, 60)];

describe('crash detection', () => {
  it('reports a crash: fast, a hard impact, a dead stop, then stillness', () => {
    const t = run([...cruise, win(4000, 6), fix(5000, 0), fix(6000, 0), ...ticks(7000, 20000)]);
    expect(t).toBe(16000);
  });

  it('ignores a hard bump while the bike keeps going', () => {
    expect(run([...cruise, win(4000, 6), fix(5000, 55), fix(6000, 58), fix(7000, 60), ...ticks(8000, 40000)])).toBeUndefined();
  });

  it('ignores a bump followed by a normal stop that takes many seconds', () => {
    // Slows gradually: still 20 km/h six seconds on, so it never counts as a dead stop.
    expect(run([...cruise, win(4000, 5), fix(5000, 45), fix(6000, 35), fix(7000, 28), fix(8000, 20), fix(9000, 10), fix(10000, 0), ...ticks(11000, 50000)])).toBeUndefined();
  });

  it('ignores an impact that was not preceded by riding', () => {
    expect(run([fix(0, 0), fix(1000, 3), win(2000, 7), fix(3000, 0), ...ticks(4000, 40000)])).toBeUndefined();
  });

  it('ignores a small jolt', () => {
    expect(run([...cruise, win(4000, 2.5), fix(5000, 0), fix(6000, 0), ...ticks(7000, 40000)])).toBeUndefined();
  });

  it('gives up when the rider gets up and walks', () => {
    expect(run([...cruise, win(4000, 6), fix(5000, 0), fix(6000, 0), win(8000, 1.2, 2), ...ticks(9000, 40000)])).toBeUndefined();
  });

  it('gives up when the bike is ridden away after the stop', () => {
    expect(run([...cruise, win(4000, 6), fix(5000, 0), fix(6000, 0), fix(8000, 30), ...ticks(9000, 40000)])).toBeUndefined();
  });

  it('does not alert before the stillness has lasted', () => {
    expect(run([...cruise, win(4000, 6), fix(5000, 0), fix(6000, 0), ...ticks(7000, 15000)])).toBeUndefined();
  });

  it('gives up after 30 s with no dead stop seen (no GPS)', () => {
    expect(run([...cruise, win(4000, 6), ...ticks(5000, 60000)])).toBeUndefined();
  });

  it('can detect a second crash after the first has been reported', () => {
    let s = initialCrash;
    for (const e of [...cruise, win(4000, 6), fix(5000, 0), fix(6000, 0), ...ticks(7000, 16000)]) s = stepCrash(s, e).state;
    expect(s.suspect).toBeUndefined();
    expect(run([fix(100000, 60), fix(101000, 60), win(102000, 6), fix(103000, 0), fix(104000, 0), ...ticks(105000, 115000)], s)).toBe(114000);
  });
});
