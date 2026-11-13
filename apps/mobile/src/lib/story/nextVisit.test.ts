import { describe, expect, it } from 'vitest';
import { nextVisit, visitForRide, type VisitCtx } from './nextVisit';

const at = (d: number, h = 12) => new Date(2026, 10, d, h).getTime();
const base: VisitCtx = { now: at(10), home: true, riding: false, onboarded: true, busy: false, greeting: { opens: 1, greeted: false }, shown: {} };
const due = { opens: 3, plan: { opens: 3, at: 0 }, greeted: false };

describe('nextVisit', () => {
  it('is quiet when there is nothing to say', () => {
    expect(nextVisit(base)).toBeUndefined();
  });

  it('says hello when the greeting is due', () => {
    expect(nextVisit({ ...base, greeting: due })).toEqual({ id: 'hello', key: 'hello' });
  });

  it('never off Home, on a ride, during the welcome flow, or while another is showing', () => {
    for (const off of [{ home: false }, { riding: true }, { onboarded: false }, { busy: true }]) expect(nextVisit({ ...base, greeting: due, ...off })).toBeUndefined();
  });

  it('a finished ride is offered for a day, once', () => {
    const pending = { id: 'finished' as const, key: 'ride:r1', at: at(10, 9) };
    expect(nextVisit({ ...base, pending })).toEqual({ id: 'finished', key: 'ride:r1' });
    expect(nextVisit({ ...base, pending, now: at(11, 10) })).toBeUndefined();
    expect(nextVisit({ ...base, pending, shown: { 'ride:r1': 1 } })).toBeUndefined();
  });

  it('the greeting comes before a finished ride, which comes before a trip', () => {
    const pending = { id: 'rest' as const, key: 'ride:r2', at: at(10, 9) };
    const trip = { id: 't', name: 'Spiti', startDate: '2026-11-11' };
    expect(nextVisit({ ...base, greeting: due, pending, trip })?.id).toBe('hello');
    expect(nextVisit({ ...base, pending, trip })?.id).toBe('rest');
    expect(nextVisit({ ...base, trip })).toEqual({ id: 'map', key: 'map:t', trip: { id: 't', name: 'Spiti' } });
  });

  it('a trip is looked at only in the two days before it, and once', () => {
    expect(nextVisit({ ...base, trip: { id: 't', name: 'A', startDate: '2026-11-12' } })?.id).toBe('map');
    expect(nextVisit({ ...base, trip: { id: 't', name: 'A', startDate: '2026-11-13' } })).toBeUndefined();
    expect(nextVisit({ ...base, trip: { id: 't', name: 'A', startDate: '2026-11-09' } })).toBeUndefined();
    expect(nextVisit({ ...base, trip: { id: 't', name: 'A', startDate: '2026-11-11' }, shown: { 'map:t': 1 } })).toBeUndefined();
  });
});

describe('visitForRide', () => {
  const now = at(10, 19);
  const ride = (durationSec: number, endHour: number) => ({ id: 'r', startedAt: at(10, endHour) - durationSec * 1000, durationSec });
  it('a long ride is a rest, an evening one a campfire, any other a finished ride', () => {
    expect(visitForRide(ride(3.5 * 3600, 19), now)?.id).toBe('rest');
    expect(visitForRide(ride(2 * 3600, 19), now)?.id).toBe('campfire');
    expect(visitForRide(ride(2 * 3600, 14), at(10, 14))?.id).toBe('finished');
    expect(visitForRide(ride(30 * 60, 19), now)?.id).toBe('finished');
  });

  it('nothing for sample or simulated rides, or one that finished a while ago', () => {
    expect(visitForRide({ ...ride(3600, 19), sample: true }, now)).toBeUndefined();
    expect(visitForRide({ ...ride(3600, 19), simulated: true }, now)).toBeUndefined();
    expect(visitForRide(ride(3600, 19), at(10, 21))).toBeUndefined();
  });
});
