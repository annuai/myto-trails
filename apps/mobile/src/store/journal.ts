import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { removeAllMedia, removeMedia } from '@/lib/journalMedia';
import { useRecorder } from './recorder';
import { useRides } from './rides';
import { journalSlice, type JournalState } from './journalCore';
import { storage } from './persist';

/** The ride an entry's `rideKey` belongs to: the one being recorded now, or a saved one that started at that time. */
const rideIdFor = (rideKey: number): string | undefined => {
  const rec = useRecorder.getState();
  if (rec.status === 'running' && rec.startedAt === rideKey && rec.rideId) return rec.rideId;
  return useRides.getState().rides.find((r) => r.startedAt === rideKey)?.id;
};

/** The ride journal. Entries live in the phone's storage and their files in a private folder; none of it is sent anywhere. */
export const useJournal = create<JournalState>()(
  persist(journalSlice({ remove: removeMedia, removeAll: removeAllMedia }, rideIdFor), { name: 'myto-journal', storage, partialize: (s) => ({ entries: s.entries, titles: s.titles }) as JournalState }),
);
