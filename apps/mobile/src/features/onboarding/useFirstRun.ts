import { useEffect, useState } from 'react';
import { isReturningRider } from '@/lib/firstRun';
import { useOnboarding } from '@/store/onboarding';
import { useProfile } from '@/store/profile';
import { useRides } from '@/store/rides';
import { useTodos } from '@/store/todos';
import { useTrips } from '@/store/trips';

type Hydrating = { persist: { hasHydrated: () => boolean; onFinishHydration: (fn: () => void) => () => void } };
const hydrated = (s: Hydrating) => new Promise<void>((resolve) => { if (s.persist.hasHydrated()) resolve(); else s.persist.onFinishHydration(() => resolve()); });

/**
 * 'show' on a fresh install, 'skip' once the welcome flow is done or when the phone already holds a rider's data (an update, not a new
 * install; that rider is marked done so deleting their data later does not bring the welcome back). 'checking' until storage is read.
 */
export function useFirstRun(): 'checking' | 'show' | 'skip' {
  const done = useOnboarding((s) => s.done);
  const [state, setState] = useState<'checking' | 'show' | 'skip'>(done ? 'skip' : 'checking');
  useEffect(() => {
    if (done) return;
    let live = true;
    void Promise.all([hydrated(useOnboarding), hydrated(useRides), hydrated(useTrips), hydrated(useTodos), hydrated(useProfile)]).then(() => {
      if (!live) return;
      if (useOnboarding.getState().done) return setState('skip');
      const returning = isReturningRider({ rides: useRides.getState().rides, trips: useTrips.getState().trips, todos: useTodos.getState().todos, profile: useProfile.getState() });
      if (returning) useOnboarding.getState().finish();
      setState(returning ? 'skip' : 'show');
    });
    return () => { live = false; };
  }, [done]);
  return done ? 'skip' : state;
}
