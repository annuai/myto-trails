import { describe, expect, it, vi } from 'vitest';
import type { LatLng } from '@/lib/geo';
import { createMemoryJournal, type Journal } from '@/lib/journal';
import { createRecorder } from './recorderCore';

const M = 1 / 111_320;
const pt = (north: number, tSec: number, acc?: number): LatLng => ({ lat: 13 + north * M, lng: 77.6, t: 1_700_000_000_000 + tSec * 1000, ...(acc !== undefined ? { acc } : {}) });

describe('recorder over the journal', () => {
  it('keeps every fix on disk, even a very poor one, while the live track leaves it out', async () => {
    const j = createMemoryJournal();
    const rec = createRecorder(j);
    await rec.getState().start('gps');
    await rec.getState().ingest(pt(0, 0, 5));
    await rec.getState().ingest(pt(20, 5, 500));
    await rec.getState().ingest(pt(40, 10, 5));
    expect((await j.read())!.points).toHaveLength(3);
    expect(rec.getState().points).toHaveLength(2);
  });
  it('notes the time of every fix, including one that is not drawn', async () => {
    const rec = createRecorder(createMemoryJournal());
    await rec.getState().start('gps');
    const before = Date.now();
    await rec.getState().ingest(pt(0, 0, 500));
    expect(rec.getState().lastFixAt).toBeGreaterThanOrEqual(before);
  });
  it('a recorder started after a kill finds the unfinished ride and can restore it', async () => {
    const j = createMemoryJournal();
    const first = createRecorder(j);
    await first.getState().start('gps');
    for (let i = 0; i < 5; i++) await first.getState().ingest(pt(i * 20, i * 5));
    await first.getState().addWaypoint();

    const second = createRecorder(j);
    await second.getState().checkRecoverable();
    expect(second.getState().recoverable).toEqual({ startedAt: first.getState().startedAt, points: 5 });
    await second.getState().recover();
    expect(second.getState().status).toBe('running');
    expect(second.getState().points).toEqual(first.getState().points);
    expect(second.getState().waypoints).toHaveLength(1);
    expect(second.getState().recoverable).toBeNull();
  });
  it('names the last waypoint by what it marks, counting each kind, and keeps that on disk', async () => {
    const j = createMemoryJournal();
    const rec = createRecorder(j);
    await rec.getState().start('gps');
    await rec.getState().ingest(pt(0, 0));
    await rec.getState().addWaypoint();
    await rec.getState().retypeLastWaypoint('fuel');
    await rec.getState().addWaypoint();
    await rec.getState().retypeLastWaypoint('fuel');
    expect(rec.getState().waypoints.map((w) => [w.name, w.kind])).toEqual([['Fuel 1', 'fuel'], ['Fuel 2', 'fuel']]);
    expect((await j.read())!.waypoints.map((w) => w.kind)).toEqual(['fuel', 'fuel']);
  });
  it('retyping with no waypoint does nothing', async () => {
    const rec = createRecorder(createMemoryJournal());
    await rec.getState().start('gps');
    await expect(rec.getState().retypeLastWaypoint('water')).resolves.toBeUndefined();
    expect(rec.getState().waypoints).toEqual([]);
  });
  it('starting a ride while an unfinished one exists does not overwrite it', async () => {
    const j = createMemoryJournal();
    const first = createRecorder(j);
    await first.getState().start('gps');
    await first.getState().ingest(pt(0, 0));
    const startedAt = first.getState().startedAt;

    const second = createRecorder(j);
    expect(await second.getState().start('gps')).toBe(false);
    expect(second.getState().status).toBe('idle');
    expect(second.getState().recoverable).toEqual({ startedAt, points: 1 });
    expect((await j.read())!.meta.startedAt).toBe(startedAt);
  });
  it('discarding the recovered ride empties the journal', async () => {
    const j = createMemoryJournal();
    const first = createRecorder(j);
    await first.getState().start('gps');
    await first.getState().ingest(pt(0, 0));
    const second = createRecorder(j);
    await second.getState().checkRecoverable();
    await second.getState().discardRecovered();
    expect(await j.read()).toBeNull();
    expect(second.getState().recoverable).toBeNull();
  });
  it('stays quiet when there is nothing to recover', async () => {
    const rec = createRecorder(createMemoryJournal());
    await rec.getState().checkRecoverable();
    expect(rec.getState().recoverable).toBeNull();
  });
});

