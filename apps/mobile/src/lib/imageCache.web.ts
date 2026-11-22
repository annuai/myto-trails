// The web build keeps no image cache: images load from their address.

import type { ImageKey } from './imageCacheCore';

/** The website has no private file store: pictures are drawn from their address and there is nothing to wipe. */
export function cachedImageUri(_key: ImageKey, remoteUrl: string | null): Promise<string | null> {
  return Promise.resolve(remoteUrl);
}

/** The remote address itself, since the web has no cache. */
export function useCachedImage(_key: ImageKey, remoteUrl: string | null): string | null | undefined {
  return remoteUrl;
}

/** Nothing to wipe on the web. */
export async function wipeImageCache(): Promise<void> {}
