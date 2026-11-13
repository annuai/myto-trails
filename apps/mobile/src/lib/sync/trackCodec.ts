import { gunzipSync, gzipSync, strFromU8, strToU8 } from 'fflate';
import type { LatLng } from '@/lib/geo';

/**
 * A ride's points as one small object for the cloud. Columns of whole-number deltas (position to 0.1 m, time to the millisecond,
 * height to 0.1 m, speed to 0.01 km/h) compressed with gzip: a 3-hour ride at one point a second is about 30 to 80 KB.
 * Position precision is far finer than GPS error, so nothing a rider can see is lost.
 */
const POS = 1e6;
const VERSION = 1;

type Cols = { v: number; n: number; lat: number[]; lng: number[]; t: (number | null)[]; ele: (number | null)[]; speed: (number | null)[]; acc: (number | null)[]; breaks: number[] };

const deltas = (xs: number[]) => xs.map((x, i) => x - (i === 0 ? 0 : xs[i - 1]!));
const sums = (ds: number[]) => { let a = 0; return ds.map((d) => (a += d)); };
const opt = (xs: (number | undefined | null)[], scale: number) => xs.map((x) => (typeof x === 'number' && Number.isFinite(x) ? Math.round(x * scale) : null));
const unopt = (xs: (number | null)[], scale: number): (number | undefined)[] => xs.map((x) => (x === null ? undefined : x / scale));

export function encodeTrack(points: LatLng[], breaks: number[] = []): Uint8Array {
  const t = opt(points.map((p) => p.t), 1);
  const cols: Cols = {
    v: VERSION, n: points.length,
    lat: deltas(points.map((p) => Math.round(p.lat * POS))), lng: deltas(points.map((p) => Math.round(p.lng * POS))),
    // Times are deltas between the points that have one; a missing time stays null.
    t: (() => { let last = 0; return t.map((x) => { if (x === null) return null; const d = x - last; last = x; return d; }); })(),
    ele: opt(points.map((p) => p.ele), 10), speed: opt(points.map((p) => p.speed), 100), acc: opt(points.map((p) => p.acc), 10), breaks,
  };
  return gzipSync(strToU8(JSON.stringify(cols)), { level: 6 });
}

export function decodeTrack(bytes: Uint8Array): { points: LatLng[]; breaks: number[] } {
  const c = JSON.parse(strFromU8(gunzipSync(bytes))) as Cols;
  if (c.v !== VERSION) throw new Error('This ride was saved by a newer version of the app.');
  const lat = sums(c.lat).map((x) => x / POS);
  const lng = sums(c.lng).map((x) => x / POS);
  let lastT = 0;
  const t = c.t.map((d) => { if (d === null) return undefined; lastT += d; return lastT; });
  const ele = unopt(c.ele, 10), speed = c.speed.map((x) => (x === null ? undefined : x / 100)), acc = unopt(c.acc, 10);
  const points = lat.map((la, i): LatLng => ({ lat: la, lng: lng[i]!, ...(t[i] !== undefined ? { t: t[i] } : {}), ...(ele[i] !== undefined ? { ele: ele[i] } : {}), ...(speed[i] !== undefined ? { speed: speed[i] } : {}), ...(acc[i] !== undefined ? { acc: acc[i] } : {}) }));
  return { points, breaks: c.breaks ?? [] };
}
