import { describe, expect, it } from 'vitest';
import { addDays, addMonths, daysUntil, monthGrid } from './dates';
import { buildGpx } from './gpx';
import { segmentsOf } from './track';
import { haversine, pathLength, trimEnds, type LatLng } from './geo';
import { dueInfo, type Todo } from './todos';

describe('dates', () => {
  it('adds days and months, clamping month ends', () => {
    expect(addDays('2026-10-25', 7)).toBe('2026-11-01');
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(daysUntil('2026-11-01', '2026-10-25')).toBe(7);
  });
  it('lays out a Monday-first month grid', () => {
    const g = monthGrid(2026, 9); // October 2026 starts on a Thursday
    expect(g[0].slice(0, 4)).toEqual([null, null, null, '2026-10-01']);
    expect(g.flat().filter(Boolean)).toHaveLength(31);
  });
});

describe('dueInfo', () => {
  const today = '2026-10-25';
  const lube: Todo = { id: 'a', title: 'Chain lube', category: 'service', kind: 'service', done: false, everyKm: 500, everyMonths: 1, lastDate: '2026-10-07', lastKm: 0 };
  it('dated items are overdue, soon or ok', () => {
    const base: Todo = { id: 'b', title: 'PUC', category: 'document', kind: 'date', done: false };
    expect(dueInfo({ ...base, due: '2026-10-20' }, 0, today).state).toBe('overdue');
    expect(dueInfo({ ...base, due: '2026-11-10' }, 0, today).state).toBe('soon');
    expect(dueInfo({ ...base, due: '2027-03-01' }, 0, today).state).toBe('ok');
  });
  it('service items use whichever limit comes first', () => {
    expect(dueInfo(lube, 100, today).text).toBe('Due in 13 days or about 400 km');
    expect(dueInfo(lube, 480, today).state).toBe('soon'); // 20 km left of 500
    expect(dueInfo(lube, 500, today).state).toBe('overdue'); // distance reached
    expect(dueInfo({ ...lube, lastDate: '2026-08-01' }, 0, today).state).toBe('overdue'); // date passed
  });
  it('done items are done', () => expect(dueInfo({ ...lube, done: true }, 0, today).state).toBe('done'));
});

const line = (n: number): LatLng[] => Array.from({ length: n }, (_, i) => ({ lat: 13 + i * 0.001, lng: 77.6 }));

describe('geo and gpx', () => {
  it('measures distance', () => {
    expect(haversine({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeGreaterThan(111_000);
    expect(pathLength(line(11)) / 1000).toBeCloseTo(1.11, 1);
  });
  it('trims both ends', () => {
    const t = trimEnds(line(101), 2000); // 100 points x 111 m = 11 km total
    expect(t.length).toBeLessThan(101);
    expect(pathLength(t) / 1000).toBeCloseTo(11.1 - 4, 0);
  });
  it('returns nothing when trim would remove the whole track', () => expect(trimEnds(line(5), 1000)).toEqual([]));
  it('builds valid escaped GPX', () => {
    const g = buildGpx('A & B <x>', line(2), [{ name: 'Gate', lat: 13, lng: 77.6 }]);
    expect(g).toContain('<name>A &amp; B &lt;x&gt;</name>');
    expect(g.match(/<trkpt /g)).toHaveLength(2);
    expect(g).toContain('<wpt lat="13.000000" lon="77.600000">');
  });
});

describe('segmented GPX', () => {
  const pts: LatLng[] = Array.from({ length: 5 }, (_, i) => ({ lat: 13 + i * 0.001, lng: 77.6, t: 1_700_000_000_000 + i * 1000 }));
  const count = (s: string, tag: string) => s.split(tag).length - 1;
  it('writes one trkseg per segment and keeps every point', () => {
    const gpx = buildGpx('Ride', pts, [], [3]);
    expect(count(gpx, '<trkseg>')).toBe(2);
    expect(count(gpx, '<trkpt')).toBe(5);
  });
  it('writes a single trkseg when there are no breaks', () => {
    expect(count(buildGpx('Ride', pts), '<trkseg>')).toBe(1);
    expect(count(buildGpx('Ride', pts, [], []), '<trkseg>')).toBe(1);
  });
  it('segmentsOf a legacy ride (no breaks) returns one segment, and splits at the break indices otherwise', () => {
    expect(segmentsOf(pts)).toEqual([pts]);
    expect(segmentsOf(pts, [2, 4]).map((s) => s.length)).toEqual([2, 2, 1]);
    expect(segmentsOf([])).toEqual([]);
  });
});
