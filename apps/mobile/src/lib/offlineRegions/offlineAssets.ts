import { Asset } from 'expo-asset';
import { copyAsync, deleteAsync, documentDirectory, getInfoAsync, makeDirectoryAsync, readAsStringAsync, writeAsStringAsync } from 'expo-file-system/legacy';
import { OFFLINE_MAP_ASSETS } from '../../../assets/offline-map/assets';
import type { LocalPaths } from './style';

/** Bump when the bundled style assets change; the copy in the document directory is redone once. */
const ASSETS_VERSION = '2';
const DIR = `${documentDirectory ?? ''}offline-map/`;
const MARKER = `${DIR}.version`;

let ready: Promise<LocalPaths> | undefined;

/** MapLibre reads glyphs and sprite from `file://` paths, so the bundled files are copied into the document directory once per version. */
export function ensureOfflineAssets(): Promise<LocalPaths> {
  ready ??= copyAll().catch((e) => { ready = undefined; throw e; });
  return ready;
}

async function copyAll(): Promise<LocalPaths> {
  const paths: LocalPaths = { glyphs: `${DIR}fonts/{fontstack}/{range}.pbf`, sprite: `${DIR}sprite/sprite` };
  const marker = await getInfoAsync(MARKER).catch(() => null);
  if (marker?.exists) {
    const have = await readAsStringAsync(MARKER).catch(() => '');
    if (have === ASSETS_VERSION) return paths;
  }
  await deleteAsync(DIR, { idempotent: true });
  for (const [rel, module] of OFFLINE_MAP_ASSETS) {
    const asset = Asset.fromModule(module);
    await asset.downloadAsync();
    if (!asset.localUri) throw new Error(`offline asset not available: ${rel}`);
    await makeDirectoryAsync(`${DIR}${rel.slice(0, rel.lastIndexOf('/'))}`, { intermediates: true });
    await copyAsync({ from: asset.localUri, to: `${DIR}${rel}` });
  }
  await writeAsStringAsync(MARKER, ASSETS_VERSION);
  return paths;
}
