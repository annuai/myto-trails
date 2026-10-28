import { createMotionStore } from './motionCore';

/** Whether the vehicle is reliably stopped, fed from the GPS watch while a ride is recording. */
export const useMotion = createMotionStore();
