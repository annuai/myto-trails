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
