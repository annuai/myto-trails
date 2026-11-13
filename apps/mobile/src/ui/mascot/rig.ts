import { parseShapes, shapeToSvg, type Shapes } from './shapes';
import { trailDogArt as art } from './TrailDog.tokens';
import { trailDogRig as R } from './rig.tokens';

/**
 * Moves the trail dog by skinning: each point of each traced shape (outline, fill and shading alike) is tied to the bones by weights
 * worked out once from where the point sits, and each frame the bones' pose is applied to every point. Because the outline and the
 * fills share the same weights they cannot come apart, which cutting a limb out of the picture and turning it does.
 *
 * Everything here is plain numbers and marked 'worklet', so Reanimated can run it on the UI thread and the browser version can run it too.
 * The rock is part of the same picture: it is drawn once, still, below a line along its top, and the dog is drawn above that line.
 */

const ROCK_TOP = art.rockTop;
const LEG_COUNT = R.legs.length;
/** Per point: one weight for each leg, then the head, the tail, and how much the body's own move applies (none inside the rock's dark band). */
const STRIDE = LEG_COUNT + 3;
const HEAD = LEG_COUNT;
const TAIL = LEG_COUNT + 1;
const BODY = LEG_COUNT + 2;
const DEG = Math.PI / 180;

export type Rig = Shapes & {
  /** Whether each shape stays still (the rock fill, its darker patches and the grass). Indexed like `shapes`. */
  still: boolean[];
  /** STRIDE weights per point. */
  weights: Float32Array;
};

export type Pose = {
  /** The body's move from where it is drawn, and each paw's move (world, not relative to the body). */
  dx: number;
  dy: number;
  feet: { x: number; y: number }[];
  headDeg: number;
  tailDeg: number;
  scaleX: number;
  scaleY: number;
  alpha: number;
};

function smooth(a: number, b: number, x: number): number {
  'worklet';
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
}

/** The y of the top of the rock's fill under x, exactly as drawn. */
function rockY(x: number): number {
  'worklet';
  const top = ROCK_TOP;
  const n = top.length;
  if (x <= top[0][0]) return top[0][1];
  if (x >= top[n - 1][0]) return top[n - 1][1];
  const i = Math.min(n - 2, Math.floor((x - top[0][0]) / 10));
  const [x0, y0] = top[i];
  const [x1, y1] = top[i + 1];
  return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
}

/** The height the paws are placed at: the rock's top, evened out over 30 units so a paw crossing a small step rises instead of jumping. */
export function groundY(x: number): number {
  'worklet';
  return (rockY(x - 15) + 2 * rockY(x) + rockY(x + 15)) / 4;
}

function weightsAt(x: number, y: number, noHead: boolean, out: Float32Array, o: number): void {
  // The dog is only drawn above the rock's dark band, so inside it nothing moves (it is the rock's own outline).
  const g = rockY(x);
  const band = 1 - smooth(g - R.band - 1, g - R.band + 6, y);
  out[o + BODY] = band;
  let sum = 0;
  for (let i = 0; i < LEG_COUNT; i++) {
    const leg = R.legs[i];
    const ax = leg.foot[0] - leg.hip[0];
    const ay = leg.foot[1] - leg.hip[1];
    const px = x - leg.hip[0];
    const py = y - leg.hip[1];
    const t = Math.min(1, Math.max(0, (px * ax + py * ay) / (ax * ax + ay * ay)));
    const d = Math.hypot(px - ax * t, py - ay * t);
    const w = smooth(0.12, 0.9, t) * (1 - smooth(leg.radii[0], leg.radii[1], d)) * band;
    out[o + i] = w;
    sum += w;
  }
  if (sum > 1) for (let i = 0; i < LEG_COUNT; i++) out[o + i] /= sum;
  const h = R.head;
  out[o + HEAD] = noHead ? 0 : smooth(h.fromY, h.toY, y) * smooth(h.fromX, h.toX, x);
  const tl = R.tail;
  const dc = Math.hypot(x - tl.centre[0], y - tl.centre[1]);
  const db = Math.hypot(x - tl.pivot[0], y - tl.pivot[1]);
  out[o + TAIL] = (1 - smooth(tl.inner, tl.outer, dc)) * smooth(tl.baseFrom, tl.baseTo, db) * (1 - smooth(tl.maxY, tl.maxY + 40, y));
}

