import { haversine, pathLength, type LatLng } from './geo';
import { bboxOf, buildOverpassQuery, fuelGaps, parseOverpass, type FuelGaps, type FuelStation } from './fuel';
import { forecastUrl, parseForecast, type DayForecast } from './weather';

/** The public Overpass server times out on a big box, so a long route is asked for in pieces of this length. */
export const CHUNK_KM = 60;
export const MAX_CHUNKS = 8;

/** Splits a route into pieces about `maxKm` long that share their end points, so no stretch is left out. */
export function chunkLine(line: LatLng[], maxKm: number = CHUNK_KM): LatLng[][] {
  const out: LatLng[][] = [];
  let cur: LatLng[] = [];
  let km = 0;
  line.forEach((p, i) => {
    if (cur.length && i > 0) km += haversine(line[i - 1]!, p) / 1000;
    cur.push(p);
    if (km >= maxKm) { out.push(cur); cur = [p]; km = 0; }
  });
  if (cur.length > 1) out.push(cur);
  return out;
}

const OVERPASS = 'https://overpass-api.de/api/interpreter';
const dedupe = (stations: FuelStation[]) => { const seen = new Set<string>(); return stations.filter((s) => { const k = `${s.lat.toFixed(4)},${s.lng.toFixed(4)}`; if (seen.has(k)) return false; seen.add(k); return true; }); };

export type RouteCheck = { fuel: FuelGaps | null; days: DayForecast[]; tooLong: boolean };

/** Fuel stops along a route (OpenStreetMap, through Overpass) and the next days' weather where it starts. Either part may be missing. */
export async function checkRoute(line: LatLng[], fetcher: typeof fetch = fetch): Promise<RouteCheck> {
  const chunks = chunkLine(line);
  // Judged by length, not by point count: a route of three far-apart taps is one long piece, not a short one.
  const tooLong = pathLength(line) / 1000 > CHUNK_KM * MAX_CHUNKS || chunks.some((c) => pathLength(c) / 1000 > CHUNK_KM * 2);
  const weather = fetcher(forecastUrl(line[0]!.lat, line[0]!.lng)).then((r) => r.json()).then(parseForecast).catch((): DayForecast[] => []);
  let fuel: FuelGaps | null = null;
  if (!tooLong) {
    const found: FuelStation[] = [];
    let failed = false;
    for (const c of chunks) {
      const box = bboxOf(c);
      if (!box) continue;
      try {
        const res = await fetcher(OVERPASS, { method: 'POST', body: `data=${encodeURIComponent(buildOverpassQuery(box))}`, headers: { 'content-type': 'application/x-www-form-urlencoded' } });
        if (!res.ok) throw new Error('overpass');
        found.push(...parseOverpass(await res.json()));
      } catch { failed = true; break; }
    }
    // A partial answer would claim a fuel desert that is only a missing piece, so any failure means no answer.
    fuel = failed ? null : fuelGaps(line, dedupe(found));
  }
  return { fuel, days: await weather, tooLong };
}
