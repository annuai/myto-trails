import { haversine } from './geo';

/**
 * Whether the rider is riding, crawling in traffic, stopped, or on foot, from several weak signals instead of GPS speed alone.
 * Pure like lib/motion: the sensors and the OS sit outside, events go in, a state with a confidence comes out. Thresholds below are
 * first guesses for a phone in a pocket; they are meant to be tuned by replaying recorded rides (see motionReplay).
 */
export type Activity = 'riding' | 'crawling' | 'stopped_brief' | 'stopped_parked' | 'on_foot' | 'unknown';
/** What the phone's own activity recognition says, when it is allowed and available. */
export type OsActivity = 'automotive' | 'walking' | 'stationary' | 'unknown';

export type Evidence =
  | { k: 'gps'; t: number; lat: number; lng: number; /** metres per second; null or negative means no reading */ speed?: number | null; /** metres */ acc?: number }
  | { k: 'shake'; t: number; /** spread of the acceleration magnitude over a short window, in g */ vib: number; /** steps per second when the window shows a walking rhythm, else 0 */ stepHz: number }
  | { k: 'os'; t: number; activity: OsActivity }
  | { k: 'tick'; t: number };

type Fix = { t: number; lat: number; lng: number; speed: number | null; acc: number };
export type Fusion = {
  state: Activity;
  /** 0 to 1: how much the evidence backs the state. Consumers act on a stop only above their own bar. */
  confidence: number;
  /** when the state began */
  since: number;
  fixes: Fix[];
  shake?: { t: number; vib: number; stepHz: number };
  os?: { t: number; activity: OsActivity };
  candidate?: { state: Activity; since: number };
  /** when evidence last arrived, of any kind */
  lastAt: number;
};
export const initialFusion: Fusion = { state: 'unknown', confidence: 0, since: 0, fixes: [], lastAt: 0 };

// Evidence windows and freshness (ms).
const WINDOW_MS = 30_000;
const GPS_FRESH_MS = 10_000;
const SHAKE_FRESH_MS = 6_000;
const OS_FRESH_MS = 20_000;
// GPS counts only at this accuracy or better (metres).
const GOOD_ACC_M = 25;
// Speeds (km/h).
const RIDING_KMH = 15;
const CRAWL_KMH = 4;
const STILL_KMH = 2;
const WALK_MAX_KMH = 12;
// Net displacement over the window counts as travel when it clears this many fix accuracies.
const TRAVEL_ACCURACIES = 2;
const TRAVEL_MIN_M = 15;
const TRAVEL_MIN_SPAN_MS = 8_000;
// Travel is judged on the last stretch only, so a stop is not hidden by the road just ridden.
const TRAVEL_WINDOW_MS = 12_000;
// Acceleration spread (g): a bike on the road in a pocket vs. a body walking.
const VIB_ON = 0.03;
const WALK_VIB = 0.15;
const STEP_HZ_MIN = 1.2;
const STEP_HZ_MAX = 3;
// How long a different reading must hold before the state changes (ms). Leaving a movement state is slower than entering it.
const ENTER_MOVING_MS = 5_000;
const LEAVE_MOVING_MS = 20_000;
const ENTER_FOOT_MS = 6_000;
const LEAVE_FOOT_MS = 6_000;
const PARKED_AFTER_MS = 120_000;
// With no evidence at all the last state is held this long, then it is unknown.
const HOLD_MS = 30_000;

const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)]! : null; };
const moving = (a: Activity) => a === 'riding' || a === 'crawling';
const stopped = (a: Activity) => a === 'stopped_brief' || a === 'stopped_parked';

type Reading = { state: Activity; confidence: number };

