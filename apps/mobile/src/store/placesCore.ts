import type { StateCreator } from 'zustand';

export type SavedPlace = { lat: number; lng: number; label: string; setAt: number };
export type PlaceKind = 'home' | 'work';

/** Home and Work as the rider saved them. Kept on the phone only, never sent to the server. */
export type PlacesState = {
  home?: SavedPlace;
  work?: SavedPlace;
  /** Rides in a row that ended away from the saved place; reset when the place is replaced. */
  endStrikes: Record<PlaceKind, number>;
  /** Ignored when a coordinate is not finite or out of range, so the old place stays. */
  setPlace: (kind: PlaceKind, p: Omit<SavedPlace, 'setAt'>, now?: number) => void;
  clearPlace: (kind: PlaceKind) => void;
  addStrike: (kind: PlaceKind) => void;
  clearStrikes: (kind: PlaceKind) => void;
};

const validCoord = (lat: number, lng: number) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

export const placesSlice = (): StateCreator<PlacesState> => (set) => ({
  home: undefined,
  work: undefined,
  endStrikes: { home: 0, work: 0 },
  setPlace: (kind, p, now = Date.now()) => set((s) => (validCoord(p.lat, p.lng)
    ? { [kind]: { lat: p.lat, lng: p.lng, label: p.label, setAt: now }, endStrikes: { ...s.endStrikes, [kind]: 0 } }
    : s)),
  clearPlace: (kind) => set({ [kind]: undefined }),
  addStrike: (kind) => set((s) => ({ endStrikes: { ...s.endStrikes, [kind]: s.endStrikes[kind] + 1 } })),
  clearStrikes: (kind) => set((s) => ({ endStrikes: { ...s.endStrikes, [kind]: 0 } })),
});
