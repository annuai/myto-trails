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

/** The first installed region whose box holds the point. */
export function regionAt(point: LatLng, installed: Installed[]): Installed | undefined {
  return installed.find(({ bbox: [w, s, e, n] }) => point.lng >= w && point.lng <= e && point.lat >= s && point.lat <= n);
}

const stripFile = (p: string) => p.replace(/^file:\/\//, '');

/**
 * The base style with its online tiles swapped for the downloaded files: one vector source per region and every layer
 * on the online source cloned per region as `<id>@<regionId>`. Background and layers on other sources stay once.
 */
export function composeLocalStyle(base: StyleJson, installed: Installed[], paths: LocalPaths): StyleJson {
  const local = { ...base, glyphs: paths.glyphs, sprite: paths.sprite };
  if (installed.length === 0) return local;
  const sources: StyleJson['sources'] = {};
  for (const [id, src] of Object.entries(base.sources)) if (id !== ONLINE_SOURCE) sources[id] = src;
  for (const r of installed) sources[r.id] = { type: 'vector', url: `pmtiles://file://${stripFile(r.mapPath)}` };
  const layers: StyleJson['layers'] = [];
  for (const layer of base.layers) {
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

/** Which style the map uses: the local one until it fails to load, otherwise the online URL (a failure of the online URL is never retried as itself). */
export function chooseStyle(online: string, local: string | undefined, localFailed: boolean): { style: string; isLocal: boolean } {
  return local && !localFailed ? { style: local, isLocal: true } : { style: online, isLocal: false };
}
