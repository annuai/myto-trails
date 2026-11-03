import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { storage } from './persist';

/** Cap on rides waiting to be sent, so a phone that is never online does not keep them for ever. */
const MAX_PENDING = 20;

type State = {
  /** The rider wants their rides shared. It starts on, since the question is asked with this answer already given. */
  enabled: boolean;
  /** The question has been put to the rider, in the welcome flow or after the update that brought this. It is asked once, never again. */
  asked: boolean;
  /** Signed in to OpenStreetMap (the token itself is in secure storage). */
  connected: boolean;
  /** Finished rides waiting to be sent. */
  pending: string[];
  /** How many rides have been sent. */
  shared: number;
  /** The answer to the one-time question. */
  answer: (enabled: boolean) => void;
  setEnabled: (enabled: boolean) => void;
  setConnected: (connected: boolean) => void;
  queue: (rideId: string) => void;
  /** A ride left the queue: `sent` when it went, false when it was refused and will not be tried again. */
  settle: (rideId: string, sent: boolean) => void;
};

export const useOsm = create<State>()(
  persist(
    (set) => ({
      enabled: true, asked: false, connected: false, pending: [], shared: 0,
      answer: (enabled) => set({ enabled, asked: true }),
      setEnabled: (enabled) => set({ enabled, asked: true }),
      setConnected: (connected) => set({ connected }),
      queue: (id) => set((s) => (s.pending.includes(id) ? s : { pending: [...s.pending, id].slice(-MAX_PENDING) })),
      settle: (id, sent) => set((s) => ({ pending: s.pending.filter((x) => x !== id), shared: s.shared + (sent ? 1 : 0) })),
    }),
    { name: 'myto-osm', storage },
  ),
);

/** Sharing is on only once the rider has answered, and said yes. A rider who has not been asked yet shares nothing. */
export const sharingOn = (s: Pick<State, 'enabled' | 'asked'>): boolean => s.asked && s.enabled;
