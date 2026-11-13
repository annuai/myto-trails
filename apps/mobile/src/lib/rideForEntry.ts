import type { JournalEntry } from './journalEntries';

/** The ride whose stats go with a journal photo: the entry's own ride, else the latest saved one. */
export function rideForEntry(entry: Pick<JournalEntry, 'rideId'>, rides: readonly { id: string; startedAt: number }[]): string | undefined {
  if (entry.rideId && rides.some((r) => r.id === entry.rideId)) return entry.rideId;
  return [...rides].sort((a, b) => b.startedAt - a.startedAt)[0]?.id;
}
