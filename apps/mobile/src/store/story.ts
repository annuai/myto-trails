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
  /** Set once the title the rider already had was recorded quietly, so an upgrading rider is not told they became something they already were. */
  seeded: boolean;
  /** Moments that lost the one-per-session pick, offered in a later session. */
  pending: Moment[];
  /** The Moment last picked and when, so Dash can offer it for a day. */
  latest: { moment: Moment; at: number } | null;
  /** Moments shown since the app opened. Not kept: it is what limits a session to one. */
  shownThisSession: string[];
  setSeeded: () => void;
  queue: (ms: Moment[]) => void;
  unqueue: (id: string) => void;
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
      seen: [], title: null, seeded: false, pending: [], latest: null, shownThisSession: [],
      setSeeded: () => set({ seeded: true }),
      queue: (ms) => set((s) => ({ pending: [...s.pending, ...ms.filter((m, i) => !s.seen.includes(m.id) && ![...s.pending, ...ms.slice(0, i)].some((p) => p.id === m.id))] })),
      unqueue: (id) => set((s) => ({ pending: s.pending.filter((m) => m.id !== id) })),
      markSeen: (id) => set((s) => (s.seen.includes(id) ? s : { seen: [...s.seen, id] })),
      noteShown: (id) => set((s) => ({ shownThisSession: [...s.shownThisSession, id] })),
      setLatest: (moment, at) => set({ latest: { moment, at } }),
      raiseTitle: (t) => {
        const next = higherTitle(get().title, t);
        if (next === get().title) return false;
        set({ title: next });
        return true;
      },
      wipe: () => set({ seen: [], title: null, seeded: false, pending: [], latest: null, shownThisSession: [] }),
    }),
    { name: 'myto-story', storage, partialize: (s) => ({ seen: s.seen, title: s.title, seeded: s.seeded, pending: s.pending, latest: s.latest }) },
  ),
);
