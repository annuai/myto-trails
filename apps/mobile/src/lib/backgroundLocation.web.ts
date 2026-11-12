/** A browser tab cannot keep recording once it is hidden, so there is no background task on the web. */
export const TASK_NAME = 'myto-ride-recording';
export const requestRideLocationAccess = async (): Promise<'always' | 'foreground' | 'denied'> => 'foreground';
export const startBackground = async (): Promise<boolean> => false;
export const stopBackground = async (): Promise<void> => undefined;
/** A browser cannot grant background location, so there it reads as already allowed and nothing is asked. */
export const rideLocationAccess = async (): Promise<'always' | 'foreground' | 'denied' | 'unknown'> => 'always';
export const needsAlwaysExplainer = async (): Promise<boolean> => false;
export const setRecordingProfile = async (_p: 'full' | 'saver' | 'idle'): Promise<void> => undefined;
export const activeRecordingProfile = (): 'full' | 'saver' | 'idle' => 'full';
