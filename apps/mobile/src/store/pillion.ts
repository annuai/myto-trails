import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { planGreeting, type GreetingPlan, type Origin } from '@/lib/story/greeting';
import type { Visit, VisitId } from '@/lib/story/visits';
import { storage } from './persist';

/** A visit that has been earned but not yet shown (a ride just finished), kept until the rider is next at Home. */
export type PendingVisit = { id: VisitId; /** What it is about, so it is shown once: `ride:<id>`. */ key: string; at: number };

type State = {
  /** How many times the app has been opened (a cold start, or coming back after a while). */
  opens: number;
  firstOpenAt?: number;
  lastOpenAt?: number;
  /** A rider who finished the welcome flow after this was added (`new`) or who already had the app (`existing`). Known once, on the first open. */
  origin?: Origin;
  onboardedAt?: number;
  plan?: GreetingPlan;
  greeted: boolean;
  /** Keys of visits already shown, to the time. A map visit is keyed by its trip, so a trip is shown once. */
  shown: Record<string, number>;
  pending?: PendingVisit;
  /** The visit on screen now. Not kept. */
  current: { visit: Visit; key: string } | null;
  noteOpen: (now: number) => void;
  /** Called with whether the welcome flow is done, on every change: the first call decides `origin`. */
  observeOnboarding: (done: boolean, now: number) => void;
  /** Plans the greeting once the rider's origin is known. */
  ensurePlan: (rand: () => number) => void;
  show: (visit: Visit, key: string, now: number) => void;
  dismiss: () => void;
  queue: (p: PendingVisit) => void;
  wipe: () => void;
};

export const usePillion = create<State>()(
  persist(
    (set, get) => ({
      opens: 0, greeted: false, shown: {}, current: null,
      noteOpen: (now) => set((s) => ({ opens: s.opens + 1, firstOpenAt: s.firstOpenAt ?? now, lastOpenAt: now })),
      observeOnboarding: (done, now) => {
        const s = get();
        if (!s.origin) {
          set({ origin: done ? 'existing' : 'new' });
          return;
        }
        if (s.origin === 'new' && done && s.onboardedAt === undefined) set({ onboardedAt: now });
      },
      ensurePlan: (rand) => {
        const s = get();
        if (s.plan || s.greeted) return;
        // A rider still in the welcome flow gets no plan: it starts when they finish it.
        if (!s.origin || (s.origin === 'new' && s.onboardedAt === undefined)) return;
        set({ plan: planGreeting(s.origin, s.opens, s.onboardedAt, rand) });
      },
      show: (visit, key, now) => set((s) => ({ current: { visit, key }, shown: { ...s.shown, [key]: now }, pending: s.pending?.key === key ? undefined : s.pending })),
      dismiss: () => set((s) => ({ current: null, greeted: s.greeted || s.current?.visit.id === 'hello' })),
      queue: (p) => set((s) => (s.shown[p.key] || s.pending?.key === p.key ? s : { pending: p })),
      wipe: () => set({ opens: 0, firstOpenAt: undefined, lastOpenAt: undefined, origin: undefined, onboardedAt: undefined, plan: undefined, greeted: false, shown: {}, pending: undefined, current: null }),
    }),
    { name: 'myto-pillion', storage, partialize: (s) => ({ opens: s.opens, firstOpenAt: s.firstOpenAt, lastOpenAt: s.lastOpenAt, origin: s.origin, onboardedAt: s.onboardedAt, plan: s.plan, greeted: s.greeted, shown: s.shown, pending: s.pending }) },
  ),
);
