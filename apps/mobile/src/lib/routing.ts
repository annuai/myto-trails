import { APP_HEADERS } from './appHeaders';
import { haversine, type LatLng } from './geo';

/**
 * The one door to road routing. On the phone first, when a downloaded region holds every stop (lib/offlineRouting: no signal needed, no
 * data used). Then Valhalla online (motorcycle profile, the rider's preferences, heading, alternatives); if it fails twice the OSRM car
 * router answers instead, without preferences. Both are free FOSSGIS servers: no key, no cost. Every request has a timeout, so a hung
 * server can never leave a rider waiting for a reroute that will not come.
 */
const VALHALLA = 'https://valhalla1.openstreetmap.de/route';
const OSRM = 'https://routing.openstreetmap.de/routed-car/route/v1/driving';
/** How long a routing request may take before it is given up, in milliseconds. */
export const TIMEOUT_MS = 12_000;
/** Below this speed the phone's heading is noise, so it is not sent. */
export const HEADING_MIN_MPS = 2;
/** How far the router may turn the start from the rider's heading. */
const HEADING_TOLERANCE = 45;

/** The kinds of turn an instruction can be. */
export type TurnKind = 'straight' | 'left' | 'right' | 'slight left' | 'slight right' | 'sharp left' | 'sharp right' | 'uturn' | 'roundabout' | 'arrive';
/** One manoeuvre: what to do, and how far along the line it is. */
export type Step = { text: string; kind: TurnKind; /** Metres from the start of the line to where it happens. */ atM: number };
export type Provider = 'device' | 'valhalla' | 'osrm';
/** A route to follow: its line, its turns, its length and time, and which router answered. */
export type Directions = { line: LatLng[]; steps: Step[]; totalM: number; etaMin: number; /** Which router answered; `osrm` ignored the rider's preferences. */ provider?: Provider };

/** What the rider wants to avoid or allow: highways, tolls, ferries, smaller roads and unpaved roads. */
export type RoutePrefs = { avoidHighways: boolean; avoidTolls: boolean; avoidFerries: boolean; smallerRoads: boolean; allowUnpaved: boolean };
/** No preferences set. */
export const DEFAULT_PREFS: RoutePrefs = { avoidHighways: false, avoidTolls: false, avoidFerries: false, smallerRoads: false, allowUnpaved: false };

/** What is asked of a router: the stops, the rider's heading when moving, and their preferences. */
export type RouteRequest = {
  stops: LatLng[];
  /** The way the rider is travelling, sent only when they are moving: the new route then starts the way they face. */
  heading?: number;
  prefs?: RoutePrefs;
  /** Extra routes wanted besides the best; Valhalla offers them only between two stops. */
  alternates?: number;
};

// ---- Valhalla ----

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

/** Google's encoded polyline format. Valhalla and OSRM's polyline6 use 6 decimal places, Google's own uses 5. */
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

/** Metres from the start of the line at each point. */
export function cumulative(line: LatLng[]): number[] {
  const cum = [0];
  for (let i = 1; i < line.length; i++) cum.push(cum[i - 1]! + haversine(line[i - 1]!, line[i]!));
  return cum;
}

/** Valhalla's motorcycle costing for the rider's preferences: 0 is "avoid", Valhalla's own default where they have no wish. */
export function motorcycleCosting(p: RoutePrefs = DEFAULT_PREFS): Record<string, number> {
  const o: Record<string, number> = {};
  if (p.avoidHighways) o.use_highways = 0;
  if (p.avoidTolls) o.use_tolls = 0;
  if (p.avoidFerries) o.use_ferry = 0;
  if (p.smallerRoads) { o.use_primary = 0.2; o.use_highways = 0; }
  o.use_trails = p.allowUnpaved ? 0.5 : 0;
  return o;
}

