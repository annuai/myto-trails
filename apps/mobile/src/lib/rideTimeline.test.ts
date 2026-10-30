import { describe, expect, it } from 'vitest';
import type { JournalEntry } from './journalEntries';
import { rideTimeline } from './rideTimeline';

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
