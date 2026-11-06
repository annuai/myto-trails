import type { Nudge, NudgeHistory } from './types';

/** How far ahead, and how far back, a nudge counts as "now" for the card on the Dash. */
export const IN_APP_AHEAD_MS = 18 * 3_600_000;
export const IN_APP_BACK_MS = 12 * 3_600_000;

/**
 * For a rider whose phone is not showing notifications: the nudge to show as a card on the Dash instead. The soonest one that is due within the
 * next 18 hours, or came due in the last 12, that the rider has not already seen (`seen` holds ids opened or shown) and has not opened. Same plan, same
 * rules, same wording: only the place it appears differs.
 */
export function inAppNudge(planned: Nudge[], history: NudgeHistory[], seen: Record<string, number>, now: number): Pick<Nudge, 'id' | 'title' | 'body' | 'route'> | undefined {
  const due = [...history.filter((h) => !h.opened).map((h) => planned.find((p) => p.id === h.id) ?? undefined), ...planned].filter((n): n is Nudge => !!n);
  return due
    .filter((n) => !seen[n.id] && n.fireAt >= now - IN_APP_BACK_MS && n.fireAt <= now + IN_APP_AHEAD_MS)
    .sort((a, b) => a.fireAt - b.fireAt)[0];
}
