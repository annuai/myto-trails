import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LatLng } from '@/lib/geo';
import { ApiFailure, api } from './client';
import { toLatLng, type BikeMakeList, type BikeModelPage, type ClubDetail, type ClubJoinRequest, type ClubPost, type ClubSummary, type Me, type RouteDto, type SavedItem, type SearchResult, type TrailComment, type TrailDetail } from './types';
import { useAuth } from '@/store/auth';
import { useTrailStore } from '@/store/trails';

type Async<T> = { data?: T; error?: string; loading: boolean; reload: () => void };
const cache = new Map<string, unknown>();

/** Fetch with a tiny in-memory cache, so going back to a screen shows the last result at once and refreshes behind it. */
function useFetch<T>(key: string | null, load: (signal: AbortSignal) => Promise<T>): Async<T> {
  const [state, set] = useState<{ data?: T; error?: string; loading: boolean }>({ data: key ? (cache.get(key) as T | undefined) : undefined, loading: !!key });
  const [tick, setTick] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;
  useEffect(() => {
    if (!key) return set({ loading: false });
    const ctl = new AbortController();
    set((s) => ({ data: (cache.get(key) as T | undefined) ?? s.data, loading: true }));
    loadRef.current(ctl.signal)
      .then((data) => { cache.set(key, data); set({ data, loading: false }); })
      .catch((e: unknown) => { if (!ctl.signal.aborted) set((s) => ({ data: s.data, loading: false, error: e instanceof ApiFailure ? e.message : 'Something went wrong.' })); });
    return () => ctl.abort();
  }, [key, tick]);
  return { ...state, reload: useCallback(() => setTick((n) => n + 1), []) };
}

export function useTrailSearch(q: string): Async<SearchResult> {
  const params = new URLSearchParams();
  if (q.trim()) params.set('q', q.trim());
  return useFetch(`search:${params}`, (signal) => api<SearchResult>(`/trails?${params}`, { signal }));
}

/** One trail. When the network fails, a downloaded copy is used if there is one. */
export function useTrail(slug: string): Async<{ detail: TrailDetail; route: RouteDto | null }> & { fromOffline: boolean } {
  const offline = useTrailStore((s) => s.offline[slug]);
  const r = useFetch(`trail:${slug}`, async (signal) => {
    const [detail, route] = await Promise.all([api<TrailDetail>(`/trails/${slug}`, { signal }), api<RouteDto>(`/trails/${slug}/route`, { signal }).catch(() => null)]);
    return { detail, route };
  });
  if (!r.data && r.error && offline) return { ...r, data: { detail: offline.detail, route: offline.route }, error: undefined, fromOffline: true };
  return { ...r, fromOffline: false };
}

export function useSaved(): Async<SavedItem[]> {
  const token = useAuth((s) => s.token);
  return useFetch(token ? 'saved' : null, async (signal) => (await api<{ items: SavedItem[] }>('/me/saved', { token, signal })).items);
}

export async function setSaved(slug: string, saved: boolean, token: string) {
  await api(`/me/saved/${slug}`, { method: saved ? 'PUT' : 'DELETE', token });
  cache.delete('saved');
}

/** The published route of a trail, from the offline copy when there is one. Used to show the planned route while riding. */
export function useRouteLine(slug?: string): LatLng[] | undefined {
  const off = useTrailStore((s) => (slug ? s.offline[slug]?.route : null));
  const r = useFetch<RouteDto>(slug && !off ? `route:${slug}` : null, (signal) => api<RouteDto>(`/trails/${slug}/route`, { signal }));
  const dto = off ?? r.data;
  return useMemo(() => (dto ? toLatLng(dto.line) : undefined), [dto]);
}

/** The signed-in rider, with profile picture and bike. */
export function useMe(): Async<Me> {
  const token = useAuth((s) => s.token);
  return useFetch(token ? 'me' : null, (signal) => api<Me>('/me', { token, signal }));
}

export function useClubs(): Async<ClubSummary[]> {
  const token = useAuth((s) => s.token);
  return useFetch(token ? 'clubs' : null, async (signal) => (await api<{ items: ClubSummary[] }>('/clubs', { token, signal })).items);
}

export function useClub(id: string): Async<ClubDetail> {
  const token = useAuth((s) => s.token);
  return useFetch(token ? `club:${id}` : null, (signal) => api<ClubDetail>(`/clubs/${id}`, { token, signal }));
}

/** A club's posts and ride plans. Members only: pass `enabled` false for anyone else. */
export function useClubPosts(id: string, enabled: boolean): Async<ClubPost[]> {
  const token = useAuth((s) => s.token);
  return useFetch(token && enabled ? `club:${id}:posts` : null, async (signal) => (await api<{ posts: ClubPost[] }>(`/clubs/${id}/posts`, { token, signal })).posts);
}

/** Join requests with phone numbers. Club admins only. */
export function useClubRequests(id: string, enabled: boolean): Async<ClubJoinRequest[]> {
  const token = useAuth((s) => s.token);
  return useFetch(token && enabled ? `club:${id}:requests` : null, async (signal) => (await api<{ items: ClubJoinRequest[] }>(`/clubs/${id}/requests`, { token, signal })).items);
}

/** A trail's comments. Public; when signed in, the rider's own comments awaiting a moderator are included. */
export function useTrailComments(slug: string): Async<TrailComment[]> {
  const token = useAuth((s) => s.token);
  // Comments are public: a token only adds the rider's own comments awaiting approval. If it is no longer valid, read without it.
  return useFetch(`comments:${slug}:${token ? 'in' : 'out'}`, async (signal) => {
    const get = (t: string | null) => api<{ items: TrailComment[] }>(`/trails/${slug}/comments`, { token: t, signal });
    try { return (await get(token)).items; }
    catch (e) { if (token && e instanceof ApiFailure && e.status === 401) return (await get(null)).items; throw e; }
  });
}

/** Forget a trail's cached comments after posting, editing or deleting one. */
export function forgetComments(slug: string) {
  for (const k of [...cache.keys()]) if (k.startsWith(`comments:${slug}:`)) cache.delete(k);
}

/** Forget cached profile and club screens after an edit, so they reload. */
export function forgetProfile() {
  for (const k of [...cache.keys()]) if (k === 'me' || k === 'clubs' || k.startsWith('club:')) cache.delete(k);
}

/** One page of the bike catalogue (only models that have a picture). Public, so no token. */
export function useBikeModels(o: { q: string; make: string | null; category: string | null; page: number }): Async<BikeModelPage> {
  const params = new URLSearchParams();
  if (o.q.trim()) params.set('q', o.q.trim());
  if (o.make) params.set('make', o.make);
  if (o.category) params.set('category', o.category);
  if (o.page > 1) params.set('page', String(o.page));
  return useFetch(`bikes:${params}`, (signal) => api<BikeModelPage>(`/bikes?${params}`, { signal }));
}

export function useBikeMakes(): Async<BikeMakeList['items']> {
  return useFetch('bikes:makes', async (signal) => (await api<BikeMakeList>('/bikes/makes', { signal })).items);
}
