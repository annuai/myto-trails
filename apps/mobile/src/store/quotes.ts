import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { RIDE_QUOTES } from '@/data/rideQuotes';
import { drawQuote } from '@/lib/quotes';
import { storage } from './persist';

type State = {
  /** Indexes of lines not yet shown in this round. */
  queue: number[];
  last?: number;
  /** Takes the next line. Remembered across launches, so a round is not restarted by closing the app. */
  next: () => string;
};

export const useQuotes = create<State>()(
  persist(
    (set, get) => ({
      queue: [],
      next: () => {
        const { index, queue } = drawQuote(get().queue, RIDE_QUOTES.length, get().last);
        set({ queue, last: index });
        return RIDE_QUOTES[index]!;
      },
    }),
    { name: 'myto-quotes', storage },
  ),
);
