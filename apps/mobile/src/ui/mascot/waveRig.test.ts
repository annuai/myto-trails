import { describe, expect, it } from 'vitest';
import { buildWaveRig, restWave, skinWave, wavePoseAt } from './waveRig';
import { waveRig as R } from './wave.rig.tokens';

const rig = buildWaveRig();

describe('wave rig', () => {
  it('skinning the rest pose gives back the drawn picture', () => {
    const out = new Float32Array(rig.rest.length);
    skinWave(rig, restWave, out);
    expect(Array.from(out)).toEqual(Array.from(rig.rest));
  });

  it('repeats seamlessly: the end of a loop is the start of the next', () => {
    const a = wavePoseAt(0);
    const b = wavePoseAt(R.seconds);
    expect(b.deg).toBeCloseTo(a.deg, 9);
    expect(b.scaleY).toBeCloseTo(a.scaleY, 9);
    expect(wavePoseAt(R.seconds - 1e-6).deg).toBeCloseTo(0, 3);
  });

  it('waves both ways and never jumps between frames', () => {
    let min = 0;
    let max = 0;
    for (let t = 0; t < R.seconds * 2; t += 1 / 60) {
      const d = wavePoseAt(t).deg;
      min = Math.min(min, d);
      max = Math.max(max, d);
      expect(Math.abs(wavePoseAt(t + 1 / 60).deg - d)).toBeLessThan(2);
    }
    expect(min).toBeLessThan(-7);
    expect(max).toBeGreaterThan(10);
  });

  it('moves only the arm: a point on the paw moves, the head and body do not turn', () => {
    const out = new Float32Array(rig.rest.length);
    skinWave(rig, { deg: 10, scaleX: 1, scaleY: 1 }, out);
    let moved = 0;
    for (let p = 0; p < rig.weights.length; p++) {
      const w = rig.weights[p];
      const d = Math.hypot(out[p * 2] - rig.rest[p * 2], out[p * 2 + 1] - rig.rest[p * 2 + 1]);
      if (w === 0) expect(d).toBeLessThan(1e-4);
      else moved++;
    }
    expect(moved).toBeGreaterThan(100);
    expect(moved).toBeLessThan(rig.weights.length / 3);
  });
});
