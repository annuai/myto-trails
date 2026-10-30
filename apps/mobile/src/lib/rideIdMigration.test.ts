import { describe, expect, it, vi } from 'vitest';
import type { JournalEntry } from './journalEntries';
import { migrateRideIds } from './rideIdMigration';

const e = (id: string, rideKey: number, rideId?: string): JournalEntry => ({ id, rideKey, at: 1, kind: 'note', ...(rideId ? { rideId } : {}) });
const rides = [{ id: 'r1', startedAt: 100 }];

function setup(entries: JournalEntry[], opts: { copyFails?: boolean } = {}) {
  const calls: string[] = [];
  const saveCopy = vi.fn(async (_json: string) => { calls.push('copy'); if (opts.copyFails) throw new Error('disk full'); });
  const backfill = vi.fn((_r: typeof rides) => { calls.push('backfill'); return 1; });
  return { calls, saveCopy, backfill, run: () => migrateRideIds({ entries: () => entries, rides: () => rides, saveCopy, backfill }) };
}

describe('migrateRideIds', () => {
  it('saves a copy of the entries first, then fills in the ride ids', async () => {
    const { run, calls, saveCopy } = setup([e('a', 100), e('b', 999)]);
    expect(await run()).toBe(1);
    expect(calls).toEqual(['copy', 'backfill']);
    expect(JSON.parse(saveCopy.mock.calls[0]![0]).entries).toHaveLength(2);
  });
  it('does nothing, and writes no copy, when no entry needs an id', async () => {
    const { run, saveCopy, backfill } = setup([e('a', 100, 'r1'), e('b', 999)]);
    expect(await run()).toBe(0);
    expect(saveCopy).not.toHaveBeenCalled();
    expect(backfill).not.toHaveBeenCalled();
  });
  it('leaves the entries alone when the copy cannot be written', async () => {
    const { run, backfill } = setup([e('a', 100)], { copyFails: true });
    await expect(run()).rejects.toThrow('disk full');
    expect(backfill).not.toHaveBeenCalled();
  });
});
