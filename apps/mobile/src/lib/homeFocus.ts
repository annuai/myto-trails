import type { TripStatus } from './tripPlan';

export type HomeFocus =
  | { kind: 'resume' }
  | { kind: 'trip'; phase: 'active' | 'ready' | 'upcoming' }
  | { kind: 'recap'; rideId: string }
  | { kind: 'first' }
  | { kind: 'plan' };

const DAY_MS = 86_400_000;

/**
 * The one thing Home puts first, from where the rider is: a ride being recorded, a trip under way or ready, a ride that
 * finished in the last day, a trip coming up, a rider with no rides yet, and otherwise a nudge to plan the next one.
 */
export function homeFocus(s: { recording: boolean; tripPhase?: Extract<TripStatus, 'active' | 'ready' | 'upcoming'>; lastRide?: { id: string; endedAt: number }; rideCount: number; now: number }): HomeFocus {
  if (s.recording) return { kind: 'resume' };
  if (s.tripPhase === 'active' || s.tripPhase === 'ready') return { kind: 'trip', phase: s.tripPhase };
  if (s.lastRide && s.now - s.lastRide.endedAt < DAY_MS) return { kind: 'recap', rideId: s.lastRide.id };
  if (s.tripPhase === 'upcoming') return { kind: 'trip', phase: 'upcoming' };
  return s.rideCount === 0 ? { kind: 'first' } : { kind: 'plan' };
}
