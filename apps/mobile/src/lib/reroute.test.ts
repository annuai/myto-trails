import { describe, expect, it } from 'vitest';
import { haversine, type LatLng } from './geo';
import { answered, askFirst, BACKOFF_MS, COOLDOWN_MS, dropped, failed, isFresh, offLimitM, readAgainst, rejoinTarget, startReroute, stepReroute, STALE_M, type RerouteState } from './reroute';
import { prepareTrail } from './trailGuide';

const ORIGIN = { lat: 12.9, lng: 77.5 };
const M_LAT = 111_320, M_LNG = 111_320 * Math.cos((ORIGIN.lat * Math.PI) / 180);
/** A point `x` metres east and `y` metres north of the origin. */
const P = (x: number, y: number): LatLng => ({ lat: ORIGIN.lat + y / M_LAT, lng: ORIGIN.lng + x / M_LNG });
/** A road that runs east for a kilometre and then north for two. */
const ROUTE = [P(0, 0), P(500, 0), P(1000, 0), P(1000, 1000), P(1000, 2000)];

type Ride = { at: LatLng; speedMps: number; headingDeg?: number; accM?: number };
/** Rides a script of positions a second apart against the route and collects what the engine says. */
function replay(rides: Ride[], route: LatLng[] = ROUTE, from: RerouteState = startReroute) {
  let s = from, prev: LatLng | undefined;
  const events: { t: number; wentOff: boolean; backOn: boolean; ask: boolean }[] = [];
  rides.forEach((r, t) => {
    const reading = readAgainst(route, r.at, prev, { now: t * 1000, accM: r.accM, speedMps: r.speedMps, headingDeg: r.headingDeg });
    prev = r.at;
    const step = stepReroute(s, reading!);
    s = step.state;
    if (step.wentOff || step.backOn || step.ask) events.push({ t, wentOff: step.wentOff, backOn: step.backOn, ask: step.ask });
  });
  return { state: s, events };
}

/** 15 m/s east along the first kilometre with a sideways offset in metres. */
const eastward = (n: number, offset: (t: number) => number, start = 0): Ride[] => Array.from({ length: n }, (_, t) => ({ at: P(start + t * 15, offset(t)), speedMps: 15, headingDeg: 90 }));

describe('offLimitM', () => {
  it('is 35 m for a good fix, wider for a poor one, and never more than 120 m', () => {
    expect(offLimitM(5, 10)).toBe(35);
    expect(offLimitM(40, 10)).toBe(100);
    expect(offLimitM(200, 10)).toBe(120);
  });
});

describe('riding the route', () => {
  it('never goes off with ordinary GPS wander', () => {
    const wander = (t: number) => (t % 2 ? 12 : -12);
    expect(replay(eastward(60, wander)).events).toEqual([]);
  });
  it('does not go off on a poor fix that is within its own error', () => {
    const rides = eastward(40, () => 60).map((r) => ({ ...r, accM: 40 }));
    expect(replay(rides).events).toEqual([]);
  });
  it('is not off while stopped well away from the road: a rider at a fuel stop is not lost', () => {
    const stopped = Array.from({ length: 120 }, () => ({ at: P(300, 80), speedMps: 0 }));
    expect(replay(stopped).events).toEqual([]);
  });
});

describe('a missed turn', () => {
  // The route turns north at 1 km; the rider carries straight on east at 15 m/s.
  const ride: Ride[] = Array.from({ length: 30 }, (_, t) => ({ at: P(1000 + Math.max(0, t - 10) * 15, 0), speedMps: 15, headingDeg: 90 }));
  it('is noticed within seconds of leaving the road, and asks once', () => {
    const { events } = replay(ride, ROUTE);
    const off = events.find((e) => e.wentOff)!;
    // Leaves the line at t = 10 and is past the 35 m limit at 13; sure 6 s after that. The old rule was 100 m away (7 s) plus 20 s: 27 s.
    expect(off.t - 10).toBeLessThanOrEqual(10);
    expect(off.t - 10).toBeGreaterThanOrEqual(2);
    expect(events.filter((e) => e.ask)).toHaveLength(1);
  });
  it('is sure at once when a long way off', () => {
    const s = stepReroute(startReroute, { now: 0, distM: 300, speedMps: 15, stepM: 15 });
    expect(s.wentOff).toBe(true);
    expect(s.ask).toBe(true);
  });
});

