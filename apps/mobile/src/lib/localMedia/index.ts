// Document photos never leave the phone: this folder must not import anything from src/api (localMedia.test.ts enforces it).
import { Directory, File, Paths } from 'expo-file-system';
import { SaveFormat, manipulateAsync } from 'expo-image-manipulator';
import { uid } from '../id';
import type { DocKind, DocPhoto, DocSide } from './types';

export type { DocKind, DocPhoto, DocSide } from './types';

export const MAX_LONG_SIDE = 1600;
export const JPEG_QUALITY = 0.8;

const photoDir = () => new Directory(Paths.document, 'doc-photos');
const stageDir = () => new Directory(Paths.document, 'doc-photos-incoming');
const fileOf = (dir: Directory, id: string) => new File(dir, `${id}.jpg`);

const ensure = (dir: Directory) => { if (!dir.exists) dir.create({ intermediates: true }); return dir; };
const remove = (dir: Directory) => { if (dir.exists) dir.delete(); };

/** Downscales the picked image, stores it under a new id and returns the metadata to keep in the profile store. */
export async function savePhoto(sourceUri: string, docKind: DocKind, side?: DocSide): Promise<DocPhoto> {
  const probe = await manipulateAsync(sourceUri, []);
  const resize = probe.width >= probe.height ? { width: Math.min(probe.width, MAX_LONG_SIDE) } : { height: Math.min(probe.height, MAX_LONG_SIDE) };
  const out = await manipulateAsync(sourceUri, [{ resize }], { compress: JPEG_QUALITY, format: SaveFormat.JPEG });
  const id = uid();
  const target = fileOf(ensure(photoDir()), id);
  target.create();
  await new File(out.uri).copy(target, { overwrite: true });
  return { id, docKind, side, width: out.width, height: out.height, addedAt: Date.now() };
}

export const photoUri = (id: string) => fileOf(photoDir(), id).uri;
export const readPhotoBase64 = (id: string) => fileOf(photoDir(), id).base64();
export const hasPhoto = (id: string) => fileOf(photoDir(), id).exists;

export function deletePhoto(id: string) {
  const f = fileOf(photoDir(), id);
  if (f.exists) f.delete();
}

/** Ids of the photo files on the phone. */
export const listPhotoIds = (): string[] =>
  photoDir().exists ? photoDir().list().filter((e): e is File => e instanceof File).map((f) => f.name.replace(/\.jpg$/, '')) : [];

/** Deletes every document photo (Erase all my data). */
export function deleteAllPhotos() { remove(photoDir()); remove(stageDir()); }

// Import support: files are written to a temporary folder first and swapped in only once everything else has validated.
export async function stagePhoto(id: string, base64: string) {
  const f = fileOf(ensure(stageDir()), id);
  f.create({ overwrite: true });
  await f.write(base64, { encoding: 'base64' });
}

export function discardStaged() { remove(stageDir()); }

const oldDir = () => new Directory(Paths.document, 'doc-photos-old');
const filesIn = (dir: Directory) => (dir.exists ? dir.list().filter((e): e is File => e instanceof File) : []);

/**
 * Replace: existing photos are set aside, the staged ones moved in, and the old ones put back if anything fails.
 * Merge: staged photos are added; ones already on the phone are kept (same id means same picture).
 */
export function commitStaged(mode: 'replace' | 'merge') {
  const dir = ensure(photoDir());
  const aside = new Map<string, File>();
  const moved: File[] = [];
  try {
    if (mode === 'replace') {
      ensure(oldDir());
      for (const f of filesIn(dir)) { const to = new File(oldDir(), f.name); f.moveSync(to, { overwrite: true }); aside.set(f.name, to); }
    }
    for (const f of filesIn(stageDir())) {
      const to = new File(dir, f.name);
      if (to.exists) continue;
      f.moveSync(to);
      moved.push(to);
    }
  } catch (e) {
    for (const f of moved) if (f.exists) f.delete();
    for (const [name, f] of aside) f.moveSync(new File(dir, name), { overwrite: true });
    remove(oldDir());
    throw e;
  }
  remove(oldDir());
  remove(stageDir());
}
