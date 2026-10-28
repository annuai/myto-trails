import { describe, expect, it } from 'vitest';
import type { LatLng } from '@/lib/geo';
import { createMemoryJournal } from '@/lib/journal';
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
