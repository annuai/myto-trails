/** The three copies of a photo the phone makes before sending it (the site makes none): the same sizes and byte limits as the site (apps/web/src/server/community/photo-shared.ts and photos.ts). */
export const PHOTO_SIZES = { thumb: 400, view: 1080, full: 2048 } as const;
export type PhotoSize = keyof typeof PHOTO_SIZES;
export const PHOTO_KINDS = Object.keys(PHOTO_SIZES) as PhotoSize[];
export const PHOTO_MAX_BYTES: Record<PhotoSize, number> = { thumb: 250_000, view: 900_000, full: 4_000_000 };
/** The first JPEG quality tried for each copy, and how much to lower it when a copy comes out too big. */
export const PHOTO_QUALITY: Record<PhotoSize, number> = { thumb: 0.75, view: 0.8, full: 0.82 };
export const QUALITY_STEP = 0.12;
export const MIN_QUALITY = 0.4;
export const PHOTOS_PER_POST = 10;

/** The resize that brings a photo's long side down to `max`, never up: width when it is the longer side, height otherwise. Nothing when it already fits. */
export function fitLongSide(width: number, height: number, max: number): { width: number } | { height: number } | undefined {
  if (Math.max(width, height) <= max) return undefined;
  return width >= height ? { width: max } : { height: max };
}

/** The next quality to try when a copy came out over its limit, or undefined when there is nowhere lower to go. */
export const lowerQuality = (q: number): number | undefined => (q - QUALITY_STEP >= MIN_QUALITY ? Math.round((q - QUALITY_STEP) * 100) / 100 : undefined);
