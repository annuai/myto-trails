import { formatDate } from './dates';

const iso = (ms: number) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/** A journal is named after its ride. If the ride was never saved (a discarded recording), after its date. */
export const journalTitle = (rideKey: number, rides: { startedAt: number; name: string }[]) => rides.find((r) => r.startedAt === rideKey)?.name ?? `Ride on ${formatDate(iso(rideKey))}`;
export const journalDate = (rideKey: number) => formatDate(iso(rideKey));
