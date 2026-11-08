import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { storage } from './persist';

type State = {
  /** The "Ride together" explainer has been shown, or dismissed. Kept on this phone only. */
  seen: boolean;
  markSeen: () => void;
};

export const useGroupIntro = create<State>()(
  persist(
    (set) => ({ seen: false, markSeen: () => set({ seen: true }) }),
    { name: 'myto-group-intro', storage },
  ),
);

/** True once storage has been read and the rider has not seen the explainer, so it never flashes open for someone who already has. */
export function useGroupIntroDue(): boolean {
  const seen = useGroupIntro((s) => s.seen);
  const [ready, setReady] = useState(useGroupIntro.persist.hasHydrated());
  useEffect(() => {
    if (ready) return;
    return useGroupIntro.persist.onFinishHydration(() => setReady(true));
  }, [ready]);
  return ready && !seen;
}