/** Reads the traced shapes once and works out every point's weights. Cheap (a few milliseconds); call it once, not per frame. */
export function buildRig(): Rig {
  const parsed = parseShapes(art.paths);
  const { shapes, rest } = parsed;
  // The rock fill, its darker patches and the grass (the brown fills low in the picture) never move; the outline is one shape and does.
  const still = shapes.map((s) => (s.color === 3 || s.color === 4) && s.minY >= 900);
  const weights = new Float32Array((rest.length / 2) * STRIDE);
  shapes.forEach((s, si) => {
    if (still[si]) return;
    // The scarf (red, below the head) is left out of the head turn; the ear's red lining is not.
    const noHead = s.color === 5 && s.minY >= 355;
    for (let p = s.pointStart; p < s.pointStart + s.pointCount; p++) weightsAt(rest[p * 2], rest[p * 2 + 1], noHead, weights, p * STRIDE);
  });
  return { ...parsed, still, weights };
}

export const restPose: Pose = { dx: 0, dy: 0, feet: R.legs.map(() => ({ x: 0, y: 0 })), headDeg: 0, tailDeg: 0, scaleX: 1, scaleY: 1, alpha: 1 };

/** Finishes fast, slightly overshooting 1: the head lifts, passes the drawn pose a little, and settles. */
function easeOutBack(p: number): number {
  'worklet';
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
}

/**
 * The pose `t` seconds after the dog appears: it walks in from the left, slowing to a stop on its drawn spot (the body's move `dx` runs from
 * -distance to 0); each paw is planted on the ground while the body passes over it, then swings forward and down, so the feet never slide;
 * the head is lowered as it walks, then lifts to look up; after that it idles (breathing, a slow tail).
 */
export function poseAt(t: number): Pose {
  'worklet';
  const W = R.walk;
  const u = Math.min(1, Math.max(0, t / W.seconds));
  const dx = -W.distance * (1 - u) * (1 - u);
  const env = Math.min(1, -dx / (W.distance * 0.1));
  const settle = smooth(W.seconds, W.seconds + W.settle, t);
  const feet: Pose['feet'] = [];
  let groundSum = 0;
  let cycleA = 0;
  for (let i = 0; i < LEG_COUNT; i++) {
    const leg = R.legs[i];
    // A trot: the two pairs of paws are half a cycle apart, and the first pair is mid-stance (paw under the hip) where the dog stops.
    const c = W.stride * (0.5 + leg.pair);
    const cycle = (dx + c) / (2 * W.stride);
    if (leg.pair === 0) cycleA = cycle;
    const q = cycle - Math.floor(cycle);
    let rel: number;
    let lift = 0;
    if (q < 0.5) {
      rel = W.stride / 2 - (q / 0.5) * W.stride;
    } else {
      const z = (q - 0.5) / 0.5;
      rel = -W.stride / 2 + W.stride * (z * z * (3 - 2 * z));
      lift = W.lift * Math.sin(Math.PI * z) * (1 - settle);
    }
    const fx = dx + rel;
    const fy = groundY(leg.foot[0] + fx) - groundY(leg.foot[0]) - lift;
    groundSum += groundY(leg.foot[0] + fx) - groundY(leg.foot[0]);
    feet.push({ x: fx, y: fy });
  }
  const bob = -2.5 * env * (0.5 - 0.5 * Math.cos(4 * Math.PI * cycleA));
  const dy = (groundSum / LEG_COUNT) * 0.85 + bob;
  const look = Math.min(1, Math.max(0, (t - W.lookStart) / W.lookSeconds));
  const nod = 2 * env * Math.sin(4 * Math.PI * cycleA);
  const headDeg = R.head.levelDeg * (1 - easeOutBack(look)) + nod * (1 - look);
  const tailDeg = 7 * env * Math.sin(4 * Math.PI * cycleA + 1) + R.idle.tailDeg * (1 - env) * Math.sin((2 * Math.PI * t) / R.idle.tailSeconds);
  const b = 0.5 - 0.5 * Math.cos((2 * Math.PI * t) / R.idle.breatheSeconds);
  return { dx, dy, feet, headDeg, tailDeg, scaleX: 1 + R.idle.breatheX * b, scaleY: 1 + R.idle.breatheY * b, alpha: smooth(0, W.fade, t) };
}

