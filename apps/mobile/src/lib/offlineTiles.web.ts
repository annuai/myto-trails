import type { LatLng } from './geo';

/** The browser has no offline map store. */
export const tilesAvailable = false;
export const downloadTiles = async (_slug: string, _line: LatLng[], _onProgress: (pct: number) => void): Promise<void> => { throw new Error('Offline maps are available in the phone app.'); };
export const hasTiles = async (_slug: string): Promise<boolean> => false;
export const deleteTiles = async (_slug: string): Promise<void> => undefined;
