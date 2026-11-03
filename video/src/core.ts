import { Easing, interpolate, useVideoConfig } from 'remotion';

export const FPS = 30;
export const DURATION = 60 * FPS;

/** The app's Survey-sheet palette (DESIGN.md, packages/tokens/src/mobile.ts). Brand red is for the closing logo only. */
export const c = {
  paper: '#f2ede8',
  card: '#fbf9f6',
  field: '#efe9e1',
  ink: '#1a1a1a',
  muted: '#6b6560',
  edge: '#857e77',
  line: 'rgba(0,0,0,0.10)',
  accent: '#1f4a6b',
  accentSubtle: '#e3ebf1',
  good: '#2d6a3e',
  caution: '#8a5a00',
  stop: '#a32d1c',
  brand: '#be3a23',
  white: '#ffffff',
  riders: ['#1e7380', '#a34393', '#5a6e1c', '#5241aa', '#89613e'],
};

export const font = {
  display: 'Michroma, sans-serif',
  text: 'Geist, sans-serif',
  mono: '"Geist Mono", monospace',
};

/** The app's easing: cubic-bezier(.4,0,.2,1). */
export const ease = Easing.bezier(0.4, 0, 0.2, 1);

/** 0 to 1 with the app's easing, starting at `start` and lasting `dur` frames. */
export const prog = (frame: number, start: number, dur: number) =>
  interpolate(frame, [start, start + dur], [0, 1], { easing: ease, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

/** 0 to 1, no easing. */
export const lin = (frame: number, start: number, dur: number) =>
  interpolate(frame, [start, start + dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

/** A closed, hand-drawn-looking ring: a circle bent by a few sine waves. `seed` changes the shape. */
export const blob = (cx: number, cy: number, r: number, seed: number, n = 72) => {
  let d = '';
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + 0.14 * Math.sin(3 * a + seed) + 0.08 * Math.sin(5 * a + seed * 2.3) + 0.04 * Math.sin(7 * a + seed * 1.7);
    d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * r * k).toFixed(1)} ${(cy + Math.sin(a) * r * k * 0.85).toFixed(1)}`;
  }
  return `${d}Z`;
};

/**
 * Where things go in each size. Portrait keeps 250 px clear top and bottom (Instagram's own buttons and caption sit there)
 * and 64 px at the sides; the 4:5 feed size and the 16:9 website size use smaller margins.
 */
export const useFormat = () => {
  const { width: w, height: h } = useVideoConfig();
  const wide = w > h;
  const tall = h / w > 1.5;
  const side = wide ? 96 : 64;
  const safeTop = wide ? 64 : tall ? 250 : 90;
  const safeBottom = safeTop;
  const captionH = wide ? 0 : tall ? 330 : 300;
  const phoneTop = wide ? safeTop : safeTop + captionH + 16;
  const phoneH = h - safeBottom - phoneTop;
  const scale = phoneH / 844;
  const phoneW = 390 * scale;
  const phoneX = wide ? w - side - phoneW : (w - phoneW) / 2;
  const headSize = wide ? 68 : tall ? 58 : 52;
  const subSize = wide ? 34 : tall ? 36 : 32;
  const captionW = wide ? phoneX - side - 96 : w - side * 2;
  return { w, h, wide, tall, side, safeTop, safeBottom, captionH, phoneTop, phoneH, scale, phoneW, phoneX, headSize, subSize, captionW };
};
