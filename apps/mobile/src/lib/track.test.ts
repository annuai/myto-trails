import { describe, expect, it } from 'vitest';
import type { LatLng } from './geo';
import { breaksOf, cleanTrack, segmentsOf, splitSegments, trackStats } from './track';

const M = 1 / 111_320; // one metre of latitude, in degrees
/** A fix `north` metres north of the origin, `tSec` seconds after the start. */
const pt = (north: number, tSec: number, acc?: number): LatLng => ({ lat: 13 + north * M, lng: 77.6, t: 1_700_000_000_000 + tSec * 1000, ...(acc !== undefined ? { acc } : {}) });

describe('cleanTrack', () => {
  it('drops accuracy over 100 m but keeps a fix with no accuracy', () => {
    const out = cleanTrack([pt(0, 0, 10), pt(20, 5, 150), pt(40, 10), pt(60, 15, 100)]);
    expect(out.map((p) => Math.round((p.lat - 13) / M))).toEqual([0, 40, 60]);
  });
  it('drops a teleport spike (implied 400 km/h) and keeps the points either side', () => {
    const out = cleanTrack([pt(0, 0), pt(20, 10), pt(5000, 20), pt(40, 30), pt(60, 40)]);
    expect(out.map((p) => Math.round((p.lat - 13) / M))).toEqual([0, 20, 40, 60]);
  });
  it('a bad first fix does not erase the ride', () => {
    const out = cleanTrack([pt(9000, 0), ...Array.from({ length: 8 }, (_, i) => pt(i * 20, 10 + i * 10))]);
    expect(out.length).toBeGreaterThanOrEqual(7);
    expect(Math.round((out[out.length - 1].lat - 13) / M)).toBe(140);
  });
  it('drops points within 3 m of the last kept point', () => {
    const out = cleanTrack([pt(0, 0), pt(2, 1), pt(4, 2), pt(30, 10)]);
    expect(out.map((p) => Math.round((p.lat - 13) / M))).toEqual([0, 4, 30]);
  });
  it('returns empty and one-point input unchanged', () => {
    expect(cleanTrack([])).toEqual([]);
    expect(cleanTrack([pt(0, 0)])).toHaveLength(1);
  });
});

describe('stationary drift', () => {
  it('a 20 minute stop with plus or minus 4 m of wander at 1 Hz adds almost no distance', () => {
    const stop = Array.from({ length: 1200 }, (_, i) => pt(100 + (i % 2 ? 4 : -4), 100 + i, 10));
    const clean = cleanTrack([pt(0, 0, 10), pt(100, 10, 10), ...stop]);
    expect(trackStats(splitSegments(clean)).distanceM).toBeLessThan(150);
  });
  it('slow real movement is still recorded: 2 m per second with 5 m accuracy keeps a point every few seconds', () => {
    const slow = Array.from({ length: 60 }, (_, i) => pt(i * 2, i, 5));
    const clean = cleanTrack(slow);
    expect(trackStats(splitSegments(clean)).distanceM).toBeGreaterThan(100);
  });
});

describe('splitSegments', () => {
  it('a 20 minute stop with no movement is one segment, not a GPS gap', () => {
    expect(splitSegments([pt(0, 0), pt(1, 1200)])).toHaveLength(1);
  });
  it('a 2 km hole over 90 s starts a second segment', () => {
    const segs = splitSegments([pt(0, 0), pt(20, 10), pt(2020, 100), pt(2040, 110)]);
    expect(segs.map((s) => s.length)).toEqual([2, 2]);
  });
  it('a fast stretch with fixes every second stays one segment', () => {
    expect(splitSegments(Array.from({ length: 100 }, (_, i) => pt(i * 20, i)))).toHaveLength(1);
  });
  it('empty input gives no segments', () => {
    expect(splitSegments([])).toEqual([]);
  });
});

describe('splitSegments with pauses', () => {
  it('a pause between two fixes starts a new segment even with 5 s and 3 m between them', () => {
    const pts = [pt(0, 0), pt(20, 10), pt(23, 15), pt(43, 25)];
    const pause = { from: 1_700_000_000_000 + 12_000, to: 1_700_000_000_000 + 14_000 };
    expect(splitSegments(pts, [pause]).map((s) => s.length)).toEqual([2, 2]);
  });
  it('a pause that has not ended still splits later fixes', () => {
    const pts = [pt(0, 0), pt(20, 10), pt(40, 20)];
    expect(splitSegments(pts, [{ from: 1_700_000_000_000 + 15_000 }]).map((s) => s.length)).toEqual([2, 1]);
  });
  it('no pauses behaves as before', () => {
    expect(splitSegments([pt(0, 0), pt(20, 10)], [])).toHaveLength(1);
  });
});

describe('trackStats', () => {
  it('counts the straight-line distance across a break as gap, not distance', () => {
    const segs = splitSegments([pt(0, 0), pt(100, 10), pt(2100, 100), pt(2200, 110)]);
    const s = trackStats(segs);
    expect(s.distanceM).toBeCloseTo(200, -1);
    expect(s.gapM).toBeCloseTo(2000, -1);
  });
  it('moving time skips standing still and reports the top speed', () => {
    const s = trackStats([[pt(0, 0), pt(100, 10), pt(100.5, 70), pt(200, 80)]]);
    expect(s.movingSec).toBeCloseTo(20, 0);
    expect(s.maxKmh).toBeCloseTo(36, 0);
  });
  it('identical or backwards timestamps do not throw or go negative', () => {
    const s = trackStats([[pt(0, 10), pt(50, 10), pt(100, 5)]]);
    expect(s.movingSec).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(s.maxKmh)).toBe(true);
    expect(s.distanceM).toBeCloseTo(100, -1);
  });
  it('empty input is all zeros', () => {
    expect(trackStats([])).toEqual({ distanceM: 0, movingSec: 0, gapM: 0, maxKmh: 0 });
  });
});

describe('breaksOf', () => {
  it('lists the index where each segment after the first starts, and round-trips with segmentsOf', () => {
    const pts = [pt(0, 0), pt(20, 10), pt(2020, 100), pt(2040, 110), pt(4040, 200)];
    const segs = splitSegments(pts);
    expect(breaksOf(segs)).toEqual([2, 4]);
    expect(segmentsOf(pts, breaksOf(segs))).toEqual(segs);
  });
  it('is empty for one segment or none', () => {
    expect(breaksOf([[pt(0, 0), pt(20, 10)]])).toEqual([]);
    expect(breaksOf([])).toEqual([]);
  });
});
