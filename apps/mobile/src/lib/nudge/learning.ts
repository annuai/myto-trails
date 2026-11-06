import { DAY } from './time';
import type { NudgeHistory, NudgeType, NudgeWorld } from './types';

export type Resolved = { id: string; type: NudgeType; fireAt: number; good: boolean };

/** A nudge is judged a day after it was shown: good if it was opened, or the rider went for a ride in the day after it. */
export const JUDGE_AFTER_MS = DAY;
const RECENT = 8;
const DORMANT_AFTER_IGNORED = 4;
const DORMANT_FOR_MS = 21 * DAY;
const FATIGUE_AFTER_IGNORED = 3;

export function resolveHistory(history: NudgeHistory[], rides: NudgeWorld['rides'], now: number): Resolved[] {
  return history
    .filter((h) => h.fireAt <= now - JUDGE_AFTER_MS)
    .map((h) => ({ id: h.id, type: h.type, fireAt: h.fireAt, good: !!h.opened || rides.some((r) => r.startedAt >= h.fireAt && r.startedAt <= h.fireAt + JUDGE_AFTER_MS) }))
    .sort((a, b) => a.fireAt - b.fireAt);
}

const ofType = (r: Resolved[], type: NudgeType) => r.filter((x) => x.type === type).slice(-RECENT);

/** How much a type is trusted: 1 with no history, up to 1.4 when it always works, down to 0.6 when it never does. */
export function typeWeight(resolved: Resolved[], type: NudgeType): number {
  const mine = ofType(resolved, type);
  const good = mine.filter((x) => x.good).length;
  return 0.5 + (good + 1) / (mine.length + 2);
}

/** A type whose last few nudges were all ignored rests for three weeks. */
export function dormant(resolved: Resolved[], type: NudgeType, now: number): boolean {
  const last = ofType(resolved, type).slice(-DORMANT_AFTER_IGNORED);
  return last.length === DORMANT_AFTER_IGNORED && last.every((x) => !x.good) && now - last[last.length - 1]!.fireAt < DORMANT_FOR_MS;
}

/** The last few nudges, of any type, were all ignored: the rider is not enjoying them, so there are half as many. */
export function fatigued(resolved: Resolved[]): boolean {
  const last = resolved.slice(-FATIGUE_AFTER_IGNORED);
  return last.length === FATIGUE_AFTER_IGNORED && last.every((x) => !x.good);
}