describe('the wrong way', () => {
  it('is sure after 50 m of heading against the route while off it, before the wait is up', () => {
    // On a parallel road 60 m north of the first kilometre, riding west (the route runs east).
    const ride: Ride[] = Array.from({ length: 20 }, (_, t) => ({ at: P(900 - t * 15, 60), speedMps: 15, headingDeg: 270 }));
    const { events } = replay(ride);
    const off = events.find((e) => e.wentOff)!;
    expect(off.t).toBeLessThan(6);
  });
  it('does not count heading against the route at a crawl', () => {
    const ride: Ride[] = Array.from({ length: 10 }, (_, t) => ({ at: P(900 - t, 60), speedMps: 1, headingDeg: 270 }));
    expect(replay(ride).events).toEqual([]);
  });
});

describe('coming back', () => {
  it('is back on once within 60 percent of the limit, and says so once', () => {
    const out = Array.from({ length: 12 }, (_, t) => ({ at: P(500 + t * 15, 150), speedMps: 15, headingDeg: 90 }));
    const back = Array.from({ length: 12 }, (_, t) => ({ at: P(680 + t * 15, 150 - t * 14), speedMps: 15, headingDeg: 90 }));
    const { events, state } = replay([...out, ...back]);
    expect(events.filter((e) => e.wentOff)).toHaveLength(1);
    expect(events.filter((e) => e.backOn)).toHaveLength(1);
    expect(state.phase).toBe('on');
  });
  it('a rider on the edge of the limit does not flip between on and off', () => {
    // Hovering between the back-on distance and the limit once off: stays off, no fresh alert.
    const s0 = { ...startReroute, phase: 'off' as const };
    const mid = stepReroute(s0, { now: 0, distM: 28, speedMps: 15, stepM: 15 });
    expect(mid.state.phase).toBe('off');
    expect(mid.backOn).toBe(false);
  });
});

describe('asking', () => {
  const off = { now: 0, distM: 300, speedMps: 15, stepM: 15 };
  it('asks once at a time: while a question is out another is not asked', () => {
    const first = stepReroute(startReroute, off);
    const again = stepReroute(first.state, { ...off, now: 1000 });
    expect(first.ask).toBe(true);
    expect(again.ask).toBe(false);
  });
  it('waits 10 s after an answer, and backs off 15 s, 30 s, then 60 s after failures', () => {
    let s = stepReroute(startReroute, off).state;
    s = answered(s, 0);
    expect(stepReroute(s, { ...off, now: COOLDOWN_MS - 1 }).ask).toBe(false);
    expect(stepReroute(s, { ...off, now: COOLDOWN_MS }).ask).toBe(true);
    for (const wait of [BACKOFF_MS[0], BACKOFF_MS[1], BACKOFF_MS[2], BACKOFF_MS[2]]) {
      s = failed({ ...s, asking: 0 }, 100_000);
      expect(stepReroute(s, { ...off, now: 100_000 + wait - 1 }).ask).toBe(false);
      const go = stepReroute(s, { ...off, now: 100_000 + wait });
      expect(go.ask).toBe(true);
      s = go.state;
    }
  });
  it('a dropped answer allows the next question at once, and a first question can be asked with nothing to be off', () => {
    const s = dropped(stepReroute(startReroute, off).state, 5000);
    expect(stepReroute(s, { ...off, now: 5000 }).ask).toBe(true);
    expect(askFirst(startReroute, 0).ask).toBe(true);
  });
  it('an answer is fresh only for the question that is out and a rider who has not moved on', () => {
    const asked = stepReroute(startReroute, off);
    const here = P(0, 0);
    expect(isFresh(asked.state, asked.seq, here, P(STALE_M - 5, 0))).toBe(true);
    expect(isFresh(asked.state, asked.seq, here, P(STALE_M + 50, 0))).toBe(false);
    expect(isFresh(asked.state, asked.seq + 1, here, here)).toBe(false);
    expect(isFresh(answered(asked.state, 0), asked.seq, here, here)).toBe(false);
  });
});

describe('rejoinTarget', () => {
  const trail = prepareTrail([P(0, 0), P(2500, 0), P(5000, 0)]);
  it('is 150 m ahead at a crawl and further ahead at speed', () => {
    expect(haversine(rejoinTarget(trail, 500, 3), P(650, 0))).toBeLessThan(2);
    expect(haversine(rejoinTarget(trail, 500, 20), P(800, 0))).toBeLessThan(2);
  });
  it('stops at the end of the trail', () => {
    expect(haversine(rejoinTarget(trail, 4950, 20), P(5000, 0))).toBeLessThan(2);
  });
});
