import { fixed, scrim } from '@/theme/tokens';

/**
 * How the heat map is drawn (the same on the phone's map and the web one): glowing lines in the brand red. On the light map a road
 * ridden once is a thin, soft-red line, and the more it is ridden the wider, deeper and more glowing it gets, through the brand red
 * to a deep red. On the dark map (inverted colours) it runs the other way, from a dim red up to a pale glow, because deep reds would
 * vanish there. Three layers, bottom to top: a soft glow (a heat map of the places ridden, so it is one smooth glow and never beads);
 * a blurred halo of the line; and the line itself, fully opaque so it is one unbroken stroke. `heat` runs from 0 (ridden once) to 1
 * (ridden most). Lines are sorted by heat, so the busiest sit on top.
 */
const byHeat = (once: number, most: number) => ['interpolate', ['linear'], ['get', 'heat'], 0, once, 1, most];
const byZoom = (far: unknown, near: unknown) => ['interpolate', ['linear'], ['zoom'], 6, far, 15, near];

export const heatLineLayout = { 'line-cap': 'round', 'line-join': 'round', 'line-sort-key': ['get', 'heat'] } as const;

/** The paint of the three heat layers, for the light map or (`dark`) the dark one. */
export function heatPaints(dark: boolean) {
  const ramp = dark ? fixed.heatNight : fixed.heat;
  const colour = ['interpolate', ['linear'], ['get', 'heat'], 0, ramp[0], 0.34, ramp[1], 0.67, ramp[2], 1, ramp[3]];
  return {
    glow: {
      'heatmap-weight': byHeat(0.3, 1),
      'heatmap-intensity': byZoom(0.8, 1.6),
      'heatmap-radius': byZoom(4, 16),
      'heatmap-opacity': dark ? 0.5 : 0.45,
      'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'], 0, scrim.clear, 0.25, ramp[0], 0.6, ramp[1], 1, ramp[2]],
    },
    /** The halo: the line, wide and blurred, so each road glows. Fainter where it was ridden once. */
    halo: {
      'line-color': colour,
      'line-width': byZoom(byHeat(3, 6), byHeat(6, 14)),
      'line-blur': byZoom(3, 6),
      'line-opacity': byHeat(0.22, 0.5),
    },
    line: {
      'line-color': colour,
      'line-width': byZoom(byHeat(0.9, 1.8), byHeat(1.6, 4)),
      'line-opacity': byHeat(0.85, 1),
    },
  };
}
