import { describe, expect, it } from 'vitest';
import { buildRig, groundY, poseAt, restPose, shapeToSvg, skin } from './rig';
import { trailDogRig as R } from './rig.tokens';
import { trailDogArt as art } from './TrailDog.tokens';

const rig = buildRig();
const times = Array.from({ length: 80 }, (_, i) => i * 0.05);

describe('trail dog rig', () => {
  it('skinning the rest pose gives back the drawn picture exactly', () => {
    const out = new Float32Array(rig.rest.length);
    skin(rig, restPose, out);
    expect(Array.from(out)).toEqual(Array.from(rig.rest));
  });

  it('turns every traced shape back into the same path it came from', () => {
    const nums = (d: string) => (d.match(/-?\d*\.?\d+/g) ?? []).map(Number);
    const verbs = (d: string) => d.replace(/[^MLCZ]/g, '');
    rig.shapes.forEach((_, i) => {
      const made = shapeToSvg(rig, i, rig.rest);
      const was = art.paths[i][1];
      expect(verbs(made)).toBe(verbs(was));
      nums(was).forEach((n, k) => expect(Math.abs(nums(made)[k] - n)).toBeLessThan(0.06));
    });
  });

  it('ends on the drawn spot, looking up as drawn, with every paw down', () => {
    const p = poseAt(R.walk.lookStart + R.walk.lookSeconds + 1);
    expect(p.dx).toBeCloseTo(0, 6);
    expect(p.dy).toBeCloseTo(0, 6);
    expect(p.headDeg).toBeCloseTo(0, 6);
    p.feet.forEach((f) => {
      expect(f.x).toBeCloseTo(0, 6);
      expect(f.y).toBeCloseTo(0, 6);
    });
  });

  it('starts with the head lowered, left of the drawn spot, and fades in', () => {
    const p = poseAt(0);
    expect(p.dx).toBe(-R.walk.distance);
    expect(p.headDeg).toBeGreaterThan(R.head.levelDeg - 3);
    expect(p.alpha).toBe(0);
    expect(poseAt(R.walk.fade).alpha).toBe(1);
  });

  it('never slides a paw backwards: planted paws stay put and swinging ones move forward', () => {
    for (let leg = 0; leg < R.legs.length; leg++) {
      let prev = -Infinity;
      for (const t of times) {
        const x = poseAt(t).feet[leg].x;
        expect(x).toBeGreaterThanOrEqual(prev - 1e-6);
        prev = x;
      }
    }
  });

  it('moves smoothly: no jump between frames a sixtieth of a second apart', () => {
    for (let t = 0; t < 5; t += 1 / 60) {
      const a = poseAt(t);
      const b = poseAt(t + 1 / 60);
      expect(Math.abs(b.dx - a.dx)).toBeLessThan(5);
      expect(Math.abs(b.headDeg - a.headDeg)).toBeLessThan(3);
      a.feet.forEach((f, i) => {
        expect(Math.abs(b.feet[i].x - f.x)).toBeLessThan(12);
        expect(Math.abs(b.feet[i].y - f.y)).toBeLessThan(6);
      });
    }
  });

  it('keeps paws on the rock: a planted paw is exactly as high as the rock under it', () => {
    const p = poseAt(1.0);
    p.feet.forEach((f, i) => {
      const x = R.legs[i].foot[0];
      const lifted = f.y - (groundY(x + f.x) - groundY(x));
      expect(lifted).toBeLessThanOrEqual(1e-6);
      expect(lifted).toBeGreaterThanOrEqual(-R.walk.lift - 1e-6);
    });
  });

  it('gives finite points for the whole animation and never moves the rock or grass', () => {
    const out = new Float32Array(rig.rest.length);
    for (const t of times) {
      skin(rig, poseAt(t), out);
      for (const v of out) expect(Number.isFinite(v)).toBe(true);
      for (const [si, s] of rig.shapes.entries()) {
        if (!rig.still[si]) continue;
        for (let k = s.pointStart * 2; k < (s.pointStart + s.pointCount) * 2; k++) expect(out[k]).toBe(rig.rest[k]);
      }
    }
  });
});
