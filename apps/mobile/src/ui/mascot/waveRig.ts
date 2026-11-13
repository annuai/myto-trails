import { parseShapes, shapeToSvg, type Shapes } from './shapes';
import { waveRig as R } from './wave.rig.tokens';
import { waveArt as art } from './Wave.tokens';

/** Pillion waving, moved by skinning like the trail dog (rig.ts): every point of the outline and the fills turns about the elbow by the same weight. */
export type WaveRig = Shapes & { /** One weight per point. */ weights: Float32Array };
export type WavePose = { deg: number; scaleX: number; scaleY: number };

export { shapeToSvg };

const ELBOW = R.elbow;
const BONE = [R.paw[0] - R.elbow[0], R.paw[1] - R.elbow[1]];
const LENGTH2 = BONE[0] * BONE[0] + BONE[1] * BONE[1];

function smooth(a: number, b: number, x: number): number {
  'worklet';
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
}

/** Reads the picture once and works out every point's weight. Call it once, not per frame. */
export function buildWaveRig(): WaveRig {
  const parsed = parseShapes(art.paths);
  const { rest } = parsed;
  const weights = new Float32Array(rest.length / 2);
  for (let p = 0; p < weights.length; p++) {
    const px = rest[p * 2] - ELBOW[0];
    const py = rest[p * 2 + 1] - ELBOW[1];
    const t = Math.min(1, Math.max(0, (px * BONE[0] + py * BONE[1]) / LENGTH2));
    const d = Math.hypot(px - BONE[0] * t, py - BONE[1] * t);
    const r1 = R.radius.arm + (R.radius.paw - R.radius.arm) * smooth(0.5, 0.9, t);
    weights[p] = smooth(R.along.from, R.along.to, t) * (1 - smooth(r1, r1 + R.radius.fade, d));
  }
  return { ...parsed, weights };
}

export const restWave: WavePose = { deg: 0, scaleX: 1, scaleY: 1 };

/** The pose `t` seconds in. It repeats every `seconds`, and the first and last moments of a repeat are the same pose. */
export function wavePoseAt(t: number): WavePose {
  'worklet';
  const u = (t % R.seconds) / R.seconds;
  let deg = 0;
  for (let i = 1; i < R.keys.length; i++) {
    const [a, va] = R.keys[i - 1];
    const [b, vb] = R.keys[i];
    if (u <= b) {
      deg = va + ((vb - va) * (1 - Math.cos((Math.PI * (u - a)) / (b - a)))) / 2;
      break;
    }
  }
  const breath = 0.5 - 0.5 * Math.cos((2 * Math.PI * t) / R.seconds);
  return { deg, scaleX: 1 + R.breathe.x * breath, scaleY: 1 + R.breathe.y * breath };
}

/** Writes every point of the pose into `out` (same layout as `rig.rest`). */
export function skinWave(rig: WaveRig, pose: WavePose, out: Float32Array): void {
  'worklet';
  const { rest, weights } = rig;
  const [ex, ey] = R.elbow;
  const [bx, by] = R.breathe.origin;
  const rad = (pose.deg * Math.PI) / 180;
  for (let p = 0; p < weights.length; p++) {
    let x = rest[p * 2];
    let y = rest[p * 2 + 1];
    const w = weights[p];
    if (w > 0) {
      const a = rad * w;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const dx = x - ex;
      const dy = y - ey;
      x = ex + dx * c - dy * s;
      y = ey + dx * s + dy * c;
    }
    out[p * 2] = bx + (x - bx) * pose.scaleX;
    out[p * 2 + 1] = by + (y - by) * pose.scaleY;
  }
}
