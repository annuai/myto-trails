import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { currencyFor, defaultDistanceUnit, deviceRegion } from '@/lib/locale';
import { setDistanceUnit, type DistanceUnit } from '@/lib/units';
import { storage } from './persist';

type State = {
  /** Where the rider lives (ISO 3166-1 alpha-2). Null follows the phone's region. Sets the default unit and currency. */
  home: string | null;
  /** The rider's own choice of kilometres or miles. Null follows the home country. */
  unit: DistanceUnit | null;
  /** The country whose trails, clubs and rides the lists show. Null means every country that is open. */
  browsing: string | null;
  /** A number the rider typed over the emergency number. Kept for this session only, never saved. */
  emergencyOverride: string | null;
  setHome: (iso2: string | null) => void;
  setUnit: (unit: DistanceUnit | null) => void;
  setBrowsing: (iso2: string | null) => void;
  setEmergencyOverride: (number: string | null) => void;
  wipe: () => void;
};

export const useRegion = create<State>()(
  persist(
    (set) => ({
      home: null, unit: null, browsing: null, emergencyOverride: null,
      setHome: (home) => set({ home }),
      setUnit: (unit) => set({ unit }),
      setBrowsing: (browsing) => set({ browsing }),
      setEmergencyOverride: (emergencyOverride) => set({ emergencyOverride }),
      wipe: () => set({ home: null, unit: null, browsing: null, emergencyOverride: null }),
    }),
    { name: 'myto-region', storage, partialize: (s) => ({ home: s.home, unit: s.unit, browsing: s.browsing }) },
  ),
);

/** The home country in use: the rider's choice, else the phone's region. */
export const homeCountry = (s: Pick<State, 'home'>): string | null => s.home ?? deviceRegion();
export const effectiveUnit = (s: Pick<State, 'home' | 'unit'>): DistanceUnit => s.unit ?? defaultDistanceUnit(homeCountry(s));
export const useHomeCountry = (): string | null => useRegion(homeCountry);
export const useDistanceUnit = (): DistanceUnit => useRegion(effectiveUnit);
/** The currency amounts are shown in, or null when we do not know one for the home country. */
export const useCurrency = (): string | null => currencyFor(useHomeCountry());

// The unit is read by plain functions all over the app, so it is pushed into lib/units whenever it can change.
const apply = () => setDistanceUnit(effectiveUnit(useRegion.getState()));
apply();
useRegion.subscribe(apply);
useRegion.persist.onFinishHydration(apply);
