import { create } from 'zustand';
import { haversine, type LatLng } from '@/lib/geo';
import { fixSpeedKmh } from '@/lib/liveSpeed';
import { medianOf, TOP_SPEED_WINDOW } from '@/lib/topSpeed';
import type { Journal } from '@/lib/journal';
import { breaksOf, cleanTrack, driftRadius, splitSegments, trackStats } from '@/lib/track';
import { WAYPOINT_LABEL, type WaypointKind } from '@/lib/waypointKinds';
import type { Waypoint } from './rides';

// The live track and distance leave out the same fixes the saved ride will (poor accuracy, impossible jumps, jitter);
// the journal keeps all of them.
const MAX_ACCURACY_M = 100;
const MAX_KMH = 250;

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
  /** Indices into `points` where the live track starts again after a pause, so no line is drawn across one. */
  pauseBreaks: number[];
  /** The first fix after a resume starts a new stretch: the distance from before the pause is not counted. */
  skipStep: boolean;
  /** The rider paused the ride (a tea break): nothing is recorded until they resume. */
  paused: boolean;
  /** When the current pause began. */
  pausedAt: number;
  /** Total time of pauses that have ended. */
  pausedMs: number;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  /** Time spent riding: since the start, leaving out pauses. Frozen while paused. */
  elapsedMs: (now: number) => number;
  /** The rider was moving at the last fix. The lost-signal warning only makes sense then: a stopped phone gets no fixes. */
  moving: boolean;
  /** Waits until every fix received so far has been written to the journal. */
  flush: () => Promise<void>;
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
  /** The rider says what the waypoint they just dropped marks (fuel, water, food, hazard). */
  retypeLastWaypoint: (kind: WaypointKind) => Promise<void>;
  addNote: () => void;
  checkRecoverable: () => Promise<void>;
  recover: () => Promise<void>;
  discardRecovered: () => Promise<void>;
  reset: () => void;
};

const blank = { status: 'idle' as const, startedAt: 0, points: [], waypoints: [], meters: 0, speedKmh: 0, maxKmh: 0, notes: 0, lastFixAt: 0, moving: false, paused: false, pausedAt: 0, pausedMs: 0, pauseBreaks: [] as number[], skipStep: false };

/** The live recorder. Every fix goes to the journal first; the store only shows what the screen needs. */
export function createRecorder(journal: Journal, hooks: { stopBackground?: () => Promise<void> } = {}) {
  let queue: Promise<unknown> = Promise.resolve();
  // The speeds of the last few drawn fixes: the top speed is their median, so one glitch cannot set it.
  let recent: number[] = [];
  return create<State>((set, get) => ({
    ...blank, source: 'gps', recoverable: null, backgrounded: false,
    flush: async () => { await queue; },
    pause: async () => {
      if (get().status !== 'running' || get().paused) return;
      const t = Date.now();
      set({ paused: true, pausedAt: t, moving: false });
      await journal.pause(t);
    },
    resume: async () => {
      if (!get().paused) return;
      const t = Date.now();
      recent = [];
      set({ paused: false, pausedMs: get().pausedMs + (t - get().pausedAt), skipStep: true });
      await journal.resume(t);
    },
    elapsedMs: (now) => Math.max(0, (get().paused ? get().pausedAt : now) - get().startedAt - get().pausedMs),
    setBackgrounded: (backgrounded) => set({ backgrounded }),
    start: async (source) => {
      const existing = await journal.read();
      if (existing) { set({ recoverable: { startedAt: existing.meta.startedAt, points: existing.points.length } }); return false; }
      const startedAt = Date.now();
      recent = [];
      await journal.begin({ startedAt, source });
      set({ ...blank, status: 'running', source, startedAt, recoverable: null, error: undefined });
      return true;
    },
    ingest: (p) => {
      if (get().paused) return Promise.resolve();
      queue = queue.then(() => journal.append(p)).catch(() => set({ error: 'Could not save this ride to the phone. Free up storage.' }));
      // A fix can arrive while the screen state is idle (the phone relaunched the app for the background task): it is journaled, nothing more.
      if (get().status !== 'running') return queue as Promise<void>;
      const { points, meters, maxKmh } = get();
      const last = points[points.length - 1];
      const step = last ? haversine(last, p) : 0;
      const dt = last && last.t != null && p.t != null ? (p.t - last.t) / 1000 : 0;
      // A step inside the jitter radius is not travel: a parked phone wandering 5 m a second must not read as moving.
      const inside = !!last && step < driftRadius(p.acc);
      const derived = dt > 0 ? (step / dt) * 3.6 : 0;
      const kmh = fixSpeedKmh({ stepM: step, dtSec: dt, inside, reportedMps: p.speed });
      const poor = p.acc != null && p.acc > MAX_ACCURACY_M;
      // A fix too poor to draw says nothing about whether the rider is moving, so it leaves that as it was.
      set(poor ? { lastFixAt: Date.now() } : { lastFixAt: Date.now(), moving: kmh >= 3.6, speedKmh: kmh });
      if (poor) return queue as Promise<void>;
      if (!last) { set({ points: [p] }); return queue as Promise<void>; }
      if (get().skipStep) { set({ points: [...points, p], pauseBreaks: [...get().pauseBreaks, points.length], skipStep: false }); return queue as Promise<void>; }
      if (derived > MAX_KMH || inside) return queue as Promise<void>;
      recent = [...recent, kmh].slice(-TOP_SPEED_WINDOW);
      set({ points: [...points, p], meters: meters + step, maxKmh: recent.length >= 3 ? Math.max(maxKmh, medianOf(recent)) : maxKmh });
      return queue as Promise<void>;
    },
    addWaypoint: async () => {
      const { points, waypoints } = get(); const last = points[points.length - 1];
      if (!last) return;
      const w = { name: `Waypoint ${waypoints.length + 1}`, lat: last.lat, lng: last.lng };
      set({ waypoints: [...waypoints, w] });
      try { await journal.appendWaypoint(w); } catch { set({ error: 'Could not save this waypoint to the phone. Free up storage.' }); }
    },
    retypeLastWaypoint: async (kind) => {
      const { waypoints } = get(); const index = waypoints.length - 1;
      if (index < 0) return;
      const name = `${WAYPOINT_LABEL[kind]} ${waypoints.filter((w) => w.kind === kind).length + 1}`;
      set({ waypoints: waypoints.map((w, i) => (i === index ? { ...w, kind, name } : w)) });
      try { await journal.retypeWaypoint(index, kind, name); } catch { set({ error: 'Could not save this waypoint to the phone. Free up storage.' }); }
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
      recent = [];
      const points = cleanTrack(r.points);
      const stats = trackStats(splitSegments(points, r.pauses));
      const open = r.pauses.find((x) => x.to === undefined);
      const pausedMs = r.pauses.reduce((n, x) => n + (x.to !== undefined ? x.to - x.from : 0), 0);
      set({ ...blank, status: 'running', source: r.meta.source, startedAt: r.meta.startedAt, points, waypoints: r.waypoints, meters: stats.distanceM, maxKmh: stats.maxKmh, lastFixAt: Date.now(), recoverable: null, paused: !!open, pausedAt: open?.from ?? 0, pausedMs, pauseBreaks: breaksOf(splitSegments(points, r.pauses)) });
    },
    discardRecovered: async () => { await hooks.stopBackground?.(); await journal.clear(); set({ recoverable: null }); },
    setError: (error) => set({ error }),
    reset: () => { recent = []; set({ ...blank, error: undefined }); },
  }));
}
