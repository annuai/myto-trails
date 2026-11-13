import { describe, expect, it } from 'vitest';
import type { Installed, Region } from '@/lib/offlineRegions/manifest';
import { rowState } from './rowState';

const file = { url: 'https://x/f', bytes: 1, sha256: 'a' };
const region: Region = { id: 'goa', name: 'Goa', bbox: [73, 14, 75, 16], version: '2', map: file, search: file };
const installed = (version: string): Installed => ({ id: 'goa', version, bbox: region.bbox, mapPath: 'm', searchPath: 's' });

describe('rowState', () => {
  it('is installed when the same version is on the phone', () => expect(rowState(region, installed('2'), undefined)).toBe('installed'));
  it('is update when an older version is on the phone', () => expect(rowState(region, installed('1'), undefined)).toBe('update'));
  it('is downloading while a progress number is set, even at zero', () => expect(rowState(region, undefined, 0)).toBe('downloading'));
  it('is downloading during an update too', () => expect(rowState(region, installed('1'), 40)).toBe('downloading'));
  it('is download when nothing is installed', () => expect(rowState(region, undefined, undefined)).toBe('download'));
});
