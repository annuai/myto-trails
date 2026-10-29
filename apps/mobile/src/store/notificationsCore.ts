import type { StateCreator } from 'zustand';
import type { Reminder, ReminderPrefs } from '@/lib/reminders';
import { REMIND_BEFORE_MIN } from '@/lib/tripPlan';

/** A reminder that has come due, kept so the rider can read it again and clear it. */
export type InboxItem = { id: string; title: string; body: string; route: string; kind: Reminder['kind']; at: number; read: boolean };
export type Prefs = ReminderPrefs & { showDetails: boolean; /** Tell me when someone in my group ride changes their signal (help, wait up, fuel, break). */ groupSignals: boolean; /** A reminder after two hours of riding without a stop of ten minutes. */ breakReminder: boolean; /** An alert about 45 minutes before sunset while riding. */ daylightAlert: boolean };

const MAX_INBOX = 100;
const defaults = (): Prefs => ({ todos: true, trips: true, paused: true, tripLeadMin: REMIND_BEFORE_MIN, showDetails: false, groupSignals: true, breakReminder: true, daylightAlert: true });
const toItem = (r: Reminder, at: number): InboxItem => ({ id: r.id, title: r.title, body: r.body, route: r.route, kind: r.kind, at, read: false });

export type NotificationsState = {
  prefs: Prefs;
  /** The reminders the app has scheduled and not yet shown. They are what the history is filled from. */
  scheduled: Reminder[];
  inbox: InboxItem[];
  /** To-do id to the `lastKm` it was announced at, so a service is announced once. */
  kmNotified: Record<string, number>;
  /** The rider said "Not now" to turning reminders on. */
  asked: boolean;
  setPref: (key: Exclude<keyof Prefs, 'tripLeadMin'>, value: boolean) => void;
  /** How long before a trip starts to be reminded to start it (0 is off). */
  setTripLead: (minutes: number) => void;
  setScheduled: (list: Reminder[]) => void;
  /** Moves every scheduled reminder whose time has come into the history. */
  absorb: (now: number) => void;
  /** Adds a reminder to the history right away (a service that has just come due). */
  push: (r: Reminder, now: number) => void;
  clear: (id: string) => void;
  markAllRead: () => void;
  markKmNotified: (todoId: string, lastKm: number) => void;
  setAsked: () => void;
  /** Erase all my data. */
  wipe: () => void;
};

const merge = (inbox: InboxItem[], add: InboxItem[]) => {
  const have = new Set(inbox.map((i) => i.id));
  return [...add.filter((i) => !have.has(i.id)), ...inbox].sort((a, b) => b.at - a.at).slice(0, MAX_INBOX);
};

export const notificationsSlice = (): StateCreator<NotificationsState> => (set) => ({
  prefs: defaults(), scheduled: [], inbox: [], kmNotified: {}, asked: false,
  setPref: (key, value) => set((s) => ({ prefs: { ...s.prefs, [key]: value } })),
  setTripLead: (tripLeadMin) => set((s) => ({ prefs: { ...s.prefs, tripLeadMin } })),
  setScheduled: (list) => set({ scheduled: list }),
  absorb: (now) => set((s) => {
    const due = s.scheduled.filter((r) => r.fireAt <= now);
    return due.length ? { inbox: merge(s.inbox, due.map((r) => toItem(r, r.fireAt))), scheduled: s.scheduled.filter((r) => r.fireAt > now) } : {};
  }),
  push: (r, now) => set((s) => ({ inbox: merge(s.inbox, [toItem(r, now)]) })),
  clear: (id) => set((s) => ({ inbox: s.inbox.filter((i) => i.id !== id) })),
  markAllRead: () => set((s) => (s.inbox.some((i) => !i.read) ? { inbox: s.inbox.map((i) => ({ ...i, read: true })) } : {})),
  markKmNotified: (todoId, lastKm) => set((s) => ({ kmNotified: { ...s.kmNotified, [todoId]: lastKm } })),
  setAsked: () => set({ asked: true }),
  wipe: () => set({ prefs: defaults(), scheduled: [], inbox: [], kmNotified: {}, asked: false }),
});
