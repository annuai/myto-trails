import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { RIDE_QUOTES } from '@/data/rideQuotes';
import { api } from '@/api/client';
import { drawQuote } from '@/lib/quotes';
import { parseQuotes, quotesRefreshDue } from '@/lib/quoteSync';
import { storage } from './persist';

type State = {
  /** Indexes of lines not yet shown in this round. */
  queue: number[];
  last?: number;
  /** Lines downloaded from the site, kept for offline use; null until the phone has been online once (the lines bundled in the app are used then). */
  lines: string[] | null;
  fetchedAt: number;
  /** Keeps a downloaded set. Starts a new round, as the indexes of the old one no longer mean the same lines. */
  setLines: (lines: string[], at: number) => void;
  /** Takes the next line. Remembered across launches, so a round is not restarted by closing the app. */
  next: () => string;
};

export const useQuotes = create<State>()(
  persist(
    (set, get) => ({
      queue: [], lines: null, fetchedAt: 0,
      setLines: (lines, fetchedAt) => set({ lines, fetchedAt, queue: [], last: undefined }),
      next: () => {
        const all = get().lines ?? RIDE_QUOTES;
        const { index, queue } = drawQuote(get().queue, all.length, get().last);
        set({ queue, last: index });
        return all[index]!;
      },
    }),
    { name: 'myto-quotes', storage },
  ),
);

let lastAttemptAt = 0;
let running = false;

/**
 * Downloads the quotes (they are edited in the database) on first open and then at most once a week. Never throws and never waits for
 * anyone: a failed or unusable reply leaves the quotes on the phone as they were, and the next app open or return to the app tries again.
 */
export async function refreshQuotes(now: number): Promise<void> {
  // The stored copy loads from the phone a moment after start; asking before it has would fetch on every launch and be overwritten by it.
  if (!useQuotes.persist.hasHydrated()) await new Promise<void>((done) => { const off = useQuotes.persist.onFinishHydration(() => { off(); done(); }); });
  if (running || !quotesRefreshDue(useQuotes.getState().fetchedAt, lastAttemptAt, now)) return;
  running = true;
  lastAttemptAt = now;
  try {
    const lines = parseQuotes(await api<unknown>('/quotes'));
    if (lines) useQuotes.getState().setLines(lines, now);
  } catch {
    // offline or the site is down: keep what is on the phone
  } finally {
    running = false;
  }
}
