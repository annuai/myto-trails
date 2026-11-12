import { describe, expect, it, vi } from 'vitest';
import { create } from 'zustand';
import type { CohortRow } from '@moto-trails/domain';
import type { Ride } from '@/store/rides';
import { standingPrefSlice } from '@/store/standingPrefCore';
import type { RideSummary } from '@/api/standing';
import { uid } from '../id';
import { uploadQueued } from '../standingSyncCore';
import { currentStanding, localDay, shownPercent, STANDING_CONSENT, standingMoment, summaryOf } from './standing';

const ride = (over: Partial<Ride> = {}): Ride => ({
  id: 'r1', name: 'Morning', startedAt: new Date(2026, 10, 12, 23, 50).getTime(), durationSec: 3600, distanceKm: 42.5, maxKmh: 90, points: [{ lat: 12.9, lng: 77.5 }],
  waypoints: [{ name: 'Start', lat: 12.97, lng: 77.59 }], ...over,
});
const row = (n = 40): CohortRow => ({ n, deciles: [10, 20, 30, 40, 50, 60, 70, 80, 90] });

describe('summaryOf', () => {
  it('has exactly the five coarse keys: no coordinates, no time of day', () => {
    const s = summaryOf(ride(), 'rand-ref');
    expect(Object.keys(s!).sort()).toEqual(['cell', 'day', 'distanceKm', 'durationSec', 'ref']);
    expect(s).toEqual({ ref: 'rand-ref', day: '2026-11-12', distanceKm: 42.5, durationSec: 3600, cell: '12:77' });
    expect(JSON.stringify(s)).not.toContain('12.97');
  });
  it('uses the local calendar day, not UTC', () => {
    const t = new Date(2026, 0, 1, 0, 30).getTime();
    expect(localDay(t)).toBe('2026-01-01');
    expect(summaryOf(ride({ startedAt: t }), 'x')!.day).toBe('2026-01-01');
  });
  it('drops the sample ride and a ride with no waypoint', () => {
    expect(summaryOf(ride({ sample: true }), 'x')).toBeUndefined();
    expect(summaryOf(ride({ waypoints: [] }), 'x')).toBeUndefined();
  });
});

describe('consent copy', () => {
  it('names every uploaded field the rider can understand: date, distance, ride time and a rough area', () => {
    expect(STANDING_CONSENT).toContain("date, distance, ride time and a rough area (about 100 km wide)");
    expect(STANDING_CONSENT).toContain('Never your route.');
  });
});

describe('standingMoment', () => {
  const base = { metric: 'distance_km' as const, region: 'your area' };
  it('is undefined for a cohort of 19', () => {
    expect(standingMoment({ ...base, value: 95, row: row(19) })).toBeUndefined();
    expect(standingMoment({ ...base, value: 95, row: undefined })).toBeUndefined();
  });
  it('says the percentile at the 70th', () => {
    const m = standingMoment({ ...base, value: 70, row: row() });
    expect(m?.title).toBe('You rode further than 70% of riders near your area this month.');
    expect(m?.pose).toBe('standing-up');
    expect(m?.kind).toBe('standing');
  });
  it('never says 100%: above the top cut point it says 99%', () => {
    expect(standingMoment({ ...base, value: 95, row: row() })?.title).toBe('You rode further than 99% of riders near your area this month.');
    expect(shownPercent(100)).toBe(99);
    expect(shownPercent(72)).toBe(72);
  });
  it('is undefined below the 50th percentile', () => {
    expect(standingMoment({ ...base, value: 30, row: row() })).toBeUndefined();
    expect(standingMoment({ ...base, value: 49, row: row() })).toBeUndefined();
  });
});

describe('currentStanding', () => {
  it('uses the latest ride cell and this month distance, ignoring the sample', () => {
    const now = new Date(2026, 10, 20).getTime();
    const rides = [ride({ id: 'a', startedAt: new Date(2026, 9, 1).getTime(), distanceKm: 100, waypoints: [{ name: '', lat: 1.5, lng: 2.5 }] }), ride({ id: 'b', distanceKm: 10 }), ride({ id: 'c', sample: true, distanceKm: 999 })];
    expect(currentStanding(rides, now)).toEqual({ cell: '12:77', value: 10 });
  });
  it('sums only this month rides in the cohort cell, as the server cohort does', () => {
    const now = new Date(2026, 10, 20).getTime();
    const rides = [
      ride({ id: 'far', startedAt: new Date(2026, 10, 5).getTime(), distanceKm: 300, waypoints: [{ name: '', lat: 1.5, lng: 2.5 }] }),
      ride({ id: 'near1', startedAt: new Date(2026, 10, 10).getTime(), distanceKm: 20 }),
      ride({ id: 'near2', distanceKm: 10 }),
    ];
    expect(currentStanding(rides, now)).toEqual({ cell: '12:77', value: 30 });
  });
});

