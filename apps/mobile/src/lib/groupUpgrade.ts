import type { GroupCapacity } from '@/api/groups';

type Option = GroupCapacity['upgrades'][number];

/** Whole rupees when the price is whole ("₹99"), else with paise. Prices come from the server's configuration. */
export function rupees(paise: number): string {
  const r = paise / 100;
  return `₹${Number.isInteger(r) ? r : r.toFixed(2)}`;
}

export const OPTION_TITLE: Record<Option['plan'], string> = { large_ride_pass: 'Large Ride Pass', organiser: 'Myto Organiser' };

/** One line per option: the size it gives, the price and what it covers. Never says "buy": nothing can be bought until a billing provider is wired in. */
export function optionLine(o: Option): string {
  return o.plan === 'large_ride_pass' ? `Up to ${o.limit} riders on this ride, ${rupees(o.pricePaise)} once` : `Up to ${o.limit} riders on every ride you lead, ${rupees(o.pricePaise)} a month`;
}

/** Whether the ride has no room. A full ride with nothing to upgrade to is just full, so no prompt. */
export const needsUpgradePrompt = (c: GroupCapacity | undefined): c is GroupCapacity => !!c && c.used >= c.limit && c.upgrades.length > 0;
