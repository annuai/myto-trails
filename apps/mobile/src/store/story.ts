import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { higherTitle, type TitleId } from '@/lib/story/titles';
import type { Moment } from '@/lib/story/moment';
import { storage } from './persist';

type State = {
  /** Moment ids the rider has dismissed or opened. Never shown again. */
  seen: string[];
  /** The highest title ever reached. Never lowered. */
  title: TitleId | null;
  /** The Moment last picked and when, so Dash can offer it for a day. */
  latest: { moment: Moment; at: number } | null;
  /** Moments shown since the app opened. Not kept: it is what limits a session to one. */
  shownThisSession: string[];
  markSeen: (id: string) => void;
  noteShown: (id: string) => void;
  setLatest: (moment: Moment, at: number) => void;
  /** True when the title rose. */
  raiseTitle: (t: TitleId | null) => boolean;
  wipe: () => void;
};

export const useStory = create<State>()(
  persist(
    (set, get) => ({
      seen: [], title: null, latest: null, shownThisSession: [],
      markSeen: (id) => set((s) => (s.seen.includes(id) ? s : { seen: [...s.seen, id] })),
      noteShown: (id) => set((s) => ({ shownThisSession: [...s.shownThisSession, id] })),
      setLatest: (moment, at) => set({ latest: { moment, at } }),
      raiseTitle: (t) => {
        const next = higherTitle(get().title, t);
        if (next === get().title) return false;
        set({ title: next });
        return true;
      },
      wipe: () => set({ seen: [], title: null, latest: null, shownThisSession: [] }),
    }),
    { name: 'myto-story', storage, partialize: (s) => ({ seen: s.seen, title: s.title, latest: s.latest }) },
  ),
);
