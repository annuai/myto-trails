import { describe, expect, it } from 'vitest';
import { LOOKS } from '../filmLook';
import { FILM_SKSL, SHADER_LOOKS, shaderUniforms, uniformMap } from './filmShader';

describe('film shader uniforms', () => {
  it('covers every look', () => expect(SHADER_LOOKS).toEqual(LOOKS.map((l) => l.id)));
  it('is the identity for None', () => {
    const u = shaderUniforms({ id: 'none', intensity: 1 });
    expect([u.rowR, u.rowG, u.rowB]).toEqual([[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0]]);
    expect([u.curve, u.grain, u.vignette, u.screenMode, u.leak]).toEqual([0, 0, 0, 0, 0]);
  });
  it('turns the halftone screens on only for the halftone looks', () => {
    expect(shaderUniforms({ id: 'halftone', intensity: 1 }).screenMode).toBe(1);
    expect(shaderUniforms({ id: 'newsprint', intensity: 1 }).screenMode).toBe(2);
    expect(shaderUniforms({ id: 'mono', intensity: 1 }).screenMode).toBe(0);
    expect(shaderUniforms({ id: 'halftone', intensity: 0 }).screenMode).toBe(0);
  });
  it('blends the screen in with the strength', () => {
    expect(shaderUniforms({ id: 'halftone', intensity: 0.5 }).screenMix).toBeCloseTo(0.5);
  });
  it('sets the light leak only for the disposable look', () => {
    expect(shaderUniforms({ id: 'disposable', intensity: 1 }).leak).toBeGreaterThan(0);
    expect(shaderUniforms({ id: 'vivid', intensity: 1 }).leak).toBe(0);
  });
  it('gives the shader every uniform it declares, as numbers', () => {
    const declared = [...FILM_SKSL.matchAll(/^uniform (?!shader)\w+ (\w+);/gm)].map((m) => m[1]!);
    const map = uniformMap({ id: 'vivid', intensity: 0.7 }, 100, 50);
    expect(Object.keys(map).sort()).toEqual([...declared].sort());
    for (const v of Object.values(map)) for (const n of v) expect(Number.isFinite(n)).toBe(true);
  });
  it('keeps every look in range', () => {
    for (const l of LOOKS) for (const i of [0, 0.5, 1]) {
      const u = shaderUniforms({ id: l.id, intensity: i });
      for (const n of [u.curve, u.grain, u.vignette, u.split, u.screenMix, u.leak]) { expect(n).toBeGreaterThanOrEqual(0); expect(n).toBeLessThanOrEqual(1); }
    }
  });
});
