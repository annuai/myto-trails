import { describe, expect, it } from 'vitest';
import type { JournalEntry } from './journalEntries';
import { rideTimeline, rideWaits } from './rideTimeline';

const T0 = 1_700_000_000_000;
const M = 1 / 111_320;
const p = (north: number, tSec: number) => ({ lat: 13 + north * M, lng: 77.6, t: T0 + tSec * 1000 });
const ride = {
  id: 'r1', startedAt: T0, durationSec: 100, pausedSec: 0,
  points: [p(0, 0), p(500, 50), p(1000, 100)], breaks: undefined as number[] | undefined,
  waypoints: [{ name: 'Fuel', lat: 13 + 520 * M, lng: 77.6, kind: 'fuel' as const }],
};
const note = (id: string, atSec: number, extra: Partial<JournalEntry> = {}): JournalEntry => ({ id, rideKey: T0, at: T0 + atSec * 1000, kind: 'note', text: id, ...extra });

describe('rideTimeline', () => {
  it('runs from the start to the finish, with moments and waypoints between in time order', () => {
    const tl = rideTimeline(ride, [note('later', 80), note('early', 10)]);
    expect(tl.map((e) => e.kind)).toEqual(['start', 'note', 'waypoint', 'note', 'finish']);
    expect(tl.map((e) => e.at)).toEqual([...tl.map((e) => e.at)].sort((a, b) => a - b));
    expect(tl[1]!.text).toBe('early');
  });
  it('places a waypoint at the time of the nearest point on the track', () => {
    const wp = rideTimeline(ride, []).find((e) => e.kind === 'waypoint')!;
    expect(wp.at).toBe(T0 + 50_000);
    expect(wp.text).toBe('Fuel');
  });
  it('shows a stop where the track has a gap, with how long it lasted', () => {
    const gappy = { ...ride, points: [p(0, 0), p(100, 20), p(110, 80), p(200, 90)], breaks: [2], waypoints: [] };
    const brk = rideTimeline(gappy, []).find((e) => e.kind === 'break')!;
    expect(brk.at).toBe(T0 + 20_000);
    expect(brk.durationSec).toBe(60);
  });
  it('keeps only this ride\'s moments, matching by id or by the older start-time key', () => {
    const tl = rideTimeline(ride, [note('byKey', 5), note('byId', 6, { rideKey: 1, rideId: 'r1' }), note('other', 7, { rideKey: 999 })]);
    expect(tl.filter((e) => e.kind === 'note').map((e) => e.text)).toEqual(['byKey', 'byId']);
  });
  it('carries where a moment was made when that is known', () => {
    const e = rideTimeline(ride, [note('here', 5, { lat: 13.1, lng: 77.7 })]).find((x) => x.kind === 'note')!;
    expect(e).toMatchObject({ lat: 13.1, lng: 77.7 });
  });
  it('still gives a start and a finish for a ride with no track times', () => {
    const bare = { ...ride, points: [{ lat: 13, lng: 77.6 }, { lat: 13.01, lng: 77.6 }], waypoints: [] };
    const tl = rideTimeline(bare, []);
    expect(tl.map((e) => e.kind)).toEqual(['start', 'finish']);
    expect(tl[1]!.at).toBe(T0 + 100_000);
  });
});

describe('rideWaits', () => {
  // Points stand still for the gap; saving a ride drops the points in between.
  const still = [p(0, 0), p(100, 10), p(103, 100), p(200, 110), p(203, 500), p(300, 510)];
  it('finds a stop of a minute or more where the bike barely moved', () => {
    const w = rideWaits(still);
    expect(w.waits.map((x) => x.durationSec)).toEqual([90, 390]);
    expect(w).toMatchObject({ count: 2, longCount: 1, totalSec: 480 });
  });
  it('ignores a gap shorter than a minute, a gap that covered ground, and a gap the track marks as a break', () => {
    expect(rideWaits([p(0, 0), p(100, 59)]).count).toBe(0);
    expect(rideWaits([p(0, 0), p(2000, 120)]).count).toBe(0);
    expect(rideWaits([p(0, 0), p(10, 120)], [1]).count).toBe(0);
  });
  it('shows only long waits in the timeline and leaves the short ones to the total', () => {
    const tl = rideTimeline({ ...ride, points: still, waypoints: [] }, []);
    expect(tl.filter((e) => e.kind === 'wait').map((e) => e.durationSec)).toEqual([390]);
  });
});

