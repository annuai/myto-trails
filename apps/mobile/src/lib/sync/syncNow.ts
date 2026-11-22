import { ApiFailure } from '@/api/client';
import { eraseCloudCopy, syncApi } from '@/api/sync';
import { useAuth } from '@/store/auth';
import { resetSync, useSync } from '@/store/sync';
import { syncAdapters } from './adapters';
import { runSync } from './runSync';
import { scan } from './syncCore';
import { useRides } from '@/store/rides';
import { useTodos } from '@/store/todos';
import { useTrips } from '@/store/trips';

/** Every store sync reads. Until they have all been read from the phone, an empty one is not the real one, so nothing is compared or sent. */
export const syncStores = [useSync, useRides, useTodos, useTrips, useAuth] as const;
const loaded = () => syncStores.every((s) => s.persist.hasHydrated());

let running = false;

/** The words for a failed round: what the rider can do about it, not a status code. */
export function syncErrorText(e: unknown): { text: string; blocked: 'scope' | null } {
  if (e instanceof ApiFailure) {
    if (e.status === 403 && e.code === 'insufficient_scope') return { text: 'Sign out and sign in again to turn on sync.', blocked: 'scope' };
    if (e.status === 401) return { text: 'You have been signed out. Sign in to keep syncing.', blocked: null };
    if (e.status === 0) return { text: 'No signal. Sync will try again.', blocked: null };
    return { text: e.message, blocked: null };
  }
  return { text: e instanceof Error ? e.message : 'Sync failed.', blocked: null };
}

/** One sync round. Does nothing when sync is off, nobody is signed in, or a round is already running. Never throws. */
export async function syncNow(): Promise<void> {
  const token = useAuth.getState().token;
  if (!token || running || !loaded() || !useSync.getState().enabled) return;
  running = true;
  try {
    await runSync({ api: syncApi(token), adapters: syncAdapters, get: () => useSync.getState(), set: (s) => useSync.setState(s), now: Date.now });
  } catch (e) {
    const { text, blocked } = syncErrorText(e);
    useSync.setState({ lastError: text, ...(blocked ? { blocked } : {}) });
  } finally { running = false; }
}

/** Looks for local changes without going to the network, so "waiting to sync" is right straight after an edit. */
export function scanNow(): void {
  const s = useSync.getState();
  if (s.enabled && loaded()) useSync.setState(scan(s, syncAdapters, Date.now()));
}

/** Turns sync on, clears any error and runs it once. */
export async function enableSync(): Promise<void> {
  useSync.setState({ enabled: true, lastError: null, blocked: null });
  await syncNow();
}

/** Turns sync off. With `eraseCloud` the rider's copy on the server is deleted too; the phones keep their own data either way. */
export async function disableSync(opts: { eraseCloud: boolean }): Promise<void> {
  const token = useAuth.getState().token;
  if (opts.eraseCloud && token) await eraseCloudCopy(token);
  resetSync();
}
