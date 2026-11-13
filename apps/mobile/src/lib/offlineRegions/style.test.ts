import { describe, expect, it } from 'vitest';
import type { Installed } from './manifest';
import { composeLocalStyle, regionAt, type StyleJson } from './style';

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
  sources: { openmaptiles: { type: 'vector', url: 'https://x/planet' }, ne2: { type: 'raster', tiles: ['https://x/{z}.png'] } },
  layers: [
    { id: 'bg', type: 'background', paint: {} },
    { id: 'water', type: 'fill', source: 'openmaptiles', 'source-layer': 'water' },
    { id: 'roads', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation' },
    { id: 'shade', type: 'raster', source: 'ne2' },
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
    expect(out.layers).toHaveLength(2 * 2 + 1 + 1);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('water@goa');
    expect(ids).toContain('roads@konkan');
    expect(out.layers.find((l) => l.id === 'water@konkan')?.source).toBe('konkan');
  });
  it('leaves no layer on the removed source', () => expect(out.layers.some((l) => l.source === 'openmaptiles')).toBe(false));
  it('points glyphs and sprite at local files', () => {
    expect(out.glyphs?.startsWith('file://')).toBe(true);
    expect(out.sprite).toBe(paths.sprite);
  });
  it('with no regions returns the base with local glyphs and sprite', () => {
    const none = composeLocalStyle(base, [], paths);
    expect(none.layers).toEqual(base.layers);
    expect(none.glyphs).toBe(paths.glyphs);
  });
});
