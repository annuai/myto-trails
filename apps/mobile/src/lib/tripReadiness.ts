import type { Status } from '@/ui/Chip';
import type { TripRoute } from './tripPlan';

export type TripCheck = { label: string; status: Status; word: string; go?: string };

/**
 * What the pre-ride list says about the trip that is under way: whether today has a route and how much of the pack list is done.
 * These are reminders. Nothing here says a ride is safe, and none of it stops a ride from starting.
 */
export function tripChecks(t: { route?: TripRoute; pack: { total: number; done: number } }): TripCheck[] {
  const { total, done } = t.pack;
  return [
    t.route ? { label: 'Route today', status: 'good', word: t.route.name } : { label: 'Route today', status: 'caution', word: 'None chosen' },
    total === 0 ? { label: 'Pack list', status: 'caution', word: 'No list' }
      : done >= total ? { label: 'Pack list', status: 'good', word: 'All packed' }
      : { label: 'Pack list', status: 'caution', word: `${done} of ${total} packed` },
  ];
}
