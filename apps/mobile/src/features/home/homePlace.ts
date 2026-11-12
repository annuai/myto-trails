import type { PlaceKind, SavedPlace } from '@/store/placesCore';

/** Auto-end needs somewhere to end at: it is only offered once Home or Work is saved. */
export const canEnableAutoEnd = (home?: SavedPlace, work?: SavedPlace): boolean => !!home || !!work;

/** The name saved for "Use my current location": no network lookup, so the kind's own name. */
export const currentLocationLabel = (kind: PlaceKind): string => (kind === 'home' ? 'Home' : 'Work');
