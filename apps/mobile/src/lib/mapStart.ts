import { countryBox } from './countryBoundaries';

export type MapStart =
  | { kind: 'point'; center: [number, number]; zoom: number }
  | { kind: 'bounds'; bounds: [number, number, number, number] }
  | { kind: 'world'; center: [number, number]; zoom: number };

export const WORLD_CENTER: [number, number] = [0, 20];
export const WORLD_ZOOM = 1.5;
const POSITION_ZOOM = 10;

/** Where a map with nothing to show yet opens: on the rider, else on the country being browsed, else the whole world. */
export function mapStart(i: { position?: { lat: number; lng: number } | null; browsing?: string | null }): MapStart {
  if (i.position) return { kind: 'point', center: [i.position.lng, i.position.lat], zoom: POSITION_ZOOM };
  const bounds = countryBox(i.browsing);
  if (bounds) return { kind: 'bounds', bounds };
  return { kind: 'world', center: WORLD_CENTER, zoom: WORLD_ZOOM };
}
