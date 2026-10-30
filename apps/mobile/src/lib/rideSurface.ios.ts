import type { LiveActivity } from 'expo-widgets';
import RideActivity from '@/features/rideSurface/RideActivity.tokens';
import type { RideSurfaceProps } from './rideActions';

export { onSurfaceAction } from './rideSurfaceEvents';

const OPEN = 'myto://ride/live';
let current: LiveActivity<RideSurfaceProps> | undefined;

/** The activity left from before the app was restarted, so it is updated rather than doubled. */
const existing = () => (current ??= RideActivity.getInstances()[0]);

/** Starts the Live Activity or updates it. False when it cannot be shown (Live Activities switched off in Settings, or too old an iOS). */
export async function showRideSurface(p: RideSurfaceProps): Promise<boolean> {
  try {
    const live = existing();
    if (live) await live.update(p);
    else current = RideActivity.start(p, OPEN);
    return true;
  } catch {
    current = undefined;
    return false;
  }
}

export async function clearRideSurface(): Promise<void> {
  const all = new Set([existing(), ...RideActivity.getInstances()]);
  current = undefined;
  await Promise.all([...all].filter((a): a is LiveActivity<RideSurfaceProps> => !!a).map((a) => a.end('immediate').catch(() => undefined)));
}
