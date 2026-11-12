import { FIX_MAX_AGE_MS } from '@/lib/homeRoute/types';
import type { PlaceKind, SavedPlace } from '@/store/placesCore';

/** Auto-end needs somewhere to end at: it is only offered once Home or Work is saved. */
export const canEnableAutoEnd = (home?: SavedPlace, work?: SavedPlace): boolean => !!home || !!work;

/** The name saved for "Use my current location": no network lookup, so the kind's own name. */
export const currentLocationLabel = (kind: PlaceKind): string => (kind === 'home' ? 'Home' : 'Work');

export type LocationPermission = 'granted' | 'denied' | 'undetermined';

/** "Use my current location" is off only when the phone is known to refuse it; undetermined may still prompt on tap. */
export const canUseCurrentLocation = (permission: LocationPermission | undefined): boolean => permission !== 'denied';

/** A stored fix is only good for saving as a place while it is fresh; an old one falls through to a new reading. */
export const isFreshFix = (fixAt: number | undefined, now: number): boolean => fixAt !== undefined && now - fixAt <= FIX_MAX_AGE_MS;
