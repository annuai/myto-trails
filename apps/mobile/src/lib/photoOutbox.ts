import type { PhotoCopies } from './photoCopies';

/** A post of photos waiting to be sent: the copies are already made and kept on the phone, so closing the app or losing the signal loses nothing. */
export type OutboxPost = {
  id: string; clubId: string; eventId?: string; body: string; photos: PhotoCopies[];
  tries: number; /** Do not try again before this time (ms). Infinity while it waits for the rider to retry. */ nextAt: number;
  /** The last send reached the post step: if its answer was lost, a later "photo not found" means the post went through. */
  posting?: boolean; error?: string;
};
export type Outbox = OutboxPost[];

const BACKOFF_BASE_MS = 30_000;
const BACKOFF_MAX_MS = 60 * 60_000;

export const enqueuePost = (q: Outbox, item: Omit<OutboxPost, 'tries' | 'nextAt'>, now: number): Outbox => [...q, { ...item, tries: 0, nextAt: now }];
/** The oldest post that is due. One at a time: a signal that comes and goes should finish one before starting the next. */
export const duePost = (q: Outbox, now: number): OutboxPost | undefined => q.find((i) => i.nextAt <= now);
export const removePost = (q: Outbox, id: string): Outbox => q.filter((i) => i.id !== id);
export const patchPost = (q: Outbox, id: string, patch: Partial<OutboxPost>): Outbox => q.map((i) => (i.id === id ? { ...i, ...patch } : i));
/** A failed attempt waits 30 s, then 1 min, 2 min and so on up to an hour. */
export const retryLater = (q: Outbox, id: string, now: number): Outbox =>
  q.map((i) => (i.id === id ? { ...i, tries: i.tries + 1, nextAt: now + Math.min(BACKOFF_BASE_MS * 2 ** i.tries, BACKOFF_MAX_MS) } : i));
/** The site refused it for good: it stays in the list with the reason until the rider retries or discards it. */
export const giveUp = (q: Outbox, id: string, error: string): Outbox => patchPost(q, id, { nextAt: Infinity, error, posting: false });
/** The rider taps Retry: clear the reason and try straight away. */
export const retryNow = (q: Outbox, id: string, now: number): Outbox => patchPost(q, id, { nextAt: now, error: undefined, tries: 0 });
export const forClub = (q: Outbox, clubId: string): Outbox => q.filter((i) => i.clubId === clubId);
