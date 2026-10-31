import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LatLng } from '@/lib/geo';
import { ApiFailure, api } from './client';
import { toLatLng, type BikeMakeList, type BikeModelPage, type ClubDetail, type ClubJoinRequest, type ClubPost, type ClubSummary, type Me, type RouteDto, type SavedItem, type SearchResult, type TrailComment, type TrailDetail } from './types';
import { cacheDelete, cacheDeleteWhere, cacheGet, cacheSet, clearUserCache, isFresh } from './cacheStore';
import { countryAt } from '@/lib/countryBoundaries';
import { useDebounced } from '@/lib/useDebounced';
import { countryQuery, resolveBrowsing } from '@/lib/browsing';
import { useAuth } from '@/store/auth';
import { useLocation } from '@/store/location';
import { homeCountry, useRegion } from '@/store/region';
import { fetchCountries, FALLBACK_COUNTRIES, type Country } from './countries';
import { useTrailStore } from '@/store/trails';

type Async<T> = { data?: T; error?: string; loading: boolean; reload: () => void };

// Signing out forgets the account's cached screens.
useAuth.subscribe((s, prev) => { if (prev.token && !s.token) clearUserCache(); });

/** Fetch with a tiny in-memory cache: going back to a screen shows the last result at once, and asks again only once it is five minutes old. `reload` always asks. */
function useFetch<T>(key: string | null, load: (signal: AbortSignal) => Promise<T>): Async<T> {
  const [state, set] = useState<{ data?: T; error?: string; loading: boolean }>({ data: key ? cacheGet<T>(key)?.data : undefined, loading: !!key });
  const [tick, setTick] = useState(0);
  const loadRef = useRef(load);
  const forceRef = useRef(false);
  useEffect(() => { loadRef.current = load; });
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- starting a request: it has to mark itself as loading before the answer comes back
    if (!key) return set({ loading: false });
    const force = forceRef.current;
    forceRef.current = false;
    if (!force && isFresh(key)) return set({ data: cacheGet<T>(key)?.data, loading: false });
    const ctl = new AbortController();
    set((s) => ({ data: cacheGet<T>(key)?.data ?? s.data, loading: true }));
    loadRef.current(ctl.signal)
      .then((data) => { cacheSet(key, data); set({ data, loading: false }); })
      .catch((e: unknown) => { if (!ctl.signal.aborted) set((s) => ({ data: s.data, loading: false, error: e instanceof ApiFailure ? e.message : 'Something went wrong.' })); });
    return () => ctl.abort();
  }, [key, tick]);
  return { ...state, reload: useCallback(() => { forceRef.current = true; setTick((n) => n + 1); }, []) };
}

/** Every country the website lists. Offline, or before the answer, India is the only one assumed open. */
export function useCountries(): Async<Country[]> & { data: Country[] } {
  const r = useFetch('countries', fetchCountries);
  return { ...r, data: r.data ?? FALLBACK_COUNTRIES };
}

/** The country the lists show: the home country (the rider's choice in settings, else their phone's region), else where GPS says they are, else null for every open country. */
export function useBrowsingCountry(): string | null {
  const home = useRegion(homeCountry);
  const fix = useLocation((s) => s.fix);
  const countries = useCountries().data;
  return resolveBrowsing({ home, countries, detected: fix ? countryAt(fix.lat, fix.lng) : null });
}

