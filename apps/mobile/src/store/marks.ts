import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { earnedMarks, newMarks, type MarkId, type MarkInput } from '@/lib/marks';
import { storage } from './persist';

type State = {
  /** Marks earned, by id, with the day they were first noticed. A mark is never taken back, and is announced only once. */
  held: Record<string, number>;
  /** How many times a service item has been marked done. A to-do can be created already serviced, so only the tap counts. */
  services: number;
  noteService: () => void;
  /** Set once the marks the rider already earned before this feature were recorded quietly, so they are not all announced at once. */
  seeded: boolean;
  setSeeded: () => void;
  /** Looks at what the rider has done and records any new marks. Returns the ones that are new, so the screen that caused them can stamp them. */
  sync: (input: MarkInput) => MarkId[];
  wipe: () => void;
};

export const useMarks = create<State>()(
  persist(
    (set, get) => ({
      held: {}, services: 0, seeded: false, setSeeded: () => set({ seeded: true }),
      noteService: () => set((s) => ({ services: s.services + 1 })),
      sync: (input) => {
        const fresh = newMarks(Object.keys(get().held), earnedMarks(input));
        if (fresh.length) set((s) => ({ held: { ...s.held, ...Object.fromEntries(fresh.map((id) => [id, Date.now()])) } }));
        return fresh;
      },
      wipe: () => set({ held: {}, services: 0, seeded: false }),
    }),
    { name: 'myto-marks', storage, partialize: (s) => ({ held: s.held, services: s.services, seeded: s.seeded }) },
  ),
);
