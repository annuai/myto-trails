import type { LatLng } from './geo';
import { simplify } from './routePlan';
import { segmentsOf } from './track';

type Pt = { lat: number; lng: number };
type HeatRide = { startedAt: number; distanceKm: number; points: LatLng[]; breaks?: number[]; sample?: boolean };

/** A run of a ride's own track, and how often that stretch of road was ridden: 0 for once, up to 1 for the road ridden most. */
export type HeatLine = { points: Pt[]; heat: number };
/** A place ridden, for the soft glow under the lines, with the same 0 to 1 heat. */
export type HeatDot = Pt & { heat: number };
export type HeatMap = { lines: HeatLine[]; dots: HeatDot[] };

/** A cell is 0.0006 degrees: about 65 m, wide enough that two rides of one road land in the same cell despite GPS wander. */
export const CELL_DEG = 0.0006;
/** The most glow dots handed to the map. A long history gets coarser cells (up to eight times) rather than a slow map. */
export const MAX_DOTS = 20_000;
const MAX_CELL_DEG = CELL_DEG * 8;
/** The drawn line may stray this far from the recorded track: enough to drop GPS noise, little enough to keep every bend. */
const SIMPLIFY_M = 6;
/** Heat is shown in this many steps, so a road is a few clean runs and not a different colour at every point. */
const LEVELS = 4;
/** A point's heat is smoothed over this many points either side, so one stray point never breaks a run. */
const SMOOTH = 2;

const key = (y: number, x: number) => `${y}:${x}`;

/** The cells a segment passes through, each once. Points can be far apart at speed, so the gaps are filled half a cell at a time. */
function addCells(into: Set<string>, seg: Pt[], cell: number) {
  const add = (lat: number, lng: number) => into.add(key(Math.floor(lat / cell), Math.floor(lng / cell)));
  for (let i = 0; i < seg.length; i++) {
    const a = seg[i]!;
    add(a.lat, a.lng);
    const b = seg[i + 1];
    if (!b) continue;
    const steps = Math.floor(Math.max(Math.abs(b.lat - a.lat), Math.abs(b.lng - a.lng)) / (cell / 2));
    for (let s = 1; s < steps; s++) add(a.lat + ((b.lat - a.lat) * s) / steps, a.lng + ((b.lng - a.lng) * s) / steps);
  }
}

/** How many rides passed through each cell; a ride counts a cell once however often it crossed it. */
function cellCounts(segments: Pt[][][], cell: number): Map<string, number> {
  const counts = new Map<string, number>();
  for (const ride of segments) {
    const mine = new Set<string>();
    for (const seg of ride) addCells(mine, seg, cell);
    for (const k of mine) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return counts;
}

/** Points no further apart than `step` degrees, so heat can change part-way along a long straight stretch. */
function densify(seg: Pt[], step: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < seg.length; i++) {
    const a = seg[i]!;
    out.push(a);
    const b = seg[i + 1];
    if (!b) continue;
    const n = Math.ceil(Math.max(Math.abs(b.lat - a.lat), Math.abs(b.lng - a.lng)) / step);
    for (let s = 1; s < n; s++) out.push({ lat: a.lat + ((b.lat - a.lat) * s) / n, lng: a.lng + ((b.lng - a.lng) * s) / n });
  }
  return out;
}

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;

/**
 * Where the rider has been, drawn as the rides' own tracks and not as a grid: each ride is simplified, cut wherever the road's heat
 * changes, and each piece carries its heat (0 once, 1 the road ridden most, in steps). Neighbouring pieces share an end, so a road is
 * one unbroken line. Lines are sorted coolest first so the busiest are drawn on top. The glow is one dot per cell ridden.
 * The sample ride never counts; nothing is drawn across a break in a track.
 */
