import type { LatLng } from './geo';
import type { Installed } from './offlineRegions/manifest';
import { setLocalRouter, type LocalRouter } from './routing';

/**
 * Directions with no signal: Valhalla runs on the phone against a downloaded region's routing file (modules/offline-router). A route is
 * answered here only when one region holds every stop, since each region's file has only its own roads; anything else goes online.
 */

/** The installed region with a routing file whose box holds every stop; the smallest such box, so a small region inside a large one wins. */
export function regionFor(installed: Installed[], stops: LatLng[]): Installed | undefined {
  const inside = (r: Installed) => stops.every((p) => p.lng >= r.bbox[0] && p.lat >= r.bbox[1] && p.lng <= r.bbox[2] && p.lat <= r.bbox[3]);
  const area = (r: Installed) => (r.bbox[2] - r.bbox[0]) * (r.bbox[3] - r.bbox[1]);
  return installed.filter((r) => r.routePath && inside(r)).sort((a, b) => area(a) - area(b))[0];
}

type Native = { route(tilesPath: string, requestJson: string): Promise<string> };

/** How long the list of installed regions is trusted before it is read from disk again; a download or delete resets it at once. */
const INSTALLED_TTL_MS = 60_000;

export function makeLocalRouter(native: Native, listInstalled: () => Promise<Installed[]>, now: () => number = Date.now): { router: LocalRouter; forget: () => void } {
  let cached: { at: number; list: Promise<Installed[]> } | undefined;
  const installed = () => {
    if (!cached || now() - cached.at > INSTALLED_TTL_MS) cached = { at: now(), list: listInstalled().catch(() => []) };
    return cached.list;
  };
  const router: LocalRouter = async (stops, requestJson) => {
    const region = regionFor(await installed(), stops);
    return region?.routePath ? native.route(region.routePath, requestJson) : null;
  };
  return { router, forget: () => { cached = undefined; } };
}

let forgetInstalled: (() => void) | undefined;

/** Called once at start-up. Where the native router is missing (Expo Go, the web) nothing is set and routing stays online. */
export async function installOfflineRouting(): Promise<void> {
  try {
    const [{ OfflineRouterNative }, store] = await Promise.all([import('../../modules/offline-router'), import('./offlineRegions/store')]);
    if (!OfflineRouterNative) return;
    const { router, forget } = makeLocalRouter(OfflineRouterNative, store.listInstalled);
    forgetInstalled = forget;
    setLocalRouter(router);
  } catch {
    /* no offline routing; online still works */
  }
}

/** A region was downloaded, updated or deleted: read the list again before the next route. */
export function regionsChanged(): void { forgetInstalled?.(); }
