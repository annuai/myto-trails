import { describe, expect, it } from 'vitest';
import { gapWords, riderGap } from './riderGap';
import { prepareTrail } from './trailGuide';

// A road running north from 13.000, 77.000 for about 2 km, with a hairpin: it goes north, east, then back south alongside itself.
const north = (m: number) => 13 + m / 111_320;
const road = prepareTrail(Array.from({ length: 101 }, (_, i) => ({ lat: north(i * 20), lng: 77 })));
const at = (m: number) => ({ lat: north(m), lng: 77 });

describe('riderGap on a road', () => {
  it('is the distance along the road, ahead or behind', () => {
    const me = at(500);
    const ahead = riderGap({ me, rider: at(800), road });
    expect(ahead.side).toBe('ahead');
    expect(ahead.m).toBeCloseTo(300, -1);
    const behind = riderGap({ me, rider: at(320), road });
    expect(behind.side).toBe('behind');
    expect(behind.m).toBeCloseTo(180, -1);
  });
  it('is side by side when they are within 10 m', () => expect(riderGap({ me: at(500), rider: at(506), road }).side).toBe('beside'));
  it('follows the road, not the straight line, round a bend', () => {
    const bend = prepareTrail([{ lat: 13, lng: 77 }, { lat: 13.009, lng: 77 }, { lat: 13.009, lng: 77.009 }]);
    const g = riderGap({ me: { lat: 13, lng: 77 }, rider: { lat: 13.009, lng: 77.009 }, road: bend });
    expect(g.m).toBeGreaterThan(1500);
  });
});

describe('riderGap without a road', () => {
  const me = { lat: 13, lng: 77 };
  it('says ahead when they are in front of the way you are heading, behind when they are not', () => {
    expect(riderGap({ me, rider: at(300), heading: 0 }).side).toBe('ahead');
    expect(riderGap({ me: at(300), rider: me, heading: 0 }).side).toBe('behind');
  });
  it('gives only the distance when there is no heading', () => {
    const g = riderGap({ me, rider: at(300) });
    expect(g.side).toBeNull();
    expect(g.m).toBeCloseTo(300, -1);
  });
  it('ignores a road the riders are not on', () => {
    const far = { lat: 13, lng: 77.05 };
    expect(riderGap({ me: far, rider: { lat: north(300), lng: 77.05 }, road, heading: 0 }).side).toBe('ahead');
  });
});

describe('gapWords', () => {
  it('names each side', () => {
    expect(gapWords({ m: 1, side: 'ahead' })).toBe('ahead of you');
    expect(gapWords({ m: 1, side: 'behind' })).toBe('behind you');
    expect(gapWords({ m: 1, side: null })).toBe('from you');
  });
});
