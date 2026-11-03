import { create } from 'zustand';

/** The sheets that are open, bottom first. A sheet that opens over another is pushed on top; each one reads how many are above it to know how far to step back. */
export const useSheetStack = create<{ ids: string[]; push: (id: string) => void; remove: (id: string) => void }>((set) => ({
  ids: [],
  push: (id) => set((s) => (s.ids.includes(id) ? s : { ids: [...s.ids, id] })),
  remove: (id) => set((s) => ({ ids: s.ids.filter((x) => x !== id) })),
}));
