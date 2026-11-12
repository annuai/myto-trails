import { useCallback, useEffect, useState } from 'react';
import type { ChallengeProgress, ProgressSnapshot, TrailmarkAction } from '@moto-trails/domain';
import { useAuth } from '@/store/auth';
import { ApiFailure, api } from './client';

/** What GET /me/trailmarks answers. Challenge progress arrives with dates already read, so the phone only shows it. */
export type MyTrailmarks = {
  total: number;
  /** Trailmarks are not money or crypto; the server words this so the phone and the web say the same thing. */
  note: string;
  recent: { action: TrailmarkAction; label: string; points: number; at: string }[];
  snapshot: ProgressSnapshot;
  challenges: ChallengeProgress[];
  leaderboardOptIn: boolean;
};

export const getTrailmarks = (token: string, signal?: AbortSignal) => api<MyTrailmarks>('/me/trailmarks', { token, signal });
export const setChallengeJoined = (token: string, id: string, joined: boolean) => api<void>(`/me/challenges/${id}`, { method: joined ? 'PUT' : 'DELETE', token });
export const setLeaderboardOptIn = (token: string, optIn: boolean) => api<void>('/me/leaderboard-opt-in', { method: 'PUT', token, body: { optIn } });

/** The rider's own Trailmarks and challenge progress. `data` stays undefined when signed out or offline: the screen then says what it is waiting for. */
export function useTrailmarks() {
  const token = useAuth((s) => s.token);
  const [state, set] = useState<{ data?: MyTrailmarks; error?: string }>({});
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!token) return;
    const ctl = new AbortController();
    getTrailmarks(token, ctl.signal)
      .then((data) => set({ data }))
      .catch((e: unknown) => { if (!ctl.signal.aborted) set({ error: e instanceof ApiFailure ? e.message : 'Could not reach Moto Trails.' }); });
    return () => ctl.abort();
  }, [token, tick]);
  const reload = useCallback(() => setTick((n) => n + 1), []);
  return { signedIn: !!token, data: token ? state.data : undefined, error: token ? state.error : undefined, reload, token };
}
