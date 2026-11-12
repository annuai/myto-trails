import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { homeOfferSlice, type HomeOfferState } from './homeOfferCore';
import { storage } from './persist';

export type { HomeOfferState };
/** Dismissals of the "Ride home" offer. Kept on the phone only. */
export const useHomeOffer = create<HomeOfferState>()(persist(homeOfferSlice(), { name: 'myto-home-offer', storage, partialize: (s) => ({ dismissals: s.dismissals }) as HomeOfferState }));
