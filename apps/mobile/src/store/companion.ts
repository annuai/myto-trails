import { create } from 'zustand';
import { SIM_GROUP_ID } from '@/lib/groupSim';
import { persist } from 'zustand/middleware';
import type { GroupCapacity, GroupRegroup } from '@/api/groups';
import type { GroupRiderView, GroupStatus } from '@/lib/groupCore';
import type { Outbox } from '@/lib/conditions';
import type { CardFormat, CardStat } from '@/lib/rideCard';
import type { OverlayInk, PhotoLayout } from '@/lib/photoCard';
import { DEFAULT_STATS } from '@/lib/rideCard';
import { storage } from './persist';

/** The timer the server watches. The link is kept so it can be shared again; the server holds only its hash. */
export type Checkin = { id: string; expectedAt: number; contactName: string; url: string; /** Where the check-in was set: getting back here closes it by itself. */ home?: { lat: number; lng: number } };
/** The group ride this phone is in. `role` is "leader" for whoever started it. */
export type GroupSession = { id: string; code: string; name: string; role: string };

type Live = { /** The leader's view of the ride's size. */ capacity?: GroupCapacity; riders: GroupRiderView[]; /** Which of `riders` is this phone. */ me?: string; regroup: GroupRegroup | null; myStatus: GroupStatus; error?: string; /** The leader's backup, a rider's id (the leader sees it). */ successor?: string | null; /** The leader is out of contact and this rider may take the lead. */ canTakeLead?: boolean; /** The lead was taken from this rider, and they may take it back. */ canTakeBack?: boolean };

type State = {
  checkin: Checkin | null;
  group: GroupSession | null;
  /** Condition reports waiting for a signal. */
  outbox: Outbox;
  card: { format: CardFormat; stats: CardStat[]; layout: PhotoLayout; ink: OverlayInk };
  /** Pause the ride by itself after a long stop (opt-in). */
  autoPause: boolean;
  /** End the ride by itself on arrival at Home or Work (opt-in). */
  autoEnd: boolean;
  /** Sample the GPS less often on a low battery or a long stop (on by default). */
  batterySaver: boolean;
  live: Live;
  setCheckin: (c: Checkin | null) => void;
  setGroup: (g: GroupSession | null) => void;
  setOutbox: (o: Outbox) => void;
  setCard: (c: Partial<State['card']>) => void;
  setAutoPause: (on: boolean) => void;
  setAutoEnd: (on: boolean) => void;
  setBatterySaver: (on: boolean) => void;
  setLive: (l: Partial<Live>) => void;
  /** This phone's part in the group changed (the lead was passed). */
  setGroupRole: (role: string) => void;
  /** Used by "Erase all my data". */
  wipe: () => void;
};

const defaultCard = (): State['card'] => ({ format: 'story', stats: DEFAULT_STATS, layout: 'bar', ink: 'light' });

/** Rebuild the stored state on load: a card saved by an older build has no layout or ink, so it gets the defaults here, once. */
export function mergeCompanion(saved: unknown, current: State): State {
  const p = saved as Partial<State> | undefined;
  return { ...current, ...p, card: { ...current.card, ...p?.card }, group: p?.group?.id === SIM_GROUP_ID ? null : p?.group ?? current.group };
}

const noLive: Live = { riders: [], regroup: null, myStatus: 'ok' };

export const useCompanion = create<State>()(
  persist(
    (set) => ({
      checkin: null, group: null, outbox: [], card: defaultCard(), autoPause: false, autoEnd: false, batterySaver: true, live: noLive,
      setCheckin: (checkin) => set({ checkin }),
      setGroup: (group) => set({ group, live: noLive }),
      setOutbox: (outbox) => set({ outbox }),
      setCard: (c) => set((s) => ({ card: { ...s.card, ...c } })),
      setAutoPause: (autoPause) => set({ autoPause }),
      setAutoEnd: (autoEnd) => set({ autoEnd }),
      setBatterySaver: (batterySaver) => set({ batterySaver }),
      setLive: (l) => set((s) => ({ live: { ...s.live, ...l } })),
      setGroupRole: (role) => set((s) => (s.group ? { group: { ...s.group, role } } : s)),
      wipe: () => set({ checkin: null, group: null, outbox: [], card: defaultCard(), autoPause: false, autoEnd: false, batterySaver: true, live: noLive }),
    }),
    {
      name: 'myto-companion', storage,
      // A simulated group ride is only for the test in front of the rider: it is never kept, and one left in storage by an older build is dropped.
      partialize: (s) => ({ checkin: s.checkin, group: s.group?.id === SIM_GROUP_ID ? null : s.group, outbox: s.outbox, card: s.card, autoPause: s.autoPause, autoEnd: s.autoEnd, batterySaver: s.batterySaver }),
      merge: mergeCompanion,
    },
  ),
);
