import { describe, expect, it } from 'vitest';
import { parseManifest, regionTotalBytes, updateAvailable, type Installed, type Region } from './manifest';

const file = (bytes = 100) => ({ url: 'https://r2.example/x.pmtiles', bytes, sha256: 'abc' });
const raw = (over: Record<string, unknown> = {}) => ({
  id: 'karnataka', name: 'Karnataka', bbox: [74, 11.5, 78.6, 18.5], version: '2026-11-01',
  map: file(1000), search: file(200), ...over,
});
const manifest = (...regions: unknown[]) => ({ format: 1, regions });

describe('parseManifest', () => {
  it('rejects a wrong format, null and a string', () => {
    expect(parseManifest({ format: 2, regions: [] })).toBeNull();
    expect(parseManifest(null)).toBeNull();
    expect(parseManifest('nope')).toBeNull();
    expect(parseManifest({ format: 1 })).toBeNull();
  });

  it('accepts a valid manifest', () => {
    const out = parseManifest(manifest(raw()));
    expect(out).toEqual([raw()]);
  });

  it('drops a region whose bbox has west >= east or south >= north', () => {
    expect(parseManifest(manifest(raw({ bbox: [78, 11, 74, 18] })))).toEqual([]);
    expect(parseManifest(manifest(raw({ bbox: [74, 18, 78, 11] })))).toEqual([]);
    expect(parseManifest(manifest(raw({ bbox: [74, 11, 74, 18] })))).toEqual([]);
  });

  it('drops a region with out-of-range or malformed coordinates', () => {
    expect(parseManifest(manifest(raw({ bbox: [74, -91, 78, 18] })))).toEqual([]);
    expect(parseManifest(manifest(raw({ bbox: [-181, 11, 78, 18] })))).toEqual([]);
    expect(parseManifest(manifest(raw({ bbox: [74, 11, 78] })))).toEqual([]);
    expect(parseManifest(manifest(raw({ bbox: [74, 11, 78, '18'] })))).toEqual([]);
    expect(parseManifest(manifest(raw({ bbox: [74, 11, NaN, 18] })))).toEqual([]);
  });

  it('drops a region missing map or search', () => {
    expect(parseManifest(manifest(raw({ map: undefined })))).toEqual([]);
    expect(parseManifest(manifest(raw({ search: undefined })))).toEqual([]);
  });

  it('drops regions with bad bytes, urls, ids or versions', () => {
    expect(parseManifest(manifest(raw({ map: file(NaN) })))).toEqual([]);
    expect(parseManifest(manifest(raw({ map: file(Infinity) })))).toEqual([]);
    expect(parseManifest(manifest(raw({ map: file(-1) })))).toEqual([]);
    expect(parseManifest(manifest(raw({ map: { ...file(), bytes: '5' } })))).toEqual([]);
    expect(parseManifest(manifest(raw({ search: { ...file(), url: 7 } })))).toEqual([]);
    expect(parseManifest(manifest(raw({ search: { ...file(), sha256: '' } })))).toEqual([]);
    expect(parseManifest(manifest(raw({ id: '' })))).toEqual([]);
    expect(parseManifest(manifest(raw({ name: 5 })))).toEqual([]);
    expect(parseManifest(manifest(raw({ version: '' })))).toEqual([]);
  });

  it('keeps good regions next to bad ones and never throws on junk entries', () => {
    const out = parseManifest(manifest(null, 5, 'x', raw({ id: 'bad', bbox: [1, 1, 0, 0] }), raw({ id: 'goa', name: 'Goa' })));
    expect(out?.map((r) => r.id)).toEqual(['goa']);
  });

  it('keeps the first of a duplicated id', () => {
    const out = parseManifest(manifest(raw({ name: 'First' }), raw({ name: 'Second' })));
    expect(out).toHaveLength(1);
    expect(out?.[0].name).toBe('First');
  });
});

describe('updateAvailable', () => {
  const region = parseManifest(manifest(raw()))![0] as Region;
  const installed = (version: string): Installed => ({ id: region.id, version, bbox: region.bbox, mapPath: 'm', searchPath: 's' });

  it('is true when versions differ', () => expect(updateAvailable(region, installed('2026-10-01'))).toBe(true));
  it('is false when versions match', () => expect(updateAvailable(region, installed(region.version))).toBe(false));
  it('is false when not installed', () => expect(updateAvailable(region, undefined)).toBe(false));
});

describe('regionTotalBytes', () => {
  it('sums map and search', () => {
    expect(regionTotalBytes(parseManifest(manifest(raw()))![0])).toBe(1200);
  });
});
