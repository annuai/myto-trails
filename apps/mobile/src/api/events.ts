import { api } from './client';
import type { DeclineReason, EventInput, EventResponse, EventRole, RideEvent, RideEventDetail } from '@moto-trails/domain';

// Ride events: announced by a rider or a club, answered with going, maybe or "can't make it", checked into at the meeting point,
// then started by the host as a group ride.
export type { DeclineReason, EventInput, EventResponse, EventRole, RideEvent, RideEventDetail };
export type EventScope = 'discover' | 'club' | 'mine';

/** Upcoming events for a scope: discover, one club or mine. */
export const listEvents = (token: string, scope: EventScope, clubId?: string) =>
  api<{ items: RideEvent[] }>(`/events?scope=${scope}${clubId ? `&clubId=${clubId}` : ''}`, { token });
/** One event with the rider's own state. */
export const getEvent = (token: string, id: string) => api<RideEventDetail>(`/events/${id}`, { token });
/** Creates an event. */
export const createEvent = (token: string, body: EventInput) => api<{ id: string }>('/events', { method: 'POST', token, body });
/** Answers an invitation: going, maybe or declined, with an optional reason. */
export const respondToEvent = (token: string, id: string, body: { response: 'going' | 'maybe' | 'declined'; reason?: DeclineReason; note?: string }) =>
  api<{ response: EventResponse }>(`/events/${id}/response`, { method: 'PUT', token, body });
/** Checks in at the start place with the phone's position and its accuracy. */
export const checkInEvent = (token: string, id: string, body: { lat: number; lng: number; accuracyM: number }) =>
  api<{ rideLive: boolean }>(`/events/${id}/check-in`, { method: 'POST', token, body });
/** Marks another rider as arrived. */
export const markArrived = (token: string, id: string, riderId: string) => api<void>(`/events/${id}/arrived/${riderId}`, { method: 'POST', token });
/** Gives a rider a job on the event, or takes it away. */
export const setEventRole = (token: string, id: string, riderId: string, role: EventRole | null) => api<void>(`/events/${id}/roles/${riderId}`, { method: 'PUT', token, body: { role } });
/** Starts the event's group ride, with an optional stretch limit. */
export const startEvent = (token: string, id: string, stretchKm?: number) => api<void>(`/events/${id}/start`, { method: 'POST', token, body: stretchKm ? { stretchKm } : {} });
/** Joins the event's group ride. */
export const joinEventRide = (token: string, id: string) => api<{ id: string; name: string; code: string; role: 'leader' | 'member' }>(`/events/${id}/join-ride`, { method: 'POST', token });
/** Cancels an event. */
export const cancelEvent = (token: string, id: string) => api<void>(`/events/${id}/cancel`, { method: 'POST', token });
/** Sets or clears the event's cover picture. */
export const setEventCover = (token: string, id: string, mediaId: string | null) => api<{ coverUrl: string | null }>(`/events/${id}/cover`, { method: 'PUT', token, body: { mediaId } });
