import type { LatLng } from '@/lib/geo';
import type { Installed } from './manifest';

/** The slice of a MapLibre style JSON this file touches; pure so it runs under node. */
export type StyleJson = {
  version: number;
  glyphs?: string;
  sprite?: string;
  sources: Record<string, Record<string, unknown>>;
  layers: { id: string; type: string; source?: string; [key: string]: unknown }[];
  [key: string]: unknown;
};

/** Where the bundled glyphs and sprite were copied to on the phone, as `file://` URLs (sprite has no extension). */
export type LocalPaths = { glyphs: string; sprite: string };

/** The source id of the online tiles in the bundled liberty style. */
const ONLINE_SOURCE = 'openmaptiles';
/** The online-only shaded relief raster of the liberty style; offline it would fail tile by tile, so the local style leaves it out. */
const NETWORK_ONLY_SOURCE = 'ne2_shaded';

/** The first installed region whose box holds the point. */
export function regionAt(point: LatLng, installed: Installed[]): Installed | undefined {
  return installed.find(({ bbox: [w, s, e, n] }) => point.lng >= w && point.lng <= e && point.lat >= s && point.lat <= n);
}

const stripFile = (p: string) => p.replace(/^file:\/\//, '');

/**
 * The base style with its online tiles swapped for the downloaded files: one vector source per region and every layer
 * on the online source cloned per region as `<id>@<regionId>`. Background and layers on other sources stay once, except the network-only relief raster, which is dropped with its layer.
 */
export function composeLocalStyle(base: StyleJson, installed: Installed[], paths: LocalPaths): StyleJson {
  const local = { ...base, glyphs: paths.glyphs, sprite: paths.sprite };
  const sources: StyleJson['sources'] = {};
  for (const [id, src] of Object.entries(base.sources)) if (id !== ONLINE_SOURCE && id !== NETWORK_ONLY_SOURCE) sources[id] = src;
  if (installed.length === 0) return { ...local, sources, layers: base.layers.filter((l) => l.source !== NETWORK_ONLY_SOURCE) };
  for (const r of installed) sources[r.id] = { type: 'vector', url: `pmtiles://file://${stripFile(r.mapPath)}` };
  const layers: StyleJson['layers'] = [];
  for (const layer of base.layers) {
    if (layer.source === NETWORK_ONLY_SOURCE) continue;
    if (layer.source !== ONLINE_SOURCE) layers.push(layer);
    else for (const r of installed) layers.push({ ...layer, id: `${layer.id}@${r.id}`, source: r.id });
  }
  return { ...local, sources, layers };
}

/** A PMTiles v3 file starts with the ASCII bytes "PMTiles" and the version byte 3. Catches a truncated or wrong file, not a damaged body. */
export function isPmtilesHeader(bytes: Uint8Array): boolean {
  const magic = [0x50, 0x4d, 0x54, 0x69, 0x6c, 0x65, 0x73];
  return bytes.length >= 8 && magic.every((b, i) => bytes[i] === b) && bytes[7] === 3;
}

/**
 * Which style the map uses: the local one while the view is inside a downloaded region and the local style has not failed, otherwise the online URL
 * (a failure of the online URL is never retried as itself, and a failed local style stays off for good).
 */
export function chooseStyle(online: string, local: string | undefined, localFailed: boolean, inside: boolean): { style: string; isLocal: boolean } {
  return local && inside && !localFailed ? { style: local, isLocal: true } : { style: online, isLocal: false };
}

/** Whether the view is inside a downloaded region, and when that last changed (ms). */
export type Scope = { inside: boolean; at: number };

/** The least time between two style switches, so a ride along a region's edge does not reload the map back and forth. */
export const SWITCH_GAP_MS = 3000;

/**
 * Applies a fresh inside/outside reading. Nothing changes while the reading agrees with `prev`; a change within `gapMs` of the last one is held
 * back and `waitMs` says how long until it may be applied (0 when nothing is waiting).
 */
export function nextScope(prev: Scope, inside: boolean, now: number, gapMs = SWITCH_GAP_MS): { scope: Scope; waitMs: number } {
  if (inside === prev.inside) return { scope: prev, waitMs: 0 };
  const wait = prev.at + gapMs - now;
  if (wait > 0) return { scope: prev, waitMs: wait };
  return { scope: { inside, at: now }, waitMs: 0 };
}
