import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { removeAllMedia, removeMedia } from '@/lib/journalMedia';
import { journalSlice, type JournalState } from './journalCore';
import { storage } from './persist';

/** The ride journal. Entries live in the phone's storage and their files in a private folder; none of it is sent anywhere. */
export const useJournal = create<JournalState>()(
  persist(journalSlice({ remove: removeMedia, removeAll: removeAllMedia }), { name: 'myto-journal', storage, partialize: (s) => ({ entries: s.entries }) as JournalState }),
);
