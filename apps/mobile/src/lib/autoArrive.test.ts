import { describe, expect, it } from 'vitest';
import type { LatLng } from './geo';
import { startArrive, stepArrive, type ArriveState } from './autoArrive';

const home: LatLng = { lat: 12.97, lng: 77.59 };
const end: LatLng = { lat: 13.3, lng: 77.7 };
const at = (lat: number, lng: number): LatLng => ({ lat, lng });
const walk = (points: LatLng[], targets: { home?: LatLng; routeEnd?: LatLng }) => {
  let s: ArriveState = startArrive; const out: (string | null)[] = [];
  for (const p of points) { const r = stepArrive(s, p, targets); s = r.state; out.push(r.arrived); }
  return out;
};

describe('stepArrive', () => {
  it('does not close a check-in set at home while the ride is still at home', () => {
    expect(walk([home, at(12.9705, 77.5905)], { home })).toEqual([null, null]);
  });
  it('closes it on getting back home after having been away', () => {
    expect(walk([home, at(13.1, 77.6), at(12.9702, 77.5902)], { home })).toEqual([null, null, 'home']);
  });
  it('closes it at the end of the route after having been away from it', () => {
    expect(walk([home, at(13.1, 77.65), at(13.2995, 77.7002)], { routeEnd: end })).toEqual([null, null, 'route']);
  });
  it('the first of home and route end to be reached wins', () => {
    expect(walk([home, at(13.1, 77.65), at(13.3, 77.7), at(12.97, 77.59)], { home, routeEnd: end })).toEqual([null, null, 'route', 'home']);
  });
  it('counts only when within about 200 m, not 400', () => {
    expect(walk([home, at(13.1, 77.6), at(12.9735, 77.59)], { home })).toEqual([null, null, null]);
  });
  it('with no home and no route end it never closes', () => {
    expect(walk([home, at(13.1, 77.6), home], {})).toEqual([null, null, null]);
  });
});
