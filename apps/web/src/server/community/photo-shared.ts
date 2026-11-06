// What the feed and the photo code both need: the photo sizes, the reactions, where a photo's copies live and their public addresses.
// Kept apart from photos.ts, which imports the club code that the feed code also imports.

/** The three copies of a photo, made on the rider's phone: a preview for the feed, a screen-sized one for the viewer, and the one kept and downloaded. */
export const PHOTO_SIZES = { thumb: 400, view: 1080, full: 2048 } as const;
export type PhotoSize = keyof typeof PHOTO_SIZES;
export const SIZES = Object.keys(PHOTO_SIZES) as PhotoSize[];
export const REACTIONS = ["like", "love", "fire", "laugh", "wow", "thanks"] as const;
export type Reaction = (typeof REACTIONS)[number];
export const isReaction = (v: unknown): v is Reaction => typeof v === "string" && (REACTIONS as readonly string[]).includes(v);

/** Where a copy lives: the same place in the quarantine bucket (before it is checked) and the public one (after). */
export const photoKey = (ownerId: string, assetId: string, size: PhotoSize) => `post/${ownerId}/${assetId}-${PHOTO_SIZES[size]}.jpg`;
export const photoStem = (ownerId: string, assetId: string) => `post/${ownerId}/${assetId}`;

export type PhotoUrls = { id: string; width: number; height: number; colour: string | null; thumbUrl: string; viewUrl: string; fullUrl: string };
/** The public addresses of a photo's three copies. */
export const photoUrls = (publicUrl: (key: string) => string, a: { id: string; stem: string; width: number; height: number; colour: string | null }): PhotoUrls => ({
  id: a.id, width: a.width, height: a.height, colour: a.colour,
  thumbUrl: publicUrl(`${a.stem}-${PHOTO_SIZES.thumb}.jpg`), viewUrl: publicUrl(`${a.stem}-${PHOTO_SIZES.view}.jpg`), fullUrl: publicUrl(`${a.stem}-${PHOTO_SIZES.full}.jpg`),
});


/** The public object names of every copy of a photo with this stem. */
export const photoCopyKeys = (stem: string): string[] => SIZES.map((k) => `${stem}-${PHOTO_SIZES[k]}.jpg`);