describe('opt-in store and upload', () => {
  const mk = (fetchCohort = vi.fn(async () => row()), now = { t: 1_000_000 }) =>
    create(standingPrefSlice({ now: () => now.t, current: () => ({ cell: '12:77', value: 70, period: '2026-11' }), fetchCohort }));

  it('is off by default and queues nothing while off', () => {
    const s = mk();
    expect(s.getState().optIn).toBe(false);
    s.getState().enqueue(['r1']);
    expect(s.getState().queue).toEqual([]);
  });
  it('after set(false) the queue is empty and nothing is uploaded', async () => {
    const s = mk();
    s.getState().set(true);
    s.getState().enqueue(['r1']);
    s.getState().set(false);
    expect(s.getState().queue).toEqual([]);
    const upload = vi.fn(async () => {});
    await uploadQueued({ token: 't', pref: () => s.getState(), rides: () => [ride()], upload });
    expect(upload).not.toHaveBeenCalled();
  });
  it('a retry in flight does not continue after opt-out', async () => {
    const s = mk();
    s.getState().set(true);
    s.getState().enqueue(['r1', 'r2']);
    const upload = vi.fn(async () => { s.getState().set(false); });
    await uploadQueued({ token: 't', pref: () => s.getState(), rides: () => [ride(), ride({ id: 'r2' })], upload });
    expect(upload).toHaveBeenCalledTimes(1);
    expect(s.getState().queue).toEqual([]);
  });
  it('uploads nothing without a token, and keeps the queue when the upload fails', async () => {
    const s = mk();
    s.getState().set(true);
    s.getState().enqueue(['r1']);
    const upload = vi.fn(async () => {});
    expect(await uploadQueued({ token: null, pref: () => s.getState(), rides: () => [ride()], upload })).toBe(false);
    expect(upload).not.toHaveBeenCalled();
    const failing = vi.fn(async () => { throw new Error('offline'); });
    await uploadQueued({ token: 't', pref: () => s.getState(), rides: () => [ride()], upload: failing });
    expect(s.getState().queue).toEqual(['r1']);
  });
  it('uploads only summaries and clears the queue on success', async () => {
    const s = mk();
    s.getState().set(true);
    s.getState().enqueue(['r1']);
    const upload = vi.fn(async () => {});
    await uploadQueued({ token: 't', pref: () => s.getState(), rides: () => [ride()], upload });
    expect(upload).toHaveBeenCalledWith('t', [summaryOf(ride(), s.getState().refOf('r1'))]);
    expect(s.getState().queue).toEqual([]);
  });
  it('sends a random ref, never the ride id (which encodes its start time); the same ride keeps its ref across retries', async () => {
    const s = mk();
    const id = uid(); // the real ride id format: start time in base 36
    s.getState().set(true);
    s.getState().enqueue([id, 'r2']);
    const sent: RideSummary[][] = [];
    const failing = vi.fn(async (_t: string, r: RideSummary[]) => { sent.push(r); throw new Error('offline'); });
    const ok = vi.fn(async (_t: string, r: RideSummary[]) => { sent.push(r); });
    const rides = () => [ride({ id }), ride({ id: 'r2' })];
    await uploadQueued({ token: 't', pref: () => s.getState(), rides, upload: failing });
    await uploadQueued({ token: 't', pref: () => s.getState(), rides, upload: ok });
    const [first, second] = sent;
    expect(first[0].ref).toBe(second[0].ref);
    expect(first[0].ref).not.toBe(first[1].ref);
    for (const r of first) {
      expect(Object.keys(r).sort()).toEqual(['cell', 'day', 'distanceKm', 'durationSec', 'ref']);
      expect(r.ref).not.toContain(id);
      expect(r.ref).not.toContain('r2');
      expect(r.ref).not.toContain(Date.now().toString(36).slice(0, 5));
      expect(r.ref).toMatch(/^[0-9a-f-]{36}$/);
    }
  });
  it('keeps a ride ref until the server has deleted (opt-out confirmed) or the rider leaves, and drops refs of deleted rides', async () => {
    const s = mk();
    s.getState().set(true);
    const a = s.getState().refOf('r1');
    s.getState().refOf('gone');
    s.getState().enqueue(['r1', 'gone']);
    await uploadQueued({ token: 't', pref: () => s.getState(), rides: () => [ride()], upload: vi.fn(async () => {}) });
    expect(s.getState().refs).toEqual({ r1: a }); // uploaded ride keeps its ref so a later re-queue upserts the same row
    s.getState().set(false); // the server may not know yet: an opt-in again before it does must not create a second row
    expect(s.getState().refOf('r1')).toBe(a);
    s.getState().clearPendingOptOut();
    expect(s.getState().refs).toEqual({});
    s.getState().refOf('r1');
    s.getState().reset();
    expect(s.getState().refs).toEqual({});
  });
  it('refreshStanding needs opt-in and a token, runs at most every 6 hours, stores a plain region', async () => {
    const fetchCohort = vi.fn(async () => row());
    const now = { t: 1_000_000 };
    const s = mk(fetchCohort, now);
    await s.getState().refreshStanding('t');
    expect(fetchCohort).not.toHaveBeenCalled();
    s.getState().set(true);
    await s.getState().refreshStanding(null);
    expect(fetchCohort).not.toHaveBeenCalled();
    await s.getState().refreshStanding('t');
    expect(fetchCohort).toHaveBeenCalledWith('12:77', '2026-11', 'distance_km');
    expect(s.getState().cohort).toMatchObject({ region: 'your area', metric: 'distance_km', value: 70, fetchedAt: 1_000_000 });
    now.t += 3_600_000;
    await s.getState().refreshStanding('t');
    expect(fetchCohort).toHaveBeenCalledTimes(1);
    now.t += 6 * 3_600_000;
    await s.getState().refreshStanding('t');
    expect(fetchCohort).toHaveBeenCalledTimes(2);
    s.getState().set(false);
    expect(s.getState().cohort).toBeUndefined();
  });
});
