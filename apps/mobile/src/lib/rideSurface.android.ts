import * as Notifications from 'expo-notifications';
import { AndroidImportance, AndroidNotificationVisibility } from 'expo-notifications';
import RideCard from '@/features/rideSurface/RideCard.tokens';
import type { RideSurfaceProps } from './rideActions';
import { allowed } from './rideNotification';

export { onSurfaceAction } from './rideSurfaceEvents';

const ID = 'ride-controls';
// A channel's settings cannot be changed once it exists, so the version is in the name. The first channel was "silent", which Android keeps off the lock screen.
const CHANNEL = 'ride-card-v2';
let channel: Promise<unknown> | undefined;
/** Shown on the lock screen and in the main part of the shade, but without a sound or a buzz; updates never alert again (`alertOnlyOnce`). */
const ensureChannel = () => (channel ??= Notifications.setNotificationChannelAsync(CHANNEL, {
  name: 'Ride card', importance: AndroidImportance.DEFAULT, sound: null, enableVibrate: false, showBadge: false, lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
}));

/** Posts the ongoing ride card or updates it in place. False when it cannot be shown (notifications refused). */
export async function showRideSurface(p: RideSurfaceProps): Promise<boolean> {
  try {
    await ensureChannel();
    if (!(await allowed())) return false;
    const live = await RideCard.get(ID);
    if (live) await live.update(p, { ongoing: true });
    else await RideCard.post(p, { id: ID, channelId: CHANNEL, ongoing: true, alertOnlyOnce: true, autoCancel: false, url: 'myto://ride/live', title: p.title });
    return true;
  } catch {
    return false;
  }
}

export async function clearRideSurface(): Promise<void> {
  const live = await RideCard.get(ID).catch(() => null);
  await live?.cancel().catch(() => undefined);
}
