import type { ImageKey } from './imageCacheCore';

/** The website has no private file store: pictures are drawn from their address and there is nothing to wipe. */
export function cachedImageUri(_key: ImageKey, remoteUrl: string | null): Promise<string | null> {
  return Promise.resolve(remoteUrl);
}

export function useCachedImage(_key: ImageKey, remoteUrl: string | null): string | null | undefined {
  return remoteUrl;
}

export async function wipeImageCache(): Promise<void> {}