/** Writes every point of the pose into `out` (same layout as `rig.rest`). Still shapes are copied as drawn. */
export function skin(rig: Rig, pose: Pose, out: Float32Array): void {
  'worklet';
  const { shapes, rest, weights, still } = rig;
  const hp = R.head.pivot;
  const tp = R.tail.pivot;
  const [bx, by] = R.breathe;
  // Each paw's move relative to the body: the legs stretch between the hip (moves with the body) and the paw (planted).
  const relX = pose.feet.map((f) => f.x - pose.dx);
  const relY = pose.feet.map((f) => f.y - pose.dy);
  for (let si = 0; si < shapes.length; si++) {
    const s = shapes[si];
    const end = (s.pointStart + s.pointCount) * 2;
    if (still[si]) {
      for (let k = s.pointStart * 2; k < end; k++) out[k] = rest[k];
      continue;
    }
    for (let p = s.pointStart; p < s.pointStart + s.pointCount; p++) {
      const o = p * STRIDE;
      let x = rest[p * 2];
      let y = rest[p * 2 + 1];
      const wh = weights[o + HEAD];
      if (wh > 0) {
        const a = pose.headDeg * wh * DEG;
        const c = Math.cos(a);
        const sn = Math.sin(a);
        const px = x - hp[0];
        const py = y - hp[1];
        x = hp[0] + px * c - py * sn;
        y = hp[1] + px * sn + py * c;
      }
      const wt = weights[o + TAIL];
      if (wt > 0) {
        const a = pose.tailDeg * wt * DEG;
        const c = Math.cos(a);
        const sn = Math.sin(a);
        const px = x - tp[0];
        const py = y - tp[1];
        x = tp[0] + px * c - py * sn;
        y = tp[1] + px * sn + py * c;
      }
      const wb = weights[o + BODY];
      let mx = pose.dx * wb;
      let my = pose.dy * wb;
      for (let i = 0; i < LEG_COUNT; i++) {
        const w = weights[o + i];
        if (w > 0) {
          mx += w * relX[i];
          my += w * relY[i];
        }
      }
      x += mx;
      y += my;
      out[p * 2] = bx + (x - bx) * pose.scaleX;
      out[p * 2 + 1] = by + (y - by) * pose.scaleY;
    }
  }
}

export { shapeToSvg };

/** A polygon (flat x, y list) covering everything above the line where the dog is cut: just inside the rock's dark band. */
export function dogRegion(): number[] {
  const top = art.rockTop;
  const n = top.length;
  const cut = R.band;
  const pts = [-2000, 4000, top[0][0] - 5, 4000, top[0][0] - 5, top[0][1] - cut];
  for (const [x, y] of top) pts.push(x, y - cut);
  pts.push(top[n - 1][0] + 5, top[n - 1][1] - cut, top[n - 1][0] + 5, 4000, 4000, 4000, 4000, -2000, -2000, -2000);
  return pts;
}

/** A polygon covering the rock: everything from the top of its dark band down. */
export function rockRegion(): number[] {
  const top = art.rockTop;
  const n = top.length;
  const pts: number[] = [];
  pts.push(top[0][0] - 5, top[0][1] - R.band);
  for (const [x, y] of top) pts.push(x, y - R.band);
  pts.push(top[n - 1][0] + 5, top[n - 1][1] - R.band, top[n - 1][0] + 5, 4000, top[0][0] - 5, 4000);
  return pts;
}

export const toPath = (poly: number[]): string => {
  let d = '';
  for (let i = 0; i < poly.length; i += 2) d += `${i ? 'L' : 'M'}${poly[i]} ${poly[i + 1]}`;
  return `${d}Z`;
};

/** A line along the seam between the two regions, to be drawn in the outline colour, so the two clips cannot leave a light hairline there. */
export function seamLine(): number[] {
  return art.rockTop.flatMap(([x, y]) => [x, y - R.band + 0.5]);
}
