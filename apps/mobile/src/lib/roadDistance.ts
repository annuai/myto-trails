import { APP_HEADERS } from './appHeaders';
import type { LatLng } from './geo';
import { fetchWithTimeout } from './routing';

/** Two free, keyless OSRM servers (the project's demo, then FOSSGIS's): shared, so each list asks once and keeps the answer. */
const OSRM = 'https://router.project-osrm.org';
const OSRM_BACKUP = 'https://routing.openstreetmap.de/routed-car';

/** One request for the road distance from `from` to every place in `to`: the table service, with the rider as the only source. */
export function tableUrl(from: LatLng, to: LatLng[], host: string = OSRM): string {
  const coords = [from, ...to].map((p) => `${p.lng.toFixed(5)},${p.lat.toFixed(5)}`).join(';');
  return `${host}/table/v1/driving/${coords}?sources=0&annotations=distance`;
}

/** Kilometres to each place, in order; null where no road reaches it. Anything unexpected is no answer at all. */
export function parseTable(body: unknown, count: number): (number | null)[] | undefined {
  const row = (body as { distances?: (number | null)[][] } | undefined)?.distances?.[0];
  if (!row || row.length !== count + 1) return undefined;
  return row.slice(1).map((m) => (typeof m === 'number' ? m / 1000 : null));
}

export async function roadDistancesKm(from: LatLng, to: LatLng[], signal?: AbortSignal): Promise<(number | null)[] | undefined> {
  if (!to.length) return [];
  for (const host of [OSRM, OSRM_BACKUP]) {
    try {
      const res = await fetchWithTimeout(tableUrl(from, to, host), { signal, headers: APP_HEADERS });
      const table = res.ok ? parseTable(await res.json(), to.length) : undefined;
      if (table) return table;
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') throw e;
    }
  }
  return undefined;
}
