import { addDays, addMonths, daysUntil, formatDate, todayISO } from './dates';
import { roundedDistanceKm, withUnit } from './units';

export type TodoCategory = 'document' | 'service' | 'pack' | 'other';
export type Todo = {
  id: string; title: string; category: TodoCategory; kind: 'date' | 'service'; done: boolean;
  due?: string; source?: string; updatedAt?: number;
  /** Set on a to-do that belongs to a trip's pack list: its due date is the trip's start date. */
  tripId?: string;
  // service items: due after N km or N months, whichever comes first
  everyKm?: number; everyMonths?: number; lastDate?: string; lastKm?: number;
};

export type Due = { state: 'ok' | 'soon' | 'overdue' | 'done'; text: string; sortKey: number };

/**
 * How due is a to-do. For service items we only know the kilometres recorded in Myto, not rides made outside the app,
 * so the text is an estimate and the date limit is the one that always holds.
 */
export function dueInfo(t: Todo, appKm: number, today: string = todayISO()): Due {
  if (t.done) return { state: 'done', text: 'Done', sortKey: Number.MAX_SAFE_INTEGER };
  if (t.kind === 'date') {
    if (!t.due) return { state: 'ok', text: 'No date', sortKey: 100_000 };
    const d = daysUntil(t.due, today);
    if (d < 0) return { state: 'overdue', text: `Overdue by ${-d} day${d === -1 ? '' : 's'}`, sortKey: d };
    if (d === 0) return { state: 'soon', text: 'Due today', sortKey: 0 };
    return { state: d <= 30 ? 'soon' : 'ok', text: d === 1 ? 'Due tomorrow' : d < 45 ? `Due in ${d} days` : `Due ${formatDate(t.due)}`, sortKey: d };
  }
  const limitDate = addMonths(t.lastDate ?? today, t.everyMonths ?? 1);
  const days = daysUntil(limitDate, today);
  const kmLeft = (t.everyKm ?? 0) - Math.max(0, appKm - (t.lastKm ?? 0));
  if (days < 0 || (t.everyKm && kmLeft <= 0)) return { state: 'overdue', text: 'Due now', sortKey: Math.min(days, -1) };
  const near = days <= 7 || (!!t.everyKm && kmLeft <= (t.everyKm ?? 0) * 0.15);
  const parts = [`${days} day${days === 1 ? '' : 's'}`];
  if (t.everyKm) parts.push(`about ${withUnit(roundedDistanceKm(kmLeft))}`);
  return { state: near ? 'soon' : 'ok', text: `Due in ${parts.join(' or ')}`, sortKey: days };
}

export const isDueSoon = (d: Due) => d.state === 'overdue' || d.state === 'soon';
export { addDays };

/**
 * Older installs started with three example to-dos whose ids begin `seed-`. A rider who never touched one (it has no `updatedAt`,
 * which every edit, tick and "done" sets) did not choose it, so it is dropped; one they changed stays.
 */
export const withoutUntouchedExamples = (todos: Todo[]): Todo[] => todos.filter((t) => !(t.id.startsWith('seed-') && t.updatedAt === undefined));

/**
 * How much of a service interval is left, from 1 (just done) down to 0 (due now), for the ring beside it: the smaller of the share of
 * kilometres and the share of time that remain. Undefined for a to-do that is not a service item.
 */
export function serviceLeft(t: Todo, appKm: number, today: string = todayISO()): number | undefined {
  if (t.kind !== 'service') return undefined;
  const parts: number[] = [];
  const from = t.lastDate ?? today;
  const limit = addMonths(from, t.everyMonths ?? 1);
  const span = daysUntil(limit, from);
  if (t.everyMonths && span > 0) parts.push(daysUntil(limit, today) / span);
  if (t.everyKm) parts.push((t.everyKm - Math.max(0, appKm - (t.lastKm ?? 0))) / t.everyKm);
  if (!parts.length) return undefined;
  return Math.min(1, Math.max(0, Math.min(...parts)));
}
