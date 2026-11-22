import { FileMode, File as ExpoFile } from 'expo-file-system';
import { createDownloadResumable, deleteAsync, documentDirectory, getFreeDiskStorageAsync, getInfoAsync, makeDirectoryAsync, moveAsync, readAsStringAsync, readDirectoryAsync, writeAsStringAsync } from 'expo-file-system/legacy';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { assertNotDownloading, createInflight, MANIFEST_CACHE_FILE, rangePlan, readInstalled, resolveManifest, runDelete, runDownload, type DownloadFs } from './download';
import { parseManifest, type Installed, type Region } from './manifest';
import { track } from '../analytics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { OfflineRouterNative } from '../../../modules/offline-router';
import { regionsChanged } from '../offlineRouting';

/** The phone side of offline regions: real files, real network. The logic worth testing lives in `download.ts`. */

const BASE = process.env.EXPO_PUBLIC_REGIONS_BASE_URL;
/** Where the list of downloadable regions is published. */
export const MANIFEST_URL = `${BASE ?? ''}/regions/manifest.json`;
const DIR = `${documentDirectory ?? ''}regions/`;
const CHUNK = 1024 * 1024;
const MANIFEST_TIMEOUT_MS = 10_000;
const inflight = createInflight();

// iOS suspends an app that is not in the foreground, and the download stops with it. The screen stays on while any download runs, so leaving the phone open finishes it.
const KEEP_AWAKE_TAG = 'offline-download';
let running = 0;
async function whileAwake<T>(job: () => Promise<T>): Promise<T> {
  if (running++ === 0) void activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => undefined);
  try {
    return await job();
  } finally {
    if (--running === 0) void deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => undefined);
  }
}

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
  // Only where the native router is built in (not Expo Go, not the web): elsewhere the routing file is skipped.
  ...(OfflineRouterNative ? { gunzip: (from: string, to: string) => OfflineRouterNative!.gunzip(from, to) } : {}),
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
    // Always ask the server: a cached copy of the list would hide a new version (the phone's HTTP stack guesses how long a file stays fresh).
    const res = await fetch(`${MANIFEST_URL}?t=${Date.now()}`, { signal: abort.signal, headers: { 'Cache-Control': 'no-cache' } });
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
export const downloadRegion = async (region: Region, onProgress: (pct: number) => void): Promise<void> => {
  const before = (await listInstalled()).find((r) => r.id === region.id);
  await inflight.run(region.id, (emit) => whileAwake(() => runDownload(nativeFs, DIR, region, emit)), onProgress);
  // An update replaced the old routing file: let its engine go so the space is given back.
  if (before?.routePath && before.version !== region.version) await closeRouter(before.routePath);
  regionsChanged();
  track('offline_region_downloaded', { region: region.id });
};

/** Frees the native engine that has a routing file open; nothing to do where there is none. */
const closeRouter = (path: string): Promise<void> => OfflineRouterNative?.close(path).catch(() => undefined) ?? Promise.resolve();

/** True while a download for this region is running (also after the screen that started it was left). */
export const isDownloading = (id: string): boolean => inflight.has(id);

/** Rejects in plain words while the region is downloading. */
export async function deleteRegion(id: string): Promise<void> {
  assertNotDownloading(inflight.has(id));
  const mine = (await listInstalled()).find((r) => r.id === id);
  if (mine?.routePath) await closeRouter(mine.routePath);
  await runDelete(nativeFs, DIR, id);
  regionsChanged();
}

export { checkSpace } from './download';
