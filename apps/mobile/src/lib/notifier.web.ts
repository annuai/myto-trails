import type { Notifier } from './reminderSync';

/** The browser build has no phone notifications: nothing is scheduled, and the history still fills in the app. */
export const notifier: Notifier = {
  permission: async () => 'denied',
  request: async () => false,
  cancelAll: async () => {},
  schedule: async () => {},
  notifyNow: async () => {},
  openSettings: () => {},
};

export const useTappedRoute = (): { route: string; key: string } | null => null;
