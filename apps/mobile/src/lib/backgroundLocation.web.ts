/** A browser tab cannot keep recording once it is hidden, so there is no background task on the web. */
export const TASK_NAME = 'myto-ride-recording';
export const requestRideLocationAccess = async (): Promise<'always' | 'foreground' | 'denied'> => 'foreground';
export const startBackground = async (): Promise<boolean> => false;
export const stopBackground = async (): Promise<void> => undefined;
export const needsAlwaysExplainer = async (): Promise<boolean> => false;
