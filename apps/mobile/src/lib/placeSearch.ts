import type { LatLng } from './geo';

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

/** Looks a place up by name. `near` nudges results towards where the rider is already planning. Free and keyless, so nothing to pay for or leak. */
export async function searchPlaces(query: string, opts: { near?: LatLng; signal?: AbortSignal } = {}): Promise<Place[]> {
  const q = new URLSearchParams({ q: query.trim(), limit: '6', lang: 'en' });
  if (opts.near) { q.set('lat', String(opts.near.lat)); q.set('lon', String(opts.near.lng)); }
  const res = await fetch(`${PHOTON}?${q}`, { signal: opts.signal });
  if (!res.ok) throw new Error(`place search ${res.status}`);
  return parsePlaces(await res.json());
}
