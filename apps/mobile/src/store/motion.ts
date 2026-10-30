import { traceLog } from '@/lib/motionTraceFile';
import { createMotionStore } from './motionCore';

/** What the rider is doing and whether they are reliably stopped, fed from the GPS watch and the accelerometer while a ride is recording. */
export const useMotion = createMotionStore(traceLog);
