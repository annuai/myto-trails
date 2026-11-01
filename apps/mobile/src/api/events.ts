import { api } from './client';
import type { DeclineReason, EventInput, EventResponse, EventRole, RideEvent, RideEventDetail } from '@moto-trails/domain';

// Ride events: announced by a rider or a club, answered with going, maybe or "can't make it", checked into at the meeting point,
// then started by the host as a group ride.
export type { DeclineReason, EventInput, EventResponse, EventRole, RideEvent, RideEventDetail };
export type EventScope = 'discover' | 'club' | 'mine';

export const listEvents = (token: string, scope: EventScope, clubId?: string) =>
  api<{ items: RideEvent[] }>(`/events?scope=${scope}${clubId ? `&clubId=${clubId}` : ''}`, { token });
export const getEvent = (token: string, id: string) => api<RideEventDetail>(`/events/${id}`, { token });
export const createEvent = (token: string, body: EventInput) => api<{ id: string }>('/events', { method: 'POST', token, body });
export const respondToEvent = (token: string, id: string, body: { response: 'going' | 'maybe' | 'declined'; reason?: DeclineReason; note?: string }) =>
  api<{ response: EventResponse }>(`/events/${id}/response`, { method: 'PUT', token, body });
export const checkInEvent = (token: string, id: string, body: { lat: number; lng: number; accuracyM: number }) =>
  api<{ rideLive: boolean }>(`/events/${id}/check-in`, { method: 'POST', token, body });
export const markArrived = (token: string, id: string, riderId: string) => api<void>(`/events/${id}/arrived/${riderId}`, { method: 'POST', token });
export const setEventRole = (token: string, id: string, riderId: string, role: EventRole | null) => api<void>(`/events/${id}/roles/${riderId}`, { method: 'PUT', token, body: { role } });
export const startEvent = (token: string, id: string, stretchKm?: number) => api<void>(`/events/${id}/start`, { method: 'POST', token, body: stretchKm ? { stretchKm } : {} });
export const joinEventRide = (token: string, id: string) => api<{ id: string; name: string; code: string; role: 'leader' | 'member' }>(`/events/${id}/join-ride`, { method: 'POST', token });
export const cancelEvent = (token: string, id: string) => api<void>(`/events/${id}/cancel`, { method: 'POST', token });
