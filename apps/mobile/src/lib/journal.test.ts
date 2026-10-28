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
  it('retypes a waypoint by position', async () => {
    await j.begin({ startedAt: 1, source: 'gps' });
    await j.appendWaypoint({ name: 'Waypoint 1', lat: 13, lng: 77.6 });
    await j.appendWaypoint({ name: 'Waypoint 2', lat: 13.1, lng: 77.6 });
    await j.retypeWaypoint(1, 'water', 'Water 1');
    expect((await j.read())?.waypoints).toEqual([{ name: 'Waypoint 1', lat: 13, lng: 77.6 }, { name: 'Water 1', lat: 13.1, lng: 77.6, kind: 'water' }]);
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

  it('records a pause and its resume, and an open pause has no end', async () => {
    await j.begin({ startedAt: 1, source: 'gps' });
    await j.pause(1000);
    await j.resume(5000);
    await j.pause(9000);
    expect((await j.read())?.pauses).toEqual([{ from: 1000, to: 5000 }, { from: 9000 }]);
  });
  it('ignores a second pause while paused and a resume while running', async () => {
    await j.begin({ startedAt: 1, source: 'gps' });
    await j.resume(10);
    await j.pause(20);
    await j.pause(30);
    await j.resume(40);
    expect((await j.read())?.pauses).toEqual([{ from: 20, to: 40 }]);
  });
  it('begin clears pauses', async () => {
    await j.begin({ startedAt: 1, source: 'gps' });
    await j.pause(1);
    await j.begin({ startedAt: 2, source: 'gps' });
    expect((await j.read())?.pauses).toEqual([]);
  });
});
