import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { CATEGORIES, isRideAction, type RideActionId, type RideCategory, type RideNotice } from './rideActions';

const CHANNEL = 'ride-controls';
/** The crash countdown has to be heard, so it gets its own channel that is allowed to make a sound and pop up. */
const LOUD_CHANNEL = 'crash-alert';
const ROUTE = '/ride/live';

let ready: Promise<unknown> | undefined;
/** The buttons are registered once; on Android the notification also needs a quiet channel, so updating it never beeps or pops up. */
const setup = () => (ready ??= Promise.all([
  ...Object.entries(CATEGORIES).map(([id, actions]) => Notifications.setNotificationCategoryAsync(id, actions.map((a) => ({ identifier: a.id, buttonTitle: a.label, options: { opensAppToForeground: !!a.opensApp, isDestructive: !!a.destructive } })))),
  Platform.OS === 'android' ? Notifications.setNotificationChannelAsync(CHANNEL, { name: 'Ride controls', importance: AndroidImportance.LOW }) : Promise.resolve(),
  Platform.OS === 'android' ? Notifications.setNotificationChannelAsync(LOUD_CHANNEL, { name: 'Crash alert', importance: AndroidImportance.MAX }) : Promise.resolve(),
]));

/** Without permission iOS drops a notification without a word, so ask the first time a ride needs one. A refusal is final: the rider can allow it later in the phone's settings. */
export async function allowed(): Promise<boolean> {
  const p = await Notifications.getPermissionsAsync();
  if (p.granted) return true;
  return p.canAskAgain ? (await Notifications.requestPermissionsAsync()).granted : false;
}

/** Shows or replaces the notification with this id. It is not removed by a swipe on Android while the ride runs. */
export async function showRideNotice(id: string, n: RideNotice & { category?: RideCategory }, ongoing: boolean, loud = false): Promise<void> {
  await setup();
  if (!(await allowed())) return;
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: { title: n.title, body: n.body, data: { route: ROUTE }, ...(n.category ? { categoryIdentifier: n.category } : {}), ...(ongoing ? { sticky: true, autoDismiss: false } : {}), ...(loud ? { sound: 'default' } : {}) },
    trigger: { channelId: loud ? LOUD_CHANNEL : CHANNEL },
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
