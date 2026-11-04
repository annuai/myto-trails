import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { isFixitContent, type FixitContent } from '@moto-trails/domain';
import { api } from '@/api/client';
import { storage } from '@/store/persist';
import { prefetchArt } from './artCache';

/** How long before the app asks the site again whether anything changed. The question is cheap, so it is short. */
export const REFRESH_AFTER_MS = 60 * 1000;

type State = { cached: FixitContent | null; fetchedAt: number; set: (c: FixitContent, at: number) => void; clear: () => void };

/** The guides, downloaded from the site and kept on the phone so they open with no signal. The app does not ship any guides itself: they all come from the site. */
export const useFixitCopy = create<State>()(persist((set) => ({ cached: null, fetchedAt: 0, set: (cached, fetchedAt) => set({ cached, fetchedAt }), clear: () => set({ cached: null, fetchedAt: 0 }) }), {
  name: 'myto-fixit-content', storage,
  // Version 2: copies kept before sections existed are dropped, so an app update fetches the current guides at once instead of waiting out the refresh time.
  version: 2,
  migrate: () => ({ cached: null, fetchedAt: 0 }) as never,
}));

/** The downloaded guides, or null until the phone has been online once. */
export const useFixitContent = (): FixitContent | null => useFixitCopy((s) => s.cached);

/** Whether a download is running, so a screen can say so. */
export const useFixitLoading = create<{ loading: boolean }>(() => ({ loading: false }));

/**
 * Downloads the latest guides (they are edited in the database) and keeps them. A reply that is not usable is ignored and the phone keeps
 * what it has. Offline or failing, nothing changes. Skips the request when the copy is recent, unless `force`. Returns whether the phone now has guides.
 */
export async function refreshFixit(now: number, force = false): Promise<boolean> {
  const { fetchedAt, cached, set } = useFixitCopy.getState();
  if (!force && cached && fetchedAt && now - fetchedAt < REFRESH_AFTER_MS) return true;
  if (useFixitLoading.getState().loading) return !!cached;
  useFixitLoading.setState({ loading: true });
  try {
    // Ask with the version the phone has: if nothing has changed the answer is a few bytes, so asking often is cheap and an edit or a new picture arrives within a minute.
    const fresh = await api<unknown>(cached?.version ? `/fixit?v=${encodeURIComponent(cached.version)}` : '/fixit');
    if (cached && (fresh as { unchanged?: boolean } | null)?.unchanged) { set(cached, now); return true; }
    if (!isFixitContent(fresh)) return !!cached;
    set(fresh, now);
    void prefetchArt(fresh);
    return true;
  } catch {
    return !!cached; // offline: keep what is on the phone
  } finally {
    useFixitLoading.setState({ loading: false });
  }
}
