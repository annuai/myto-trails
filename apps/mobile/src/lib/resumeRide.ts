import type { JournalRide } from './journal';

/** A recording whose last fix is newer than this is a ride that was under way when the app closed: it is taken up again without asking. */
export const RESUME_WITHIN_MS = 30 * 60_000;
/** How long the live screen says it picked the ride up again. */
export const RESUMED_NOTICE_MS = 12_000;
/** A silence shorter than this is not a gap worth marking. */
export const GAP_MIN_MS = 20_000;

/** When the recording last heard from the phone: its last fix, or the start for a ride with none. */
export const lastFixAt = (r: Pick<JournalRide, 'meta' | 'points'>): number => r.points[r.points.length - 1]?.t ?? r.meta.startedAt;

/** What to do with an unfinished recording found at launch: carry on at once, or leave it for the rider to save or discard. */
export const resumeAction = (lastAt: number, now: number): 'resume' | 'ask' => (now - lastAt <= RESUME_WITHIN_MS ? 'resume' : 'ask');

/** "40 s", "4 min", "1 h 5 min". */
export function gapText(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} s`;
  const m = Math.round(s / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`;
}
