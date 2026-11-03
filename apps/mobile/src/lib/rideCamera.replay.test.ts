import { describe, expect, it } from 'vitest';
import { bearing } from './geo';
import { SIM_TRAIL, simMeAlong, simMePoint } from './groupSim';
import { lookAheadM, matchToRoad, smoothHeading, turnBetween } from './rideCamera';
import { pointAt } from './trailGuide';

/** Rides the test loop second by second through the same steps the live screen takes, and measures the heading against the road's true direction. */
function replay(speed: number) {
  let map: number | undefined, arrow: number | undefined, snapped = false, along: number | undefined;
  const errs = { map: [] as number[], arrow: [] as number[] };
  for (let s = 0; s < SIM_TRAIL.totalM / speed; s++) {
    const m = matchToRoad(SIM_TRAIL, simMePoint(s, SIM_TRAIL, speed), snapped, along, lookAheadM(speed));
    snapped = !!m; along = m?.alongM;
    map = smoothHeading(map, m?.heading, speed, 1, !!m);
    arrow = smoothHeading(arrow, m?.heading, speed, 1, !!m);
    const a = simMeAlong(s, SIM_TRAIL, speed);
    const truth = bearing(pointAt(SIM_TRAIL, a), pointAt(SIM_TRAIL, Math.min(SIM_TRAIL.totalM, a + 15)));
    if (map !== undefined && arrow !== undefined) { errs.map.push(Math.abs(turnBetween(map, truth))); errs.arrow.push(Math.abs(turnBetween(arrow, truth))); }
  }
  return errs;
}
const over = (xs: number[], deg: number) => xs.filter((e) => e > deg).length;

describe('the heading on a road with corners', () => {
  for (const speed of [11, 20]) {
    it(`at ${speed} m/s the arrow is never far from the road, and is off by more than 30 degrees for only a moment at each corner`, () => {
      const { arrow, map } = replay(speed);
      expect(Math.max(...arrow)).toBeLessThan(40);
      expect(over(arrow, 30)).toBeLessThanOrEqual(2);
      // The map follows the arrow a little behind, but not for long.
      expect(over(map, 30)).toBeLessThanOrEqual(3);
    });
  }
});
