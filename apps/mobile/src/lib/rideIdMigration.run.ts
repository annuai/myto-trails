import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import { migrateRideIds } from './rideIdMigration';
import { useJournal } from '@/store/journal';
import { useRides } from '@/store/rides';

const hydrated = (s: { persist: { hasHydrated: () => boolean; onFinishHydration: (f: () => void) => () => void } }) =>
  new Promise<void>((resolve) => { if (s.persist.hasHydrated()) resolve(); else { const off = s.persist.onFinishHydration(() => { off(); resolve(); }); } });

/** Runs once per start, after the phone's saved journal and rides are loaded. A failure is left for the next start. */
export async function runRideIdMigration(): Promise<void> {
  if (Platform.OS === 'web') return; // the browser test build cannot write the safety copy, and its journal is not kept between visits
  await Promise.all([hydrated(useJournal), hydrated(useRides)]);
  await migrateRideIds({
    entries: () => useJournal.getState().entries,
    rides: () => useRides.getState().rides,
    saveCopy: async (json) => { const f = new File(Paths.document, `journal-before-ride-ids-${Date.now()}.json`); f.create({ overwrite: true }); f.write(json); },
    backfill: (rides) => useJournal.getState().backfillRideIds(rides),
  });
}
