import { API_BASE } from './config';
import { ApiFailure, REQUEST_TIMEOUT_MS, api } from './client';
import type { SyncApi } from '@/lib/sync/runSync';
import type { PushResult } from '@/lib/sync/syncCore';

export type SyncUsage = { rides: number; trackBytes: number; maxRides: number; maxTrackBytes: number };

/** A ride's points are raw bytes, not JSON, so they bypass `api()`. */
async function bytes(path: string, token: string, init: { method: 'GET' | 'PUT'; body?: Uint8Array }): Promise<Response> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), REQUEST_TIMEOUT_MS * 2);
  try {
    return await fetch(`${API_BASE}${path}`, {
      method: init.method, signal: ctl.signal,
      headers: { authorization: `Bearer ${token}`, ...(init.body ? { 'content-type': 'application/octet-stream' } : {}) },
      body: init.body as BodyInit | undefined,
    });
  } catch {
    throw new ApiFailure(0, 'network', 'Cannot reach Moto Trails. Check your connection.');
  } finally { clearTimeout(timer); }
}

export const syncApi = (token: string): SyncApi => ({
  push: (deviceId, changes) => api<PushResult>('/sync/push', { method: 'POST', body: { deviceId, changes }, token }),
  pull: ({ deviceId, since, limit }) => api(`/sync/pull?deviceId=${encodeURIComponent(deviceId)}&limit=${limit}${since ? `&since=${encodeURIComponent(since)}` : ''}`, { token }),
  async putTrack(rideId, body) {
    const res = await bytes(`/sync/rides/${encodeURIComponent(rideId)}/track`, token, { method: 'PUT', body });
    if (res.status === 204) return 'ok';
    if (res.status === 404) return 'no_such_ride';
    if (res.status === 409) return 'over_quota';
    if (res.status === 413) return 'too_large';
    throw new ApiFailure(res.status, 'error', `The ride's route could not be saved (${res.status}).`);
  },
  async getTrack(rideId) {
    const res = await bytes(`/sync/rides/${encodeURIComponent(rideId)}/track`, token, { method: 'GET' });
    if (res.status === 404) return null;
    if (!res.ok) throw new ApiFailure(res.status, 'error', `The ride's route could not be fetched (${res.status}).`);
    return new Uint8Array(await res.arrayBuffer());
  },
});

export const getSyncUsage = (token: string) => api<SyncUsage>('/sync/usage', { token });
/** Deletes the rider's cloud copy. Their phones keep their own data. */
export const eraseCloudCopy = (token: string) => api<void>('/sync', { method: 'DELETE', token });
