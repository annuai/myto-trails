import { Directory, File, Paths } from 'expo-file-system';
import { SaveFormat, manipulateAsync } from 'expo-image-manipulator';
import { uid } from './id';
import { fitLongSide, lowerQuality, PHOTO_KINDS, PHOTO_MAX_BYTES, PHOTO_QUALITY, PHOTO_SIZES, type PhotoSize } from './photoSizes';

export type PhotoCopy = { uri: string; bytes: number };
/** One photo ready to send: the three copies, and the size of the biggest. */
export type PhotoCopies = { width: number; height: number; copies: Record<PhotoSize, PhotoCopy> };

/** Where copies wait to be sent. Kept in the app's own folder, not the cache, so closing the app or a full phone does not lose a post. */
const dir = () => { const d = new Directory(Paths.document, 'post-outbox'); if (!d.exists) d.create({ intermediates: true }); return d; };

/**
 * Makes the three JPEG copies the site expects from a picked photo. Re-encoding drops the location and camera details, which the site
 * checks again. A copy that comes out over its byte limit is saved again at a lower quality.
 */
export async function makeCopies(sourceUri: string): Promise<PhotoCopies> {
  const probe = await manipulateAsync(sourceUri, []);
  const id = uid();
  const copies = {} as Record<PhotoSize, PhotoCopy>;
  let width = probe.width, height = probe.height;
  for (const kind of PHOTO_KINDS) {
    const resize = fitLongSide(probe.width, probe.height, PHOTO_SIZES[kind]);
    for (let q: number | undefined = PHOTO_QUALITY[kind]; q !== undefined; q = lowerQuality(q)) {
      const out = await manipulateAsync(sourceUri, resize ? [{ resize }] : [], { compress: q, format: SaveFormat.JPEG });
      const made = new File(out.uri);
      if (made.size <= PHOTO_MAX_BYTES[kind] || lowerQuality(q) === undefined) {
        const target = new File(dir(), `${id}-${PHOTO_SIZES[kind]}.jpg`);
        target.create({ overwrite: true });
        made.copy(target, { overwrite: true });
        copies[kind] = { uri: target.uri, bytes: target.size };
        if (kind === 'full') { width = out.width; height = out.height; }
        break;
      }
    }
  }
  return { width, height, copies };
}

/** Deletes the waiting copies of a photo once it is sent, or given up on. */
export function discardCopies(p: { copies: Record<PhotoSize, PhotoCopy> }) {
  for (const kind of PHOTO_KINDS) { try { const f = new File(p.copies[kind].uri); if (f.exists) f.delete(); } catch { /* already gone */ } }
}
