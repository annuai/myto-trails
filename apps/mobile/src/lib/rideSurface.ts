import type { RideActionId, RideSurfaceProps } from './rideActions';

/**
 * The ride card that is always on screen: a Live Activity on iPhone (lock screen and Dynamic Island), an ongoing notification on
 * Android. This is the stand-in for the browser, which has neither; rideSurface.ios.ts and rideSurface.android.ts are the real ones.
 * `show` says whether the card is up, and when it is not the ordinary ride notification is used instead.
 */
export const showRideSurface = async (_p: RideSurfaceProps): Promise<boolean> => false;
export const clearRideSurface = async (): Promise<void> => {};
export const onSurfaceAction = (_on: (id: RideActionId) => void): (() => void) => () => {};
