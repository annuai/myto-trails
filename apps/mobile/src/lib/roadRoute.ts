import type { LatLng } from './geo';
import { simplify, type PlannedRoute } from './routePlan';

const VALHALLA = 'https://valhalla1.openstreetmap.de/route';
/** The public server refuses more than 20 locations in one request. */
export const MAX_STOPS_PER_REQUEST = 20;
/** Road geometry is dense; dropping points within 5 m of the line keeps its shape and a saved route small. */
const SIMPLIFY_M = 5;

/** Google's encoded polyline format. Valhalla uses 6 decimal places, Google's own uses 5. */
export function decodePolyline(encoded: string, precision = 6): LatLng[] {
  const f = 10 ** precision;
  const out: LatLng[] = [];
  let i = 0, lat = 0, lng = 0;
  const next = () => {
    let shift = 0, result = 0, b: number;
    do { b = encoded.charCodeAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };
  while (i < encoded.length) { lat += next(); lng += next(); out.push({ lat: lat / f, lng: lng / f }); }
  return out;
}

/** Runs of stops that fit one request. Neighbouring runs share their joining stop, so the legs meet. */
export function chunkStops<T>(stops: T[], max = MAX_STOPS_PER_REQUEST): T[][] {
  const runs: T[][] = [];
  for (let i = 0; i < stops.length - 1; i += max - 1) runs.push(stops.slice(i, i + max));
  return runs;
}

type Trip = { trip?: { legs?: { shape?: string }[]; summary?: { length?: number; time?: number } } };

/** The road route a motorcycle can ride through the stops, in order. Stops off a road are moved to the nearest one. */
export async function roadRoute(stops: LatLng[], signal?: AbortSignal): Promise<PlannedRoute> {
  const points: LatLng[] = [];
  let km = 0, seconds = 0;
  for (const run of chunkStops(stops)) {
    const res = await fetch(VALHALLA, {
      method: 'POST', signal, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locations: run.map((p) => ({ lat: p.lat, lon: p.lng, type: 'break' })), costing: 'motorcycle', directions_options: { units: 'kilometers' } }),
    });
    if (!res.ok) throw new Error(`routing ${res.status}`);
    const { trip } = (await res.json()) as Trip;
    if (!trip?.legs?.length || trip.summary?.length === undefined) throw new Error('routing returned no route');
    for (const leg of trip.legs) {
      const shape = decodePolyline(leg.shape ?? '');
      points.push(...(points.length ? shape.slice(1) : shape));
    }
    km += trip.summary.length; seconds += trip.summary.time ?? 0;
  }
  return { points: simplify(points, SIMPLIFY_M), distanceKm: km, etaMin: Math.round(seconds / 60) };
}
