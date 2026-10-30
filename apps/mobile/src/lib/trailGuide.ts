import { haversine, type LatLng } from './geo';
import { nearestOnLine } from './routeFollow';

/**
 * Guidance for riding a trail line: first to its start, then along it. Pure like lib/routeFollow: a position goes in, what to tell the
 * rider comes out. There is no routing engine behind it (that would cost money): the way is the trail's own line, so the turns it names
 * are read from the line's shape, and the way to the start is the straight line plus a link that opens Google Maps for the road.
 */
export type TrailLine = { line: LatLng[]; /** Metres from the start of the line to each point. */ cum: number[]; totalM: number };
export function prepareTrail(line: LatLng[]): TrailLine {
  const cum = [0];
  for (let i = 1; i < line.length; i++) cum.push(cum[i - 1]! + haversine(line[i - 1]!, line[i]!));
  return { line, cum, totalM: cum[cum.length - 1] ?? 0 };
}

export type GuidePhase = 'to_start' | 'on_trail' | 'finished';
export type GuideState = { phase: GuidePhase; /** The furthest the rider has got along the line. It keeps a loop, whose end is its start, from looking finished at once. */ furthestM: number; /** The segment last matched, to search near it first. */ segment: number };
export const startGuide: GuideState = { phase: 'to_start', furthestM: 0, segment: 0 };
export type Turn = { dir: 'left' | 'right' | 'sharp left' | 'sharp right'; distM: number };
export type Guide = { phase: GuidePhase; toStartM: number; alongM: number; remainingM: number; offM: number; next?: Turn };

/** Close enough to the start (or to the line anywhere) to count as on the trail. */
export const AT_START_M = 150;
export const ON_LINE_M = 50;
export const AT_END_M = 100;
/** A finish needs this share of the trail ridden, so a loop is not over where it begins. */
const FINISH_SHARE = 0.6;
/** Beyond this from the line the nearby search is given up for a search of the whole line. */
const LOST_M = 150;
const START_STRETCH_M = 300;
const WINDOW_BEHIND = 5;
const WINDOW_AHEAD = 120;

/** The nearest point on the line, looked for near where the rider was last, so the far end of a loop is not mistaken for the start. */
function locate(t: TrailLine, hint: number, p: LatLng, ahead: number = WINDOW_AHEAD): { distM: number; alongM: number; segment: number } {
  const from = Math.max(0, hint - WINDOW_BEHIND), to = Math.min(t.line.length, hint + ahead);
  const near = to - from >= 2 ? nearestOnLine(t.line.slice(from, to), p) : null;
  if (near && near.distM <= LOST_M) return { distM: near.distM, alongM: t.cum[from]! + near.alongM, segment: from + near.segment };
  const all = nearestOnLine(t.line, p);
  return all ? { distM: all.distM, alongM: all.alongM, segment: all.segment } : { distM: Infinity, alongM: 0, segment: 0 };
}

const bearing = (a: LatLng, b: LatLng) => {
  const rad = Math.PI / 180, dLng = (b.lng - a.lng) * rad;
  const y = Math.sin(dLng) * Math.cos(b.lat * rad), x = Math.cos(a.lat * rad) * Math.sin(b.lat * rad) - Math.sin(a.lat * rad) * Math.cos(b.lat * rad) * Math.cos(dLng);
  return ((Math.atan2(y, x) / rad) + 360) % 360;
};
const COMPASS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
/** The compass word for the way from `a` to `b`: "north-east". */
export const compassWord = (a: LatLng, b: LatLng): string => COMPASS[Math.round(bearing(a, b) / 45) % 8]!;

/** The point `d` metres along the line. */
function pointAt(t: TrailLine, d: number): LatLng {
  const x = Math.max(0, Math.min(t.totalM, d));
  let i = 1;
  while (i < t.cum.length - 1 && t.cum[i]! < x) i++;
  const a = t.line[i - 1]!, b = t.line[i]!, span = t.cum[i]! - t.cum[i - 1]! || 1, f = (x - t.cum[i - 1]!) / span;
  return { lat: a.lat + (b.lat - a.lat) * f, lng: a.lng + (b.lng - a.lng) * f };
}

const LOOK_M = 400, ARM_M = 40, STEP_M = 10, TURN_DEG = 40, SHARP_DEG = 110;
/**
 * The next turn within 400 m along the line: the first place where the heading over the 40 m after a point differs from the heading
 * over the 40 m before it by 40 degrees or more, taken at its sharpest. Bends gentler than that are just the road.
 */
export function turnAhead(t: TrailLine, alongM: number): Turn | undefined {
  let best: { delta: number; at: number } | undefined;
  for (let d = alongM + ARM_M; d <= Math.min(t.totalM - ARM_M, alongM + LOOK_M); d += STEP_M) {
    const delta = ((bearing(pointAt(t, d), pointAt(t, d + ARM_M)) - bearing(pointAt(t, d - ARM_M), pointAt(t, d)) + 540) % 360) - 180;
    if (Math.abs(delta) >= TURN_DEG && (!best || Math.abs(delta) > Math.abs(best.delta))) best = { delta, at: d };
    else if (best && Math.abs(delta) < TURN_DEG) break; // past the bend: the sharpest point of it is already found
  }
  if (!best) return undefined;
  const sharp = Math.abs(best.delta) >= SHARP_DEG;
  return { dir: best.delta > 0 ? (sharp ? 'sharp right' : 'right') : (sharp ? 'sharp left' : 'left'), distM: Math.max(0, best.at - alongM) };
}

/** One step: where the rider is, which phase they are in, and what to say. The state moves on only forwards: to the start, along the trail, finished. */
export function stepGuide(s: GuideState, t: TrailLine, p: LatLng): { state: GuideState; guide: Guide } {
  const start = t.line[0];
  if (!start) return { state: s, guide: { phase: s.phase, toStartM: 0, alongM: 0, remainingM: 0, offM: Infinity } };
  const toStartM = haversine(p, start);
  // At the start of a loop the end of the line is just as near, so only its first stretch is looked at.
  const atStart = s.phase === 'to_start' && toStartM <= AT_START_M;
  const firstStretch = t.cum.findIndex((c) => c > START_STRETCH_M);
  const here = locate(t, s.phase === 'to_start' ? 0 : s.segment, p, atStart ? (firstStretch < 0 ? t.line.length : firstStretch + 1) : WINDOW_AHEAD);
  let phase = s.phase, furthestM = s.furthestM;
  if (phase === 'to_start' && (toStartM <= AT_START_M || here.distM <= ON_LINE_M)) phase = 'on_trail';
  if (phase === 'on_trail' && here.distM <= ON_LINE_M) furthestM = Math.max(furthestM, here.alongM);
  const remainingM = Math.max(0, t.totalM - here.alongM);
  if (phase === 'on_trail' && furthestM >= t.totalM * FINISH_SHARE && remainingM <= AT_END_M && here.distM <= ON_LINE_M * 2) phase = 'finished';
  const state: GuideState = { phase, furthestM, segment: here.segment };
  return { state, guide: { phase, toStartM, alongM: here.alongM, remainingM, offM: here.distM, ...(phase === 'on_trail' && here.distM <= ON_LINE_M * 2 ? { next: turnAhead(t, here.alongM) } : {}) } };
}
