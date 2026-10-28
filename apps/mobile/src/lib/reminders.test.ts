import { describe, expect, it } from 'vitest';
import type { Todo } from './todos';
import { planReminders, serviceKmReminders, type PlanInput } from './reminders';

const at = (iso: string, h: number, m = 0) => new Date(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10), h, m).getTime();
const NOW = at('2026-10-28', 10);
const prefs = { todos: true, trips: true, paused: true };
const input = (over: Partial<PlanInput> = {}): PlanInput => ({ now: NOW, todos: [], appKm: 0, prefs, ...over });
const doc = (over: Partial<Todo> = {}): Todo => ({ id: 'puc', title: 'PUC certificate', category: 'document', kind: 'date', due: '2026-11-20', done: false, ...over });

describe('to-do reminders', () => {
  it('a document gets a week before, a day before, the day, and a day after, all at 9:00', () => {
    const out = planReminders(input({ todos: [doc()] }));
    expect(out.map((r) => r.fireAt)).toEqual([at('2026-11-13', 9), at('2026-11-19', 9), at('2026-11-20', 9), at('2026-11-21', 9)]);
    expect(out.map((r) => r.body)).toEqual(['PUC certificate is due in a week', 'PUC certificate is due tomorrow', 'PUC certificate is due today', 'PUC certificate is overdue']);
  });
  it('every reminder has a title, the full text, a lock-screen text that names nothing, and a route', () => {
    const r = planReminders(input({ todos: [doc()] }))[1];
    expect(r.title).toBe('PUC certificate');
    expect(r.lock).toBe('A to-do is due tomorrow');
    expect(r.lock).not.toMatch(/PUC/);
    expect(r.route).toBe('/todos');
    expect(r.kind).toBe('todo');
  });
  it('a to-do that is not a document gets no week-before reminder', () => {
    const out = planReminders(input({ todos: [doc({ category: 'other', id: 'x' })] }));
    expect(out).toHaveLength(3);
  });
  it('skips done to-dos, to-dos with no date, and times that have already passed', () => {
    expect(planReminders(input({ todos: [doc({ done: true })] }))).toEqual([]);
    expect(planReminders(input({ todos: [doc({ due: undefined })] }))).toEqual([]);
    const out = planReminders(input({ todos: [doc({ due: '2026-10-28' })] })); // due today, it is already 10:00
    expect(out.map((r) => r.fireAt)).toEqual([at('2026-10-29', 9)]);
  });
  it('is nothing when the to-do setting is off', () => {
    expect(planReminders(input({ todos: [doc()], prefs: { ...prefs, todos: false } }))).toEqual([]);
  });
  it('ids are stable and move with the date, so moving a due date is a new reminder', () => {
    const a = planReminders(input({ todos: [doc()] })).map((r) => r.id);
    expect(planReminders(input({ todos: [doc()] })).map((r) => r.id)).toEqual(a);
    expect(planReminders(input({ todos: [doc({ due: '2026-12-01' })] })).map((r) => r.id)).not.toEqual(a);
    expect(new Set(a).size).toBe(a.length);
  });
  it('a service to-do is reminded on its date limit, once it has a last date', () => {
    const lube: Todo = { id: 'lube', title: 'Chain lube', category: 'service', kind: 'service', everyKm: 500, everyMonths: 1, lastDate: '2026-10-20', lastKm: 0, done: false };
    const out = planReminders(input({ todos: [lube] }));
    expect(out.map((r) => r.fireAt)).toEqual([at('2026-11-19', 9), at('2026-11-20', 9), at('2026-11-21', 9)]);
    expect(planReminders(input({ todos: [{ ...lube, lastDate: undefined }] }))).toEqual([]);
  });
});

