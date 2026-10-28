import { api } from './client';
import type { GroupRiderView, GroupStatus } from '@/lib/groupCore';

// Group rides: a six-character code, one live map, a regroup pin (§4.2). Positions are ISO 8601 instants.
export type { GroupStatus };
export type GroupRide = { id: string; code: string; name: string; expiresAt: string };
export type JoinedGroup = { id: string; name: string; role: string };
export type GroupRegroup = { lat: number; lng: number; note: string | null };
export type GroupSync = { riders: GroupRiderView[]; regroup: GroupRegroup | null; ended: boolean; /** This rider's own handle in `riders`. */ me: string };
export type SyncBody = { lat?: number; lng?: number; at?: string; status?: GroupStatus };

export const createGroupRide = (token: string, body: { name: string; clubId?: string }) => api<GroupRide>('/group-rides', { method: 'POST', token, body });
export const joinGroupRide = (token: string, body: { code: string; displayName: string }) => api<JoinedGroup>('/group-rides/join', { method: 'POST', token, body });
/** Sends this rider's position and signal and returns everyone's: one round trip per poll. */
export const syncGroupRide = (token: string, id: string, body: SyncBody) => api<GroupSync>(`/group-rides/${id}/sync`, { method: 'POST', token, body });
/** The leader's meeting point. Pass `null` to remove it. */
export const setRegroup = (token: string, id: string, pin: { lat: number; lng: number; note?: string } | null) => api<void>(`/group-rides/${id}/regroup`, { method: 'POST', token, body: pin ?? { clear: true } });
export const leaveGroupRide = (token: string, id: string) => api<void>(`/group-rides/${id}/leave`, { method: 'POST', token });
export const endGroupRide = (token: string, id: string) => api<void>(`/group-rides/${id}/end`, { method: 'POST', token });