/** The request body for Valhalla: the stops, the heading on the first one when the rider is moving, and the preferences. */
export function valhallaBody(r: RouteRequest): object {
  const moving = r.heading !== undefined && Number.isFinite(r.heading);
  return {
    locations: r.stops.map((p, i) => ({ lat: p.lat, lon: p.lng, type: 'break', ...(i === 0 && moving ? { heading: Math.round(((r.heading! % 360) + 360) % 360), heading_tolerance: HEADING_TOLERANCE } : {}) })),
    costing: 'motorcycle',
    costing_options: { motorcycle: motorcycleCosting(r.prefs) },
    directions_options: { units: 'kilometers' },
    ...(r.alternates && r.stops.length === 2 ? { alternates: r.alternates } : {}),
  };
}

type VManeuver = { instruction?: string; type?: number; begin_shape_index?: number };
type VTrip = { legs?: { shape?: string; maneuvers?: VManeuver[] }[]; summary?: { time?: number } };
/** Valhalla's reply: the best trip and any alternatives. */
export type ValhallaAnswer = { trip?: VTrip; alternates?: { trip?: VTrip }[] };

/** One Valhalla trip as a single line with its turns. Legs are joined end to end (each shares its first point with the last leg's end). */
export function parseTrip(trip: VTrip | undefined): Directions {
  const legs = trip?.legs ?? [];
  if (!legs.length || legs.some((l) => !l.shape || !l.maneuvers?.length)) throw new Error('routing returned no route');
  const line: LatLng[] = [];
  const marks: { m: VManeuver; idx: number }[] = [];
  for (const leg of legs) {
    const shape = decodePolyline(leg.shape!);
    const offset = line.length ? line.length - 1 : 0;
    line.push(...(line.length ? shape.slice(1) : shape));
    for (const m of leg.maneuvers!) marks.push({ m, idx: offset + (m.begin_shape_index ?? 0) });
  }
  const cum = cumulative(line);
  const last = legs.length - 1;
  const steps = marks.map(({ m, idx }, n): Step => {
    const kind = turnKind(m.type ?? 0);
    // The end of a leg that is not the last is a stop on the way, not the end of the ride.
    const isLast = n === marks.length - 1;
    return { text: kind === 'arrive' && !isLast && last > 0 ? 'You have reached a stop' : m.instruction ?? '', kind, atM: cum[Math.min(idx, cum.length - 1)] ?? 0 };
  });
  return { line, steps, totalM: cum[cum.length - 1] ?? 0, etaMin: Math.round((trip?.summary?.time ?? 0) / 60), provider: 'valhalla' };
}

/** The best route and any alternatives from a Valhalla answer. */
export function parseValhalla(body: ValhallaAnswer): Directions[] {
  const best = parseTrip(body.trip);
  const alts: Directions[] = [];
  for (const a of body.alternates ?? []) { try { alts.push(parseTrip(a.trip)); } catch { /* a broken alternative is just left out */ } }
  return [best, ...alts];
}

// ---- OSRM (fallback) ----

type OManeuver = { type?: string; modifier?: string; exit?: number };
type OStep = { maneuver?: OManeuver; name?: string; ref?: string; distance?: number };
type ORoute = { geometry?: string; distance?: number; duration?: number; legs?: { steps?: OStep[] }[] };
/** OSRM's reply: a status code and its routes. */
export type OsrmAnswer = { code?: string; routes?: ORoute[] };

const OSRM_KIND: Record<string, TurnKind> = {
  uturn: 'uturn', 'sharp right': 'sharp right', right: 'right', 'slight right': 'slight right', straight: 'straight',
  'slight left': 'slight left', left: 'left', 'sharp left': 'sharp left',
};

