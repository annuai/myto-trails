import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { uid } from '@/lib/id';
import type { LatLng } from '@/lib/geo';
import { sampleRide } from '@/lib/sim';
import { storage } from './persist';

export type Waypoint = { name: string; lat: number; lng: number };
export type SubmissionState = { status: 'submitted'; at: number; trailName: string; slug: string; clientId: string };

export type Ride = {
  id: string; name: string; startedAt: number; durationSec: number; distanceKm: number; maxKmh: number; points: LatLng[];
  waypoints: Waypoint[]; sample?: boolean; updatedAt?: number; submission?: SubmissionState; /** Stays the same across upload attempts so a retry continues the same draft. */ clientId?: string;
};

type State = {
  rides: Ride[];
  addRide: (r: Omit<Ride, 'id'>) => string;
  removeRide: (id: string) => void;
  setSubmission: (id: string, s: SubmissionState) => void;
};

export const useRides = create<State>()(
  persist(
    (set) => ({
      rides: [sampleRide()],
      addRide: (r) => { const id = uid(); set((s) => ({ rides: [{ ...r, id }, ...s.rides] })); return id; },
      removeRide: (id) => set((s) => ({ rides: s.rides.filter((r) => r.id !== id) })),
      setSubmission: (id, submission) => set((s) => ({ rides: s.rides.map((r) => (r.id === id ? { ...r, submission, updatedAt: Date.now() } : r)) })),
    }),
    { name: 'myto-rides', storage },
  ),
);

export const totalKm = (rides: Ride[]) => rides.filter((r) => !r.sample).reduce((n, r) => n + r.distanceKm, 0);
