import { create } from 'zustand';
import type { MarkId } from '@/lib/marks';

type State = {
  /** Marks waiting to be stamped on screen, oldest first. Not kept: a mark that was never seen still shows in the Marks list. */
  queue: MarkId[];
  push: (ids: MarkId[]) => void;
  next: () => void;
};

export const useMarkToast = create<State>()((set) => ({
  queue: [],
  push: (ids) => set((s) => ({ queue: [...s.queue, ...ids.filter((i) => !s.queue.includes(i))] })),
  next: () => set((s) => ({ queue: s.queue.slice(1) })),
}));
