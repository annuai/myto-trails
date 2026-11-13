/**
 * Film looks as pure maths: a colour matrix per look, blended with "no change" by an intensity, and the grain and
 * vignette that go with it. The renderer (ui/FilmImage) only turns these numbers into an SVG filter; nothing here
 * knows about screens or files, so every look is unit tested.
 */

/** A 4 by 5 colour matrix in row-major order (R, G, B, A rows; the fifth column is an offset in 0..1), as SVG's feColorMatrix wants it. */
export type Matrix = readonly number[];
export type Rgb = readonly [number, number, number];

export const IDENTITY: Matrix = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];

export type LookId = 'none' | 'colour-negative' | 'faded-slide' | 'mono' | 'sepia' | 'cross-process';
export type Look = { id: LookId; label: string; matrix: Matrix; /** Grain and vignette at full intensity. */ grain: number; vignette: number };
export type FilmLook = { id: LookId; intensity: number };

export const DEFAULT_INTENSITY = 0.7;
export const clampIntensity = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : DEFAULT_INTENSITY);

const LUMA = [0.2126, 0.7152, 0.0722] as const;

/** Composes two matrices: the result applies `a` first, then `b`. */
export function multiply(a: Matrix, b: Matrix): Matrix {
  const aug = (m: Matrix) => (r: number, c: number) => (r === 4 ? (c === 4 ? 1 : 0) : m[r * 5 + c]);
  const A = aug(a);
  const B = aug(b);
  const out: number[] = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) {
    let sum = 0;
    for (let k = 0; k < 5; k++) sum += B(r, k) * A(k, c);
    out.push(sum);
  }
  return out;
}

/** 0 is grey, 1 is unchanged, above 1 is stronger colour. */
export const saturation = (s: number): Matrix => [
  LUMA[0] * (1 - s) + s, LUMA[1] * (1 - s), LUMA[2] * (1 - s), 0, 0,
  LUMA[0] * (1 - s), LUMA[1] * (1 - s) + s, LUMA[2] * (1 - s), 0, 0,
  LUMA[0] * (1 - s), LUMA[1] * (1 - s), LUMA[2] * (1 - s) + s, 0, 0,
  0, 0, 0, 1, 0,
];
/** Scales each channel around mid grey, then adds an offset: the gain and shadow tint of a stock. */
const channels = (gain: Rgb, contrast: number, lift: Rgb): Matrix => [
  gain[0] * contrast, 0, 0, 0, 0.5 * (1 - contrast) * gain[0] + lift[0],
  0, gain[1] * contrast, 0, 0, 0.5 * (1 - contrast) * gain[1] + lift[1],
  0, 0, gain[2] * contrast, 0, 0.5 * (1 - contrast) * gain[2] + lift[2],
  0, 0, 0, 1, 0,
];
const stock = (sat: number, gain: Rgb, contrast: number, lift: Rgb) => multiply(saturation(sat), channels(gain, contrast, lift));

export const LOOKS: readonly Look[] = [
  { id: 'none', label: 'None', matrix: IDENTITY, grain: 0, vignette: 0 },
  { id: 'colour-negative', label: 'Colour negative', matrix: stock(1.08, [1.06, 1, 0.92], 1.05, [0.01, 0.01, 0.0]), grain: 0.32, vignette: 0.26 },
  { id: 'faded-slide', label: 'Faded slide', matrix: stock(0.78, [1.02, 1, 0.97], 0.9, [0.06, 0.06, 0.07]), grain: 0.24, vignette: 0.2 },
  { id: 'mono', label: 'Black and white', matrix: stock(0, [1, 1, 1], 1.3, [0, 0, 0]), grain: 0.45, vignette: 0.34 },
  { id: 'sepia', label: 'Sepia', matrix: stock(0, [1.1, 0.96, 0.76], 1.05, [0.02, 0.015, 0.0]), grain: 0.28, vignette: 0.3 },
  { id: 'cross-process', label: 'Cross process', matrix: stock(1.15, [1.1, 1.02, 0.9], 1.12, [-0.03, 0.0, 0.06]), grain: 0.34, vignette: 0.28 },
];

export const lookById = (id: string): Look => LOOKS.find((l) => l.id === id) ?? LOOKS[0];

const lerp = (a: Matrix, b: Matrix, t: number): Matrix => a.map((v, i) => v + (b[i] - v) * t);

export type LookParams = { matrix: Matrix; /** Grain opacity, 0 to 0.5. */ grain: number; /** Vignette opacity at the corners, 0 to 0.4. */ vignette: number; /** True when the picture is left exactly as it was. */ neutral: boolean };

/** What to draw for a look at an intensity (0 to 1): the matrix blended with "no change", and grain and vignette scaled the same way. */
export function lookParams(id: LookId, intensity: number): LookParams {
  const look = lookById(id);
  const t = look.id === 'none' ? 0 : clampIntensity(intensity);
  const neutral = t === 0;
  return { matrix: neutral ? IDENTITY : lerp(IDENTITY, look.matrix, t), grain: look.grain * t, vignette: look.vignette * t, neutral };
}

/** Applies a matrix to one colour (values 0..1). For tests and any code that needs the real result of a look. */
export function applyMatrix(m: Matrix, [r, g, b]: Rgb): [number, number, number] {
  return [0, 1, 2].map((row) => m[row * 5] * r + m[row * 5 + 1] * g + m[row * 5 + 2] * b + m[row * 5 + 4]) as [number, number, number];
}

/** The twenty numbers as the `values` of an SVG feColorMatrix. */
export const matrixValues = (m: Matrix) => m.map((v) => +v.toFixed(4)).join(' ');
