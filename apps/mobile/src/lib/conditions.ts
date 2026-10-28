import { uid } from './id';

export type ConditionKind = 'clear' | 'muddy' | 'blocked' | 'washed_out' | 'closed';

/** One-tap choices, in the order the report sheet shows them. */
export const CONDITION_CHOICES: { kind: ConditionKind; label: string }[] = [
  { kind: 'clear', label: 'All clear' },
  { kind: 'muddy', label: 'Muddy' },
  { kind: 'blocked', label: 'Blocked' },
  { kind: 'washed_out', label: 'Washed out' },
  { kind: 'closed', label: 'Closed' },
];

export type ReportDraft = { slug: string; kind: ConditionKind; note?: string; at: string; lat?: number; lng?: number; mediaId?: string };
export type OutboxItem = ReportDraft & { /** Sent with every attempt: the server keeps one report per id, so a retry never doubles it. */ clientId: string; tries: number; /** Do not try again before this time (ms). */ nextAt: number };
export type Outbox = OutboxItem[];

/** The outbox keeps the newest 50 reports; a rider offline for long enough to pass that has bigger problems. */
export const OUTBOX_CAP = 50;
const BACKOFF_BASE_MS = 30_000;
const BACKOFF_MAX_MS = 60 * 60_000;

export const enqueue = (box: Outbox, draft: ReportDraft, now: number, clientId: string = uid()): Outbox =>
  [...box, { ...draft, clientId, tries: 0, nextAt: now }].slice(-OUTBOX_CAP);

/** Reports due to be sent now, oldest first. */
export const nextBatch = (box: Outbox, now: number, size: number = 5): OutboxItem[] => box.filter((i) => i.nextAt <= now).slice(0, size);

export const markSent = (box: Outbox, clientId: string): Outbox => box.filter((i) => i.clientId !== clientId);

/** A failed attempt waits 30 s, then 1 min, 2 min and so on up to an hour. `permanent` (the server said no) drops the report. */
export function markFailed(box: Outbox, clientId: string, now: number, permanent: boolean = false): Outbox {
  if (permanent) return markSent(box, clientId);
  return box.map((i) => (i.clientId === clientId ? { ...i, tries: i.tries + 1, nextAt: now + Math.min(BACKOFF_BASE_MS * 2 ** i.tries, BACKOFF_MAX_MS) } : i));
}
