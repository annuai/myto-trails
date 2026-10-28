// Journal photos and voice notes never leave the phone: this folder must not import anything from src/api (journalMedia.test.ts enforces it).
import { Directory, File, Paths } from 'expo-file-system';
import { SaveFormat, manipulateAsync } from 'expo-image-manipulator';
import { uid } from '../id';

export type MediaKind = 'photo' | 'voice';
const EXT: Record<MediaKind, string> = { photo: 'jpg', voice: 'm4a' };
const MAX_LONG_SIDE = 1600;
const JPEG_QUALITY = 0.8;

const dir = () => new Directory(Paths.document, 'journal-media');
const stageDir = () => new Directory(Paths.document, 'journal-media-incoming');
const oldDir = () => new Directory(Paths.document, 'journal-media-old');
const name = (id: string, kind: MediaKind) => `${id}.${EXT[kind]}`;
const ensure = (d: Directory) => { if (!d.exists) d.create({ intermediates: true }); return d; };
const remove = (d: Directory) => { if (d.exists) d.delete(); };
const filesIn = (d: Directory) => (d.exists ? d.list().filter((e): e is File => e instanceof File) : []);

/** Downscales a picked or captured photo and stores it under a new id. */
export async function savePhoto(sourceUri: string): Promise<{ id: string; width: number; height: number }> {
  const probe = await manipulateAsync(sourceUri, []);
  const resize = probe.width >= probe.height ? { width: Math.min(probe.width, MAX_LONG_SIDE) } : { height: Math.min(probe.height, MAX_LONG_SIDE) };
  const out = await manipulateAsync(sourceUri, [{ resize }], { compress: JPEG_QUALITY, format: SaveFormat.JPEG });
  const id = uid();
  const target = new File(ensure(dir()), name(id, 'photo'));
  target.create();
  await new File(out.uri).copy(target, { overwrite: true });
  return { id, width: out.width, height: out.height };
}

/** Moves a finished recording into the journal folder under the entry's id. */
export async function saveVoice(sourceUri: string, id: string): Promise<void> {
  const target = new File(ensure(dir()), name(id, 'voice'));
  target.create({ overwrite: true });
  await new File(sourceUri).copy(target, { overwrite: true });
}

export const mediaUri = (id: string, kind: MediaKind) => new File(dir(), name(id, kind)).uri;
export const hasMedia = (id: string, kind: MediaKind) => new File(dir(), name(id, kind)).exists;
export const readBase64 = (id: string, kind: MediaKind) => new File(dir(), name(id, kind)).base64();

export function removeMedia(id: string, kind: MediaKind) {
  const f = new File(dir(), name(id, kind));
  if (f.exists) f.delete();
}

/** Erase all my data. */
export function removeAllMedia() { remove(dir()); remove(stageDir()); remove(oldDir()); }

// Restore: files are written to a temporary folder first and swapped in only once everything else has validated.
export async function stageMedia(id: string, kind: MediaKind, base64: string) {
  const f = new File(ensure(stageDir()), name(id, kind));
  f.create({ overwrite: true });
  await f.write(base64, { encoding: 'base64' });
}

export function discardStaged() { remove(stageDir()); }

/**
 * Replace: existing files are set aside, the staged ones moved in, and the old ones put back if anything fails.
 * Merge: staged files are added; ones already on the phone are kept (same id means same file).
 */
export function commitStaged(mode: 'replace' | 'merge'): { finalize: () => void; rollback: () => void } {
  const target = ensure(dir());
  const aside = new Map<string, File>();
  const moved: File[] = [];
  const rollback = () => {
    for (const f of moved) if (f.exists) f.delete();
    for (const [n, f] of aside) f.moveSync(new File(target, n), { overwrite: true });
    remove(oldDir());
    remove(stageDir());
  };
  try {
    if (mode === 'replace') {
      ensure(oldDir());
      for (const f of filesIn(target)) { const to = new File(oldDir(), f.name); f.moveSync(to, { overwrite: true }); aside.set(f.name, to); }
    }
    for (const f of filesIn(stageDir())) {
      const to = new File(target, f.name);
      if (to.exists) continue;
      f.moveSync(to);
      moved.push(to);
    }
  } catch (e) {
    rollback();
    throw e;
  }
  // The old files stay in the set-aside folder until `finalize`, so the swap can still be undone.
  return { finalize: () => { remove(oldDir()); remove(stageDir()); }, rollback };
}
