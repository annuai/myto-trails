/** A browser tab cannot keep recording once it is hidden, so there is no background task on the web. */
export const TASK_NAME = 'myto-ride-recording';
/** Always foreground access on the web. */
export const requestRideLocationAccess = async (): Promise<'always' | 'foreground' | 'denied'> => 'foreground';
/** Never starts: false. */
export const startBackground = async (): Promise<boolean> => false;
/** Nothing to stop. */
export const stopBackground = async (): Promise<void> => undefined;
/** A browser cannot grant background location, so there it reads as already allowed and nothing is asked. */
export const rideLocationAccess = async (): Promise<'always' | 'foreground' | 'denied' | 'unknown'> => 'always';
/** The web never needs the explanation of 'always' location. */
export const needsAlwaysExplainer = async (): Promise<boolean> => false;
/** No recording profile to change. */
export const setRecordingProfile = async (_p: 'full' | 'saver' | 'idle'): Promise<void> => undefined;
/** The full profile, the only one the web has. */
export const activeRecordingProfile = (): 'full' | 'saver' | 'idle' => 'full';
