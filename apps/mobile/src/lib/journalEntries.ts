export type JournalKind = 'note' | 'voice' | 'photo';

/**
 * One thing written, spoken or photographed on a ride. `rideKey` is the ride's `startedAt`, so entries made while
 * the ride is still recording belong to it once it is saved. A voice or photo entry has a file named by `id`.
 */
export type JournalEntry = {
  id: string; rideKey: number; at: number; kind: JournalKind;
  /** The id of the ride this belongs to. Written next to `rideKey` (which stays) so a later change can switch to it; absent on a journal with no ride, and on entries from before it. */
  rideId?: string;
  /** The note, or a caption on a photo. */
  text?: string;
  /** Voice length. */
  durationSec?: number;
  width?: number; height?: number;
};

const label = (n: number, one: string, many: string) => (n === 1 ? `1 ${one}` : `${n} ${many}`);

/** "2 notes · 1 voice · 3 photos", leaving out what there is none of. */
export function summarise(entries: JournalEntry[]): string {
  const n = (k: JournalKind) => entries.filter((e) => e.kind === k).length;
  return [n('note') && label(n('note'), 'note', 'notes'), n('voice') && label(n('voice'), 'voice', 'voice'), n('photo') && label(n('photo'), 'photo', 'photos')].filter(Boolean).join(' · ');
}

export type RideJournal = { rideKey: number; entries: JournalEntry[]; /** time of the latest entry */ last: number };

/** One journal per ride: rides with the most recent entry first, each ride's entries oldest first. */
export function groupByRide(entries: JournalEntry[]): RideJournal[] {
  const by = new Map<number, JournalEntry[]>();
  for (const e of entries) by.set(e.rideKey, [...(by.get(e.rideKey) ?? []), e]);
  return [...by].map(([rideKey, list]) => {
    const sorted = [...list].sort((a, b) => a.at - b.at);
    return { rideKey, entries: sorted, last: sorted[sorted.length - 1].at };
  }).sort((a, b) => b.last - a.last);
}
