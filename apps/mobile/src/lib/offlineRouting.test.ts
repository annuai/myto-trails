import { describe, expect, it, vi } from 'vitest';
import type { Installed } from './offlineRegions/manifest';
import { makeLocalRouter, regionFor } from './offlineRouting';

const region = (id: string, bbox: Installed['bbox'], route = true): Installed => ({ id, version: 'v1', bbox, mapPath: 'm', searchPath: 's', ...(route ? { routePath: `${id}.route.tar` } : {}) });
const karnataka = region('karnataka', [74, 11.5, 78.6, 18.5]);
const goa = region('goa', [73.6, 14.8, 74.4, 15.9]);
const kerala = region('kerala', [74.8, 8.1, 77.5, 12.8]);
const BLR = { lat: 12.97, lng: 77.59 }, MYS = { lat: 12.3, lng: 76.64 }, KOCHI = { lat: 9.93, lng: 76.26 }, PANAJI = { lat: 15.49, lng: 74.0 };

describe('regionFor', () => {
  it('picks the region holding every stop', () => {
    expect(regionFor([kerala, karnataka], [BLR, MYS])?.id).toBe('karnataka');
  });
  it('picks the smallest box when boxes overlap', () => {
    expect(regionFor([karnataka, goa], [PANAJI, { lat: 15.3, lng: 74.1 }])?.id).toBe('goa');
  });
  it('gives up on a route that crosses regions, or a region without its routing file', () => {
    expect(regionFor([karnataka, kerala], [BLR, KOCHI])).toBeUndefined();
    expect(regionFor([region('karnataka', karnataka.bbox, false)], [BLR, MYS])).toBeUndefined();
  });
});

describe('makeLocalRouter', () => {
  it('routes on the phone in the right region, and says null where it cannot', async () => {
    const native = { route: vi.fn(async () => '{"trip":{}}') };
    const { router } = makeLocalRouter(native, async () => [karnataka]);
    expect(await router([BLR, MYS], '{}')).toBe('{"trip":{}}');
    expect(native.route).toHaveBeenCalledWith('karnataka.route.tar', '{}');
    expect(await router([BLR, KOCHI], '{}')).toBeNull();
  });
  it('reads the installed list once a minute, or at once after a change', async () => {
    let t = 0;
    const list = vi.fn(async () => [karnataka]);
    const { router, forget } = makeLocalRouter({ route: async () => '{}' }, list, () => t);
    await router([BLR, MYS], '{}'); await router([BLR, MYS], '{}');
    expect(list).toHaveBeenCalledTimes(1);
    forget(); await router([BLR, MYS], '{}');
    expect(list).toHaveBeenCalledTimes(2);
    t = 61_000; await router([BLR, MYS], '{}');
    expect(list).toHaveBeenCalledTimes(3);
  });
});