/** OSRM gives a manoeuvre's type and direction but no sentence; this writes one in the same plain style as Valhalla's. */
export function osrmSentence(s: OStep, kind: TurnKind): string {
  const road = s.name || s.ref;
  const onto = road ? ` onto ${road}` : '';
  const t = s.maneuver?.type;
  if (t === 'arrive') return 'You have arrived';
  if (t === 'depart') return road ? `Head along ${road}` : 'Head off';
  if (kind === 'roundabout') return s.maneuver?.exit ? `At the roundabout, take exit ${s.maneuver.exit}${onto}` : `Enter the roundabout${onto}`;
  if (kind === 'uturn') return `Make a U-turn${onto}`;
  if (t === 'fork') return `Keep ${kind.replace('slight ', '')} at the fork${onto}`;
  if (t === 'merge') return `Merge${onto}`;
  if (t === 'on ramp') return `Take the ramp${onto}`;
  if (t === 'off ramp') return `Take the exit${onto}`;
  if (kind === 'straight') return road ? `Continue on ${road}` : 'Continue straight';
  return `Turn ${kind}${onto}`;
}

function osrmKind(m: OManeuver | undefined): TurnKind {
  const t = m?.type;
  if (t === 'arrive') return 'arrive';
  if (t === 'roundabout' || t === 'rotary' || t === 'roundabout turn' || t === 'exit roundabout' || t === 'exit rotary') return 'roundabout';
  return OSRM_KIND[m?.modifier ?? ''] ?? 'straight';
}

/** One OSRM route as Directions. Throws when the route has no line or legs. */
export function parseOsrmRoute(r: ORoute | undefined): Directions {
  if (!r?.geometry || !r.legs?.length) throw new Error('routing returned no route');
  const line = decodePolyline(r.geometry);
  const cum = cumulative(line);
  const totalM = cum[cum.length - 1] ?? 0;
  // Step distances are OSRM's own; scale them onto the decoded line so the turns land where the line bends.
  const scale = r.distance && r.distance > 0 ? totalM / r.distance : 1;
  const steps: Step[] = [];
  let at = 0;
  const all = r.legs.flatMap((l) => l.steps ?? []);
  all.forEach((s, n) => {
    const kind = osrmKind(s.maneuver);
    // "new name" and "continue straight" are not turns a rider needs told about, except where a leg ends.
    const silent = (s.maneuver?.type === 'new name' || s.maneuver?.type === 'notification') && n !== 0;
    if (!(silent && kind === 'straight') && !(kind === 'arrive' && n !== all.length - 1)) steps.push({ text: osrmSentence(s, kind), kind, atM: Math.min(totalM, at * scale) });
    at += s.distance ?? 0;
  });
  if (!steps.length || steps[steps.length - 1]!.kind !== 'arrive') steps.push({ text: 'You have arrived', kind: 'arrive', atM: totalM });
  return { line, steps, totalM, etaMin: Math.round((r.duration ?? 0) / 60), provider: 'osrm' };
}

/** Every usable route in an OSRM reply as Directions. Throws when the reply is not Ok or has no route. */
export function parseOsrm(body: OsrmAnswer): Directions[] {
  if (body.code !== 'Ok' || !body.routes?.length) throw new Error(`routing ${body.code ?? 'returned no route'}`);
  const out: Directions[] = [];
  for (const r of body.routes) { try { out.push(parseOsrmRoute(r)); } catch { /* skip */ } }
  if (!out.length) throw new Error('routing returned no route');
  return out;
}

