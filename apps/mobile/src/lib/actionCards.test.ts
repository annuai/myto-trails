import { describe, expect, it } from 'vitest';
import { actionCards, type CardWorld } from './actionCards';

const NOW = 1_700_000_000_000;
const MIN = 60_000;
const HOUR = 3_600_000;
const world = (over: Partial<CardWorld> = {}): CardWorld => ({ now: NOW, journalEntries: 0, journalThisWeek: 0, overdueTodos: 0, ...over });
const by = (w: CardWorld, kind: string) => actionCards(w).find((c) => c.kind === kind)!;

describe('actionCards', () => {
  it('is always the same four cards in the same order', () => {
    expect(actionCards(world()).map((c) => c.kind)).toEqual(['ride', 'check', 'journal', 'todo']);
  });

  it('the first card offers a trip when nothing is recording, and names the next one if there is one', () => {
    expect(by(world(), 'ride')).toEqual({ kind: 'ride', title: 'Plan a trip', detail: 'Pick a day and a route' });
    expect(by(world({ nextTripName: 'Coorg loop' }), 'ride').detail).toBe('Next: Coorg loop');
  });

  it('the first card resumes a ride in progress and says how long it has run', () => {
    expect(by(world({ recordingSince: NOW - 42 * MIN }), 'ride')).toEqual({ kind: 'ride', title: 'Resume ride', detail: 'Recording 42 min' });
    expect(by(world({ recordingSince: NOW - 20_000 }), 'ride').detail).toBe('Just started');
  });

  it('the pre-ride check says when it was last done, and "not done today" after twelve hours or never', () => {
    expect(by(world({ checkedAt: NOW - 10 * MIN }), 'check').detail).toBe('Done just now');
    expect(by(world({ checkedAt: NOW - 5 * HOUR - 10 * MIN }), 'check').detail).toBe('Done 5 h ago');
    expect(by(world({ checkedAt: NOW - 13 * HOUR }), 'check').detail).toBe('Not done today');
    expect(by(world(), 'check').detail).toBe('Not done today');
  });

  it('the journal counts this week, and invites the first entry', () => {
    expect(by(world(), 'journal').detail).toBe('Start your first');
    expect(by(world({ journalEntries: 4 }), 'journal').detail).toBe('Nothing this week');
    expect(by(world({ journalEntries: 4, journalThisWeek: 1 }), 'journal').detail).toBe('1 entry this week');
    expect(by(world({ journalEntries: 9, journalThisWeek: 3 }), 'journal').detail).toBe('3 entries this week');
  });

  it('to-dos put overdue first, then the next one due, then reassure', () => {
    expect(by(world({ overdueTodos: 2, nextDue: 'Chain lube, in 3 days' }), 'todo').detail).toBe('2 overdue');
    expect(by(world({ nextDue: 'Chain lube, in 3 days' }), 'todo').detail).toBe('Chain lube, in 3 days');
    expect(by(world(), 'todo').detail).toBe('All caught up');
  });
});