describe('trip reminders', () => {
  const trip = { slug: 'nandi', name: 'Nandi Hills', iso: '2026-11-02' };
  const pack = (id: string, done: boolean): Todo => ({ id, title: id, category: 'pack', kind: 'date', done });
  it('9 pm the evening before and 7:30 on the day, with the packing count', () => {
    const out = planReminders(input({ trip, todos: [pack('a', true), pack('b', false), pack('c', false)] }));
    expect(out.map((r) => r.fireAt)).toEqual([at('2026-11-01', 21), at('2026-11-02', 7, 30)]);
    expect(out[0].title).toBe('Tomorrow: Nandi Hills');
    expect(out[0].body).toBe('2 of 3 things still to pack');
    expect(out[1].title).toBe('Ride day: Nandi Hills');
    expect(out[0].lock).toBe('You have a ride planned tomorrow');
    expect(out[0].route).toBe('/trail/nandi');
  });
  it('says all packed, or just checks the list when nothing is on it', () => {
    expect(planReminders(input({ trip, todos: [pack('a', true)] }))[0].body).toBe('All packed');
    expect(planReminders(input({ trip }))[0].body).toBe('Check your list before you go');
  });
  it('a trip with no date (ride now) gets no reminders', () => {
    expect(planReminders(input({ trip: { slug: 'nandi', name: 'Nandi Hills' } }))).toEqual([]);
  });
  it('is nothing when the trip setting is off', () => {
    expect(planReminders(input({ trip, prefs: { ...prefs, trips: false } }))).toEqual([]);
  });
});

describe('ride paused', () => {
  it('reminds 30 minutes after the pause, when that is within the day', () => {
    const out = planReminders(input({ paused: { since: at('2026-10-28', 10, 15) } }));
    expect(out.map((r) => r.fireAt)).toEqual([at('2026-10-28', 10, 45)]);
    expect(out[0].route).toBe('/ride/live');
  });
  it('stays quiet when that falls between 21:00 and 07:00, or the setting is off', () => {
    expect(planReminders(input({ paused: { since: at('2026-10-28', 21, 0) } }))).toEqual([]);
    expect(planReminders(input({ paused: { since: at('2026-10-28', 10, 15) }, prefs: { ...prefs, paused: false } }))).toEqual([]);
  });
});

describe('plan as a whole', () => {
  it('is sorted by time', () => {
    const out = planReminders(input({ todos: [doc()], trip: { slug: 's', name: 'S', iso: '2026-11-02' } }));
    expect(out.map((r) => r.fireAt)).toEqual([...out.map((r) => r.fireAt)].sort((a, b) => a - b));
  });
});

describe('service by kilometres', () => {
  const lube: Todo = { id: 'lube', title: 'Chain lube', category: 'service', kind: 'service', everyKm: 500, everyMonths: 1, lastDate: '2026-10-20', lastKm: 100, done: false };
  it('tells you once the distance since the last service passes the limit', () => {
    expect(serviceKmReminders([lube], 599, {}, NOW, prefs)).toEqual([]);
    const out = serviceKmReminders([lube], 600, {}, NOW, prefs);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ title: 'Chain lube is due', body: 'About 500 km since the last one', fireAt: NOW, route: '/todos', kind: 'todo' });
  });
  it('does not repeat for the same service, but does after the service is done and the clock restarts', () => {
    expect(serviceKmReminders([lube], 700, { lube: 100 }, NOW, prefs)).toEqual([]);
    expect(serviceKmReminders([{ ...lube, lastKm: 700 }], 1300, { lube: 100 }, NOW, prefs)).toHaveLength(1);
  });
  it('skips done items, items with no distance limit, and a setting that is off', () => {
    expect(serviceKmReminders([{ ...lube, done: true }], 900, {}, NOW, prefs)).toEqual([]);
    expect(serviceKmReminders([{ ...lube, everyKm: undefined }], 900, {}, NOW, prefs)).toEqual([]);
    expect(serviceKmReminders([lube], 900, {}, NOW, { ...prefs, todos: false })).toEqual([]);
  });
});
