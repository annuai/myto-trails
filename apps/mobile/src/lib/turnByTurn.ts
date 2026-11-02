import { haversine, type LatLng } from './geo';
import { decodePolyline } from './roadRoute';
import { nearestOnLine } from './routeFollow';

const VALHALLA = 'https://valhalla1.openstreetmap.de/route';

export type TurnKind = 'straight' | 'left' | 'right' | 'slight left' | 'slight right' | 'sharp left' | 'sharp right' | 'uturn' | 'roundabout' | 'arrive';
/** One manoeuvre: what to do, and how far along the line it is. */
export type Step = { text: string; kind: TurnKind; /** Metres from the start of the line to where it happens. */ atM: number };
export type Directions = { line: LatLng[]; steps: Step[]; totalM: number; etaMin: number };

/** Valhalla's manoeuvre types, folded to the few the screen draws. */
export function turnKind(type: number): TurnKind {
  if (type >= 4 && type <= 6) return 'arrive';
  if (type === 9 || type === 23) return 'slight right';
  if (type === 16 || type === 24) return 'slight left';
  if (type === 10 || type === 18 || type === 20) return 'right';
  if (type === 11) return 'sharp right';
  if (type === 12 || type === 13) return 'uturn';
  if (type === 14) return 'sharp left';
  if (type === 15 || type === 19 || type === 21) return 'left';
  if (type === 26 || type === 27) return 'roundabout';
  return 'straight';
}

type Maneuver = { instruction?: string; type?: number; begin_shape_index?: number };
type Trip = { trip?: { legs?: { shape?: string; maneuvers?: Maneuver[] }[]; summary?: { time?: number } } };

/** The road line and its turns, from Valhalla's answer. The line is kept whole: the turns point into it by index. */
export function parseDirections(body: Trip): Directions {
  const leg = body.trip?.legs?.[0];
  if (!leg?.shape || !leg.maneuvers?.length) throw new Error('routing returned no route');
  const line = decodePolyline(leg.shape);
  const cum = [0];
  for (let i = 1; i < line.length; i++) cum.push(cum[i - 1]! + haversine(line[i - 1]!, line[i]!));
  const steps = leg.maneuvers.map((m): Step => ({ text: m.instruction ?? '', kind: turnKind(m.type ?? 0), atM: cum[Math.min(m.begin_shape_index ?? 0, cum.length - 1)] ?? 0 }));
  return { line, steps, totalM: cum[cum.length - 1] ?? 0, etaMin: Math.round((body.trip?.summary?.time ?? 0) / 60) };
}

/** The road to `to` for a motorcycle, with its turns. */
export async function fetchDirections(from: LatLng, to: LatLng, signal?: AbortSignal): Promise<Directions> {
  const res = await fetch(VALHALLA, {
    method: 'POST', signal, headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ locations: [from, to].map((p) => ({ lat: p.lat, lon: p.lng, type: 'break' })), costing: 'motorcycle', directions_options: { units: 'kilometers' } }),
  });
  if (!res.ok) throw new Error(`routing ${res.status}`);
  return parseDirections((await res.json()) as Trip);
}

/** Within this of the end counts as arrived. */
export const ARRIVED_M = 40;

export type NavState = { /** The turn to make next, or the arrival. */ next: Step; /** Metres to it. */ toNextM: number; remainingM: number; offM: number; arrived: boolean };

/** Where the rider is on the directions: the next turn, how far to it and to the end, and how far they are from the line. */
export function navigateStep(d: Directions, p: LatLng): NavState {
  const at = nearestOnLine(d.line, p);
  const alongM = at?.alongM ?? 0;
  const last = d.steps[d.steps.length - 1]!;
  const next = d.steps.find((s) => s.atM > alongM + 1) ?? last;
  const remainingM = Math.max(0, d.totalM - alongM);
  return { next, toNextM: Math.max(0, next.atM - alongM), remainingM, offM: at?.distM ?? Infinity, arrived: remainingM <= ARRIVED_M };
}
