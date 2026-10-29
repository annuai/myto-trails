import { describe, expect, it } from 'vitest';
import { MAX_PACK_TILES, PACK_MAX_ZOOM, PACK_MIN_ZOOM, planPack, tilesAt } from './tileMath';

// Near Bengaluru: about 11 km tall and 11 km wide.
const small = { south: 12.9, west: 77.55, north: 13.0, east: 77.65 };
// Roughly 3 degrees each way: hundreds of kilometres.
const large = { south: 11, west: 75, north: 14, east: 78 };
const huge = { south: 8, west: 70, north: 30, east: 90 };

describe('tilesAt', () => {
  it('counts one tile for a point-sized box and more as it zooms in', () => {
    expect(tilesAt({ south: 13, west: 77.6, north: 13, east: 77.6 }, 10)).toBe(1);
    expect(tilesAt(small, 14)).toBeGreaterThan(tilesAt(small, 10));
  });
});

describe('planPack', () => {
  it('gives a short trail the deepest zoom and stays under the limit', () => {
    const p = planPack(small)!;
    expect(p.maxZoom).toBe(PACK_MAX_ZOOM);
    expect(p.minZoom).toBe(PACK_MIN_ZOOM);
    expect(p.tiles).toBeLessThanOrEqual(MAX_PACK_TILES);
  });
  it('gives a long route less detail, still under the limit', () => {
    const p = planPack(large)!;
    expect(p.maxZoom).toBeLessThan(PACK_MAX_ZOOM);
    expect(p.tiles).toBeLessThanOrEqual(MAX_PACK_TILES);
  });
  it('says no when even the overview is too big', () => {
    expect(planPack(huge, 20)).toBeNull();
  });
});
