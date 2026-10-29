import { describe, expect, it } from 'vitest';
import { moveWaypoint, routeNameFor, type Waypoint } from './waypoints';

const w = (id: string, name?: string): Waypoint => ({ id, name, point: { lat: 1, lng: 2 } });

describe('moveWaypoint', () => {
  it('moves a stop up and down', () => {
    expect(moveWaypoint(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
    expect(moveWaypoint(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
  });
  it('ignores moves off the ends', () => {
    const l = ['a', 'b'];
    expect(moveWaypoint(l, 0, -1)).toBe(l);
    expect(moveWaypoint(l, 1, 2)).toBe(l);
  });
});

describe('routeNameFor', () => {
  it('names a route from its first and last place', () => {
    expect(routeNameFor([w('1', 'Bengaluru'), w('2'), w('3', 'Mysuru')])).toBe('Bengaluru to Mysuru');
  });
  it('gives nothing when an end is a dropped pin or there is one stop', () => {
    expect(routeNameFor([w('1', 'Bengaluru'), w('2')])).toBe('');
    expect(routeNameFor([w('1', 'Bengaluru')])).toBe('');
  });
});
