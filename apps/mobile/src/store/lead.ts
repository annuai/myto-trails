import { create } from 'zustand';
import type { BatteryStage } from '@/lib/leadCore';

/** What the leader's low battery has raised, for the ride screen to show. The warnings come from the battery watcher; the rider dismisses or answers them. */
export const useLead = create<{
  /** The warning showing: 'low' (15%), 'lower' (7%) or 'ask' (5%, who should lead if the phone turns off), or none. */
  stage: BatteryStage;
  /** The sheet to choose the backup leader is open. */
  backupOpen: boolean;
  raise: (s: BatteryStage) => void;
  dismiss: () => void;
  openBackup: () => void;
  closeBackup: () => void;
}>((set) => ({
  stage: 'none', backupOpen: false,
  // Each warning opens the choice by itself, as a sheet and not a card over the map: the phone may not last for another chance.
  raise: (stage) => set({ stage, backupOpen: true }),
  dismiss: () => set({ stage: 'none' }),
  openBackup: () => set({ backupOpen: true }),
  closeBackup: () => set({ backupOpen: false, stage: 'none' }),
}));
