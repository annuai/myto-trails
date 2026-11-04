import type { RideSubmission } from './submit';

/** A trail submission waiting for a signal. The track is not stored here: it is read from the ride, trimmed by `trim`, when the send happens. */
export type QueuedSubmission = {
  rideId: string; clientId: string; trim: number;
  form: Omit<RideSubmission, 'points' | 'waypoints' | 'clientId'>;
  tries: number; /** Do not try again before this time (ms). */ nextAt: number;
};
export type SubmissionQueue = QueuedSubmission[];

const BACKOFF_BASE_MS = 30_000;
const BACKOFF_MAX_MS = 60 * 60_000;

/** A ride is queued once: queuing it again replaces the earlier form and tries straight away. */
export const enqueueSubmission = (q: SubmissionQueue, item: Omit<QueuedSubmission, 'tries' | 'nextAt'>, now: number): SubmissionQueue =>
  [...q.filter((i) => i.rideId !== item.rideId), { ...item, tries: 0, nextAt: now }];

/** The oldest submission that is due. One at a time: each is several requests and a signal that comes and goes should finish one before starting the next. */
export const dueSubmission = (q: SubmissionQueue, now: number): QueuedSubmission | undefined => q.find((i) => i.nextAt <= now);

export const removeSubmission = (q: SubmissionQueue, rideId: string): SubmissionQueue => q.filter((i) => i.rideId !== rideId);

/** A failed attempt waits 30 s, then 1 min, 2 min and so on up to an hour. */
export const retryLater = (q: SubmissionQueue, rideId: string, now: number): SubmissionQueue =>
  q.map((i) => (i.rideId === rideId ? { ...i, tries: i.tries + 1, nextAt: now + Math.min(BACKOFF_BASE_MS * 2 ** i.tries, BACKOFF_MAX_MS) } : i));
