import { describe, expect, it } from 'vitest';
import { summariseWindow, isStoppedConfident, initialFusion, stepFusion, type Evidence } from './motionFusion';
import { replay, score, type Truth } from './motionReplay';

// A tiny deterministic noise source so traces repeat.
const rng = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296) - 0.5;
const M = 1 / 111_320; // degrees of latitude per metre

type Leg = { secs: number; kmh: number; acc: number; vib: number; stepHz?: number; gps?: boolean; jitterKmh?: number };
/** Builds a trace of one GPS fix and one shake a second along a straight road, each leg with its own speed, accuracy and shaking. */
function trace(legs: Leg[], seed = 1): { events: Evidence[]; ends: number[] } {
  const r = rng(seed), events: Evidence[] = [], ends: number[] = [];
  let t = 0, lat = 12, lng = 77;
  for (const L of legs) {
    for (let i = 0; i < L.secs; i++, t += 1000) {
      const v = Math.max(0, L.kmh + (L.jitterKmh ?? 0) * r() * 2) / 3.6;
      lat += v * M;
      if (L.gps !== false) events.push({ k: 'gps', t, lat: lat + r() * L.acc * M * 0.8, lng: lng + r() * L.acc * M * 0.8, speed: v, acc: L.acc });
      events.push({ k: 'shake', t, vib: L.vib, stepHz: L.stepHz ?? 0 });
    }
    ends.push(t);
  }
  return { events, ends };
}

const truthOf = (ends: number[], states: Truth[number]['state'][]): Truth => ends.map((to, i) => ({ from: i ? ends[i - 1]! : 0, to, state: states[i]! }));

describe('stepFusion on realistic made-up rides', () => {
  it('rides, waits at a light with noisy GPS, rides again: stops once, no flapping', () => {
    const { events, ends } = trace([
      { secs: 60, kmh: 40, acc: 8, vib: 0.06 },
      { secs: 40, kmh: 0, acc: 35, vib: 0.0, jitterKmh: 2 },
      { secs: 60, kmh: 40, acc: 8, vib: 0.06 },
    ]);
    const s = score(replay(events), truthOf(ends, ['moving', 'stopped', 'moving']));
    expect(s.flips).toBeLessThanOrEqual(2);
    expect(s.delays[1]).toBeLessThanOrEqual(35_000);
  });

  it('crawling in traffic at 5 km/h with poor GPS stays moving', () => {
    const { events, ends } = trace([{ secs: 40, kmh: 40, acc: 8, vib: 0.06 }, { secs: 120, kmh: 5, acc: 22, vib: 0.05, jitterKmh: 3 }]);
    const s = score(replay(events), truthOf(ends, ['moving', 'moving']));
    expect(s.wrongShare).toBeLessThan(0.1);
  });

  it('stopped with the engine idling and GPS wandering is not called riding for good', () => {
    const { events, ends } = trace([{ secs: 40, kmh: 50, acc: 8, vib: 0.06 }, { secs: 90, kmh: 0, acc: 20, vib: 0.0, jitterKmh: 1.5 }]);
    const tl = replay(events);
    expect(tl[tl.length - 1]!.state.startsWith('stopped')).toBe(true);
    expect(score(tl, truthOf(ends, ['moving', 'stopped'])).delays[1]).toBeLessThanOrEqual(35_000);
  });

  it('a long quiet stop becomes parked', () => {
    const { events } = trace([{ secs: 30, kmh: 40, acc: 8, vib: 0.06 }, { secs: 200, kmh: 0, acc: 12, vib: 0.0 }]);
    const tl = replay(events);
    expect(tl[tl.length - 1]!.state).toBe('stopped_parked');
  });

  it('walking around the bike at a fuel stop is on foot, not riding', () => {
    const { events, ends } = trace([{ secs: 40, kmh: 40, acc: 8, vib: 0.06 }, { secs: 60, kmh: 4, acc: 10, vib: 0.3, stepHz: 2 }]);
    const s = score(replay(events), truthOf(ends, ['moving', 'on_foot']));
    expect(s.delays[1]).toBeLessThanOrEqual(15_000);
    expect(s.wrongShare).toBeLessThan(0.2);
  });

  it('a tunnel with no GPS but a shaking bike stays riding, and the stop afterwards is not confident until GPS returns', () => {
    const { events } = trace([{ secs: 30, kmh: 50, acc: 8, vib: 0.06 }, { secs: 40, kmh: 50, acc: 8, vib: 0.06, gps: false }]);
    const tl = replay(events);
    expect(tl[tl.length - 1]!.state).toBe('riding');
  });

  it('missing data never says stopped', () => {
    const { events } = trace([{ secs: 30, kmh: 50, acc: 8, vib: 0.06 }]);
    let s = events.reduce(stepFusion, initialFusion);
    s = stepFusion(s, { k: 'tick', t: 100_000 });
    expect(s.state).toBe('unknown');
    expect(isStoppedConfident(s)).toBe(false);
  });

  it('the OS saying automotive raises confidence of riding', () => {
    const { events } = trace([{ secs: 20, kmh: 10, acc: 8, vib: 0.05 }]);
    const plain = replay(events).pop()!;
    const withOs = replay([...events, { k: 'os', t: 19_500, activity: 'automotive' }]).pop()!;
    expect(withOs.confidence).toBeGreaterThan(plain.confidence);
  });
});

describe('summariseWindow', () => {
  const win = (f: (i: number) => number, hz = 20, secs = 2) => Array.from({ length: hz * secs }, (_, i) => ({ t: (i / hz) * 1000, x: 0, y: 0, z: 1 + f(i / hz) }));
  it('a still phone has no spread', () => expect(summariseWindow(win(() => 0)).vib).toBeCloseTo(0, 5));
  it('a walking rhythm at 2 steps a second is seen as steps', () => {
    const r = summariseWindow(win((t) => 0.35 * Math.sin(2 * Math.PI * 2 * t)));
    expect(r.vib).toBeGreaterThan(0.15);
    expect(r.stepHz).toBeGreaterThan(1.5);
    expect(r.stepHz).toBeLessThan(2.5);
  });
  it('small fast engine vibration is shaking but not steps', () => {
    const r = summariseWindow(win((t) => 0.06 * Math.sin(2 * Math.PI * 9 * t)));
    expect(r.vib).toBeGreaterThan(0.03);
    expect(r.stepHz).toBe(0);
  });
  it('too few samples say nothing', () => expect(summariseWindow([])).toEqual({ vib: 0, stepHz: 0 }));
});
