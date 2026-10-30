import { describe, expect, it } from 'vitest';
import { mapStart } from './mapStart';

describe('mapStart', () => {
  it('opens on the rider first', () => {
    expect(mapStart({ position: { lat: 12.9, lng: 77.6 }, browsing: 'IN' })).toEqual({ kind: 'point', center: [77.6, 12.9], zoom: 10 });
  });
  it('then on the country being browsed', () => {
    const s = mapStart({ browsing: 'IN' });
    expect(s.kind).toBe('bounds');
  });
  it('then on the whole world', () => {
    expect(mapStart({})).toEqual({ kind: 'world', center: [0, 20], zoom: 1.5 });
    expect(mapStart({ browsing: 'ZZ' }).kind).toBe('world');
  });
});