export function useTrailSearch(q: string): Async<SearchResult> {
  const params = new URLSearchParams(countryQuery(useBrowsingCountry()));
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
  cacheDelete('saved');
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

type ClubsPage = { items: ClubSummary[]; nextCursor: string | null };
/** The clubs the rider is in come in one go; every club is limited to the rider's own page by the server (100 at most). */
const MY_CLUBS_LIMIT = 100;
const OTHER_CLUBS_PAGE = 20;
const SEARCH_PAUSE_MS = 300;

/**
 * The club lists. `mine` are the clubs the rider is in. `others` are the rest, a page at a time: `loadMore` asks for the next page and
 * is safe to call again and again (it does nothing while a page is on its way or when there is no more). `text` is what the rider typed;
 * both lists are searched by the server (name or description) once they pause typing, so every club can be found, not only the
 * ones already loaded. While a new search loads, the previous results stay on screen.
 */
export function useClubs(text: string) {
  const token = useAuth((s) => s.token);
  const q = useDebounced(text.trim(), SEARCH_PAUSE_MS);
  const search = q ? `&q=${encodeURIComponent(q)}` : '';
  const mine = useFetch(token ? `clubs:mine:${q}` : null, async (signal) => (await api<ClubsPage>(`/clubs?scope=mine&limit=${MY_CLUBS_LIMIT}${search}`, { token, signal })).items);

  const [others, setOthers] = useState<{ items: ClubSummary[]; cursor: string | null; loading: boolean; loadingMore: boolean; error?: string; loaded: boolean }>({ items: [], cursor: null, loading: false, loadingMore: false, loaded: false });
  const [tick, setTick] = useState(0);
  /** Which request may still write its answer: a newer search or a reload makes an older one stale. */
  const generation = useRef(0);
  const inFlight = useRef(false);
  const cursorRef = useRef<string | null>(null);
  useEffect(() => { cursorRef.current = others.cursor; });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- starting a request: it has to mark itself as loading before the answer comes back
    if (!token) { setOthers({ items: [], cursor: null, loading: false, loadingMore: false, loaded: false }); return; }
    const gen = ++generation.current;
    const ctl = new AbortController();
    inFlight.current = true;
    setOthers((o) => ({ ...o, loading: true, error: undefined }));
    api<ClubsPage>(`/clubs?scope=others&limit=${OTHER_CLUBS_PAGE}${search}`, { token, signal: ctl.signal })
      .then((p) => { if (generation.current === gen) setOthers({ items: p.items, cursor: p.nextCursor, loading: false, loadingMore: false, loaded: true }); })
      .catch((e: unknown) => { if (!ctl.signal.aborted && generation.current === gen) setOthers((o) => ({ ...o, loading: false, error: e instanceof ApiFailure ? e.message : 'Something went wrong.' })); })
      .finally(() => { if (generation.current === gen) inFlight.current = false; });
    return () => ctl.abort();
  }, [token, q, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = useCallback(() => {
    const cursor = cursorRef.current;
    if (!token || !cursor || inFlight.current) return;
    const mineGen = generation.current;
    inFlight.current = true;
    setOthers((o) => ({ ...o, loadingMore: true, error: undefined }));
    api<ClubsPage>(`/clubs?scope=others&limit=${OTHER_CLUBS_PAGE}${search}&cursor=${encodeURIComponent(cursor)}`, { token })
      .then((p) => { if (generation.current === mineGen) setOthers((o) => ({ ...o, items: [...o.items, ...p.items], cursor: p.nextCursor, loadingMore: false })); })
      .catch((e: unknown) => { if (generation.current === mineGen) setOthers((o) => ({ ...o, loadingMore: false, error: e instanceof ApiFailure ? e.message : 'Something went wrong.' })); })
      .finally(() => { if (generation.current === mineGen) inFlight.current = false; });
  }, [token, search]);

  const reload = useCallback(() => { mine.reload(); setTick((n) => n + 1); }, [mine.reload]); // eslint-disable-line react-hooks/exhaustive-deps
  return { mine, others: { ...others, hasMore: others.cursor !== null, loadMore }, /** The words the lists are showing results for, which trail what was typed by the pause. */ searched: q, reload };
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
  cacheDeleteWhere((k) => k.startsWith(`comments:${slug}:`));
}

/** Forget cached profile and club screens after an edit, so they reload. */
export function forgetProfile() {
  cacheDeleteWhere((k) => k === 'me' || k === 'clubs' || k.startsWith('clubs:') || k.startsWith('club:'));
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
