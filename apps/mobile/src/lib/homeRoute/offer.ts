import { haversine } from '../geo';
import { minuteOfDay } from '../nudge/time';
import {
  AWAY_M, DUSK_MIN, FIX_MAX_AGE_MS, JUST_ENDED_MS, QUIET_AFTER_DISMISS_MS, QUIET_DISMISSALS, QUIET_LONG_MS,
  QUIET_WINDOW_MS, USUAL_WINDOW_MIN, type HomeOffer, type HomeWorld,
} from './types';

/** Distance between two minutes of the day, going the short way round midnight (23:30 to 00:10 is 40). */
export function minuteDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 1440;
  return Math.min(d, 1440 - d);
}

/** Whether the rider's own dismissals keep the offer quiet right now. A dismissal stamped in the future (clock moved back) counts as just now. */
function quiet(now: number, dismissals: number[]): boolean {
  if (dismissals.length === 0) return false;
  const ds = dismissals.map((t) => Math.min(t, now)).sort((x, y) => x - y);
  if (now - ds[ds.length - 1] < QUIET_AFTER_DISMISS_MS) return true;
  // Three dismissals within QUIET_WINDOW_MS silence the offer until QUIET_LONG_MS after the latest of them.
  for (let i = 0; i + QUIET_DISMISSALS - 1 < ds.length; i++) {
    const last = ds[i + QUIET_DISMISSALS - 1];
    if (last - ds[i] <= QUIET_WINDOW_MS && now < last + QUIET_LONG_MS) return true;
  }
  return false;
}

/**
 * Whether to offer "Ride home" now, and why. Suppressions come first (no home, no fresh fix, at home or only a little way
 * out, a ride or trip under way, a sample or simulated last ride, recent dismissals); then the reasons in priority order:
 * dusk, a ride that just ended, a usual ride time. Pure: the caller supplies the clock and the stores' contents.
 */
export function decideHomeOffer(w: HomeWorld): HomeOffer | null {
  if (!w.home || !w.pos || w.posAt === undefined) return null;
  if (w.now - w.posAt > FIX_MAX_AGE_MS) return null;
  if (w.rideRunning || w.inGroupRide || w.tripActive) return null;
  const distanceM = haversine(w.pos, w.home);
  if (distanceM <= AWAY_M) return null; // at home (<= AT_HOME_M) or not far enough out to need a way home
  if (quiet(w.now, w.dismissals)) return null;

  if (w.sunsetMs !== undefined) {
    const toSunset = w.sunsetMs - w.now;
    if (toSunset >= 0 && toSunset <= DUSK_MIN * 60_000) return { reason: 'dusk', distanceM };
  }
  const r = w.lastRide;
  if (r && !r.sample && r.source !== 'sim' && w.now - r.endedAt <= JUST_ENDED_MS) return { reason: 'ride-ended', distanceM };
  const mod = minuteOfDay(w.now);
  if (w.usualStartMins.some((m) => minuteDistance(m, mod) <= USUAL_WINDOW_MIN)) return { reason: 'usual-time', distanceM };
  return null;
}
