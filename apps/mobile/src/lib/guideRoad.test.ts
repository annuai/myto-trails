import { describe, expect, it } from 'vitest';
import { roadToward } from './guideRoad';

const rescue = { lat: 1, lng: 1 }, target = { lat: 2, lng: 2 }, start = { lat: 3, lng: 3 }, rejoin = { lat: 4, lng: 4 }, regroup = { lat: 5, lng: 5 };
const base = { sim: false, trail: false, toStart: false };

describe('roadToward', () => {
  it('goes to a rider being helped before anything else', () => {
    expect(roadToward({ ...base, trail: true, rescue, target, regroup })).toBe(rescue);
  });
  it('lets a place the rider chose override a loaded trail, on the way to the start and after', () => {
    expect(roadToward({ ...base, trail: true, toStart: true, start, target })).toBe(target);
    expect(roadToward({ ...base, trail: true, rejoin, target })).toBe(target);
  });
  it('follows the trail when no place is chosen: the start first, then the way back on', () => {
    expect(roadToward({ ...base, trail: true, toStart: true, start, regroup })).toBe(start);
    expect(roadToward({ ...base, trail: true, rejoin, regroup })).toBe(rejoin);
    expect(roadToward({ ...base, trail: true, regroup })).toBeUndefined();
  });
  it('without a trail, goes to the chosen place, else the group\'s', () => {
    expect(roadToward({ ...base, target, regroup })).toBe(target);
    expect(roadToward({ ...base, regroup })).toBe(regroup);
  });
  it('asks for no road on a simulated ride, except for a rider being helped', () => {
    expect(roadToward({ ...base, sim: true, target, regroup })).toBeUndefined();
    expect(roadToward({ ...base, sim: true, rescue })).toBe(rescue);
  });
});
