import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nudgesSlice, type NudgesState } from './nudgesCore';
import { storage } from './persist';

export type { NudgesState };
/** Ride nudges: the rider's choice, what was planned and shown, and the little data (weather, club rides) the plan reads. Kept on the phone only. */
export const useNudges = create<NudgesState>()(persist(nudgesSlice(), { name: 'myto-nudges', storage }));
