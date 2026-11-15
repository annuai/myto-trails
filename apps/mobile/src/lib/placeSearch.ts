import { APP_HEADERS } from './appHeaders';
import type { LatLng } from './geo';
import { combine } from './offlineRegions/searchIndex';
import { boxAround, kmFrom, NEARBY_KM, withinKm, type SearchScope } from './placeScope';

export type Place = { name: string; /** Where it is, e.g. "Mysuru, Karnataka, India". */ detail: string; point: LatLng; /** How far from the search centre, set only for a place beyond "nearby". */ farKm?: number };

/** What a search found, and how it was limited. `limited`: only nearby was searched, so a wider search could find more. `widened`: nothing was nearby, so the whole world was searched instead. */
export type PlaceResults = { places: Place[]; limited: boolean; widened: boolean };

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

async function photon(query: string, opts: { near?: LatLng; box?: [number, number, number, number]; signal?: AbortSignal }): Promise<Place[]> {
  const q = new URLSearchParams({ q: query.trim(), limit: String(LIMIT), lang: 'en' });
  if (opts.near) { q.set('lat', String(opts.near.lat)); q.set('lon', String(opts.near.lng)); }
  if (opts.box) q.set('bbox', opts.box.map((n) => n.toFixed(5)).join(','));
  const res = await fetch(`${PHOTON}?${q}`, { signal: opts.signal, headers: APP_HEADERS });
  if (!res.ok) throw new Error(`place search ${res.status}`);
  return parsePlaces(await res.json());
}

/** One pass: local regions plus Photon, within the box when there is one. The distance filter backs up the box (the local files are not boxed, and Photon's box is only as good as its index). */
async function pass(query: string, opts: { near?: LatLng; limitKm?: number; signal?: AbortSignal }): Promise<Place[]> {
  const box = opts.near && opts.limitKm ? boxAround(opts.near, opts.limitKm) : undefined;
  const [local, online] = await Promise.all([
    localPlaces(query, opts.near),
    photon(query, { near: opts.near, box, signal: opts.signal }).then((r): Place[] | Error => r, (e: unknown) => (e instanceof Error ? e : new Error(String(e)))),
  ]);
  if (opts.signal?.aborted && online instanceof Error) throw online; // a cancelled search must not resolve with stale local results
  const keep = (list: Place[]) => (opts.limitKm ? withinKm(list, opts.near, opts.limitKm) : list);
  return combine(keep(local), online instanceof Error ? online : keep(online), LIMIT);
}

/** Marks the places beyond "nearby" with how far they are, so the list can say so. */
const withFar = (places: Place[], centre: LatLng | undefined): Place[] => (centre ? places.map((p) => { const km = kmFrom(centre, p.point); return km > NEARBY_KM ? { ...p, farKm: Math.round(km) } : p; }) : places);

/**
 * Looks a place up by name. Downloaded regions answer first (they work with no signal), then Photon.
 * `near` is where the rider is planning or standing; with it the search is `nearby` by default (within NEARBY_KM), and if that finds nothing it
 * widens to the whole world by itself (`widened`). `scope: 'everywhere'` is the rider's own "search everywhere". Without `near` nothing is limited.
 * Photon is free and keyless, so nothing to pay for or leak.
 */
export async function searchPlaces(query: string, opts: { near?: LatLng; scope?: SearchScope; signal?: AbortSignal } = {}): Promise<PlaceResults> {
  const { near, signal } = opts;
  if (!near || opts.scope === 'everywhere') return { places: withFar(await pass(query, { near, signal }), near), limited: false, widened: false };
  const nearby = await pass(query, { near, limitKm: NEARBY_KM, signal });
  if (nearby.length) return { places: nearby, limited: true, widened: false };
  return { places: withFar(await pass(query, { near, signal }), near), limited: false, widened: true };
}
