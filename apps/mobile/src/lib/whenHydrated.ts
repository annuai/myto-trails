/** The part of a persisted zustand store that says whether its saved state has been read from the phone. */
export type Hydratable = { persist: { hasHydrated: () => boolean; onFinishHydration: (f: () => void) => () => void } };

/**
 * Runs `run` once, as soon as every store has been read from the phone (at once if they already have), so a launch job never mistakes
 * an empty store for the real one. Returns a cancel.
 */
export function whenHydrated(stores: readonly Hydratable[], run: () => void): () => void {
  let done = false;
  const offs: (() => void)[] = [];
  const stop = () => { offs.splice(0).forEach((off) => off()); };
  const go = () => {
    if (done || !stores.every((s) => s.persist.hasHydrated())) return;
    done = true;
    stop();
    run();
  };
  offs.push(...stores.map((s) => s.persist.onFinishHydration(go)));
  go();
  return () => { done = true; stop(); };
}
