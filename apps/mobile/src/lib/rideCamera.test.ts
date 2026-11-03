import { describe, expect, it } from 'vitest';
import { glideMs, matchToRoad, roundedDistanceM, smoothHeading, turnBetween, unwrapBearing } from './rideCamera';
import { prepareTrail } from './trailGuide';

describe('turnBetween and unwrapBearing', () => {
  it('turns the short way round the compass', () => {
    expect(turnBetween(350, 10)).toBe(20);
    expect(turnBetween(10, 350)).toBe(-20);
  });
  it('continues a bearing across north instead of spinning back', () => {
    expect(unwrapBearing(359, 2)).toBe(362);
    expect(unwrapBearing(362, 355)).toBe(355);
  });
});

describe('smoothHeading', () => {
  it('holds the last heading while the bike is slow', () => {
    expect(smoothHeading(90, 200, 1, 1)).toBe(90);
    expect(smoothHeading(undefined, 200, 1, 1)).toBeUndefined();
  });
  it('takes the first heading as it is', () => expect(smoothHeading(undefined, 200, 10, 1)).toBe(200));
  it('ignores a wobble inside the deadband', () => expect(smoothHeading(90, 95, 10, 1)).toBe(90));
  it('moves part of the way to a real change, and no faster than the limit', () => {
    const next = smoothHeading(90, 150, 10, 1)!;
    expect(next).toBeGreaterThan(90);
    expect(next).toBeLessThan(150);
    expect(Math.abs(turnBetween(0, smoothHeading(0, 180, 10, 0.2)!))).toBeLessThanOrEqual(12.01);
  });
  it('settles on a steady heading from noisy samples', () => {
    let h: number | undefined = 90;
    for (const noise of [20, -18, 15, -22, 10, -12, 19, -15]) h = smoothHeading(h, 90 + noise, 10, 1);
    expect(Math.abs(turnBetween(90, h!))).toBeLessThan(8);
  });
});

describe('matchToRoad', () => {
  // A road running north for 2 km.
  const road = prepareTrail(Array.from({ length: 101 }, (_, i) => ({ lat: 13 + (i * 20) / 111_320, lng: 77 })));
  const east = (m: number) => m / (111_320 * Math.cos((13 * Math.PI) / 180));
  it('puts a fix a few metres off the road on the road, pointing along it', () => {
    const m = matchToRoad(road, { lat: 13 + 500 / 111_320, lng: 77 + east(8) }, false)!;
    expect(m.point.lng).toBeCloseTo(77, 5);
    expect(m.heading).toBeLessThan(1);
    expect(m.alongM).toBeCloseTo(500, -1);
  });
  it('does not join the road from further than 30 m but does not leave it until 50 m', () => {
    const fix = { lat: 13 + 500 / 111_320, lng: 77 + east(40) };
    expect(matchToRoad(road, fix, false)).toBeNull();
    expect(matchToRoad(road, fix, true)).not.toBeNull();
    expect(matchToRoad(road, { ...fix, lng: 77 + east(60) }, true)).toBeNull();
  });
  it('never lets the distance along go back by a little', () => {
    const m = matchToRoad(road, { lat: 13 + 490 / 111_320, lng: 77 }, true, 500)!;
    expect(m.alongM).toBe(500);
  });
});

describe('glideMs and roundedDistanceM', () => {
  it('glides for the time between fixes, within a range', () => {
    expect(glideMs(1000)).toBe(1000);
    expect(glideMs(200)).toBe(600);
    expect(glideMs(5000)).toBe(1500);
    expect(glideMs(undefined)).toBe(1000);
  });
  it('rounds in steps that grow with the distance', () => {
    expect(roundedDistanceM(1234)).toBe(1200);
    expect(roundedDistanceM(687)).toBe(690);
    expect(roundedDistanceM(43)).toBe(45);
    expect(roundedDistanceM(2)).toBe(5);
  });
});

import { norm } from './rideCamera';
describe('norm', () => {
  it('puts any bearing in 0 to 360, which is all the phone map accepts (it ignores a negative one)', () => {
    expect(norm(-77)).toBe(283);
    expect(norm(-249)).toBe(111);
    expect(norm(471)).toBe(111);
    expect(norm(0)).toBe(0);
  });
});