export function heatMap(rides: HeatRide[], cell = CELL_DEG, maxDots = MAX_DOTS): HeatMap {
  const segments = rides.filter((r) => !r.sample).map((r) => segmentsOf(r.points, r.breaks ?? []).filter((s) => s.length >= 2));
  let size = cell, counts = cellCounts(segments, size);
  while (counts.size > maxDots && size < MAX_CELL_DEG) { size *= 2; counts = cellCounts(segments, size); }
  const most = Math.max(1, ...counts.values());
  const level = (n: number) => (most === 1 ? 0 : Math.round(((n - 1) / (most - 1)) * LEVELS) / LEVELS);
  /** The busiest of a cell and its eight neighbours, so two rides a little apart on one road still read as shared. */
  const near = (lat: number, lng: number) => {
    const y = Math.floor(lat / size), x = Math.floor(lng / size);
    let n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) n = Math.max(n, counts.get(key(y + dy, x + dx)) ?? 0);
    return n;
  };

  const lines: HeatLine[] = [];
  for (const ride of segments) {
    for (const seg of ride) {
      const pts = densify(simplify(seg, SIMPLIFY_M) as Pt[], size / 2);
      const raw = pts.map((p) => level(near(p.lat, p.lng)));
      const lv = raw.map((_, i) => median(raw.slice(Math.max(0, i - SMOOTH), i + SMOOTH + 1)));
      let from = 0;
      for (let i = 1; i <= pts.length; i++) {
        if (i === pts.length || lv[i] !== lv[from]) {
          // The piece runs to the first point of the next heat, so it meets the next piece instead of stopping short of it.
          const end = i === pts.length ? i : i + 1;
          if (end - from >= 2) lines.push({ points: pts.slice(from, end), heat: lv[from]! });
          from = i;
        }
      }
    }
  }
  lines.sort((a, b) => a.heat - b.heat);

  const dots = [...counts.entries()].map(([k, n]) => {
    const [y, x] = k.split(':').map(Number) as [number, number];
    return { lat: (y + 0.5) * size, lng: (x + 0.5) * size, heat: level(n) };
  });
  return { lines, dots };
}

export type HeatRange = 'all' | 'year' | 'quarter';
const DAY_MS = 86_400_000;

/** The rides inside a range: all of them, this calendar year, or the last 90 days. */
export function ridesIn<T extends { startedAt: number }>(rides: T[], range: HeatRange, now: number): T[] {
  if (range === 'all') return rides;
  const from = range === 'year' ? new Date(new Date(now).getFullYear(), 0, 1).getTime() : now - 90 * DAY_MS;
  return rides.filter((r) => r.startedAt >= from);
}

/** What the heat map is made of, for the line under it: real rides only, and their distance. */
export function heatSummary(rides: HeatRide[]): { rides: number; distanceKm: number } {
  const real = rides.filter((r) => !r.sample);
  return { rides: real.length, distanceKm: real.reduce((n, r) => n + r.distanceKm, 0) };
}

/** The box around everything drawn, for fitting the camera. */
export function heatBounds(map: HeatMap): [number, number, number, number] | undefined {
  const pts = map.lines.length ? map.lines.flatMap((l) => l.points) : map.dots;
  if (!pts.length) return undefined;
  const lngs = pts.map((p) => p.lng), lats = pts.map((p) => p.lat);
  return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
}

/** The lines as map features, each carrying its heat. */
export function heatLineFeatures(map?: HeatMap) {
  return {
    type: 'FeatureCollection' as const,
    features: (map?.lines ?? []).map((l) => ({ type: 'Feature' as const, properties: { heat: l.heat }, geometry: { type: 'LineString' as const, coordinates: l.points.map((p) => [p.lng, p.lat] as [number, number]) } })),
  };
}

/** The glow dots as map features, each carrying its heat. */
export function heatDotFeatures(map?: HeatMap) {
  return {
    type: 'FeatureCollection' as const,
    features: (map?.dots ?? []).map((d) => ({ type: 'Feature' as const, properties: { heat: d.heat }, geometry: { type: 'Point' as const, coordinates: [d.lng, d.lat] as [number, number] } })),
  };
}