describe('recorder review fixes', () => {
  it('a fix that arrives while the screen state is idle (app relaunched by the phone) is journaled but not shown', async () => {
    const j = createMemoryJournal();
    const first = createRecorder(j);
    await first.getState().start('gps');
    const relaunched = createRecorder(j);
    await relaunched.getState().ingest(pt(0, 0));
    expect((await j.read())!.points).toHaveLength(1);
    expect(relaunched.getState().points).toEqual([]);
    expect(relaunched.getState().lastFixAt).toBe(0);
  });
  it('flush waits for fixes still being written', async () => {
    const inner = createMemoryJournal();
    const slow: Journal = { ...inner, append: (f) => new Promise((r) => setTimeout(r, 20)).then(() => inner.append(f)) };
    const rec = createRecorder(slow);
    await rec.getState().start('gps');
    void rec.getState().ingest(pt(0, 0));
    void rec.getState().ingest(pt(20, 5));
    await rec.getState().flush();
    expect((await inner.read())!.points).toHaveLength(2);
  });
  it('moving is true at speed and false when standing still', async () => {
    const rec = createRecorder(createMemoryJournal());
    await rec.getState().start('gps');
    await rec.getState().ingest({ ...pt(0, 0), speed: 10 });
    expect(rec.getState().moving).toBe(true);
    await rec.getState().ingest({ ...pt(0, 30), speed: 0 });
    expect(rec.getState().moving).toBe(false);
  });
  it('moving ignores jitter: a parked phone wandering 5 m a second is not moving, and a poor fix changes nothing', async () => {
    const rec = createRecorder(createMemoryJournal());
    await rec.getState().start('gps');
    await rec.getState().ingest({ ...pt(0, 0, 5), speed: 10 });
    await rec.getState().ingest({ ...pt(0, 1, 5), speed: 0 });
    await rec.getState().ingest({ ...pt(5, 2, 5) });
    expect(rec.getState().moving).toBe(false);
    await rec.getState().ingest({ ...pt(20, 3, 5), speed: 10 });
    await rec.getState().ingest({ ...pt(300, 4, 500) });
    expect(rec.getState().moving).toBe(true);
  });
  it('a failed waypoint write sets an error and does not throw', async () => {
    const inner = createMemoryJournal();
    const rec = createRecorder({ ...inner, appendWaypoint: async () => { throw new Error('disk full'); } });
    await rec.getState().start('gps');
    await rec.getState().ingest(pt(0, 0));
    await expect(rec.getState().addWaypoint()).resolves.toBeUndefined();
    expect(rec.getState().error).toMatch(/could not save/i);
  });
  it('discarding a recovered ride stops background recording', async () => {
    const j = createMemoryJournal();
    await j.begin({ startedAt: 1, source: 'gps' });
    const stopBackground = vi.fn(async () => undefined);
    const rec = createRecorder(j, { stopBackground });
    await rec.getState().discardRecovered();
    expect(stopBackground).toHaveBeenCalledTimes(1);
  });
});

describe('pause', () => {
  const clock = (start: number) => { let now = start; vi.spyOn(Date, 'now').mockImplementation(() => now); return (t: number) => { now = t; }; };
  const T = 1_700_000_000_000;

  it('pausing stops fixes being added to the track or the journal, and resuming continues', async () => {
    const set = clock(T);
    const j = createMemoryJournal();
    const rec = createRecorder(j);
    await rec.getState().start('gps');
    await rec.getState().ingest(pt(0, 0));
    await rec.getState().ingest(pt(30, 5));
    set(T + 10_000);
    await rec.getState().pause();
    await rec.getState().ingest(pt(60, 10));
    expect(rec.getState().paused).toBe(true);
    expect(rec.getState().points).toHaveLength(2);
    expect((await j.read())!.points).toHaveLength(2);
    set(T + 20_000);
    await rec.getState().resume();
    await rec.getState().ingest(pt(90, 20));
    expect(rec.getState().paused).toBe(false);
    expect((await j.read())!.points).toHaveLength(3);
    vi.restoreAllMocks();
  });
  it('elapsed time leaves out paused time and is frozen while paused', async () => {
    const set = clock(T);
    const rec = createRecorder(createMemoryJournal());
    await rec.getState().start('gps');
    set(T + 60_000);
    await rec.getState().pause();
    expect(rec.getState().elapsedMs(T + 60_000)).toBe(60_000);
    expect(rec.getState().elapsedMs(T + 500_000)).toBe(60_000);
    set(T + 360_000);
    await rec.getState().resume();
    expect(rec.getState().elapsedMs(T + 400_000)).toBe(100_000);
    vi.restoreAllMocks();
  });
  it('a second pause or a resume while running does nothing', async () => {
    const set = clock(T);
    const rec = createRecorder(createMemoryJournal());
    await rec.getState().start('gps');
    await rec.getState().resume();
    set(T + 1000);
    await rec.getState().pause();
    set(T + 5000);
    await rec.getState().pause();
    expect(rec.getState().pausedAt).toBe(T + 1000);
    vi.restoreAllMocks();
  });
  it('pausing clears the moving flag', async () => {
    clock(T);
    const rec = createRecorder(createMemoryJournal());
    await rec.getState().start('gps');
    await rec.getState().ingest({ ...pt(0, 0), speed: 10 });
    expect(rec.getState().moving).toBe(true);
    await rec.getState().pause();
    expect(rec.getState().moving).toBe(false);
    vi.restoreAllMocks();
  });
  it('after a kill, a recovered ride is still paused and keeps its elapsed time', async () => {
    const set = clock(T);
    const j = createMemoryJournal();
    const first = createRecorder(j);
    await first.getState().start('gps');
    set(T + 30_000);
    await first.getState().pause();
    set(T + 900_000);
    const second = createRecorder(j);
    await second.getState().recover();
    expect(second.getState().paused).toBe(true);
    expect(second.getState().elapsedMs(T + 900_000)).toBe(30_000);
    set(T + 960_000);
    await second.getState().resume();
    expect(second.getState().elapsedMs(T + 1_000_000)).toBe(70_000);
    vi.restoreAllMocks();
  });
  it('a recovered ride with a finished pause keeps the paused time out', async () => {
    const set = clock(T);
    const j = createMemoryJournal();
    const first = createRecorder(j);
    await first.getState().start('gps');
    set(T + 10_000); await first.getState().pause();
    set(T + 70_000); await first.getState().resume();
    const second = createRecorder(j);
    await second.getState().recover();
    expect(second.getState().paused).toBe(false);
    expect(second.getState().elapsedMs(T + 100_000)).toBe(40_000);
    vi.restoreAllMocks();
  });
});