/** What the evidence says right now, with no memory of what was said before. */
function read(s: Fusion, now: number): Reading {
  const fixes = s.fixes.filter((f) => now - f.t <= WINDOW_MS);
  const good = fixes.filter((f) => f.acc <= GOOD_ACC_M);
  const fresh = good.filter((f) => now - f.t <= GPS_FRESH_MS);
  const speeds = fresh.map((f) => f.speed).filter((v): v is number => v !== null).map((v) => v * 3.6);
  const kmh = median(speeds);
  const shake = s.shake && now - s.shake.t <= SHAKE_FRESH_MS ? s.shake : undefined;
  const os = s.os && now - s.os.t <= OS_FRESH_MS ? s.os.activity : undefined;
  const vibrating = !!shake && shake.vib >= VIB_ON;
  const stepping = !!shake && shake.stepHz >= STEP_HZ_MIN && shake.stepHz <= STEP_HZ_MAX && shake.vib >= WALK_VIB;
  const recent = good.filter((f) => now - f.t <= TRAVEL_WINDOW_MS);
  const first = recent[0], last = recent[recent.length - 1];
  const span = first && last ? last.t - first.t : 0;
  const noise = Math.max(0, ...recent.map((f) => f.acc));
  const travelled = first && last && span >= TRAVEL_MIN_SPAN_MS ? haversine(first, last) : 0;
  const travelling = travelled > Math.max(TRAVEL_MIN_M, TRAVEL_ACCURACIES * noise);
  const hasGps = fresh.length > 0;
  // The OS agreeing (or not) moves the confidence, never the state on its own, except as a tie-breaker below.
  const agree = (a: Activity) => (os === 'automotive' && (a === 'riding' || a === 'crawling')) || (os === 'walking' && a === 'on_foot') || (os === 'stationary' && stopped(a)) ? 0.1 : os && os !== 'unknown' ? -0.1 : 0;
  const out = (state: Activity, confidence: number): Reading => ({ state, confidence: Math.max(0, Math.min(1, confidence + agree(state))) });

  // On foot: a walking rhythm with no vehicle speed. It beats "slow GPS", which is what walking around the bike looks like.
  if (stepping && (kmh === null || kmh < WALK_MAX_KMH) && os !== 'automotive') return out('on_foot', hasGps ? 0.85 : 0.7);
  if (os === 'walking' && !vibrating && (kmh === null || kmh < WALK_MAX_KMH)) return out('on_foot', 0.6);
  if (kmh !== null && kmh >= RIDING_KMH) return out('riding', 0.9);
  if (kmh !== null && kmh >= CRAWL_KMH) return out('crawling', vibrating || travelling ? 0.8 : 0.6);
  if (travelling) return out(vibrating || os === 'automotive' ? 'riding' : 'crawling', 0.7);
  // Slow or still on good GPS: stopped, unless the bike is shaking, which says it is running and moving slowly or the GPS is lying.
  // A phone that gives no speed reading is judged by position alone: still on good fixes for a while is a stop.
  if (hasGps && (kmh === null ? span >= TRAVEL_MIN_SPAN_MS : kmh < STILL_KMH)) {
    if (vibrating && os !== 'stationary') return out('crawling', 0.5);
    return out('stopped_brief', shake ? 0.85 : 0.7);
  }
  // No usable GPS: the vibration alone says riding, and its absence for a while says stopped.
  if (!hasGps) {
    if (vibrating) return out('riding', 0.55);
    if (shake) return out('stopped_brief', 0.6);
  }
  return { state: 'unknown', confidence: 0 };
}

const Z: Record<Activity, number> = { riding: 0, crawling: 0, stopped_brief: 0, stopped_parked: 0, on_foot: 0, unknown: 0 };
/** How long a reading must hold to change from `from` to `to` (ms); 0 changes at once. */
function holdFor(from: Activity, to: Activity, confidence: number): number {
  if (to === 'unknown') return HOLD_MS;
  if (to === 'on_foot') return ENTER_FOOT_MS;
  if (from === 'on_foot') return LEAVE_FOOT_MS;
  if (moving(to)) return confidence >= 0.9 ? 0 : ENTER_MOVING_MS;
  if (moving(from) && stopped(to)) return LEAVE_MOVING_MS;
  return Z[to];
}

