import { describe, expect, it } from 'vitest';
import { decideHomeOffer } from './offer';
import { AT_HOME_M, AWAY_M, FIX_MAX_AGE_MS, QUIET_LONG_MS, type HomeWorld } from './types';

const MIN = 60_000;
const HOUR = 3_600_000;
const NOW = new Date(2026, 10, 12, 15, 0).getTime();
const HOME = { lat: 52, lng: 5 };
// About 5 km north of home.
const FAR = { lat: 52.045, lng: 5 };

const world = (o: Partial<HomeWorld> = {}): HomeWorld => ({
  now: NOW, home: HOME, pos: FAR, posAt: NOW - 10_000,
  rideRunning: false, inGroupRide: false, tripActive: false,
  usualStartMins: [], dismissals: [], ...o,
});
const ended = (ago: number) => ({ endedAt: NOW - ago });
const at = (h: number, m: number) => new Date(2026, 10, 12, h, m).getTime();

describe('decideHomeOffer', () => {
  it('no home returns null', () => expect(decideHomeOffer(world({ home: undefined, lastRide: ended(MIN) }))).toBeNull());
  it('no position returns null', () => expect(decideHomeOffer(world({ pos: undefined, lastRide: ended(MIN) }))).toBeNull());
  it('a fix older than FIX_MAX_AGE_MS returns null', () =>
    expect(decideHomeOffer(world({ posAt: NOW - FIX_MAX_AGE_MS - 1, lastRide: ended(MIN) }))).toBeNull());
  it('within AT_HOME_M returns null', () =>
    expect(decideHomeOffer(world({ pos: { lat: 52.001, lng: 5 }, lastRide: ended(MIN) }))).toBeNull());
  it('between AT_HOME_M and AWAY_M returns null', () => {
    expect(AT_HOME_M).toBeLessThan(AWAY_M);
    expect(decideHomeOffer(world({ pos: { lat: 52.008, lng: 5 }, lastRide: ended(MIN) }))).toBeNull();
  });
  it('ride ended 10 min ago and away gives ride-ended with the distance', () => {
    const o = decideHomeOffer(world({ lastRide: ended(10 * MIN) }));
    expect(o?.reason).toBe('ride-ended');
    expect(o?.distanceM).toBeGreaterThan(4900);
    expect(o?.distanceM).toBeLessThan(5100);
  });
  it('ride ended 31 min ago gives null', () => expect(decideHomeOffer(world({ lastRide: ended(31 * MIN) }))).toBeNull());
  it('sample ride or source sim gives null', () => {
    expect(decideHomeOffer(world({ lastRide: { endedAt: NOW - MIN, sample: true } }))).toBeNull();
    expect(decideHomeOffer(world({ lastRide: { endedAt: NOW - MIN, source: 'sim' } }))).toBeNull();
  });
  it('rideRunning, inGroupRide or tripActive gives null', () => {
    for (const k of ['rideRunning', 'inGroupRide', 'tripActive'] as const)
      expect(decideHomeOffer(world({ lastRide: ended(MIN), [k]: true }))).toBeNull();
  });
  it('usual-time: now within 45 min of a learned start gives usual-time', () => {
    expect(decideHomeOffer(world({ usualStartMins: [15 * 60 + 30] }))?.reason).toBe('usual-time');
    expect(decideHomeOffer(world({ usualStartMins: [18 * 60] }))).toBeNull();
  });
  it('usual-time across midnight (learned 23:30, now 00:10) matches', () =>
    expect(decideHomeOffer(world({ now: at(0, 10), posAt: at(0, 10), usualStartMins: [23 * 60 + 30] }))?.reason).toBe('usual-time'));
  it('dusk: sunset 40 min away gives dusk and beats ride-ended', () =>
    expect(decideHomeOffer(world({ sunsetMs: NOW + 40 * MIN, lastRide: ended(MIN) }))?.reason).toBe('dusk'));
  it('no dusk when sunset is past or far', () => {
    expect(decideHomeOffer(world({ sunsetMs: NOW - MIN }))).toBeNull();
    expect(decideHomeOffer(world({ sunsetMs: NOW + 90 * MIN }))).toBeNull();
  });
  it('one dismissal 1 h ago gives null, 4 h ago gives an offer', () => {
    expect(decideHomeOffer(world({ lastRide: ended(MIN), dismissals: [NOW - HOUR] }))).toBeNull();
    expect(decideHomeOffer(world({ lastRide: ended(MIN), dismissals: [NOW - 4 * HOUR] }))?.reason).toBe('ride-ended');
  });
  it('three dismissals within 14 days give null until 14 days after the latest', () => {
    const d = [NOW - 5 * 86_400_000, NOW - 4 * 86_400_000, NOW - 4 * HOUR];
    expect(decideHomeOffer(world({ lastRide: ended(MIN), dismissals: d }))).toBeNull();
    const later = NOW + QUIET_LONG_MS - 4 * HOUR + 1;
    expect(decideHomeOffer(world({ now: later, posAt: later, lastRide: { endedAt: later - MIN }, dismissals: d }))?.reason).toBe('ride-ended');
  });
  it('a dismissal timestamp in the future (clock moved back) counts as just now', () =>
    expect(decideHomeOffer(world({ lastRide: ended(MIN), dismissals: [NOW + 5 * HOUR] }))).toBeNull());
});
