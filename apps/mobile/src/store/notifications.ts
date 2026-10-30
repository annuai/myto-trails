import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { mergePersisted, notificationsSlice, type NotificationsState } from './notificationsCore';
import { storage } from './persist';

/** Reminder settings and the history of reminders that came due. Kept on the phone only. */
export const useNotifications = create<NotificationsState>()(
  persist(notificationsSlice(), { name: 'myto-notifications', storage, merge: mergePersisted, partialize: (s) => ({ prefs: s.prefs, scheduled: s.scheduled, inbox: s.inbox, kmNotified: s.kmNotified, asked: s.asked }) as NotificationsState }),
);
