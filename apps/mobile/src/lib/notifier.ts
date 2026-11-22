import { Linking, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import type { Notifier, Permission, Shown } from './reminderSync';

const CHANNEL = 'reminders';

// While the app is open a reminder still shows as a banner, so a rider looking at the app is not left guessing.
Notifications.setNotificationHandler({
  // The ride controls are updated while the rider is in the app, where a banner for them would only be in the way.
  handleNotification: async (n) => ({ shouldShowBanner: n.request.content.categoryIdentifier?.startsWith('ride') !== true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

/** Ride alarm rings sent as notifications (when the phone's own alarm cannot be used): loud, and allowed to pop up. */
const ALARM_CHANNEL = 'ride-alarm-v1';
const ALARM_UP = 'alarm.up';
const ALARM_SNOOZE = 'alarm.snooze';

let channel: Promise<unknown> | undefined;
/**
 * Android needs a channel to show anything. The alarm buttons are registered once: Snooze only takes the ring away (the next ring is
 * already set), so it works without the app; I'm up opens the app, which cancels the rest.
 */
const ensureChannel = () => (channel ??= Promise.all([
  Notifications.setNotificationCategoryAsync('ride-alarm', [{ identifier: ALARM_SNOOZE, buttonTitle: 'Snooze', options: { opensAppToForeground: false } }, { identifier: ALARM_UP, buttonTitle: "I'm up", options: { opensAppToForeground: true } }]),
  Notifications.setNotificationCategoryAsync('ride-alarm-last', [{ identifier: ALARM_UP, buttonTitle: "I'm up", options: { opensAppToForeground: true } }]),
  ...(Platform.OS === 'android' ? [
    Notifications.setNotificationChannelAsync(CHANNEL, { name: 'Reminders', importance: AndroidImportance.DEFAULT }),
    Notifications.setNotificationChannelAsync(ALARM_CHANNEL, { name: 'Ride alarms', importance: AndroidImportance.MAX, sound: 'default', bypassDnd: true }),
  ] : []),
]));

const content = (n: Shown): Notifications.NotificationContentInput => (n.alarm
  ? { title: n.title, body: n.body, data: { route: n.route, alarmGroup: n.alarm.group }, sound: 'default', categoryIdentifier: n.alarm.snooze ? 'ride-alarm' : 'ride-alarm-last', interruptionLevel: 'timeSensitive' }
  : { title: n.title, body: n.body, data: { route: n.route }, ...(n.loud ? { sound: 'default' } : {}) });

/** The phone's notifications: asking permission, scheduling and cancelling reminders, and reporting taps. */
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
    await Notifications.scheduleNotificationAsync({ identifier: n.id, content: content(n), trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: n.fireAt, channelId: n.alarm ? ALARM_CHANNEL : CHANNEL } });
  },
  async notifyNow(n) {
    await ensureChannel();
    await Notifications.scheduleNotificationAsync({ identifier: n.id, content: content(n), trigger: null });
  },
  async dismiss(id) {
    await Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
    await Notifications.dismissNotificationAsync(id);
  },
  openSettings: () => { void Linking.openSettings(); },
};

/** The screen the rider last tapped a notification to open, or null. Changes each time one is tapped. */
export function useTappedRoute(): { route: string; key: string; id: string } | null {
  const last = Notifications.useLastNotificationResponse();
  const route = last?.notification.request.content.data?.route;
  // A press on one of a notification's buttons is not a tap: it must not open the screen.
  return last && last.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER && typeof route === 'string' ? { route, id: last.notification.request.identifier, key: last.notification.request.identifier + last.notification.date } : null;
}

/** The last response to a ride alarm ring sent as a notification: the I'm up button, a tap on the ring, or Snooze. Changes with each one. */
export function useAlarmResponse(): { group: string; action: 'up' | 'tap' | 'snooze'; key: string } | null {
  const last = Notifications.useLastNotificationResponse();
  const group = last?.notification.request.content.data?.alarmGroup;
  if (!last || typeof group !== 'string') return null;
  const action = last.actionIdentifier === ALARM_UP ? 'up' : last.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER ? 'tap' : 'snooze';
  return { group, action, key: last.notification.request.identifier + last.notification.date + last.actionIdentifier };
}
