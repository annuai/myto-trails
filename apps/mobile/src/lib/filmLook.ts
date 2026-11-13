/**
 * Film looks as pure maths: a colour matrix per look, blended with "no change" by an intensity, and the grain and
 * vignette that go with it. The renderer (ui/FilmImage) only turns these numbers into an SVG filter; nothing here
 * knows about screens or files, so every look is unit tested.
 */

/** A 4 by 5 colour matrix in row-major order (R, G, B, A rows; the fifth column is an offset in 0..1), as SVG's feColorMatrix wants it. */
export type Matrix = readonly number[];
export type Rgb = readonly [number, number, number];

export const IDENTITY: Matrix = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];

export type LookId = 'none' | 'vivid' | 'colour-negative' | 'faded-slide' | 'mist' | 'mono' | 'noir' | 'sepia' | 'cross-process' | 'disposable' | 'halftone' | 'newsprint';
/** How a look's dot screen is printed: `cmyk` is four rotated colour screens, `mono` a single black screen at 45 degrees. */
export type Screen = 'cmyk' | 'mono';
/**
 * One film look. `matrix` is the colour grade; `curve` an S-curve on contrast (0..1); `shadow` and `highlight` are colour
 * offsets added to the dark and bright parts (split toning) by `split`; `grain` and `vignette` as before; `screen` and `dots`
 * a real halftone screen; `leak` a light leak from the left edge. The GPU shader (lib/film/filmShader) reads all of them.
 */
export type Look = { id: LookId; label: string; matrix: Matrix; grain: number; vignette: number; dots?: number; curve?: number; shadow?: Rgb; highlight?: Rgb; split?: number; screen?: Screen; leak?: number };
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

/** Black and white from a weighting of the three channels (they should add to 1), then contrast around mid grey. */
const monoMix = (w: Rgb, contrast: number): Matrix => {
  const row = (o: number) => [w[0] * contrast, w[1] * contrast, w[2] * contrast, 0, o];
  const off = 0.5 * (1 - contrast);
  return [...row(off), ...row(off), ...row(off), 0, 0, 0, 1, 0];
};

export const LOOKS: readonly Look[] = [
  { id: 'none', label: 'None', matrix: IDENTITY, grain: 0, vignette: 0 },
  // Clean and punchy for sunlit trails: contrast, colour and a touch of clarity, no stylisation.
  { id: 'vivid', label: 'Vivid', matrix: stock(1.28, [1.02, 1.0, 1.0], 1.08, [0, 0, 0]), grain: 0, vignette: 0.1, curve: 0.5 },
  // A warm colour-negative stock: lifted shadows, golden highlights, teal in the darks.
  { id: 'colour-negative', label: 'Warm film', matrix: stock(1.06, [1.07, 1.0, 0.9], 1.04, [0.012, 0.01, 0.0]), grain: 0.3, vignette: 0.24, curve: 0.3, shadow: [-0.02, 0.012, 0.02], highlight: [0.03, 0.012, -0.03], split: 1 },
  { id: 'faded-slide', label: 'Faded', matrix: stock(0.8, [1.02, 1, 0.97], 0.88, [0.07, 0.07, 0.08]), grain: 0.22, vignette: 0.18, curve: 0.2, shadow: [0.0, 0.01, 0.03], highlight: [0.02, 0.0, -0.01], split: 1 },
  // Cool, soft and blue-green for early mist and mountain mornings.
  { id: 'mist', label: 'Mist', matrix: stock(0.82, [0.94, 1.0, 1.08], 0.92, [0.03, 0.04, 0.05]), grain: 0.14, vignette: 0.16, curve: 0.15, shadow: [-0.01, 0.015, 0.03], highlight: [-0.01, 0.01, 0.02], split: 1 },
  // Panchromatic black and white: the channels are mixed like a film's response, with a gentle curve.
  { id: 'mono', label: 'Mono', matrix: monoMix([0.34, 0.5, 0.16], 1.12), grain: 0.4, vignette: 0.3, curve: 0.45 },
  // High-contrast black and white shot through a red filter: dark skies, bright roads, heavy grain.
  { id: 'noir', label: 'Noir', matrix: monoMix([0.72, 0.28, 0.0], 1.32), grain: 0.6, vignette: 0.45, curve: 0.85 },
  { id: 'sepia', label: 'Sepia', matrix: stock(0, [1.1, 0.96, 0.76], 1.05, [0.02, 0.015, 0.0]), grain: 0.26, vignette: 0.3, curve: 0.25 },
  { id: 'cross-process', label: 'Cross process', matrix: stock(1.18, [1.1, 1.02, 0.9], 1.12, [-0.03, 0.0, 0.06]), grain: 0.3, vignette: 0.26, curve: 0.4, shadow: [-0.03, 0.03, 0.05], highlight: [0.05, 0.03, -0.06], split: 1 },
  // A flash-lit disposable camera: hard contrast, warm cast, strong corners, a light leak.
  { id: 'disposable', label: 'Disposable', matrix: stock(1.12, [1.08, 1.0, 0.92], 1.18, [0.02, 0.01, 0.0]), grain: 0.42, vignette: 0.5, curve: 0.55, leak: 0.55 },
  // A real offset-print screen: cyan, magenta, yellow and black dots at their print angles, on warm paper.
  { id: 'halftone', label: 'Halftone', matrix: stock(1.2, [1, 1, 1], 1.1, [0, 0, 0]), grain: 0.1, vignette: 0.1, dots: 1, screen: 'cmyk' },
  // A newspaper photo: one black dot screen at 45 degrees on newsprint.
  { id: 'newsprint', label: 'Newsprint', matrix: monoMix([0.3, 0.55, 0.15], 1.25), grain: 0.18, vignette: 0.14, dots: 1, screen: 'mono' },
];

