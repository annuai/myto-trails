import { lookParams, type FilmLook, type LookId } from '../filmLook';

/**
 * The film look as one GPU shader (Skia SkSL), run on every camera frame and again on the full photo, so the viewfinder,
 * the Film step and the saved picture are the same pixels. The order is the order of a real print: colour grade, S-curve,
 * split toning, then (for a halftone) the dot screen, then light leak, grain and vignette, which belong to the "film".
 * Every number it reads comes from `shaderUniforms`, a pure function of the look, so the look maths stays unit tested.
 */
export const FILM_SKSL = `
uniform shader image;
uniform float2 size;
uniform float4 rowR;
uniform float4 rowG;
uniform float4 rowB;
uniform float curve;
uniform float3 shadowTone;
uniform float3 highlightTone;
uniform float split;
uniform float grain;
uniform float grainFrac;
uniform float vignette;
uniform float screenMode;
uniform float screenMix;
uniform float cellFrac;
uniform float leak;
uniform float seed;

float luma(float3 c) { return dot(c, float3(0.2126, 0.7152, 0.0722)); }

float hash(float2 p) {
  p = fract(p * float2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float3 grade(float3 c) {
  float3 o = float3(dot(rowR.rgb, c) + rowR.a, dot(rowG.rgb, c) + rowG.a, dot(rowB.rgb, c) + rowB.a);
  o = clamp(o, 0.0, 1.0);
  float3 s = o * o * (3.0 - 2.0 * o);
  o = mix(o, s, curve);
  float l = luma(o);
  o += mix(shadowTone, highlightTone, smoothstep(0.15, 0.85, l)) * split;
  return clamp(o, 0.0, 1.0);
}

float2 rot(float2 p, float a) {
  float c = cos(a);
  float s = sin(a);
  return float2(c * p.x - s * p.y, s * p.x + c * p.y);
}

// How much ink a dot screen puts down at this pixel: the graded picture is averaged over the dot's cell, the amount of
// ink sets the dot's area (so its radius goes with the square root), and the edge is anti-aliased.
float dotCoverage(float2 coord, float cell, float angle, int channel) {
  float2 p = rot(coord, -angle) / cell;
  float2 id = floor(p) + 0.5;
  float2 centre = rot(id * cell, angle);
  float2 o = float2(cell * 0.28, 0.0);
  float3 acc = grade(image.eval(centre).rgb);
  acc += grade(image.eval(centre + rot(o, angle + 0.0)).rgb);
  acc += grade(image.eval(centre + rot(o, angle + 1.5708)).rgb);
  acc += grade(image.eval(centre + rot(o, angle + 3.1416)).rgb);
  acc += grade(image.eval(centre + rot(o, angle + 4.7124)).rgb);
  float3 c = acc / 5.0;
  float amount;
  if (channel == 3) {
    amount = 1.0 - max(c.r, max(c.g, c.b));
  } else if (channel == 4) {
    amount = 1.0 - luma(c);
  } else {
    float k = 1.0 - max(c.r, max(c.g, c.b));
    float3 cmy = (1.0 - c - k) / max(1.0 - k, 0.001);
    amount = channel == 0 ? cmy.x : (channel == 1 ? cmy.y : cmy.z);
    amount *= 1.0 - k;
  }
  float r = sqrt(clamp(amount, 0.0, 1.0)) * 0.74;
  float aa = 0.75 / cell;
  return 1.0 - smoothstep(r - aa, r + aa, length(p - id));
}

half4 main(float2 coord) {
  float cellPx = max(3.0, min(size.x, size.y) * cellFrac);
  float grainPx = max(0.75, max(size.x, size.y) * grainFrac);
  float3 src = image.eval(coord).rgb;
  float3 o;
  if (screenMode > 1.5) {
    // Newsprint: one black screen at 45 degrees on warm paper.
    float cov = dotCoverage(coord, cellPx, 0.7854, 4);
    o = mix(float3(0.95, 0.93, 0.87), float3(0.09, 0.08, 0.08), cov);
  } else if (screenMode > 0.5) {
    // Offset print: cyan 15, magenta 75, yellow 0 and key 45 degrees, each ink multiplied onto the paper.
    float3 paper = float3(0.97, 0.95, 0.9);
    float cc = dotCoverage(coord, cellPx, 0.2618, 0);
    float mm = dotCoverage(coord, cellPx, 1.309, 1);
    float yy = dotCoverage(coord, cellPx, 0.0, 2);
    float kk = dotCoverage(coord, cellPx, 0.7854, 3);
    o = paper;
    o *= mix(float3(1.0), float3(0.0, 0.66, 0.92), cc);
    o *= mix(float3(1.0), float3(0.92, 0.0, 0.52), mm);
    o *= mix(float3(1.0), float3(1.0, 0.93, 0.0), yy);
    o *= mix(float3(1.0), float3(0.14, 0.13, 0.13), kk);
  } else {
    o = grade(src);
  }
  if (screenMode > 0.5) o = mix(grade(src), o, screenMix);
  float2 uv = coord / size;
  if (leak > 0.0) {
    float lk = smoothstep(0.42, 0.0, uv.x + 0.12 * sin(uv.y * 3.2 + 0.6));
    o = 1.0 - (1.0 - o) * (1.0 - float3(1.0, 0.42, 0.12) * lk * leak);
  }
  if (grain > 0.0) {
    float2 g = floor(coord / grainPx) + seed;
    float n = hash(g) - 0.5;
    float3 nc = float3(hash(g + 11.3), hash(g + 27.9), hash(g + 5.1)) - 0.5;
    float l = luma(o);
    float amt = grain * (1.0 - abs(2.0 * l - 1.0) * 0.55);
    o += (n * 0.8 + nc * 0.35) * amt * 0.5;
  }
  if (vignette > 0.0) {
    float2 q = (coord - 0.5 * size) / (0.5 * length(size));
    o *= 1.0 - vignette * smoothstep(0.35, 1.0, length(q));
  }
  return half4(half3(clamp(o, 0.0, 1.0)), 1.0);
}
`;

