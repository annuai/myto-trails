import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { CATEGORIES, isRideAction, type RideActionId, type RideCategory, type RideNotice } from './rideActions';

const CHANNEL = 'ride-controls';
const ROUTE = '/ride/live';

let ready: Promise<unknown> | undefined;
/** The buttons are registered once; on Android the notification also needs a quiet channel, so updating it never beeps or pops up. */
const setup = () => (ready ??= Promise.all([
  ...Object.entries(CATEGORIES).map(([id, actions]) => Notifications.setNotificationCategoryAsync(id, actions.map((a) => ({ identifier: a.id, buttonTitle: a.label, options: { opensAppToForeground: false, isDestructive: !!a.destructive } })))),
  Platform.OS === 'android' ? Notifications.setNotificationChannelAsync(CHANNEL, { name: 'Ride controls', importance: Notifications.AndroidImportance.LOW }) : Promise.resolve(),
]));

/** Shows or replaces the notification with this id. It is not removed by a swipe on Android while the ride runs. */
export async function showRideNotice(id: string, n: RideNotice & { category?: RideCategory }, ongoing: boolean): Promise<void> {
  await setup();
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: { title: n.title, body: n.body, data: { route: ROUTE }, ...(n.category ? { categoryIdentifier: n.category } : {}), ...(ongoing ? { sticky: true, autoDismiss: false } : {}) },
    trigger: { channelId: CHANNEL },
  });
}

export async function clearRideNotice(id: string): Promise<void> {
  await Notifications.dismissNotificationAsync(id);
}

/** Calls `on` when the rider presses one of the buttons, with the app in the background or not. A tap on the notification itself is not a button. */
export function onRideAction(on: (id: RideActionId) => void): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((r) => { if (isRideAction(r.actionIdentifier)) on(r.actionIdentifier); });
  return () => sub.remove();
}
