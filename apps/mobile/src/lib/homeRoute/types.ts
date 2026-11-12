import type { LatLng } from '../geo';

/** The rider is at home when within this many metres of it: no offer. */
export const AT_HOME_M = 300;
/** The rider is away from home when further than this: the offer may show. Between the two there is no offer. */
export const AWAY_M = 1500;
/** A ride counts as "just ended" for this long. */
export const JUST_ENDED_MS = 30 * 60_000;
/** A learned start time matches when it is within this many minutes of now. */
export const USUAL_WINDOW_MIN = 45;
/** "Dusk" is when sunset is at most this many minutes away. */
export const DUSK_MIN = 60;
/** A position fix older than this is not trusted. */
export const FIX_MAX_AGE_MS = 120_000;
/** After a dismissal the offer stays quiet this long. */
export const QUIET_AFTER_DISMISS_MS = 3 * 3_600_000;
/** This many dismissals within QUIET_WINDOW_MS silence the offer until QUIET_LONG_MS after the latest. */
export const QUIET_DISMISSALS = 3;
export const QUIET_WINDOW_MS = 14 * 86_400_000;
export const QUIET_LONG_MS = 14 * 86_400_000;

/** Everything the offer engine looks at. The caller supplies the clock and the stores' contents. */
export type HomeWorld = {
  now: number;
  home?: { lat: number; lng: number };
  pos?: LatLng;
  /** When `pos` was taken (ms). */
  posAt?: number;
  lastRide?: { endedAt: number; sample?: boolean; source?: string };
  rideRunning: boolean;
  inGroupRide: boolean;
  tripActive: boolean;
  /** Today's sunset (ms), when known. */
  sunsetMs?: number;
  /** Minutes of day (0-1439) of the rider's learned ride starts. */
  usualStartMins: number[];
  /** When the rider dismissed the offer (ms). */
  dismissals: number[];
};

export type HomeReason = 'dusk' | 'ride-ended' | 'usual-time';
export type HomeOffer = { reason: HomeReason; distanceM: number };
