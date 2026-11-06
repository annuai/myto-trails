import type { StateCreator } from 'zustand';
import type { ClubRide, DayForecast, Nudge, NudgeHistory, NudgeLevel, NudgeType } from '@/lib/nudge/types';

const MAX_HISTORY = 80;

/** Ride nudges: the rider's choice, what was planned and shown, and the little data (weather, club rides) the plan reads. Kept on the phone only. */
export type NudgesState = {
  /** Undefined until the rider has been asked (after their first ride); a choice is made once and can be changed in Smart reminders. */
  level: NudgeLevel | undefined;
  muted: NudgeType[];
  firstSeenAt: number | undefined;
  /** Nudges that came due, newest last, with whether they were opened. */
  history: NudgeHistory[];
  /** The plan as it was last made: what is scheduled on the phone, for the "what's planned" screen and the card on the Dash. */
  planned: Nudge[];
  /** Nudges tapped, by id, until they are written into the history. */
  tapped: Record<string, number>;
  /** Nudges already shown as a card on the Dash. */
  seen: Record<string, number>;
  forecast: { at: number; lat: number; lng: number; days: DayForecast[] } | undefined;
  clubs: { at: number; count: number; rides: ClubRide[] } | undefined;
  setLevel: (level: NudgeLevel) => void;
  setMuted: (type: NudgeType, muted: boolean) => void;
  seenFirst: (now: number) => void;
  markTapped: (id: string, now: number) => void;
  markSeen: (id: string, now: number) => void;
  /** Writes every planned nudge whose time has come into the history, and keeps the ones still ahead. */
  absorb: (now: number) => void;
  setPlanned: (planned: Nudge[]) => void;
  setForecast: (f: NudgesState['forecast']) => void;
  setClubs: (c: NudgesState['clubs']) => void;
  wipe: () => void;
};

const empty = { level: undefined, muted: [] as NudgeType[], firstSeenAt: undefined, history: [] as NudgeHistory[], planned: [] as Nudge[], tapped: {} as Record<string, number>, seen: {} as Record<string, number>, forecast: undefined, clubs: undefined };

export const nudgesSlice = (): StateCreator<NudgesState> => (set) => ({
  ...empty,
  setLevel: (level) => set({ level }),
  setMuted: (type, muted) => set((s) => ({ muted: muted ? [...new Set([...s.muted, type])] : s.muted.filter((t) => t !== type) })),
  seenFirst: (now) => set((s) => (s.firstSeenAt === undefined ? { firstSeenAt: now } : s)),
  markTapped: (id, now) => set((s) => ({ tapped: { ...s.tapped, [id]: now }, history: s.history.map((h) => (h.id === id && !h.opened ? { ...h, opened: now } : h)) })),
  markSeen: (id, now) => set((s) => ({ seen: { ...s.seen, [id]: now } })),
  absorb: (now) => set((s) => {
    const known = new Set(s.history.map((h) => h.id));
    const came = s.planned.filter((n) => n.fireAt <= now && !known.has(n.id)).map((n): NudgeHistory => ({ id: n.id, type: n.type, fireAt: n.fireAt, ...(s.tapped[n.id] ? { opened: s.tapped[n.id] } : {}) }));
    if (!came.length) return s;
    return { history: [...s.history, ...came].sort((a, b) => a.fireAt - b.fireAt).slice(-MAX_HISTORY), planned: s.planned.filter((n) => n.fireAt > now) };
  }),
  setPlanned: (planned) => set({ planned }),
  setForecast: (forecast) => set({ forecast }),
  setClubs: (clubs) => set({ clubs }),
  wipe: () => set({ ...empty }),
});
