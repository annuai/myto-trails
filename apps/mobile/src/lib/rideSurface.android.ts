import * as Notifications from 'expo-notifications';
import RideCard from '@/features/rideSurface/RideCard.tokens';
import type { RideSurfaceProps } from './rideActions';
import { allowed } from './rideNotification';

export { onSurfaceAction } from './rideSurfaceEvents';

const ID = 'ride-controls';
const CHANNEL = 'ride-card';
let channel: Promise<unknown> | undefined;
/** Quiet, so updating the card never beeps or pops up. */
const ensureChannel = () => (channel ??= Notifications.setNotificationChannelAsync(CHANNEL, { name: 'Ride card', importance: Notifications.AndroidImportance.LOW }));

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