/** The look a swipe lands on: `step` 1 is the next look, -1 the previous. It stops at either end rather than wrapping. */
export function stepLook(id: LookId, step: 1 | -1): LookId {
  const i = LOOKS.findIndex((l) => l.id === id);
  return LOOKS[Math.min(LOOKS.length - 1, Math.max(0, i + step))].id;
}

/** Whether a drag is a swipe between looks: mostly sideways and long enough. Returns the step (a swipe left goes to the next look, as in a photo app), or 0. */
export function swipeStep(dx: number, dy: number, minDistance: number): 1 | -1 | 0 {
  if (Math.abs(dx) < minDistance || Math.abs(dx) < Math.abs(dy) * 1.5) return 0;
  return dx < 0 ? 1 : -1;
}

export const lookById = (id: string): Look => LOOKS.find((l) => l.id === id) ?? LOOKS[0];

const lerp = (a: Matrix, b: Matrix, t: number): Matrix => a.map((v, i) => v + (b[i] - v) * t);

export type LookParams = { /** The rest of the look scaled by strength: curve, split toning, screen, leak. */ curve: number; shadow: Rgb; highlight: Rgb; split: number; screen?: Screen; leak: number; matrix: Matrix; /** Grain opacity, 0 to 0.5. */ grain: number; /** Vignette opacity at the corners, 0 to 0.4. */ vignette: number; /** Dot screen opacity, 0 to 0.6. */ dots: number; /** True when the picture is left exactly as it was. */ neutral: boolean };

/** What to draw for a look at an intensity (0 to 1): the matrix blended with "no change", and grain and vignette scaled the same way. */
export function lookParams(id: LookId, intensity: number): LookParams {
  const look = lookById(id);
  const t = look.id === 'none' ? 0 : clampIntensity(intensity);
  const neutral = t === 0;
  return { curve: (look.curve ?? 0) * t, shadow: look.shadow ?? [0, 0, 0], highlight: look.highlight ?? [0, 0, 0], split: (look.split ?? 0) * t, screen: look.screen, leak: (look.leak ?? 0) * t, matrix: neutral ? IDENTITY : lerp(IDENTITY, look.matrix, t), grain: look.grain * t, vignette: look.vignette * t, dots: (look.dots ?? 0) * t, neutral };
}

/** Applies a matrix to one colour (values 0..1). For tests and any code that needs the real result of a look. */
export function applyMatrix(m: Matrix, [r, g, b]: Rgb): [number, number, number] {
  return [0, 1, 2].map((row) => m[row * 5] * r + m[row * 5 + 1] * g + m[row * 5 + 2] * b + m[row * 5 + 4]) as [number, number, number];
}

/** The twenty numbers as the `values` of an SVG feColorMatrix. */
export const matrixValues = (m: Matrix) => m.map((v) => +v.toFixed(4)).join(' ');
