import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { placesSlice, type PlacesState } from './placesCore';
import { storage } from './persist';

export type { PlacesState, PlaceKind, SavedPlace } from './placesCore';
/** Home and Work as the rider saved them. Kept on the phone only, never sent to the server. */
export const usePlaces = create<PlacesState>()(persist(placesSlice(), { name: 'myto-places', storage }));
