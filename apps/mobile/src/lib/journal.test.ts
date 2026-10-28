import { beforeEach, describe, expect, it } from 'vitest';
import { createMemoryJournal, type Journal } from './journal';

const fix = (n: number, extra = {}) => ({ lat: 13 + n * 1e-4, lng: 77.6, t: 1_700_000_000_000 + n * 1000, ele: 900 + n, speed: 5, acc: 8, ...extra });

describe('journal (memory implementation)', () => {
  let j: Journal;
  beforeEach(() => { j = createMemoryJournal(); });

  it('reads null before a ride has begun', async () => {
    expect(await j.read()).toBeNull();
  });
  it('keeps every fix in order with all its fields, including a very poor accuracy', async () => {
    await j.begin({ startedAt: 123, source: 'gps' });
    await j.append(fix(0));
    await j.append(fix(1, { acc: 500 }));
    await j.append(fix(2));
    const r = await j.read();
    expect(r?.meta).toEqual({ startedAt: 123, source: 'gps' });
    expect(r?.points).toEqual([fix(0), fix(1, { acc: 500 }), fix(2)]);
  });
  it('round-trips waypoints', async () => {
    await j.begin({ startedAt: 1, source: 'gps' });
    await j.appendWaypoint({ name: 'Waypoint 1', lat: 13, lng: 77.6 });
    expect((await j.read())?.waypoints).toEqual([{ name: 'Waypoint 1', lat: 13, lng: 77.6 }]);
  });
  it('is null again after clear', async () => {
    await j.begin({ startedAt: 1, source: 'gps' });
    await j.append(fix(0));
    await j.clear();
    expect(await j.read()).toBeNull();
  });
  it('begin replaces a previous ride', async () => {
    await j.begin({ startedAt: 1, source: 'gps' });
    await j.append(fix(0));
    await j.begin({ startedAt: 2, source: 'sim' });
    const r = await j.read();
    expect(r?.meta.startedAt).toBe(2);
    expect(r?.points).toEqual([]);
  });
  it('returns copies, so callers cannot change what is stored', async () => {
    await j.begin({ startedAt: 1, source: 'gps' });
    await j.append(fix(0));
    (await j.read())!.points.push(fix(9));
    expect((await j.read())!.points).toHaveLength(1);
  });
});
