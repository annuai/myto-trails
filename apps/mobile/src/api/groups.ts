import { api } from './client';
import type { EventRole } from './types';
import type { GroupRiderView, GroupStatus } from '@/lib/groupCore';

// Group rides: a six-character code, one live map, a regroup pin (§4.2). Positions are ISO 8601 instants.
export type { GroupStatus };
export type GroupRide = { id: string; code: string; name: string; expiresAt: string };
export type JoinedGroup = { id: string; name: string; role: string };
export type GroupRegroup = { lat: number; lng: number; note: string | null };
export type GroupSync = { /** The leader's backup (a rider's id); sent to the leader only. */ successor?: string | null; /** The leader is out of contact and this rider may take the lead. */ canTakeLead?: boolean; /** The lead was taken from this rider while they were out of contact, and they may take it back. */ canTakeBack?: boolean; riders: GroupRiderView[]; regroup: GroupRegroup | null; ended: boolean; /** This rider's own handle in `riders`. */ me: string; /** Distance in km after which the leader is warned that the group is stretched. */ stretchKm?: number };
export type SyncBody = { lat?: number; lng?: number; at?: string; status?: GroupStatus; /** This phone's battery, 0 to 100, and whether it is charging: the server uses it to tell a dead phone from lost signal. */ battery?: number; charging?: boolean };

export const createGroupRide = (token: string, body: { name: string; clubId?: string }) => api<GroupRide>('/group-rides', { method: 'POST', token, body });
/** The group ride a club's riders can join right now, or null. Club members only. */
export const getClubGroupRide = (token: string, clubId: string) => api<{ ride: { id: string; name: string; code: string } | null }>(`/clubs/${clubId}/group-ride`, { token });
export const joinGroupRide = (token: string, body: { code: string; displayName: string }) => api<JoinedGroup>('/group-rides/join', { method: 'POST', token, body });
/** Sends this rider's position and signal and returns everyone's: one round trip per poll. */
export const syncGroupRide = (token: string, id: string, body: SyncBody) => api<GroupSync>(`/group-rides/${id}/sync`, { method: 'POST', token, body });
/** The leader's meeting point. Pass `null` to remove it. */
export const setRegroup = (token: string, id: string, pin: { lat: number; lng: number; note?: string } | null) => api<void>(`/group-rides/${id}/regroup`, { method: 'POST', token, body: pin ?? { clear: true } });
/** The leader sets a rider's titles: any of captain, marshal, medic, sweep together, or none. Everyone sees them on their next sync. */
export const setRiderTitles = (token: string, id: string, body: { rider: string; titles: EventRole[] }) => api<void>(`/group-rides/${id}/titles`, { method: 'POST', token, body });
/** Leaves the ride. The leader must pass the lead in the same step, with `successor` (a rider's id); without it a leader cannot leave. */
export const leaveGroupRide = (token: string, id: string, successor?: string) => api<void>(`/group-rides/${id}/leave`, { method: 'POST', token, ...(successor ? { body: { successor } } : {}) });
/** The leader passes the lead to a rider, at once. */
export const passLead = (token: string, id: string, rider: string) => api<void>(`/group-rides/${id}/leader`, { method: 'POST', token, body: { rider } });
/** The leader names the rider who leads if their phone dies; `null` clears it. */
export const setSuccessor = (token: string, id: string, rider: string | null) => api<void>(`/group-rides/${id}/successor`, { method: 'POST', token, body: { rider } });
/** The backup, a marshal or a captain takes the lead from a leader who has been out of contact for 15 minutes. */
export const takeLead = (token: string, id: string) => api<void>(`/group-rides/${id}/leader/take`, { method: 'POST', token });
/** A leader the lead was taken from, because they dropped off, takes it back. */
export const takeBackLead = (token: string, id: string) => api<void>(`/group-rides/${id}/leader/back`, { method: 'POST', token });
export const endGroupRide = (token: string, id: string) => api<void>(`/group-rides/${id}/end`, { method: 'POST', token });
