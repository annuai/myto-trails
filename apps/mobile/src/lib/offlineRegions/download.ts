import { parseManifest, regionTotalBytes, type Installed, type Region } from './manifest';

/**
 * The download logic with no native code in it: every file operation goes through `DownloadFs`, so the order of steps
 * (the part that decides whether a killed download counts as installed) can be tested in plain node. `store.ts` supplies the real phone.
 */

const MB = 1024 * 1024;

/** What the index remembers per region. Paths are rebuilt from the folder each time, because the app folder's address can change after an update. */
export type IndexEntry = { id: string; version: string; bbox: Region['bbox'] };

export type DownloadFs = {
  freeBytes(): Promise<number>;
  makeDir(dir: string): Promise<void>;
  /** Size in bytes, or null when the file is not there. */
  size(path: string): Promise<number | null>;
  readText(path: string): Promise<string | null>;
  writeText(path: string, text: string): Promise<void>;
  /** Removes the file; no error when it is already gone. */
  remove(path: string): Promise<void>;
  move(from: string, to: string): Promise<void>;
  /** Downloads `url` into `path`, continuing after the first `resumeFrom` bytes already there. `onBytes` gets the total bytes now in the file. */
  fetchTo(url: string, path: string, resumeFrom: number, onBytes: (bytesInFile: number) => void): Promise<void>;
  sha256(path: string): Promise<string>;
};

export const INDEX_FILE = 'index.json';
export const MANIFEST_CACHE_FILE = 'manifest.cache.json';

const stem = (id: string, version: string) => `${id}.${version}`;
export const mapPath = (dir: string, id: string, version: string) => `${dir}${stem(id, version)}.map`;
export const searchPath = (dir: string, id: string, version: string) => `${dir}${stem(id, version)}.search`;

/** Needs the whole download plus a tenth spare, so the phone is not left with no room to work. */
export function checkSpace(freeBytes: number, region: Region): { ok: true } | { ok: false; message: string } {
  const need = (regionTotalBytes(region) * 11) / 10;
  if (freeBytes > need) return { ok: true };
  return { ok: false, message: `Not enough space on your phone. ${region.name} needs about ${Math.ceil(need / MB)} MB free; free some space and try again.` };
}

async function readIndex(fs: DownloadFs, dir: string): Promise<IndexEntry[]> {
  try {
    const raw = await fs.readText(`${dir}${INDEX_FILE}`);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as IndexEntry[]).filter((e) => e && typeof e.id === 'string' && typeof e.version === 'string') : [];
  } catch {
    return [];
  }
}

export const DAMAGED = 'The download was damaged, try again';

/**
 * Downloads one region. Order matters: both files are fetched and verified as `.part` files, only then renamed, and the index
 * entry is written last, so a download killed at any point leaves nothing installed. Part files stay for the next try to resume.
 */
export async function runDownload(fs: DownloadFs, dir: string, region: Region, onProgress: (pct: number) => void): Promise<void> {
  const space = checkSpace(await fs.freeBytes(), region);
  if (!space.ok) throw new Error(space.message);
  await fs.makeDir(dir);

  const total = regionTotalBytes(region);
  let doneBefore = 0;
  const files = [
    { ref: region.map, final: mapPath(dir, region.id, region.version) },
    { ref: region.search, final: searchPath(dir, region.id, region.version) },
  ];
  for (const f of files) {
    const part = `${f.final}.part`;
    let have = (await fs.size(part)) ?? 0;
    if (have > f.ref.bytes) {
      await fs.remove(part);
      have = 0;
    }
    const base = doneBefore;
    if (have < f.ref.bytes) {
      await fs.fetchTo(f.ref.url, part, have, (n) => onProgress(total > 0 ? Math.min(99, Math.floor(((base + Math.min(n, f.ref.bytes)) / total) * 100)) : 0));
    }
    if ((await fs.size(part)) !== f.ref.bytes || (await fs.sha256(part)) !== f.ref.sha256) {
      await fs.remove(part);
      throw new Error(DAMAGED);
    }
    doneBefore += f.ref.bytes;
  }

  for (const f of files) {
    await fs.remove(f.final);
    await fs.move(`${f.final}.part`, f.final);
  }

  const index = await readIndex(fs, dir);
  const older = index.find((e) => e.id === region.id);
  const entry: IndexEntry = { id: region.id, version: region.version, bbox: region.bbox };
  const next = older ? index.map((e) => (e.id === region.id ? entry : e)) : [...index, entry];
  const tmp = `${dir}${INDEX_FILE}.tmp`;
  await fs.writeText(tmp, JSON.stringify(next));
  await fs.move(tmp, `${dir}${INDEX_FILE}`);
  onProgress(100);

  if (older && older.version !== region.version) {
    await fs.remove(mapPath(dir, older.id, older.version));
    await fs.remove(searchPath(dir, older.id, older.version));
  }
}

/** Removes the files first, then the entry: if it stops half way the entry's files are missing and `filterInstalled` drops it. */
export async function runDelete(fs: DownloadFs, dir: string, id: string): Promise<void> {
  const index = await readIndex(fs, dir);
  for (const e of index.filter((x) => x.id === id)) {
    await fs.remove(mapPath(dir, e.id, e.version));
    await fs.remove(searchPath(dir, e.id, e.version));
  }
  const tmp = `${dir}${INDEX_FILE}.tmp`;
  await fs.writeText(tmp, JSON.stringify(index.filter((e) => e.id !== id)));
  await fs.move(tmp, `${dir}${INDEX_FILE}`);
}

/** The installed regions whose map and search files are both really there; an entry with a missing file is dropped, never half-offered. */
export async function filterInstalled(dir: string, entries: IndexEntry[], exists: (path: string) => Promise<boolean>): Promise<Installed[]> {
  const out: Installed[] = [];
  for (const e of entries) {
    const m = mapPath(dir, e.id, e.version);
    const s = searchPath(dir, e.id, e.version);
    if ((await exists(m)) && (await exists(s))) out.push({ id: e.id, version: e.version, bbox: e.bbox, mapPath: m, searchPath: s });
  }
  return out;
}

export async function readInstalled(fs: DownloadFs, dir: string): Promise<Installed[]> {
  return filterInstalled(dir, await readIndex(fs, dir), async (p) => (await fs.size(p)) !== null);
}

/** The manifest from the network when it is valid (and then cached); otherwise the cached one, or nothing. Never throws. */
export async function resolveManifest(deps: {
  fetchJson: () => Promise<unknown>;
  readCache: () => Promise<Region[] | null>;
  writeCache: (regions: Region[]) => Promise<void>;
}): Promise<Region[]> {
  try {
    const fresh = parseManifest(await deps.fetchJson());
    if (fresh) {
      await deps.writeCache(fresh).catch(() => undefined);
      return fresh;
    }
  } catch {
    // offline or a bad response: fall through to the cached list
  }
  return (await deps.readCache().catch(() => null)) ?? [];
}
