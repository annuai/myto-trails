import type { StateCreator } from 'zustand';
import type { JournalEntry, JournalKind } from '@/lib/journalEntries';

/** What the store needs from the file side, so it can be tested without a phone. */
export type JournalMediaOps = { remove: (id: string, kind: Exclude<JournalKind, 'note'>) => void; removeAll: () => void };

export type JournalState = {
  entries: JournalEntry[];
  /** A title the rider gave a journal, by its key. Without one a journal is named after its ride, or its date. */
  titles: Record<number, string>;
  add: (e: JournalEntry) => void;
  /** Gives older entries the id of the ride they belong to (matched by the ride's start time). Returns how many it changed; entries that already have one are left alone. */
  backfillRideIds: (rides: { id: string; startedAt: number }[]) => number;
  /** Removes the entry and its file. */
  remove: (id: string) => void;
  /** Removes every entry of a ride, and their files (a deleted ride takes its journal with it). */
  removeForRide: (rideKey: number) => void;
  /** Names a journal. An empty title takes the name away. */
  rename: (rideKey: number, title: string) => void;
  /** Erase all my data. */
  wipe: () => void;
  /** Replaces the entries from a backup. The files are restored separately. */
  restore: (entries: JournalEntry[], titles?: Record<number, string>) => void;
};

const without = (t: Record<number, string>, key: number) => Object.fromEntries(Object.entries(t).filter(([k]) => Number(k) !== key));

/** `rideIdFor` finds the ride an entry's `rideKey` belongs to (the one being recorded, or a saved one), so a new entry carries its id. `whereNow` is where the phone is, so a new entry carries its place. */
export const journalSlice = (media: JournalMediaOps, rideIdFor: (rideKey: number) => string | undefined = () => undefined, whereNow: () => { lat: number; lng: number } | undefined = () => undefined): StateCreator<JournalState> => (set, get) => {
  const drop = (e: JournalEntry) => { if (e.kind !== 'note') media.remove(e.id, e.kind); };
  return {
    entries: [],
    titles: {},
    add: (e) => {
      const rideId = e.rideId ?? rideIdFor(e.rideKey);
      const here = e.lat === undefined || e.lng === undefined ? whereNow() : undefined;
      set((s) => ({ entries: [...s.entries, { ...e, ...(rideId ? { rideId } : {}), ...(here ?? {}) }] }));
    },
    backfillRideIds: (rides) => {
      const byStart = new Map(rides.map((r) => [r.startedAt, r.id]));
      let changed = 0;
      const entries = get().entries.map((e) => { const id = e.rideId ? undefined : byStart.get(e.rideKey); if (!id) return e; changed++; return { ...e, rideId: id }; });
      if (changed) set({ entries });
      return changed;
    },
    remove: (id) => { get().entries.filter((e) => e.id === id).forEach(drop); set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })); },
    removeForRide: (rideKey) => { get().entries.filter((e) => e.rideKey === rideKey).forEach(drop); set((s) => ({ entries: s.entries.filter((e) => e.rideKey !== rideKey), titles: without(s.titles, rideKey) })); },
    rename: (rideKey, title) => set((s) => ({ titles: title.trim() ? { ...s.titles, [rideKey]: title.trim() } : without(s.titles, rideKey) })),
    wipe: () => { media.removeAll(); set({ entries: [], titles: {} }); },
    restore: (entries, titles = {}) => set({ entries, titles }),
  };
};
