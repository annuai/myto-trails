import { describe, expect, it } from 'vitest';
import type { LatLng } from './geo';
import { layoutCardMap, TILE } from './cardMap';

const BOX = { width: 900, height: 600 };
// About 11 km north to south near Bengaluru.
const route: LatLng[] = [{ lat: 12.9, lng: 77.6 }, { lat: 12.95, lng: 77.62 }, { lat: 13.0, lng: 77.6 }];

describe('layoutCardMap', () => {
  it('has nothing to lay out for fewer than two points', () => {
    expect(layoutCardMap([], BOX)).toBeNull();
    expect(layoutCardMap([route[0]!], BOX)).toBeNull();
  });
  it('puts the whole route inside the box, centred, filling a good part of it (zoom moves in whole steps)', () => {
    const m = layoutCardMap(route, BOX)!;
    const xs = m.points.map((p) => p.x), ys = m.points.map((p) => p.y);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs)).toBeLessThanOrEqual(BOX.width);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...ys)).toBeLessThanOrEqual(BOX.height);
    expect((Math.min(...xs) + Math.max(...xs)) / 2).toBeCloseTo(BOX.width / 2, 0);
    expect((Math.min(...ys) + Math.max(...ys)) / 2).toBeCloseTo(BOX.height / 2, 0);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(BOX.height * 0.35);
  });
  it('covers the whole box with tiles', () => {
    const m = layoutCardMap(route, BOX)!;
    expect(Math.min(...m.tiles.map((t) => t.left))).toBeLessThanOrEqual(0);
    expect(Math.max(...m.tiles.map((t) => t.left + TILE))).toBeGreaterThanOrEqual(BOX.width);
    expect(Math.min(...m.tiles.map((t) => t.top))).toBeLessThanOrEqual(0);
    expect(Math.max(...m.tiles.map((t) => t.top + TILE))).toBeGreaterThanOrEqual(BOX.height);
    expect(m.tiles.length).toBeLessThan(40);
    expect(m.tiles[0]!.url).toMatch(/^https:\/\/tile\.openstreetmap\.org\/\d+\/\d+\/\d+\.png$/);
  });
  it('zooms in for a shorter route', () => {
    const short: LatLng[] = [{ lat: 12.9, lng: 77.6 }, { lat: 12.905, lng: 77.602 }];
    expect(layoutCardMap(short, BOX)!.zoom).toBeGreaterThan(layoutCardMap(route, BOX)!.zoom);
  });
  it('copes with a route that does not move', () => {
    const still: LatLng[] = [{ lat: 12.9, lng: 77.6 }, { lat: 12.9, lng: 77.6 }];
    expect(layoutCardMap(still, BOX)!.zoom).toBeLessThanOrEqual(16);
  });
});
