import { create } from 'zustand';

/** What the ride screen shows under the turn card when the group's leader changed the destination, until the rider taps "Got it". */
export const useDestinationNotice = create<{ text?: string; show: (text: string) => void; clear: () => void }>((set) => ({
  show: (text) => set({ text }),
  clear: () => set({ text: undefined }),
}));
