// The words shown for event answers and reasons.

import type { DeclineReason, EventResponse, RideEvent } from '@/api/types';
import { formatRideWhen } from '@/lib/community';

/** The words for each reason for declining. */
export const REASON_LABEL: Record<DeclineReason, string> = { work: 'Work came up', bike: 'Bike in service', distance: 'Too far', other: 'Something else' };
/** The reasons in the order they are offered. */
export const REASONS: DeclineReason[] = ['work', 'bike', 'distance', 'other'];
/** The words for each answer to an invitation. */
export const RESPONSE_LABEL: Record<EventResponse, string> = { going: 'Going', maybe: 'Maybe', declined: 'Can’t make it', waitlisted: 'On the waitlist' };

/** "Sun, 7 Jun · 6:30 AM · Nandi Hills gate" */
export const whenAndWhere = (e: Pick<RideEvent, 'startsAt' | 'placeName'>) => `${formatRideWhen(e.startsAt)} · ${e.placeName}`;

/** The short value at the end of a list row: your own answer if you gave one, otherwise how many are going. */
export function rowValue(e: RideEvent): string {
  if (e.status === 'live') return 'Live now';
  if (e.mine) return 'You host';
  if (e.myResponse === 'going' || e.myResponse === 'maybe' || e.myResponse === 'waitlisted') return RESPONSE_LABEL[e.myResponse];
  return e.capacity ? `${e.going} of ${e.capacity}` : `${e.going} going`;
}
