import type { LatLng } from './geo';

/** The public OSRM demo server: free and keyless, but shared, so it is asked once per list and the answer is kept. */
const OSRM = 'https://router.project-osrm.org';

/** One request for the road distance from `from` to every place in `to`: the table service, with the rider as the only source. */
export function tableUrl(from: LatLng, to: LatLng[]): string {
  const coords = [from, ...to].map((p) => `${p.lng.toFixed(5)},${p.lat.toFixed(5)}`).join(';');
  return `${OSRM}/table/v1/driving/${coords}?sources=0&annotations=distance`;
}

/** Kilometres to each place, in order; null where no road reaches it. Anything unexpected is no answer at all. */
export function parseTable(body: unknown, count: number): (number | null)[] | undefined {
  const row = (body as { distances?: (number | null)[][] } | undefined)?.distances?.[0];
  if (!row || row.length !== count + 1) return undefined;
  return row.slice(1).map((m) => (typeof m === 'number' ? m / 1000 : null));
}

export async function roadDistancesKm(from: LatLng, to: LatLng[], signal?: AbortSignal): Promise<(number | null)[] | undefined> {
  if (!to.length) return [];
  const res = await fetch(tableUrl(from, to), { signal });
  return res.ok ? parseTable(await res.json(), to.length) : undefined;
}
