/** Which of the rider's own pictures are kept on the phone. */
export type ImageKey = 'avatar' | 'bike-photo';

/** The few file operations the cache needs, so the logic can be tested without Expo. */
export interface CacheFs {
  makeDir(dir: string): Promise<void>;
  read(path: string): Promise<string | null>;
  write(path: string, text: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  /** Downloads to `to`; false when it failed (offline, not found). */
  download(url: string, to: string): Promise<boolean>;
  move(from: string, to: string): Promise<void>;
  remove(path: string): Promise<void>;
}

type Meta = { url: string; file: string };

const HASH_SEED = 0x811c9dc5;
const HASH_PRIME = 0x01000193;

/** A short, stable, non-reversible name part (FNV-1a, 32 bit, hex). Names must not carry any text from the rider or the address. */
export function nameHash(text: string): string {
  let h = HASH_SEED;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, HASH_PRIME) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** The note file for a key, and the picture file for a key and the address it came from (a new address is a new name, so the screen never shows a stale copy). */
export const metaName = (key: ImageKey) => `${nameHash(key)}.json`;
export const imageName = (key: ImageKey, url: string) => `${nameHash(key)}-${nameHash(url)}.img`;

export type Plan = 'delete' | 'keep' | 'download';

/** What to do given the address now wanted and what is stored. */
export function planFor(remoteUrl: string | null, stored: { url: string } | null, copyExists: boolean): Plan {
  if (!remoteUrl) return 'delete';
  if (stored && stored.url === remoteUrl && copyExists) return 'keep';
  return 'download';
}

const parseMeta = (raw: string | null): Meta | null => {
  if (!raw) return null;
  try {
    const m = JSON.parse(raw) as Partial<Meta>;
    return typeof m.url === 'string' && typeof m.file === 'string' ? { url: m.url, file: m.file } : null;
  } catch { return null; }
};

/** Returns the local file address of the picture, downloading it when the address changed; the old copy when offline; null when there is none. */
export async function resolveCached(fs: CacheFs, dir: string, key: ImageKey, remoteUrl: string | null): Promise<string | null> {
  await fs.makeDir(dir);
  const metaPath = dir + metaName(key);
  const stored = parseMeta(await fs.read(metaPath));
  const storedPath = stored ? dir + stored.file : null;
  const hasCopy = storedPath ? await fs.exists(storedPath) : false;
  const plan = planFor(remoteUrl, stored, hasCopy);

  if (plan === 'delete') {
    if (storedPath) await fs.remove(storedPath);
    await fs.remove(metaPath);
    return null;
  }
  if (plan === 'keep') return storedPath;

  const file = imageName(key, remoteUrl!);
  const part = `${dir}${file}.part`;
  if (!(await fs.download(remoteUrl!, part))) {
    await fs.remove(part);
    return hasCopy ? storedPath : null;
  }
  await fs.move(part, dir + file);
  await fs.write(metaPath, JSON.stringify({ url: remoteUrl, file } satisfies Meta));
  if (storedPath && storedPath !== dir + file) await fs.remove(storedPath);
  return dir + file;
}
