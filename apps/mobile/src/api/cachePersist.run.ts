import AsyncStorage from '@react-native-async-storage/async-storage';
import { cacheEntries, cacheRestore, onCacheSet } from './cacheStore';
import { parseSnapshot, snapshotOf } from './cachePersist';

const KEY = 'myto-api-cache';

/**
 * Keeps the trails, searches and bike lists the rider has already opened, so they are still there after the app restarts with no signal.
 * An old entry still counts as stale and is fetched again when there is a connection; until then it is shown rather than nothing.
 */
export async function startCachePersistence(): Promise<void> {
  try {
    const text = await AsyncStorage.getItem(KEY);
    if (text) cacheRestore(parseSnapshot(text, Date.now()));
  } catch { /* an unreadable cache is just an empty one */ }
  let timer: ReturnType<typeof setTimeout> | undefined;
  onCacheSet(() => {
    clearTimeout(timer);
    timer = setTimeout(() => { void AsyncStorage.setItem(KEY, snapshotOf(cacheEntries(), Date.now())).catch(() => undefined); }, 3000);
  });
}
