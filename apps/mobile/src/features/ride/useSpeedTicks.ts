import { useEffect, useRef } from 'react';
import { bandsCrossed, SPEED_BAND } from '@/lib/feedbackPlan';
import { buzz } from '@/lib/haptics';

/**
 * A soft tick each time the speed on screen passes a multiple of 10, up or down, like a speedometer's detents. `shown` is the figure the rider
 * reads (null or not a number when there is none, which never ticks, so a speed that comes back after a gap does not click).
 * Off while paused, and when the rider turned speed ticks off (see `buzz.speed`).
 */
export function useSpeedTicks(shown: number | null, active: boolean): void {
  const prev = useRef<number | null>(null);
  useEffect(() => {
    const now = shown !== null && Number.isFinite(shown) ? shown : null;
    if (active && bandsCrossed(prev.current, now, SPEED_BAND) > 0) buzz.speed();
    prev.current = active ? now : null;
  }, [shown, active]);
}
