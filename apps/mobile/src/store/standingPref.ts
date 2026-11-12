import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getCohort } from '@/api/standing';
import { currentStanding, localPeriod } from '@/lib/story/standing';
import { storage } from './persist';
import { useRides } from './rides';
import { standingPrefSlice, type StandingPrefState } from './standingPrefCore';

export type { StandingPrefState };
/** The rider's choice about being compared with riders near them (off by default), the rides waiting to upload, and the last cohort row. */
export const useStandingPref = create<StandingPrefState>()(
  persist(
    standingPrefSlice({
      now: Date.now,
      current: () => { const c = currentStanding(useRides.getState().rides, Date.now()); return c && { ...c, period: localPeriod(Date.now()) }; },
      fetchCohort: (cell, period, metric) => getCohort(undefined, cell, period, metric),
    }),
    { name: 'myto-standing', storage, partialize: (s) => ({ optIn: s.optIn, queue: s.queue, cohort: s.cohort, pendingOptOut: s.pendingOptOut }) as StandingPrefState },
  ),
);
