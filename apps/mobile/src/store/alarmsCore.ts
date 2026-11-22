import type { StateCreator } from 'zustand';
import type { AlarmSetting } from '@/lib/alarm/plan';

/** A record of getting up is kept this long, so a re-sync never rings a ride again; then it is dropped. */
const WOKE_KEEP_MS = 10 * 86_400_000;

/** The ride alarm settings and what has woken. */
export type AlarmsState = {
  /** By setting key (`trip:<id>`, `event:<id>`). */
  settings: Record<string, AlarmSetting>;
  /** Alarm groups the rider pressed "I'm up" for (or opened), and when. */
  woke: Record<string, number>;
  set: (s: AlarmSetting) => void;
  remove: (key: string) => void;
  markWoke: (group: string, at: number) => void;
  /** Drops old wake-ups and club rides long past. */
  prune: (now: number) => void;
  reset: () => void;
};

/** The store's actions and starting state, separate from persistence so they can be tested. */
export const alarmsSlice = (): StateCreator<AlarmsState> => (set) => ({
  settings: {},
  woke: {},
  set: (s) => set((st) => ({ settings: { ...st.settings, [s.key]: s } })),
  remove: (key) => set((st) => { const { [key]: _gone, ...rest } = st.settings; return { settings: rest }; }),
  markWoke: (group, at) => set((st) => (st.woke[group] ? st : { woke: { ...st.woke, [group]: at } })),
  prune: (now) => set((st) => ({
    woke: Object.fromEntries(Object.entries(st.woke).filter(([, at]) => now - at < WOKE_KEEP_MS)),
    settings: Object.fromEntries(Object.entries(st.settings).filter(([, s]) => s.kind !== 'event' || s.startsAt === undefined || now - s.startsAt < WOKE_KEEP_MS)),
  })),
  reset: () => set({ settings: {}, woke: {} }),
});
