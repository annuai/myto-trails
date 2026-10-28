import { create } from 'zustand';
import { haversine, type LatLng } from '@/lib/geo';
import type { Journal } from '@/lib/journal';
import { cleanTrack, splitSegments, trackStats } from '@/lib/track';
import type { Waypoint } from './rides';

// The live track and distance leave out the same fixes the saved ride will (poor accuracy, impossible jumps, jitter);
// the journal keeps all of them.
const MAX_ACCURACY_M = 100;
const MAX_KMH = 250;
const JITTER_M = 3;

type Recoverable = { startedAt: number; points: number };

type State = {
  status: 'idle' | 'running';
  source: 'gps' | 'sim';
  startedAt: number;
  points: LatLng[];
  waypoints: Waypoint[];
  meters: number;
  speedKmh: number;
  maxKmh: number;
  notes: number;
  /** When the last fix arrived, drawn or not. The live screen warns when this gets old. */
  lastFixAt: number;
  /** True while the phone's background task is the one recording (it keeps going with the screen locked). */
  backgrounded: boolean;
  setBackgrounded: (b: boolean) => void;
  /** A ride left unfinished by a crash or a kill, waiting for the rider to save or discard it. */
  recoverable: Recoverable | null;
  error?: string;
  setError: (e?: string) => void;
  /** Returns false (and sets `recoverable`) when an unfinished ride is on disk: it is never overwritten. */
  start: (source: 'gps' | 'sim') => Promise<boolean>;
  ingest: (p: LatLng) => Promise<void>;
  addWaypoint: () => Promise<void>;
  addNote: () => void;
  checkRecoverable: () => Promise<void>;
  recover: () => Promise<void>;
  discardRecovered: () => Promise<void>;
  reset: () => void;
};

const blank = { status: 'idle' as const, startedAt: 0, points: [], waypoints: [], meters: 0, speedKmh: 0, maxKmh: 0, notes: 0, lastFixAt: 0 };

/** The live recorder. Every fix goes to the journal first; the store only shows what the screen needs. */
export function createRecorder(journal: Journal) {
  let queue: Promise<unknown> = Promise.resolve();
  return create<State>((set, get) => ({
    ...blank, source: 'gps', recoverable: null, backgrounded: false,
    setBackgrounded: (backgrounded) => set({ backgrounded }),
    start: async (source) => {
      const existing = await journal.read();
      if (existing) { set({ recoverable: { startedAt: existing.meta.startedAt, points: existing.points.length } }); return false; }
      const startedAt = Date.now();
      await journal.begin({ startedAt, source });
      set({ ...blank, status: 'running', source, startedAt, recoverable: null, error: undefined });
      return true;
    },
    ingest: (p) => {
      queue = queue.then(() => journal.append(p)).catch(() => set({ error: 'Could not save this ride to the phone. Free up storage.' }));
      const { points, meters, maxKmh } = get();
      set({ lastFixAt: Date.now() });
      if (p.acc != null && p.acc > MAX_ACCURACY_M) return queue as Promise<void>;
      const last = points[points.length - 1];
      if (!last) { set({ points: [p] }); return queue as Promise<void>; }
      const step = haversine(last, p);
      const dt = last.t != null && p.t != null ? (p.t - last.t) / 1000 : 0;
      const derived = dt > 0 ? (step / dt) * 3.6 : 0;
      if (derived > MAX_KMH || step < JITTER_M) return queue as Promise<void>;
      const kmh = p.speed != null && p.speed >= 0 ? p.speed * 3.6 : derived;
      set({ points: [...points, p], meters: meters + step, speedKmh: kmh, maxKmh: Math.max(maxKmh, kmh) });
      return queue as Promise<void>;
    },
    addWaypoint: async () => {
      const { points, waypoints } = get(); const last = points[points.length - 1];
      if (!last) return;
      const w = { name: `Waypoint ${waypoints.length + 1}`, lat: last.lat, lng: last.lng };
      set({ waypoints: [...waypoints, w] });
      await journal.appendWaypoint(w);
    },
    addNote: () => set((s) => ({ notes: s.notes + 1 })),
    checkRecoverable: async () => {
      if (get().status === 'running') return;
      const r = await journal.read();
      set({ recoverable: r ? { startedAt: r.meta.startedAt, points: r.points.length } : null });
    },
    recover: async () => {
      const r = await journal.read();
      if (!r) return set({ recoverable: null });
      const points = cleanTrack(r.points);
      const stats = trackStats(splitSegments(points));
      set({ ...blank, status: 'running', source: r.meta.source, startedAt: r.meta.startedAt, points, waypoints: r.waypoints, meters: stats.distanceM, maxKmh: stats.maxKmh, lastFixAt: Date.now(), recoverable: null });
    },
    discardRecovered: async () => { await journal.clear(); set({ recoverable: null }); },
    setError: (error) => set({ error }),
    reset: () => set({ ...blank, error: undefined }),
  }));
}
