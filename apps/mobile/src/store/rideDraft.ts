import { create } from 'zustand';

export type DraftPlace = { lat: number; lng: number; name: string };

/**
 * What the rider has set up on the ride start page and not yet used: the place they chose to ride to, and which answer to "Where are you
 * going?" is picked. Kept only in memory, so it lasts for this session and no longer: leaving the page and coming back finds it as it was,
 * a ride starting clears it (the place has become the ride's own), and closing the app clears it.
 */
export const useRideDraft = create<{
  dest?: DraftPlace; picked?: string;
  setDest: (dest: DraftPlace | undefined) => void; setPicked: (key: string | undefined) => void; clear: () => void;
}>((set) => ({
  setDest: (dest) => set({ dest }),
  setPicked: (picked) => set({ picked }),
  clear: () => set({ dest: undefined, picked: undefined }),
}));
