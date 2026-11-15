import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { alarmsSlice, type AlarmsState } from './alarmsCore';
import { storage } from './persist';

export type { AlarmsState };
/** Ride alarms the rider set, and the rides they already got up for. Kept on the phone only. */
export const useAlarms = create<AlarmsState>()(persist(alarmsSlice(), { name: 'myto-alarms', storage, partialize: (s) => ({ settings: s.settings, woke: s.woke }) as AlarmsState }));
