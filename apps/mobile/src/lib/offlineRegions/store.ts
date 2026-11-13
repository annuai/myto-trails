import { FileMode, File as ExpoFile } from 'expo-file-system';
import { createDownloadResumable, deleteAsync, documentDirectory, getFreeDiskStorageAsync, getInfoAsync, makeDirectoryAsync, moveAsync, readAsStringAsync, readDirectoryAsync, writeAsStringAsync } from 'expo-file-system/legacy';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { assertNotDownloading, createInflight, MANIFEST_CACHE_FILE, rangePlan, readInstalled, resolveManifest, runDelete, runDownload, type DownloadFs } from './download';
import { parseManifest, type Installed, type Region } from './manifest';

/** The phone side of offline regions: real files, real network. The logic worth testing lives in `download.ts`. */

const BASE = process.env.EXPO_PUBLIC_REGIONS_BASE_URL;
export const MANIFEST_URL = `${BASE ?? ''}/regions/manifest.json`;
const DIR = `${documentDirectory ?? ''}regions/`;
const CHUNK = 1024 * 1024;
const MANIFEST_TIMEOUT_MS = 10_000;
const inflight = createInflight();

const nativeFs: DownloadFs = {
  freeBytes: () => getFreeDiskStorageAsync(),
  makeDir: (dir) => makeDirectoryAsync(dir, { intermediates: true }).catch(() => undefined),
  size: async (p) => {
    const i = await getInfoAsync(p).catch(() => null);
    return i && i.exists && !i.isDirectory ? i.size : null;
  },
  readText: (p) => readAsStringAsync(p).catch(() => null),
  writeText: (p, t) => writeAsStringAsync(p, t),
  remove: (p) => deleteAsync(p, { idempotent: true }).catch(() => undefined),
  move: (from, to) => moveAsync({ from, to }),
  fetchTo: async (url, path, resumeFrom, onBytes) => {
    // The legacy resumable keeps no state across an app kill, so resume is done with an HTTP Range request into a side file, appended to the part.
    const resuming = resumeFrom > 0;
    const target = resuming ? `${path}.tail` : path;
    await deleteAsync(target, { idempotent: true }).catch(() => undefined);
    const task = createDownloadResumable(url, target, resuming ? { headers: { Range: `bytes=${resumeFrom}-` } } : {}, (p) => onBytes((resuming ? resumeFrom : 0) + p.totalBytesWritten));
    const res = await task.downloadAsync();
    let plan;
    try {
      plan = rangePlan(res?.status ?? 0, resumeFrom);
    } catch (e) {
      await deleteAsync(target, { idempotent: true }).catch(() => undefined);
      throw e;
    }
    if (plan === 'append') await append(path, target);
    else if (plan === 'restart') {
      await deleteAsync(path, { idempotent: true });
      await moveAsync({ from: target, to: path });
    }
    if (resuming) await deleteAsync(target, { idempotent: true }).catch(() => undefined);
  },
  sha256: hashFile,
  list: (dir) => readDirectoryAsync(dir).catch(() => []),
};

/** Appends `from` to the end of `to` a megabyte at a time. */
async function append(to: string, from: string): Promise<void> {
  const src = new ExpoFile(from).open(FileMode.ReadOnly);
  const dst = new ExpoFile(to).open(FileMode.Append);
  try {
    for (;;) {
      const chunk = await src.readBytes(CHUNK);
      if (chunk.length === 0) break;
      await dst.writeBytes(chunk);
    }
  } finally {
    src.close();
    dst.close();
  }
}

/** SHA-256 hex of a file, read a megabyte at a time so a several-hundred-MB map never sits in memory (expo-crypto can only hash a whole buffer). */
async function hashFile(path: string): Promise<string> {
  const h = sha256.create();
  const handle = new ExpoFile(path).open(FileMode.ReadOnly);
  try {
    for (;;) {
      const chunk = await handle.readBytes(CHUNK);
      if (chunk.length === 0) break;
      h.update(chunk);
    }
  } finally {
    handle.close();
  }
  return bytesToHex(h.digest());
}

async function fetchManifestJson(): Promise<unknown> {
  if (!BASE) throw new Error('no regions address set');
  // A captive portal can leave a request hanging for minutes; give up after 10 s and let the cached list stand.
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), MANIFEST_TIMEOUT_MS);
  try {
    const res = await fetch(MANIFEST_URL, { signal: abort.signal });
    if (!res.ok) throw new Error(`manifest ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** The published regions, refreshed from the network when it works; otherwise the last good copy on the phone, or an empty list. */
export function loadManifest(): Promise<Region[]> {
  return resolveManifest({
    fetchJson: fetchManifestJson,
    readCache: async () => {
      const raw = await nativeFs.readText(`${DIR}${MANIFEST_CACHE_FILE}`);
      return raw ? parseManifest(JSON.parse(raw)) : null;
    },
    writeCache: async (regions) => {
      await nativeFs.makeDir(DIR);
      await nativeFs.writeText(`${DIR}${MANIFEST_CACHE_FILE}`, JSON.stringify({ format: 1, regions }));
    },
  });
}

/** Regions fully on the phone. An entry whose files have gone missing is left out. */
export const listInstalled = (): Promise<Installed[]> => readInstalled(nativeFs, DIR);

/** Downloads and installs a region; `onProgress` gets 0 to 100. Throws a plain-words message when it cannot. */
export const downloadRegion = (region: Region, onProgress: (pct: number) => void): Promise<void> => inflight.run(region.id, (emit) => runDownload(nativeFs, DIR, region, emit), onProgress);

/** True while a download for this region is running (also after the screen that started it was left). */
export const isDownloading = (id: string): boolean => inflight.has(id);

/** Rejects in plain words while the region is downloading. */
export async function deleteRegion(id: string): Promise<void> {
  assertNotDownloading(inflight.has(id));
  await runDelete(nativeFs, DIR, id);
}

export { checkSpace } from './download';
