/** Results the screens have already fetched, kept in memory for this session. */
export const FRESH_MS = 5 * 60 * 1000;

type Entry = { data: unknown; at: number };
const entries = new Map<string, Entry>();

export function cacheGet<T>(key: string): { data: T; at: number } | undefined {
  return entries.get(key) as { data: T; at: number } | undefined;
}

export function cacheSet(key: string, data: unknown, now = Date.now()) {
  entries.set(key, { data, at: now });
}

export function cacheDelete(key: string) {
  entries.delete(key);
}

export function cacheDeleteWhere(match: (key: string) => boolean) {
  for (const k of [...entries.keys()]) if (match(k)) entries.delete(k);
}

/** A fresh entry is shown without asking the server again. */
export function isFresh(key: string, now = Date.now()): boolean {
  const e = entries.get(key);
  return e !== undefined && now - e.at < FRESH_MS;
}

/** Forget everything that belongs to the signed-in account, so the next person on this phone never sees it. */
export function clearUserCache() {
  cacheDeleteWhere((k) => k === 'saved' || k === 'me' || k === 'clubs' || k.startsWith('club:') || (k.startsWith('comments:') && k.endsWith(':in')));
}
