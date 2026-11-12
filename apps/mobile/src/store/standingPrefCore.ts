import type { CohortRow, StandingMetric } from '@moto-trails/domain';
import type { StateCreator } from 'zustand';

export const REFRESH_EVERY_MS = 6 * 3_600_000;
/** Never coordinates: a plain label for where the cohort is. */
export const REGION_LABEL = 'your area';

export type StandingCohort = { region: string; /** YYYY-MM the row is for. */ period: string; metric: StandingMetric; value: number; row: CohortRow; fetchedAt: number };

export type StandingPrefState = {
  /** Off until the rider turns it on. */
  optIn: boolean;
  /** Ride refs waiting to be uploaded. Emptied on opt-out. */
  queue: string[];
  cohort?: StandingCohort;
  /** The rider turned it off but the server may not know yet; flushed (and cleared) on the next sync while signed in. */
  pendingOptOut: boolean;
  /** A plain sentence when the server could not be reached. Not kept. */
  error?: string;
  set: (optIn: boolean) => void;
  enqueue: (refs: string[]) => void;
  setError: (error: string | undefined) => void;
  clearPendingOptOut: () => void;
  /** Forgets everything (sign-out, delete account, erase): a later account never inherits this rider's choice. */
  reset: () => void;
  dequeue: (refs: string[]) => void;
  /** Fetches this month's cohort row for the latest ride's cell. At most once per 6 hours; only when opted in and signed in. */
  refreshStanding: (token: string | null | undefined) => Promise<void>;
};

export type StandingPrefDeps = {
  now: () => number;
  current: () => { cell: string; value: number; period: string } | undefined;
  fetchCohort: (cell: string, period: string, metric: StandingMetric) => Promise<CohortRow>;
};

export const standingPrefSlice = (deps: StandingPrefDeps): StateCreator<StandingPrefState> => (set, get) => ({
  optIn: false, queue: [], cohort: undefined, pendingOptOut: false, error: undefined,
  // Opting out clears the queue and the cohort at once, so nothing queued can be uploaded afterwards.
  set: (optIn) => set(optIn ? { optIn, pendingOptOut: false } : { optIn, queue: [], cohort: undefined, pendingOptOut: true, error: undefined }),
  setError: (error) => set({ error }),
  clearPendingOptOut: () => set({ pendingOptOut: false }),
  reset: () => set({ optIn: false, queue: [], cohort: undefined, pendingOptOut: false, error: undefined }),
  enqueue: (refs) => set((s) => (s.optIn ? { queue: [...s.queue, ...refs.filter((r) => !s.queue.includes(r))] } : {})),
  dequeue: (refs) => set((s) => ({ queue: s.queue.filter((r) => !refs.includes(r)) })),
  refreshStanding: async (token) => {
    const s = get();
    if (!token || !s.optIn) return;
    const now = deps.now();
    if (s.cohort && now - s.cohort.fetchedAt < REFRESH_EVERY_MS) return;
    const cur = deps.current();
    if (!cur) return;
    try {
      const row = await deps.fetchCohort(cur.cell, cur.period, 'distance_km');
      if (!get().optIn) return;
      set({ cohort: { region: REGION_LABEL, period: cur.period, metric: 'distance_km', value: cur.value, row, fetchedAt: now } });
    } catch { /* no cohort yet, or offline: try again at the next refresh */ }
  },
});
