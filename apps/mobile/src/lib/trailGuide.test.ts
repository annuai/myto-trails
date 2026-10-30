import { describe, expect, it } from 'vitest';
import type { LatLng } from './geo';
import { compassWord, prepareTrail, startGuide, stepGuide, turnAhead, type GuideState } from './trailGuide';

const M = 1 / 111_320;
/** Metres north and east of a fixed origin. */
const at = (north: number, east: number): LatLng => ({ lat: 13 + north * M, lng: 77.6 + (east * M) / Math.cos((13 * Math.PI) / 180) });
/** 1 km north, then 1 km east: one right turn at 1 km. */
const L = [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000].map((n) => at(n, 0)).concat([1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000].map((e) => at(1000, e)));
const trail = prepareTrail(L);

const run = (positions: LatLng[], s: GuideState = startGuide) => positions.reduce((acc, p) => stepGuide(acc.state, trail, p), { state: s, guide: undefined as ReturnType<typeof stepGuide>['guide'] | undefined } as ReturnType<typeof stepGuide>);

describe('trail guide', () => {
  it('measures the trail', () => expect(trail.totalM).toBeGreaterThan(1990));
  it('is heading to the start while far from the line', () => {
    const r = stepGuide(startGuide, trail, at(-5000, 0));
    expect(r.state.phase).toBe('to_start');
    expect(r.guide.toStartM).toBeGreaterThan(4900);
  });
  it('starts the trail near its start', () => expect(stepGuide(startGuide, trail, at(-100, 0)).state.phase).toBe('on_trail'));
  it('starts the trail when joined part way along it', () => expect(stepGuide(startGuide, trail, at(500, 10)).state.phase).toBe('on_trail'));
  it('counts down the distance left', () => {
    const r = run([at(10, 0), at(400, 0)]);
    expect(r.guide.alongM).toBeCloseTo(400, -1);
    expect(r.guide.remainingM).toBeCloseTo(trail.totalM - 400, -1);
  });
  it('is finished within 100 m of the end after riding most of it', () => {
    const r = run([at(10, 0), at(1000, 0), at(1000, 1950)]);
    expect(r.state.phase).toBe('finished');
  });
  it('does not call a loop finished at its start', () => {
    const loop = prepareTrail([at(0, 0), at(500, 0), at(500, 500), at(0, 500), at(0, 0)]);
    const r = stepGuide(startGuide, loop, at(0, 5));
    expect(r.state.phase).toBe('on_trail');
  });
  it('a rider off the line is far from it', () => expect(run([at(10, 0), at(500, 300)]).guide.offM).toBeGreaterThan(250));
  it('finds the right turn ahead and how far', () => {
    const t = turnAhead(trail, 700)!;
    expect(t.dir).toBe('right');
    expect(t.distM).toBeCloseTo(300, -2);
  });
  it('sees no turn on a straight stretch', () => expect(turnAhead(trail, 100)).toBeUndefined());
  it('names the compass direction', () => { expect(compassWord(at(0, 0), at(100, 0))).toBe('north'); expect(compassWord(at(0, 0), at(0, -100))).toBe('west'); expect(compassWord(at(0, 0), at(70, 70))).toBe('north-east'); });
});
