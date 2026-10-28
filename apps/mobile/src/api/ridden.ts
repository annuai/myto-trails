import { api } from './client';

/** "I've ridden here": a rider's own list of trails, kept on the server so it follows them to a new phone. */
export type RiddenTrail = { slug: string; name: string; riddenMonth: string | null; bike: string | null; markedAt: string };
export type RiddenDetails = { month?: string; bike?: string; note?: string };

export const markRidden = (token: string, slug: string, body: RiddenDetails = {}) => api<void>(`/trails/${slug}/ridden`, { method: 'PUT', token, body });
export const unmarkRidden = (token: string, slug: string) => api<void>(`/trails/${slug}/ridden`, { method: 'DELETE', token });
export const listMyRidden = async (token: string) => (await api<{ items: RiddenTrail[] }>('/me/ridden', { token })).items;
