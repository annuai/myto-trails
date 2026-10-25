import { create } from 'zustand';
import { haversine, type LatLng } from '@/lib/geo';
import type { Waypoint } from './rides';

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
  error?: string;
  setError: (e?: string) => void;
  start: (source: 'gps' | 'sim') => void;
  addPoint: (p: LatLng, speedMs?: number | null) => void;
  addWaypoint: () => void;
  addNote: () => void;
  reset: () => void;
};

const blank = { status: 'idle' as const, startedAt: 0, points: [], waypoints: [], meters: 0, speedKmh: 0, maxKmh: 0, notes: 0 };

export const useRecorder = create<State>((set, get) => ({
  ...blank, source: 'gps',
  start: (source) => set({ ...blank, status: 'running', source, startedAt: Date.now() }),
  addPoint: (p, speedMs) => {
    const { points, meters, maxKmh } = get();
    const last = points[points.length - 1];
    const step = last ? haversine(last, p) : 0;
    if (last && step < 3) return; // ignore GPS jitter under 3 m
    const dt = last && p.t && last.t ? (p.t - last.t) / 1000 : 0;
    const kmh = speedMs != null && speedMs >= 0 ? speedMs * 3.6 : dt > 0 ? (step / dt) * 3.6 : 0;
    set({ points: [...points, p], meters: meters + step, speedKmh: kmh, maxKmh: Math.max(maxKmh, kmh) });
  },
  addWaypoint: () => {
    const { points, waypoints } = get(); const last = points[points.length - 1];
    if (last) set({ waypoints: [...waypoints, { name: `Waypoint ${waypoints.length + 1}`, lat: last.lat, lng: last.lng }] });
  },
  addNote: () => set((s) => ({ notes: s.notes + 1 })),
  setError: (error) => set({ error }),
  reset: () => set({ ...blank, error: undefined }),
}));