describe('moving while paused', () => {
  const T = 1_700_000_000_000;
  const clock = (start: number) => { let now = start; vi.spyOn(Date, 'now').mockImplementation(() => now); return (t: number) => { now = t; }; };

  it('does not add the jump across a pause to the live distance, and breaks the live track there', async () => {
    const set = clock(T);
    const rec = createRecorder(createMemoryJournal());
    await rec.getState().start('gps');
    await rec.getState().ingest(pt(0, 0));
    await rec.getState().ingest(pt(30, 5));
    set(T + 10_000); await rec.getState().pause();
    set(T + 600_000); await rec.getState().resume();
    await rec.getState().ingest(pt(5000, 605));
    await rec.getState().ingest(pt(5030, 610));
    expect(rec.getState().meters).toBeGreaterThan(55);
    expect(rec.getState().meters).toBeLessThan(65);
    expect(rec.getState().pauseBreaks).toEqual([2]);
    expect(rec.getState().points).toHaveLength(4);
    vi.restoreAllMocks();
  });
  it('a recovered ride rebuilds the breaks at its pauses', async () => {
    const set = clock(T);
    const j = createMemoryJournal();
    const first = createRecorder(j);
    await first.getState().start('gps');
    await first.getState().ingest(pt(0, 0));
    await first.getState().ingest(pt(30, 5));
    set(T + 10_000); await first.getState().pause();
    set(T + 20_000); await first.getState().resume();
    await first.getState().ingest(pt(31, 25));
    await first.getState().ingest(pt(80, 30));
    const second = createRecorder(j);
    await second.getState().recover();
    expect(second.getState().pauseBreaks).toEqual([2]);
    vi.restoreAllMocks();
  });

  it('gives each ride an id when it starts, keeps it in the journal, and restores it after a kill', async () => {
    const j = createMemoryJournal();
    const first = createRecorder(j);
    await first.getState().start('gps');
    const id = first.getState().rideId;
    expect(id).not.toBe('');
    expect((await j.read())!.meta.rideId).toBe(id);
    const second = createRecorder(j);
    await second.getState().start('gps');
    await second.getState().recover();
    expect(second.getState().rideId).toBe(id);
    const other = createRecorder(createMemoryJournal());
    await other.getState().start('gps');
    expect(other.getState().rideId).not.toBe(id);
  });
  describe('speed while standing still', () => {
    const at = (north: number, tSec: number, speed: number | null, acc = 5): LatLng => ({ ...pt(north, tSec, acc), speed });
    const rideThenStop = async () => {
      const rec = createRecorder(createMemoryJournal());
      await rec.getState().start('gps');
      for (let i = 0; i < 6; i++) await rec.getState().ingest(at(i * 10, i, 10)); // 36 km/h
      return rec;
    };
    it('drops to zero when the fixes stop moving, even if the phone keeps reporting a small speed', async () => {
      const rec = await rideThenStop();
      for (let i = 0; i < 6; i++) await rec.getState().ingest(at(50 + (i % 2), 6 + i, 1.6)); // parked, jittering 1 m, Doppler says 5.8 km/h
      expect(rec.getState().speedKmh).toBe(0);
    });
    it('is not left at the last riding speed when a stopped phone reports no speed at all', async () => {
      const rec = await rideThenStop();
      for (let i = 0; i < 6; i++) await rec.getState().ingest(at(50, 6 + i, null));
      expect(rec.getState().speedKmh).toBe(0);
    });
    it('still reads a real crawl of 6 km/h', async () => {
      const rec = await rideThenStop();
      for (let i = 0; i < 10; i++) await rec.getState().ingest(at(50 + i * 1.7, 6 + i, 1.7));
      expect(rec.getState().speedKmh).toBeGreaterThan(4);
    });
  });
});

describe('live top speed', () => {
  it('is not set by one fix whose speed reading is a glitch', async () => {
    const rec = createRecorder(createMemoryJournal());
    await rec.getState().start('gps');
    for (let i = 0; i < 12; i++) await rec.getState().ingest({ ...pt(i * 10, i, 5), speed: i === 6 ? 45 : 10 });
    expect(rec.getState().maxKmh).toBeLessThan(40);
    expect(rec.getState().maxKmh).toBeGreaterThan(30);  });
});
