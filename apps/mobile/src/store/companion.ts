import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GroupRegroup } from '@/api/groups';
import type { GroupRiderView, GroupStatus } from '@/lib/groupCore';
import type { Outbox } from '@/lib/conditions';
import type { CardFormat, CardStat } from '@/lib/rideCard';
import { DEFAULT_STATS } from '@/lib/rideCard';
import { storage } from './persist';

/** The timer the server watches. The link is kept so it can be shared again; the server holds only its hash. */
export type Checkin = { id: string; expectedAt: number; contactName: string; url: string };
/** The group ride this phone is in. `role` is "leader" for whoever started it. */
export type GroupSession = { id: string; code: string; name: string; role: string };

type Live = { riders: GroupRiderView[]; /** Which of `riders` is this phone. */ me?: string; regroup: GroupRegroup | null; myStatus: GroupStatus; error?: string };

type State = {
  checkin: Checkin | null;
  group: GroupSession | null;
  /** Condition reports waiting for a signal. */
  outbox: Outbox;
  card: { format: CardFormat; stats: CardStat[] };
  /** Pause the ride by itself after a long stop (opt-in). */
  autoPause: boolean;
  live: Live;
  setCheckin: (c: Checkin | null) => void;
  setGroup: (g: GroupSession | null) => void;
  setOutbox: (o: Outbox) => void;
  setCard: (c: Partial<State['card']>) => void;
  setAutoPause: (on: boolean) => void;
  setLive: (l: Partial<Live>) => void;
  /** Used by "Erase all my data". */
  wipe: () => void;
};

const noLive: Live = { riders: [], regroup: null, myStatus: 'ok' };

export const useCompanion = create<State>()(
  persist(
    (set) => ({
      checkin: null, group: null, outbox: [], card: { format: 'story', stats: DEFAULT_STATS }, autoPause: false, live: noLive,
      setCheckin: (checkin) => set({ checkin }),
      setGroup: (group) => set({ group, live: noLive }),
      setOutbox: (outbox) => set({ outbox }),
      setCard: (c) => set((s) => ({ card: { ...s.card, ...c } })),
      setAutoPause: (autoPause) => set({ autoPause }),
      setLive: (l) => set((s) => ({ live: { ...s.live, ...l } })),
      wipe: () => set({ checkin: null, group: null, outbox: [], card: { format: 'story', stats: DEFAULT_STATS }, autoPause: false, live: noLive }),
    }),
    { name: 'myto-companion', storage, partialize: (s) => ({ checkin: s.checkin, group: s.group, outbox: s.outbox, card: s.card, autoPause: s.autoPause }) },
  ),
);
