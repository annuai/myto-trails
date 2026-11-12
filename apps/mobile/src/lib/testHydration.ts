import type { Hydratable } from './whenHydrated';

/** A stand-in for a persisted zustand store that finishes reading from the phone when told to. */
export const fakeStore = (done = false) => {
  const subs = new Set<() => void>();
  const s = {
    persist: {
      hasHydrated: () => done,
      onFinishHydration: (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; },
    },
    finish: () => { done = true; subs.forEach((f) => f()); },
    listeners: () => subs.size,
  };
  return s satisfies Hydratable;
};
