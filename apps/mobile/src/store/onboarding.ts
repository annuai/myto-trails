import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { storage } from './persist';

type State = {
  /** The welcome flow has been seen, or skipped. Kept in the app's own storage, so deleting the app and installing it again shows it again. */
  done: boolean;
  finish: () => void;
};

export const useOnboarding = create<State>()(
  persist(
    (set) => ({ done: false, finish: () => set({ done: true }) }),
    { name: 'myto-onboarding', storage },
  ),
);
