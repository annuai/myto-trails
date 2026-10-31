import type { JournalEntry } from './journalEntries';

type Deps = {
  entries: () => JournalEntry[];
  rides: () => { id: string; startedAt: number }[];
  /** Writes the safety copy made before the first change (docs/adr/0008). */
  saveCopy: (json: string) => Promise<void>;
  /** Fills in the ride ids; returns how many entries changed. */
  backfill: (rides: { id: string; startedAt: number }[]) => number;
};

/**
 * Gives journal entries made before ride ids the id of their ride, once. `rideKey` is not touched, so the old structure keeps
 * working. The entries are copied to a file first; if that copy cannot be written, nothing changes and the next start tries again.
 */
export async function migrateRideIds(d: Deps): Promise<number> {
  const rides = d.rides();
  const starts = new Set(rides.map((r) => r.startedAt));
  const entries = d.entries();
  if (!entries.some((e) => !e.rideId && starts.has(e.rideKey))) return 0;
  await d.saveCopy(JSON.stringify({ savedAt: new Date().toISOString(), note: 'Journal entries before ride ids were added', entries }));
  return d.backfill(rides);
}
