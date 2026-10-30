import { api } from './client';

// "I haven't arrived": a timer the server watches, and a link the rider's contact can open (docs/superpowers/specs/2026-10-28-ride-companion-features-design.md §4.1).
// Times are ISO 8601 instants.
export type CheckinStatus = 'active' | 'overdue' | 'arrived' | 'expired';
export type CheckinEmergency = { riderName?: string; bloodGroup?: string; allergies?: string; bikeName?: string };
export type CheckinPosition = { lat: number; lng: number; at: string };
export type CreateCheckin = { rideName?: string; /** IANA zone the ride happens in; the contact sees the expected time in it. */ timeZone?: string; expectedAt: string; contactName: string; contactEmail?: string; shareLive?: boolean; position?: CheckinPosition; emergency?: CheckinEmergency };
/** `token` and `url` are shown once: share the link, do not store the token. */
export type CreatedCheckin = { id: string; token: string; url: string };
export type CheckinDto = { id: string; status: CheckinStatus; expectedAt: string; arrivedAt: string | null; lastPingAt: string | null };

export const createCheckin = (token: string, body: CreateCheckin) => api<CreatedCheckin>('/checkins', { method: 'POST', token, body });
export const pingCheckin = (token: string, id: string, body: CheckinPosition & { batteryPct?: number }) => api<void>(`/checkins/${id}/ping`, { method: 'POST', token, body });
export const extendCheckin = (token: string, id: string, expectedAt: string) => api<void>(`/checkins/${id}/extend`, { method: 'POST', token, body: { expectedAt } });
export const arriveCheckin = (token: string, id: string) => api<void>(`/checkins/${id}/arrive`, { method: 'POST', token });
export const getCheckin = (token: string, id: string) => api<CheckinDto>(`/checkins/${id}`, { token });