/**
 * The shader's uniforms for a look and strength. Sizes are fractions of the picture (the grain of its long side, the dot cell
 * of its short side), so the viewfinder, the Film preview and the baked photo match at any resolution; the caller adds `size`.
 */
export type FilmUniforms = {
  rowR: number[]; rowG: number[]; rowB: number[]; curve: number; shadowTone: number[]; highlightTone: number[]; split: number;
  grain: number; grainFrac: number; vignette: number; screenMode: number; screenMix: number; cellFrac: number; leak: number; seed: number;
};

/** The dot screen has this many cells across the picture's short side (a print screen is coarser than a photo's own detail). */
export const SCREEN_CELLS: Record<'cmyk' | 'mono', number> = { cmyk: 120, mono: 140 };
/** Grain is about one and a half pixels on a 1600 px picture. */
const GRAIN_PER_LONG_SIDE = 1 / 1050;

export function shaderUniforms(look: FilmLook): FilmUniforms {
  const p = lookParams(look.id, look.intensity);
  const m = p.matrix;
  return {
    rowR: [m[0], m[1], m[2], m[4]], rowG: [m[5], m[6], m[7], m[9]], rowB: [m[10], m[11], m[12], m[14]],
    curve: p.curve, shadowTone: [...p.shadow], highlightTone: [...p.highlight], split: p.split,
    grain: p.grain, grainFrac: GRAIN_PER_LONG_SIDE, vignette: p.vignette,
    screenMode: p.neutral || !p.screen ? 0 : p.screen === 'cmyk' ? 1 : 2,
    screenMix: p.dots, cellFrac: p.screen ? 1 / SCREEN_CELLS[p.screen] : 0.01, leak: p.leak, seed: 7,
  };
}

/** The uniforms as the name-to-numbers map Skia's shader builder takes, with the picture's pixel size added. */
export function uniformMap(look: FilmLook, width: number, height: number): Record<string, number[]> {
  const u = shaderUniforms(look);
  const out: Record<string, number[]> = { size: [width, height] };
  for (const [k, v] of Object.entries(u)) out[k] = typeof v === 'number' ? [v] : v;
  return out;
}

/** Every look's id, so a caller can check the shader covers them all. */
export const SHADER_LOOKS: readonly LookId[] = ['none', 'vivid', 'colour-negative', 'faded-slide', 'mist', 'mono', 'noir', 'sepia', 'cross-process', 'disposable', 'halftone', 'newsprint'];
