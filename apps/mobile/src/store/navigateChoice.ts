import { create } from 'zustand';
import type { LatLng } from '@/lib/geo';

/** The place a rider tapped Navigate for, while the sheet asks how to get there. */
export const useNavigateChoice = create<{ to?: LatLng; ask: (to: LatLng) => void; close: () => void }>((set) => ({
  ask: (to) => set({ to }),
  close: () => set({ to: undefined }),
}));
