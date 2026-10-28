import { Linking, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { Notifier, Permission, Shown } from './reminderSync';

const CHANNEL = 'reminders';

// While the app is open a reminder still shows as a banner, so a rider looking at the app is not left guessing.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

let channel: Promise<unknown> | undefined;
/** Android needs a channel to show anything. */
const ensureChannel = () => (Platform.OS === 'android' ? (channel ??= Notifications.setNotificationChannelAsync(CHANNEL, { name: 'Reminders', importance: Notifications.AndroidImportance.DEFAULT })) : Promise.resolve());

const content = (n: Shown): Notifications.NotificationContentInput => ({ title: n.title, body: n.body, data: { route: n.route } });

export const notifier: Notifier = {
  async permission(): Promise<Permission> {
    const p = await Notifications.getPermissionsAsync();
    return p.granted ? 'granted' : p.canAskAgain ? 'undetermined' : 'denied';
  },
  async request() {
    await ensureChannel();
    return (await Notifications.requestPermissionsAsync()).granted;
  },
  async cancelAll() { await Notifications.cancelAllScheduledNotificationsAsync(); },
  async schedule(n) {
    await ensureChannel();
    await Notifications.scheduleNotificationAsync({ identifier: n.id, content: content(n), trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: n.fireAt, channelId: CHANNEL } });
  },
  async notifyNow(n) {
    await ensureChannel();
    await Notifications.scheduleNotificationAsync({ identifier: n.id, content: content(n), trigger: null });
  },
  openSettings: () => { void Linking.openSettings(); },
};

/** The screen the rider last tapped a notification to open, or null. Changes each time one is tapped. */
export function useTappedRoute(): { route: string; key: string } | null {
  const last = Notifications.useLastNotificationResponse();
  const route = last?.notification.request.content.data?.route;
  return last && typeof route === 'string' ? { route, key: last.notification.request.identifier + last.notification.date } : null;
}