function advance(s: Fusion, now: number): Fusion {
  const r = read(s, now);
  let { state, confidence, since, candidate } = s;
  if (r.state === 'unknown') {
    // Nothing to go on: keep the state, losing confidence as the silence grows, and give it up after the hold.
    const silent = now - s.lastAt;
    if (silent > HOLD_MS && state !== 'unknown') return { ...s, state: 'unknown', confidence: 0, since: now, candidate: undefined };
    return { ...s, confidence: state === 'unknown' ? 0 : Math.min(confidence, 0.4), candidate: undefined };
  }
  // A stop that has lasted long enough with the bike quiet is parked, not waiting at a light.
  let target: Reading = r;
  if (state === 'stopped_parked' && r.state === 'stopped_brief') target = { state: 'stopped_parked', confidence: r.confidence };
  if (state === 'stopped_brief' && r.state === 'stopped_brief' && now - since >= PARKED_AFTER_MS && !(s.shake && now - s.shake.t <= SHAKE_FRESH_MS && s.shake.vib >= VIB_ON)) target = { state: 'stopped_parked', confidence: r.confidence };
  if (target.state === state) return { ...s, confidence: target.confidence, candidate: undefined };
  if (!candidate || candidate.state !== target.state) candidate = { state: target.state, since: now };
  if (now - candidate.since >= holdFor(state, target.state, target.confidence)) return { ...s, state: target.state, confidence: target.confidence, since: now, candidate: undefined };
  return { ...s, candidate };
}

/** Takes one piece of evidence and returns the new state. Out-of-order GPS or shake events are dropped. */
export function stepFusion(s: Fusion, e: Evidence): Fusion {
  if (e.k !== 'tick' && e.t < s.lastAt - 1000) return s;
  // A tick is not evidence: it must not hide how long the silence has lasted.
  let next: Fusion = e.k === 'tick' ? { ...s } : { ...s, lastAt: Math.max(s.lastAt, e.t) };
  if (e.k === 'gps') {
    const fix: Fix = { t: e.t, lat: e.lat, lng: e.lng, speed: e.speed != null && e.speed >= 0 ? e.speed : null, acc: e.acc ?? 50 };
    next = { ...next, fixes: [...s.fixes.filter((f) => e.t - f.t <= WINDOW_MS), fix] };
  } else if (e.k === 'shake') next = { ...next, shake: { t: e.t, vib: e.vib, stepHz: e.stepHz } };
  else if (e.k === 'os') next = { ...next, os: { t: e.t, activity: e.activity } };
  return advance(next, e.t);
}

/** The state is a stop the app may act on: stopped, and sure enough. */
export const isStoppedConfident = (s: Fusion, bar = 0.6) => stopped(s.state) && s.confidence >= bar;
/** Counts as riding for the break reminder: moving, or a short stop that has not become a break. */
export const isRidingSession = (s: Fusion) => moving(s.state) || s.state === 'stopped_brief' || s.state === 'unknown';

export type Sample = { t: number; x: number; y: number; z: number };
/**
 * Turns a window of raw accelerometer samples (g, any rate from about 8 Hz) into `vib` and `stepHz`: the spread of the magnitude, and
 * the rate of upward crossings of its mean when the swing is big enough to be a stride.
 */
export function summariseWindow(samples: Sample[]): { vib: number; stepHz: number } {
  if (samples.length < 8) return { vib: 0, stepHz: 0 };
  const mag = samples.map((p) => Math.hypot(p.x, p.y, p.z));
  const mean = mag.reduce((a, b) => a + b, 0) / mag.length;
  const vib = Math.sqrt(mag.reduce((a, b) => a + (b - mean) ** 2, 0) / mag.length);
  const seconds = (samples[samples.length - 1]!.t - samples[0]!.t) / 1000;
  if (seconds <= 0 || vib < WALK_VIB) return { vib, stepHz: 0 };
  let crossings = 0;
  for (let i = 1; i < mag.length; i++) if (mag[i - 1]! < mean && mag[i]! >= mean) crossings++;
  const hz = crossings / seconds;
  return { vib, stepHz: hz >= STEP_HZ_MIN && hz <= STEP_HZ_MAX ? hz : 0 };
}
