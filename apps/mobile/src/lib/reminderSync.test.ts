import { describe, expect, it } from 'vitest';
import { create } from 'zustand';
import { notificationsSlice } from '@/store/notificationsCore';
import type { Todo } from './todos';
import { createSyncer, type Notifier, type Shown } from './reminderSync';

const at = (iso: string, h: number, m = 0) => new Date(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10), h, m).getTime();
const NOW = at('2026-10-28', 10);
const doc = (id: string, due: string): Todo => ({ id, title: `Doc ${id}`, category: 'document', kind: 'date', due, done: false });

function setup(opts: { permission?: 'granted' | 'denied' | 'undetermined'; todos?: Todo[]; appKm?: number; now?: () => number } = {}) {
  const store = create(notificationsSlice());
  const log: string[] = [];
  const scheduled: Shown[] = [], now: Shown[] = [];
  const notifier: Notifier = {
    permission: async () => opts.permission ?? 'granted',
    request: async () => true,
    cancelAll: async () => { log.push('cancel'); },
    schedule: async (n) => { log.push('schedule'); scheduled.push(n); },
    notifyNow: async (n) => { log.push('now'); now.push(n); },
    openSettings: () => {},
  };
  const world = { todos: opts.todos ?? [], appKm: opts.appKm ?? 0 };
  const syncer = createSyncer({ now: opts.now ?? (() => NOW), world: () => world, store, notifier });
  return { store, log, scheduled, now, syncer, world };
}

describe('syncReminders', () => {
  it('cancels what was scheduled and schedules the plan, with the lock-screen text unless details are shown', async () => {
    const t = setup({ todos: [doc('a', '2026-11-20')] });
    await t.syncer.sync();
    expect(t.log[0]).toBe('cancel');
    expect(t.scheduled).toHaveLength(4);
    expect(t.scheduled[0]).toMatchObject({ title: 'Myto Moto reminder', body: 'A to-do is due in a week', route: '/todos' });
    expect(t.store.getState().scheduled).toHaveLength(4);
    t.store.getState().setPref('showDetails', true);
    t.scheduled.length = 0;
    await t.syncer.sync();
    expect(t.scheduled[0]).toMatchObject({ title: 'Doc a', body: 'Doc a is due in a week' });
  });
  it('schedules nothing when the permission is not granted, but still records the plan for the history', async () => {
    for (const permission of ['denied', 'undetermined'] as const) {
      const t = setup({ permission, todos: [doc('a', '2026-11-20')] });
      await t.syncer.sync();
      expect(t.scheduled).toEqual([]);
      expect(t.log).toEqual([]);
      expect(t.store.getState().scheduled).toHaveLength(4);
    }
  });
  it('schedules only the soonest 60', async () => {
    const todos = Array.from({ length: 40 }, (_, i) => doc(`d${i}`, '2026-12-01')); // 40 x 4 = 160 reminders
    const t = setup({ todos });
    await t.syncer.sync();
    expect(t.scheduled).toHaveLength(60);
    expect(t.store.getState().scheduled).toHaveLength(160);
    expect(t.scheduled.map((s) => s.fireAt)).toEqual([...t.scheduled.map((s) => s.fireAt)].sort((a, b) => a - b));
  });
  it('moves reminders whose time has passed into the history, and does not schedule them again', async () => {
    let clock = NOW;
    const t = setup({ todos: [doc('a', '2026-10-30')], now: () => clock });
    await t.syncer.sync(); // schedules 29 Oct 9:00, 30 Oct 9:00, 31 Oct 9:00
    clock = at('2026-10-30', 12);
    await t.syncer.sync();
    expect(t.store.getState().inbox.map((i) => i.at)).toEqual([at('2026-10-30', 9), at('2026-10-29', 9)]);
    expect(t.store.getState().scheduled.map((r) => r.fireAt)).toEqual([at('2026-10-31', 9)]);
  });
  it('a to-do finished before its time never reaches the history', async () => {
    let clock = NOW;
    const t = setup({ todos: [doc('a', '2026-10-30')], now: () => clock });
    await t.syncer.sync();
    t.world.todos = [{ ...t.world.todos[0], done: true }];
    await t.syncer.sync(); // finishing a to-do changes the store, which syncs at once
    clock = at('2026-10-31', 12);
    await t.syncer.sync();
    expect(t.store.getState().inbox).toEqual([]);
  });
  it('announces a service whose distance has passed once, in the history and as a notification', async () => {
    const lube: Todo = { id: 'lube', title: 'Chain lube', category: 'service', kind: 'service', everyKm: 500, everyMonths: 1, lastDate: '2026-10-20', lastKm: 0, done: false };
    const t = setup({ todos: [lube], appKm: 600 });
    await t.syncer.sync();
    await t.syncer.sync();
    expect(t.now).toHaveLength(1);
    expect(t.now[0]).toMatchObject({ title: 'Myto Moto reminder', body: 'A service is due' });
    expect(t.store.getState().inbox.map((i) => i.title)).toEqual(['Chain lube is due']);
    expect(t.store.getState().kmNotified).toEqual({ lube: 0 });
  });
  it('a service announcement still reaches the history when notifications are not allowed, but is not sent', async () => {
    const lube: Todo = { id: 'lube', title: 'Chain lube', category: 'service', kind: 'service', everyKm: 500, everyMonths: 1, lastDate: '2026-10-20', lastKm: 0, done: false };
    const t = setup({ todos: [lube], appKm: 600, permission: 'denied' });
    await t.syncer.sync();
    expect(t.now).toEqual([]);
    expect(t.store.getState().inbox).toHaveLength(1);
  });
  it('two syncs started together run one after the other', async () => {
    const t = setup({ todos: [doc('a', '2026-11-20')] });
    await Promise.all([t.syncer.sync(), t.syncer.sync()]);
    const firstCancel = t.log.indexOf('cancel'), secondCancel = t.log.indexOf('cancel', firstCancel + 1);
    expect(t.log.slice(firstCancel + 1, secondCancel)).toEqual(['schedule', 'schedule', 'schedule', 'schedule']);
  });
  it('a notifier that fails does not stop the next sync', async () => {
    const t = setup({ todos: [doc('a', '2026-11-20')] });
    let fail = true;
    const orig = t.syncer;
    const bad = createSyncer({ now: () => NOW, world: () => t.world, store: t.store, notifier: { permission: async () => 'granted', request: async () => true, cancelAll: async () => { if (fail) throw new Error('native'); }, schedule: async () => {}, notifyNow: async () => {}, openSettings: () => {} } });
    await expect(bad.sync()).rejects.toThrow('native');
    fail = false;
    await expect(bad.sync()).resolves.toBeUndefined();
    void orig;
  });
});
