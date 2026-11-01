import { useEffect, useState } from 'react';
import { deleteAsync, documentDirectory, downloadAsync, getInfoAsync, makeDirectoryAsync, moveAsync, readAsStringAsync, writeAsStringAsync } from 'expo-file-system/legacy';
import { resolveCached, type CacheFs, type ImageKey } from './imageCacheCore';

/**
 * The rider's own profile picture and bike photo, kept on the phone so they show at once and offline. Stored in the app's private
 * documents folder (not the photo library, not shared storage), under names that are hashes. Wiped on sign-out and account deletion.
 */
const DIR = `${documentDirectory ?? ''}private-images/`;

const fs: CacheFs = {
  makeDir: (dir) => makeDirectoryAsync(dir, { intermediates: true }).catch(() => undefined),
  read: (p) => readAsStringAsync(p).catch(() => null),
  write: (p, t) => writeAsStringAsync(p, t),
  exists: (p) => getInfoAsync(p).then((i) => i.exists).catch(() => false),
  download: (url, to) => downloadAsync(url, to).then((r) => r.status >= 200 && r.status < 300).catch(() => false),
  move: (a, b) => moveAsync({ from: a, to: b }),
  remove: (p) => deleteAsync(p, { idempotent: true }).catch(() => undefined),
};

const pending = new Map<string, Promise<string | null>>();
const known = new Map<string, string | null>();

/** The local file address of the picture (downloaded again when the address changed; the old copy when offline), or null. */
export function cachedImageUri(key: ImageKey, remoteUrl: string | null): Promise<string | null> {
  if (!documentDirectory || (remoteUrl && !/^https?:\/\//.test(remoteUrl))) return Promise.resolve(null);
  const id = `${key}|${remoteUrl ?? ''}`;
  let p = pending.get(id);
  if (!p) {
    p = resolveCached(fs, DIR, key, remoteUrl).catch(() => null).finally(() => pending.delete(id));
    pending.set(id, p);
  }
  return p.then((uri) => { known.set(id, uri); return uri; });
}

/** What to draw: the local copy, or the remote address until the copy is ready. */
export function useCachedImage(key: ImageKey, remoteUrl: string | null): string | null | undefined {
  const id = `${key}|${remoteUrl ?? ''}`;
  const [local, setLocal] = useState<string | null | undefined>(() => known.get(id));
  useEffect(() => {
    let live = true;
    setLocal(known.get(id));
    void cachedImageUri(key, remoteUrl).then((uri) => { if (live) setLocal(uri); });
    return () => { live = false; };
  }, [id, key, remoteUrl]);
  return remoteUrl ? local ?? remoteUrl : null;
}

/** Deletes every kept picture. */
export async function wipeImageCache(): Promise<void> {
  known.clear();
  pending.clear();
  if (documentDirectory) await deleteAsync(DIR, { idempotent: true }).catch(() => undefined);
}
