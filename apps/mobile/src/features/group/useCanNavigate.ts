import { useMotion } from '@/store/motion';
import { useRecorder } from '@/store/recorder';

/**
 * Opening a map to navigate is for when the bike has stopped (or the ride is paused, or none is recording), the same rule as typing:
 * a rider should never be picking a route with a thumb while moving.
 */
export function useCanNavigate(): boolean {
  const riding = useRecorder((s) => s.status === 'running');
  const paused = useRecorder((s) => s.paused);
  const stopped = useMotion((s) => s.stopped);
  return !riding || paused || stopped;
}
