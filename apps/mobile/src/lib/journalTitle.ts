import { formatDate } from './dates';

const iso = (ms: number) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/** A journal is named by the rider, else after its ride, else (when it belongs to no ride) by its date. */
export const journalTitle = (rideKey: number, rides: { startedAt: number; name: string }[], titles: Record<number, string>) => titles[rideKey] ?? rides.find((r) => r.startedAt === rideKey)?.name ?? journalDate(rideKey);
export const journalDate = (rideKey: number) => formatDate(iso(rideKey));
