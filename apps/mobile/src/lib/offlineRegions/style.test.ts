import { describe, expect, it } from 'vitest';
import type { Installed } from './manifest';
import { bboxesOverlap, chooseStyle, composeLocalStyle, isPmtilesHeader, nextScope, regionAt, SWITCH_GAP_MS, viewportInRegions, type StyleJson } from './style';

const goa: Installed = { id: 'goa', version: 'v1', bbox: [73.6, 14.9, 74.4, 15.8], mapPath: 'file:///docs/regions/goa.pmtiles', searchPath: 'x' };
const overlap: Installed = { id: 'konkan', version: 'v1', bbox: [73.0, 14.0, 74.0, 16.5], mapPath: '/docs/regions/konkan.pmtiles', searchPath: 'x' };

describe('regionAt', () => {
  it('finds the region holding the point', () => expect(regionAt({ lat: 15.3, lng: 74 }, [goa])?.id).toBe('goa'));
  it('is undefined outside every box', () => expect(regionAt({ lat: 28.6, lng: 77.2 }, [goa, overlap])).toBeUndefined());
  it('returns the first of overlapping regions', () => expect(regionAt({ lat: 15.3, lng: 73.8 }, [goa, overlap])?.id).toBe('goa'));
});

const base: StyleJson = {
  version: 8,
  glyphs: 'https://x/fonts/{fontstack}/{range}.pbf',
  sprite: 'https://x/sprite',
  sources: { openmaptiles: { type: 'vector', url: 'https://x/planet' }, ne2_shaded: { type: 'raster', tiles: ['https://x/{z}.png'] } },
  layers: [
    { id: 'bg', type: 'background', paint: {} },
    { id: 'water', type: 'fill', source: 'openmaptiles', 'source-layer': 'water' },
    { id: 'roads', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation' },
    { id: 'shade', type: 'raster', source: 'ne2_shaded' },
  ],
};
const paths = { glyphs: 'file:///d/offline-map/fonts/{fontstack}/{range}.pbf', sprite: 'file:///d/offline-map/sprite/sprite' };

describe('composeLocalStyle', () => {
  const out = composeLocalStyle(base, [goa, overlap], paths);
  const ids = out.layers.map((l) => l.id as string);
  it('has one vector source per region and drops the online one', () => {
    expect(out.sources.openmaptiles).toBeUndefined();
    expect(out.sources['goa']).toMatchObject({ type: 'vector', url: 'pmtiles://file:///docs/regions/goa.pmtiles' });
    expect(out.sources['konkan']).toMatchObject({ url: 'pmtiles://file:///docs/regions/konkan.pmtiles' });
  });
  it('clones each vector layer per region, keeps background and other sources once', () => {
    expect(out.layers).toHaveLength(2 * 2 + 1);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('water@goa');
    expect(ids).toContain('roads@konkan');
    expect(out.layers.find((l) => l.id === 'water@konkan')?.source).toBe('konkan');
  });
  it('leaves no layer on the removed source', () => expect(out.layers.some((l) => l.source === 'openmaptiles')).toBe(false));
  it('drops the network-only relief raster and its layer', () => {
    expect(out.sources.ne2_shaded).toBeUndefined();
    expect(ids).not.toContain('shade');
    const none = composeLocalStyle(base, [], paths);
    expect(none.sources.ne2_shaded).toBeUndefined();
    expect(none.layers.map((l) => l.id)).toEqual(['bg', 'water', 'roads']);
  });
  it('points glyphs and sprite at local files', () => {
    expect(out.glyphs?.startsWith('file://')).toBe(true);
    expect(out.sprite).toBe(paths.sprite);
  });
  it('with no regions returns the base with local glyphs and sprite', () => {
    const none = composeLocalStyle(base, [], paths);
    expect(none.glyphs).toBe(paths.glyphs);
  });
});

describe('isPmtilesHeader', () => {
  const good = Uint8Array.from([0x50, 0x4d, 0x54, 0x69, 0x6c, 0x65, 0x73, 3, 0]);
  it('accepts PMTiles v3', () => expect(isPmtilesHeader(good)).toBe(true));
  it('rejects a wrong version, wrong magic or short file', () => {
    expect(isPmtilesHeader(Uint8Array.from([...good.slice(0, 7), 2]))).toBe(false);
    expect(isPmtilesHeader(Uint8Array.from([0, 0, 0, 0, 0, 0, 0, 3]))).toBe(false);
    expect(isPmtilesHeader(good.slice(0, 5))).toBe(false);
    expect(isPmtilesHeader(new Uint8Array())).toBe(false);
  });
});

describe('chooseStyle', () => {
  it('is online until the local style exists', () => expect(chooseStyle('url', undefined, false, true)).toEqual({ style: 'url', isLocal: false }));
  it('is local inside a region once available, even after an online failure', () => expect(chooseStyle('url', '{}', false, true)).toEqual({ style: '{}', isLocal: true }));
  it('is online outside every region', () => expect(chooseStyle('url', '{}', false, false)).toEqual({ style: 'url', isLocal: false }));
  it('stays online once the local style failed, even inside', () => expect(chooseStyle('url', '{}', true, true)).toEqual({ style: 'url', isLocal: false }));
});

describe('nextScope', () => {
  const inside = { inside: true, at: 10_000 };
  it('changes nothing while the reading agrees', () => expect(nextScope(inside, true, 10_100)).toEqual({ scope: inside, waitMs: 0 }));
  it('goes from inside to outside after the gap', () => expect(nextScope(inside, false, 10_000 + SWITCH_GAP_MS)).toEqual({ scope: { inside: false, at: 13_000 }, waitMs: 0 }));
  it('goes from outside to inside after the gap', () => expect(nextScope({ inside: false, at: 0 }, true, 5000).scope).toEqual({ inside: true, at: 5000 }));
  it('holds a change back within the gap and says how long', () => expect(nextScope(inside, false, 11_000)).toEqual({ scope: inside, waitMs: 2000 }));
  it('applies the first reading at once', () => expect(nextScope({ inside: false, at: -Infinity }, true, 50).scope.inside).toBe(true));
});

describe('bboxesOverlap', () => {
  it('overlaps when one holds the other or they cross', () => {
    expect(bboxesOverlap([73.7, 15, 74, 15.5], goa.bbox)).toBe(true);
    expect(bboxesOverlap([73, 14, 75, 16.5], goa.bbox)).toBe(true);
    expect(bboxesOverlap([74.2, 15.5, 75, 17], goa.bbox)).toBe(true);
  });
  it('overlaps when boxes only touch', () => {
    expect(bboxesOverlap([74.4, 15, 75, 16], goa.bbox)).toBe(true);
    expect(bboxesOverlap([74.4, 15.8, 75, 16.5], goa.bbox)).toBe(true);
  });
  it('does not overlap when apart', () => {
    expect(bboxesOverlap([74.5, 15, 75, 16], goa.bbox)).toBe(false);
    expect(bboxesOverlap([73.7, 15.9, 74, 16.5], goa.bbox)).toBe(false);
  });
});

describe('viewportInRegions', () => {
  const c = { lat: 15.3, lng: 74 };
  it('is true when the view is fully inside', () => expect(viewportInRegions({ center: c, bounds: [73.9, 15.2, 74.1, 15.4] }, [goa])).toBe(true));
  it('is true when the view straddles the edge, even with the centre outside', () => expect(viewportInRegions({ center: { lat: 15.3, lng: 74.6 }, bounds: [74.3, 15.2, 74.9, 15.4] }, [goa])).toBe(true));
  it('is false when the view is fully outside', () => expect(viewportInRegions({ center: { lat: 28.6, lng: 77.2 }, bounds: [77, 28.4, 77.4, 28.8] }, [goa])).toBe(false));
  it('is true when the view only touches the region', () => expect(viewportInRegions({ center: { lat: 15.3, lng: 74.6 }, bounds: [74.4, 15.2, 74.9, 15.4] }, [goa])).toBe(true));
  it('is false with no regions', () => expect(viewportInRegions({ center: c, bounds: [73.9, 15.2, 74.1, 15.4] }, [])).toBe(false));
  it('falls back to the centre point without bounds', () => {
    expect(viewportInRegions({ center: c }, [goa])).toBe(true);
    expect(viewportInRegions({ center: { lat: 28.6, lng: 77.2 } }, [goa])).toBe(false);
  });
  it('uses the bounds over the centre when both are given', () => expect(viewportInRegions({ center: c, bounds: [77, 28.4, 77.4, 28.8] }, [goa])).toBe(false));
});