/** The OSRM request address for the stops, with the rider's heading when moving. */
export function osrmUrl(r: RouteRequest): string {
  const coords = r.stops.map((p) => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`).join(';');
  const q = new URLSearchParams({ steps: 'true', overview: 'full', geometries: 'polyline6' });
  if (r.heading !== undefined && Number.isFinite(r.heading)) q.set('bearings', [`${Math.round(((r.heading % 360) + 360) % 360)},${HEADING_TOLERANCE}`, ...r.stops.slice(1).map(() => '')].join(';'));
  if (r.alternates && r.stops.length === 2) q.set('alternatives', String(r.alternates));
  return `${OSRM}/${coords}?${q}`;
}

// ---- Transport ----

/** A fetch that gives up after `ms`, and also stops when the caller's signal does. Hermes has no AbortSignal.timeout or .any. */
export async function fetchWithTimeout(url: string, init: RequestInit & { signal?: AbortSignal }, ms = TIMEOUT_MS): Promise<Response> {
  const ctl = new AbortController();
  const outer = init.signal;
  if (outer?.aborted) throw abortError();
  const stop = () => ctl.abort();
  outer?.addEventListener('abort', stop);
  const timer = setTimeout(stop, ms);
  try {
    return await fetch(url, { ...init, signal: ctl.signal });
  } catch (e) {
    if (outer?.aborted) throw abortError();
    throw ctl.signal.aborted ? new Error('routing timed out') : e;
  } finally {
    clearTimeout(timer);
    outer?.removeEventListener('abort', stop);
  }
}

function abortError(): Error {
  const e = new Error('Aborted');
  e.name = 'AbortError';
  return e;
}

/** A failure worth asking again for: the network, a timeout, or the server being busy or broken. A 400 (no road there) is not. */
export function retryable(e: unknown): boolean {
  if (e instanceof Error && e.name === 'AbortError') return false;
  const m = e instanceof Error ? /routing (\d{3})/.exec(e.message) : null;
  if (!m) return !(e instanceof Error && e.message === 'routing returned no route');
  const status = Number(m[1]);
  return status === 429 || status >= 500;
}

type Fetcher = typeof fetchWithTimeout;

/**
 * Routes on the phone: given the stops and the Valhalla request as JSON, Valhalla's answer as JSON, or null when no downloaded region can
 * take this route. Set once at start-up (lib/offlineRouting); unset in tests, Expo Go and the web.
 */
export type LocalRouter = (stops: LatLng[], requestJson: string) => Promise<string | null>;
let localRouter: LocalRouter | undefined;
/** Sets (or clears) the router that runs on the phone from installed offline regions. */
export function setLocalRouter(r: LocalRouter | undefined): void { localRouter = r; }

async function askLocal(r: RouteRequest, local: LocalRouter): Promise<Directions[] | null> {
  const raw = await local(r.stops, JSON.stringify(valhallaBody(r)));
  return raw === null ? null : parseValhalla(JSON.parse(raw) as ValhallaAnswer).map((d) => ({ ...d, provider: 'device' as const }));
}

async function askValhalla(r: RouteRequest, signal: AbortSignal | undefined, f: Fetcher): Promise<Directions[]> {
  const res = await f(VALHALLA, { method: 'POST', signal, headers: { ...APP_HEADERS, 'Content-Type': 'application/json' }, body: JSON.stringify(valhallaBody(r)) });
  if (!res.ok) throw new Error(`routing ${res.status}`);
  return parseValhalla((await res.json()) as ValhallaAnswer);
}

async function askOsrm(r: RouteRequest, signal: AbortSignal | undefined, f: Fetcher): Promise<Directions[]> {
  const res = await f(osrmUrl(r), { signal, headers: APP_HEADERS });
  if (!res.ok) throw new Error(`routing ${res.status}`);
  return parseOsrm((await res.json()) as OsrmAnswer);
}

/**
 * The best route through the stops, then any alternatives. Valhalla twice (the second try only when the first failed for a reason that
 * may pass), then OSRM. Throws the first error when all fail, or an AbortError when the caller gave up.
 */
export async function route(r: RouteRequest, signal?: AbortSignal, f: Fetcher = fetchWithTimeout, local: LocalRouter | undefined = localRouter): Promise<Directions[]> {
  if (r.stops.length < 2) throw new Error('routing needs two stops');
  if (local) {
    // The phone's answer, if it has one; any failure there (a stop off the region's roads) just means asking online.
    const mine = await askLocal(r, local).catch(() => null);
    if (signal?.aborted) throw abortError();
    if (mine?.length) return mine;
  }
  let first: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try { return await askValhalla(r, signal, f); } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') throw e;
      first ??= e;
      if (!retryable(e)) break;
    }
  }
  try { return await askOsrm(r, signal, f); } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') throw e;
    throw first instanceof Error ? first : e;
  }
}
