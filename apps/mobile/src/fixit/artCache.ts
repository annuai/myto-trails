import { useEffect, useState } from 'react';
import { deleteAsync, documentDirectory, downloadAsync, getInfoAsync, makeDirectoryAsync } from 'expo-file-system/legacy';
import { pickVariant, type FixitContent } from '@moto-trails/domain';
import { nameHash } from '@/lib/imageCacheCore';

/** Where to draw a picture from: its width in the site's store, as picked for the screen. */
export const ART_WIDTH = 800;

const DIR = `${documentDirectory ?? ''}fixit-art/`;
const file = (url: string) => `${DIR}${nameHash(url)}.webp`;

const pending = new Map<string, Promise<string | null>>();

/** The picture's copy on the phone, downloaded the first time (and again when its address changes). Null when offline and not yet kept. */
export function keepArt(url: string): Promise<string | null> {
  if (!documentDirectory || !/^https?:\/\//.test(url)) return Promise.resolve(null);
  let p = pending.get(url);
  if (!p) {
    p = (async () => {
      await makeDirectoryAsync(DIR, { intermediates: true }).catch(() => undefined);
      const to = file(url);
      if ((await getInfoAsync(to).catch(() => null))?.exists) return to;
      const r = await downloadAsync(url, to).catch(() => null);
      return r && r.status >= 200 && r.status < 300 ? to : null;
    })().catch(() => null).finally(() => pending.delete(url));
    pending.set(url, p);
  }
  return p;
}

/** Keeps every uploaded picture on the phone, so the guides have their pictures with no signal. */
export async function prefetchArt(c: FixitContent): Promise<void> {
  for (const a of Object.values(c.art)) {
    const url = pickVariant(a.variants, ART_WIDTH);
    if (url) await keepArt(url);
  }
}

/** The address to draw for a picture: the copy on the phone, or the site's address until the copy is ready. Nothing when it has not been uploaded. */
export function useArtUri(c: FixitContent | null, id: string | undefined): { uri: string; alt: string } | null {
  const art = id && c ? c.art[id] : undefined;
  const remote = art ? pickVariant(art.variants, ART_WIDTH) : null;
  const [kept, setKept] = useState<{ url: string; uri: string }>();
  useEffect(() => {
    if (!remote) return;
    let live = true;
    void keepArt(remote).then((uri) => { if (live && uri) setKept({ url: remote, uri }); });
    return () => { live = false; };
  }, [remote]);
  if (!art || !remote) return null;
  return { uri: kept?.url === remote ? kept.uri : remote, alt: art.alt };
}

/** Deletes the kept pictures (they are public, so this is only for "Erase all my data"). */
export async function wipeArt(): Promise<void> {
  if (documentDirectory) await deleteAsync(DIR, { idempotent: true }).catch(() => undefined);
}
