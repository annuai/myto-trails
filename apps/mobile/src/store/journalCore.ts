import type { StateCreator } from 'zustand';
import type { JournalEntry, JournalKind } from '@/lib/journalEntries';

/** What the store needs from the file side, so it can be tested without a phone. */
export type JournalMediaOps = { remove: (id: string, kind: Exclude<JournalKind, 'note'>) => void; removeAll: () => void };

export type JournalState = {
  entries: JournalEntry[];
  add: (e: JournalEntry) => void;
  /** Removes the entry and its file. */
  remove: (id: string) => void;
  /** Removes every entry of a ride, and their files (a deleted ride takes its journal with it). */
  removeForRide: (rideKey: number) => void;
  /** Erase all my data. */
  wipe: () => void;
  /** Replaces the entries from a backup. The files are restored separately. */
  restore: (entries: JournalEntry[]) => void;
};

export const journalSlice = (media: JournalMediaOps): StateCreator<JournalState> => (set, get) => {
  const drop = (e: JournalEntry) => { if (e.kind !== 'note') media.remove(e.id, e.kind); };
  return {
    entries: [],
    add: (e) => set((s) => ({ entries: [...s.entries, e] })),
    remove: (id) => { get().entries.filter((e) => e.id === id).forEach(drop); set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })); },
    removeForRide: (rideKey) => { get().entries.filter((e) => e.rideKey === rideKey).forEach(drop); set((s) => ({ entries: s.entries.filter((e) => e.rideKey !== rideKey) })); },
    wipe: () => { media.removeAll(); set({ entries: [] }); },
    restore: (entries) => set({ entries }),
  };
};
