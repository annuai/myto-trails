import { api } from './client';
import type { SharedRoutePayload } from '@/lib/shareRoute';

// A route shared as a link (§4.4). Build the body with `buildSharedRoute`, which trims the ends first.
export type { SharedRoutePayload };
export type SharedRouteDto = { name: string; points: [number, number][]; waypoints: { name: string; lat: number; lng: number }[]; distanceKm: number; elevationGainM: number | null };

/** Shares a route as a link. */
export const createSharedRoute = (token: string, body: SharedRoutePayload) => api<{ id: string; url: string }>('/shared-routes', { method: 'POST', token, body });
/** Reads a shared route by its id. Needs no sign-in. */
export const getSharedRoute = (id: string) => api<SharedRouteDto>(`/shared-routes/${id}`);
/** Deletes a route the rider shared. */
export const deleteSharedRoute = (token: string, id: string) => api<void>(`/shared-routes/${id}`, { method: 'DELETE', token });
