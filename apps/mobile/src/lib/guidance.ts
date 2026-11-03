import type { LatLng } from './geo';
import { OFF_ROUTE_M } from './routeFollow';
import { compassWord, type Guide, type Turn } from './trailGuide';
import { navigateStep, type Directions, type TurnKind } from './turnByTurn';

/**
 * What the ride screen tells the rider to do next, whichever way it was worked out: from road directions to a place, or from the
 * shape of a trail line. One shape so one card on the map can show either.
 */
export type Instruction = {
  kind: TurnKind;
  /** Metres to the manoeuvre; null when there is none to count to (a stretch of straight trail). */
  distM: number | null;
  text: string;
  /** What this guidance is about, in a word or two: "To the start", "Trail", "Group destination". */
  eyebrow: string;
  remainingM: number | null;
  etaMin: number | null;
  /** The rider has left the line; the card says so while a new way is found. */
  off: boolean;
  arrived: boolean;
};

/** The road directions to a place, read at the rider's position. */
export function fromDirections(d: Directions, here: LatLng, eyebrow: string): Instruction {
  const nav = navigateStep(d, here);
  const etaMin = nav.arrived ? 0 : Math.max(1, Math.round((d.etaMin * nav.remainingM) / Math.max(1, d.totalM)));
  return { kind: nav.arrived ? 'arrive' : nav.next.kind, distM: nav.arrived ? null : nav.toNextM, text: nav.arrived ? 'You have arrived' : nav.next.text, eyebrow, remainingM: nav.remainingM, etaMin, off: !nav.arrived && nav.offM > OFF_ROUTE_M, arrived: nav.arrived };
}

const TRAIL_TURN: Record<Turn['dir'], TurnKind> = { left: 'left', right: 'right', 'sharp left': 'sharp left', 'sharp right': 'sharp right' };
const sentence = (dir: string) => `Turn ${dir}`;

/** A trail line's guide: head for the start, then the next bend along it, then the end. `off` is the monitor's verdict, not a single reading. */
export function fromTrail(g: Guide, start: LatLng | undefined, here: LatLng | undefined, off: boolean): Instruction {
  if (g.phase === 'to_start') return { kind: 'straight', distM: g.toStartM, text: here && start ? `Head ${compassWord(here, start)} to the start` : 'Head to the start', eyebrow: 'To the start', remainingM: null, etaMin: null, off: false, arrived: false };
  if (g.phase === 'finished') return { kind: 'arrive', distM: null, text: 'You reached the end of the trail', eyebrow: 'Trail', remainingM: 0, etaMin: 0, off: false, arrived: true };
  if (g.next) return { kind: TRAIL_TURN[g.next.dir], distM: g.next.distM, text: sentence(g.next.dir), eyebrow: 'Trail', remainingM: g.remainingM, etaMin: null, off, arrived: false };
  return { kind: 'straight', distM: null, text: 'Follow the trail', eyebrow: 'Trail', remainingM: g.remainingM, etaMin: null, off, arrived: false };
}
