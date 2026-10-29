import type { RideActionId, RideCategory, RideNotice } from './rideActions';

/** The browser build has no phone notifications. */
export const showRideNotice = async (_id: string, _n: RideNotice & { category?: RideCategory }, _ongoing: boolean, _loud?: boolean): Promise<void> => {};
export const clearRideNotice = async (_id: string): Promise<void> => {};
export const onRideAction = (_on: (id: RideActionId) => void): (() => void) => () => {};
