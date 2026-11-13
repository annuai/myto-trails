import { createElement as h, useId } from 'react';
import { lookParams, matrixValues, type FilmLook } from '@/lib/filmLook';
import { fixed } from '@/theme/tokens';
import { filmImage as t } from './FilmImage.tokens';

const GREY = '0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1.8 0 0 0 -0.6';

/**
 * The browser version of the film picture: react-native-svg cannot draw an image on the web, so this is plain SVG with the
 * same filters, for the web preview. Saving a filmed photo needs the phone.
 */
export function FilmImage({ uri, pixelWidth, pixelHeight, width, height, look }: { uri: string; pixelWidth: number; pixelHeight: number; width: number; height: number; look: FilmLook }) {
  const key = useId().replace(/[^a-zA-Z0-9]/g, '');
  const p = lookParams(look.id, look.intensity);
  const cell = pixelWidth / t.dotCells;
  const full = { x: 0, y: 0, width: pixelWidth, height: pixelHeight };
  return h('svg', { width, height, viewBox: `0 0 ${pixelWidth} ${pixelHeight}`, style: { display: 'block' } },
    h('defs', null,
      h('filter', { id: `c${key}`, x: 0, y: 0, width: '100%', height: '100%', colorInterpolationFilters: 'sRGB' }, h('feColorMatrix', { type: 'matrix', values: matrixValues(p.matrix) })),
      h('filter', { id: `g${key}`, x: 0, y: 0, width: '100%', height: '100%', colorInterpolationFilters: 'sRGB' },
        h('feTurbulence', { type: 'fractalNoise', baseFrequency: t.grainFrequency, numOctaves: t.grainOctaves, seed: t.grainSeed, stitchTiles: 'stitch' }),
        h('feColorMatrix', { type: 'matrix', values: GREY })),
      h('pattern', { id: `d${key}`, width: cell, height: cell, patternUnits: 'userSpaceOnUse' }, h('circle', { cx: cell / 2, cy: cell / 2, r: cell * t.dotRadius, fill: fixed.shadow })),
      h('radialGradient', { id: `v${key}`, cx: '50%', cy: '50%', r: '75%' },
        h('stop', { offset: t.vignetteStart, stopColor: fixed.shadow, stopOpacity: 0 }),
        h('stop', { offset: 1, stopColor: fixed.shadow, stopOpacity: p.vignette }))),
    h('image', { ...full, href: uri, preserveAspectRatio: 'xMidYMid slice', filter: p.neutral ? undefined : `url(#c${key})` }),
    p.grain > 0 ? h('rect', { ...full, fill: fixed.shadow, filter: `url(#g${key})`, opacity: p.grain * t.grainOpacityScale }) : null,
    p.dots > 0 ? h('rect', { ...full, fill: `url(#d${key})`, opacity: Math.min(0.55, p.dots) }) : null,
    p.vignette > 0 ? h('rect', { ...full, fill: `url(#v${key})` }) : null);
}
