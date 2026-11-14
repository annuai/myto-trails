import { APP_HEADERS } from './appHeaders';
import type { LatLng } from './geo';
import { combine } from './offlineRegions/searchIndex';

export type Place = { name: string; /** Where it is, e.g. "Mysuru, Karnataka, India". */ detail: string; point: LatLng };

type PhotonFeature = { geometry?: { coordinates?: [number, number] }; properties?: Record<string, string | undefined> };

const PHOTON = 'https://photon.komoot.io/api/';

/** Places from a Photon (OpenStreetMap) answer. Results without a name or position are dropped, as are repeats of the same place. */
export function parsePlaces(json: unknown): Place[] {
  const features = (json as { features?: PhotonFeature[] } | null)?.features ?? [];
  const seen = new Set<string>();
  const out: Place[] = [];
  for (const f of features) {
    const p = f.properties ?? {};
    const c = f.geometry?.coordinates;
    const name = p.name ?? [p.street, p.housenumber].filter(Boolean).join(' ');
    if (!name || !c || !Number.isFinite(c[0]) || !Number.isFinite(c[1])) continue;
    const detail = [p.district ?? p.city, p.state, p.country].filter((x): x is string => !!x && x !== name).join(', ');
    const key = `${name}|${detail}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name, detail, point: { lat: c[1], lng: c[0] } });
  }
  return out;
}

const LIMIT = 6;

/** Places from the downloaded regions' search files; any failure, including the native modules not loading, just means no local results. */
async function localPlaces(query: string, near: LatLng | undefined): Promise<Place[]> {
  try {
    const [{ listInstalled }, { searchLocal }] = await Promise.all([import('./offlineRegions/store'), import('./offlineRegions/searchLocal')]);
    const installed = await listInstalled();
    return installed.length ? await searchLocal(query, installed, near, LIMIT) : [];
  } catch {
    return [];
  }
}

async function photon(query: string, opts: { near?: LatLng; signal?: AbortSignal }): Promise<Place[]> {
  const q = new URLSearchParams({ q: query.trim(), limit: String(LIMIT), lang: 'en' });
  if (opts.near) { q.set('lat', String(opts.near.lat)); q.set('lon', String(opts.near.lng)); }
  const res = await fetch(`${PHOTON}?${q}`, { signal: opts.signal, headers: APP_HEADERS });
  if (!res.ok) throw new Error(`place search ${res.status}`);
  return parsePlaces(await res.json());
}

/** Looks a place up by name: downloaded regions first (they work with no signal), then Photon. `near` nudges results towards where the rider is already planning. Photon is free and keyless, so nothing to pay for or leak. */
export async function searchPlaces(query: string, opts: { near?: LatLng; signal?: AbortSignal } = {}): Promise<Place[]> {
  const [local, online] = await Promise.all([
    localPlaces(query, opts.near),
    photon(query, opts).then((r): Place[] | Error => r, (e: unknown) => (e instanceof Error ? e : new Error(String(e)))),
  ]);
  if (opts.signal?.aborted && online instanceof Error) throw online; // a cancelled search must not resolve with stale local results
  return combine(local, online, LIMIT);
}
