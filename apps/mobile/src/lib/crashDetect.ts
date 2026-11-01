/**
 * Whether the rider has just crashed: a hard impact while riding fast, the bike stopping dead, then no sign the rider is up or riding on.
 * Pure like lib/motionFusion: the sensors sit outside, evidence goes in, a yes comes out. Thresholds are first guesses to be tuned on
 * recorded rides, and lean towards missing a crash rather than raising a false alarm (docs/superpowers/specs/2026-10-29-crash-detection-design.md).
 */
export type CrashEvidence =
  | { k: 'gps'; t: number; /** km/h */ kmh: number }
  /** One accelerometer window: its largest reading in g (gravity included), and steps per second when it shows a walking rhythm. */
  | { k: 'window'; t: number; peak: number; stepHz: number }
  | { k: 'tick'; t: number };

export type CrashState = {
  /** Recent GPS speeds, newest last. */
  speeds: { t: number; kmh: number }[];
  /** An impact that is waiting to be confirmed. `stopped` once the bike has been seen stopping dead. */
  suspect?: { t: number; stopped: boolean };
};
export const initialCrash: CrashState = { speeds: [] };

export const MOVING_KMH = 25;
export const IMPACT_G = 4;
/** Road reacts to smaller impacts at lower speeds; off-road shrugs off the knocks of rough trails. */
export const ROAD_IMPACT_G = 3;
export const ROAD_MOVING_KMH = 20;
export const OFFROAD_IMPACT_G = 6;
export const OFFROAD_MOVING_KMH = 30;
export const STOPPED_KMH = 8;
export const RIDING_KMH = 15;
export type CrashPreset = 'road' | 'mixed' | 'offroad';
export const CRASH_PRESETS: CrashPreset[] = ['road', 'mixed', 'offroad'];
const TUNING: Record<CrashPreset, { impactG: number; movingKmh: number }> = {
  road: { impactG: ROAD_IMPACT_G, movingKmh: ROAD_MOVING_KMH },
  mixed: { impactG: IMPACT_G, movingKmh: MOVING_KMH },
  offroad: { impactG: OFFROAD_IMPACT_G, movingKmh: OFFROAD_MOVING_KMH },
};
/** The impact and speed thresholds for a kind of riding. `mixed` is the original behaviour. */
export function tuning(p: CrashPreset): { impactG: number; movingKmh: number } { return TUNING[p]; }

const LOOKBACK_MS = 12_000;
/** A fix this soon after the impact window may still carry the speed from before it. */
const SETTLE_MS = 1_000;
const STOP_BY_MS = 6_000;
const RIDE_ON_AFTER_MS = 3_000;
const CONFIRM_MS = 12_000;
const GIVE_UP_MS = 30_000;

/** One step. `crash` is true once, on the evidence that completes the picture; the impact is then forgotten. */
export function stepCrash(s: CrashState, e: CrashEvidence, t = tuning('mixed')): { state: CrashState; crash: boolean } {
  const speeds = e.k === 'window' ? s.speeds : [...s.speeds, ...(e.k === 'gps' ? [{ t: e.t, kmh: e.kmh }] : [])].filter((p) => e.t - p.t <= LOOKBACK_MS);
  let suspect = s.suspect;

  if (e.k === 'gps' && suspect) {
    const dt = e.t - suspect.t;
    if (dt >= RIDE_ON_AFTER_MS && e.kmh >= RIDING_KMH) suspect = undefined;
    else if (dt >= SETTLE_MS && dt <= STOP_BY_MS && e.kmh < STOPPED_KMH) suspect = { ...suspect, stopped: true };
  }

  if (e.k === 'window') {
    if (suspect) {
      if (e.stepHz > 0 && e.t - suspect.t >= RIDE_ON_AFTER_MS) suspect = undefined;
    } else if (e.peak >= t.impactG) {
      const before = Math.max(0, ...s.speeds.filter((p) => e.t - p.t <= LOOKBACK_MS).map((p) => p.kmh));
      if (before >= t.movingKmh) suspect = { t: e.t, stopped: false };
    }
  }

  let crash = false;
  if (e.k === 'tick' && suspect) {
    const dt = e.t - suspect.t;
    if (dt >= CONFIRM_MS && suspect.stopped) { crash = true; suspect = undefined; }
    else if (dt >= GIVE_UP_MS) suspect = undefined;
  }
  return { state: { speeds, suspect }, crash };
}
