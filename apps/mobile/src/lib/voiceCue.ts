import type { Instruction } from './guidance';
import { shortDistanceM, spoken } from './units';

/**
 * When to speak a turn. Pure: an instruction and the speed go in, a sentence (or nothing) comes out. Each turn is said at most twice: once
 * early, so the rider can get into lane ("In 800 metres, turn left onto MG Road"), and once as it comes up ("Turn left onto MG Road").
 * Both points move with speed, like a rider's own sense of "soon". Arrival and a lost route are each said once.
 */
export const PREPARE_MIN_M = 400;
export const PREPARE_MAX_M = 2_000;
/** How many seconds before a turn the first voice cue is spoken, at the rider's speed. */
export const PREPARE_S = 25;
/** The least distance for the 'now' cue. */
export const NOW_MIN_M = 60;
/** How many seconds before a turn the 'now' cue is spoken, at the rider's speed. */
export const NOW_S = 7;
/** A turn with the same words but this much further away than before is the next one (a trail has many "Turn left"s). */
const NEW_TURN_JUMP_M = 100;

/** What has been said for the current instruction. */
export type VoiceState = { key: string; lastDistM: number | null; prepared: boolean; now: boolean; arrived: boolean; off: boolean };
/** The state before anything has been said. */
export const startVoice: VoiceState = { key: '', lastDistM: null, prepared: false, now: false, arrived: false, off: false };

/** The distance at which the first cue is spoken, for a speed. */
export const prepareAtM = (speedMps: number): number => Math.min(PREPARE_MAX_M, Math.max(PREPARE_MIN_M, speedMps * PREPARE_S));
/** The distance at which the 'now' cue is spoken, for a speed. */
export const nowAtM = (speedMps: number): number => Math.max(NOW_MIN_M, speedMps * NOW_S);

/** A distance as a rider would say it: tidy steps, never "In 437 metres". */
export function sayDistance(m: number): string {
  const tidy = m < 200 ? Math.round(m / 10) * 10 : m < 1000 ? Math.round(m / 50) * 50 : Math.round(m / 100) * 100;
  return spoken(shortDistanceM(Math.max(10, tidy)));
}

/** Lower-cases the first letter so the turn reads on after "In 300 metres, ". */
const after = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);
const clean = (text: string) => text.replace(/\.$/, '');

/** Works out what to say, if anything, for the current instruction and speed, and the new state. */
export function voiceStep(s: VoiceState, ins: Instruction, speedMps: number): { state: VoiceState; say?: string } {
  if (ins.arrived) return s.arrived ? { state: s } : { state: { ...startVoice, arrived: true }, say: clean(ins.text) || 'You have arrived' };
  if (ins.off) return s.off ? { state: s } : { state: { ...s, off: true }, say: 'Off the route. Finding a new way' };
  const key = `${ins.eyebrow}|${ins.kind}|${ins.text}`;
  let st: VoiceState = { ...s, arrived: false, off: false };
  const isNew = key !== s.key || (ins.distM !== null && s.lastDistM !== null && ins.distM > s.lastDistM + NEW_TURN_JUMP_M);
  if (isNew) st = { ...st, key, prepared: false, now: false };
  st.lastDistM = ins.distM;
  // "Continue on", "Head north" and "Finding the road" are for the screen; only real turns are spoken.
  if (ins.distM === null || ins.kind === 'straight') return { state: st };
  const text = clean(ins.text);
  if (!text) return { state: st };
  if (!st.now && ins.distM <= nowAtM(speedMps)) return { state: { ...st, now: true, prepared: true }, say: text };
  // A turn first heard about well inside the early point (a new route, the screen just opened) is still announced once, with its distance.
  if (!st.prepared && ins.distM <= prepareAtM(speedMps)) return { state: { ...st, prepared: true }, say: `In ${sayDistance(ins.distM)}, ${after(text)}` };
  return { state: st };
}
