import { describe, expect, it } from 'vitest';
import { create } from 'zustand';
import type { Reminder } from '@/lib/reminders';
import { notificationsSlice } from './notificationsCore';

const r = (id: string, fireAt: number): Reminder => ({ id, fireAt, title: `T ${id}`, body: `B ${id}`, lock: 'L', route: '/todos', kind: 'todo' });
const setup = () => create(notificationsSlice());

describe('notifications store', () => {
  it('starts with everything on, the trip start reminder 10 minutes ahead, and details hidden on the lock screen', () => {
    expect(setup().getState().prefs).toEqual({ todos: true, trips: true, paused: true, tripLeadMin: 10, showDetails: false, groupSignals: true, breakReminder: true, daylightAlert: true });
  });
  it('changes how long before a trip starts the rider is reminded, or turns it off', () => {
    const s = setup();
    s.getState().setTripLead(30);
    expect(s.getState().prefs.tripLeadMin).toBe(30);
    s.getState().setTripLead(0);
    expect(s.getState().prefs.tripLeadMin).toBe(0);
  });
  it('absorb moves reminders whose time has come into the history, newest first, unread, leaving the rest scheduled', () => {
    const s = setup();
    s.getState().setScheduled([r('a', 100), r('b', 200), r('c', 900)]);
    s.getState().absorb(300);
    expect(s.getState().inbox.map((i) => [i.id, i.at, i.read])).toEqual([['b', 200, false], ['a', 100, false]]);
    expect(s.getState().inbox[0]).toMatchObject({ title: 'T b', body: 'B b', route: '/todos', kind: 'todo' });
    expect(s.getState().scheduled.map((x) => x.id)).toEqual(['c']);
  });
  it('absorbing a reminder that is already in the history does not duplicate it', () => {
    const s = setup();
    s.getState().setScheduled([r('a', 100)]);
    s.getState().absorb(300);
    s.getState().setScheduled([r('a', 100)]); // a later sync plans it again
    s.getState().absorb(400);
    expect(s.getState().inbox).toHaveLength(1);
  });
  it('push adds a reminder to the history at once, and does not add it twice', () => {
    const s = setup();
    s.getState().push(r('svc', 50), 60);
    s.getState().push(r('svc', 50), 70);
    expect(s.getState().inbox.map((i) => i.at)).toEqual([60]);
  });
  it('clear removes one, markAllRead reads the rest', () => {
    const s = setup();
    s.getState().setScheduled([r('a', 1), r('b', 2)]);
    s.getState().absorb(10);
    s.getState().clear('a');
    expect(s.getState().inbox.map((i) => i.id)).toEqual(['b']);
    s.getState().markAllRead();
    expect(s.getState().inbox.every((i) => i.read)).toBe(true);
  });
  it('keeps only the latest 100', () => {
    const s = setup();
    s.getState().setScheduled(Array.from({ length: 120 }, (_, i) => r(`n${i}`, i + 1)));
    s.getState().absorb(1000);
    expect(s.getState().inbox).toHaveLength(100);
    expect(s.getState().inbox[0].id).toBe('n119');
  });
  it('remembers which service was announced, and the setting changes', () => {
    const s = setup();
    s.getState().markKmNotified('lube', 100);
    s.getState().setPref('trips', false);
    expect(s.getState().kmNotified).toEqual({ lube: 100 });
    expect(s.getState().prefs.trips).toBe(false);
  });
  it('wipe forgets everything, settings included', () => {
    const s = setup();
    s.getState().setScheduled([r('a', 1)]);
    s.getState().absorb(10);
    s.getState().setPref('todos', false);
    s.getState().wipe();
    expect(s.getState().inbox).toEqual([]);
    expect(s.getState().scheduled).toEqual([]);
    expect(s.getState().prefs.todos).toBe(true);
  });
});
