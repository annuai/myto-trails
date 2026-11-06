export type CardKind = 'ride' | 'check' | 'journal' | 'todo';
export type ActionCard = { kind: CardKind; title: string; detail: string };

const MIN_MS = 60_000;
const HOUR_MS = 3_600_000;
/** A pre-ride check counts as "today's" for this long. */
const CHECK_FRESH_H = 12;

/** What Dash knows, as plain values. */
export type CardWorld = {
  now: number;
  /** When the ride being recorded started, if one is. */
  recordingSince?: number;
  nextTripName?: string;
  checkedAt?: number;
  journalEntries: number;
  journalThisWeek: number;
  overdueTodos: number;
  /** The next to-do coming due, already worded for the card ("Chain lube, in 3 days"). */
  nextDue?: string;
};

/** The four cards under Start ride, in a fixed order so each is always in the same place. The detail line is what is true right now. */
export function actionCards(w: CardWorld): ActionCard[] {
  const mins = w.recordingSince === undefined ? 0 : Math.floor((w.now - w.recordingSince) / MIN_MS);
  const ride: ActionCard = w.recordingSince !== undefined
    ? { kind: 'ride', title: 'Resume ride', detail: mins < 1 ? 'Just started' : `Recording ${mins} min` }
    : { kind: 'ride', title: 'Plan a trip', detail: w.nextTripName ? `Next: ${w.nextTripName}` : 'Pick a day and a route' };

  const hours = w.checkedAt === undefined ? Infinity : (w.now - w.checkedAt) / HOUR_MS;
  const check: ActionCard = { kind: 'check', title: 'Pre-ride check', detail: hours < 1 ? 'Done just now' : hours < CHECK_FRESH_H ? `Done ${Math.floor(hours)} h ago` : 'Not done today' };

  const journal: ActionCard = {
    kind: 'journal', title: 'Journal',
    detail: w.journalEntries === 0 ? 'Start your first' : w.journalThisWeek === 0 ? 'Nothing this week' : w.journalThisWeek === 1 ? '1 entry this week' : `${w.journalThisWeek} entries this week`,
  };

  const todo: ActionCard = { kind: 'todo', title: 'To-dos', detail: w.overdueTodos > 0 ? `${w.overdueTodos} overdue` : w.nextDue ?? 'All caught up' };

  return [ride, check, journal, todo];
}
