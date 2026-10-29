import { describe, expect, it } from 'vitest';
import { parsePlaces } from './placeSearch';

const f = (props: Record<string, string>, coordinates: [number, number] = [76.65, 12.3]) => ({ geometry: { coordinates }, properties: props });

describe('parsePlaces', () => {
  it('reads name, region and position (Photon sends lng first)', () => {
    expect(parsePlaces({ features: [f({ name: 'Mysuru', state: 'Karnataka', country: 'India' })] })).toEqual([
      { name: 'Mysuru', detail: 'Karnataka, India', point: { lat: 12.3, lng: 76.65 } },
    ]);
  });
  it('prefers the district or city for the detail and never repeats the name in it', () => {
    expect(parsePlaces({ features: [f({ name: 'Nandi Hills', city: 'Nandi Hills', district: 'Chikkaballapura', state: 'Karnataka' })] })[0]!.detail).toBe('Chikkaballapura, Karnataka');
  });
  it('drops unnamed, unplaced and repeated results', () => {
    const r = parsePlaces({ features: [f({}), { properties: { name: 'X' } }, f({ name: 'A', state: 'S' }), f({ name: 'A', state: 'S' })] });
    expect(r.map((p) => p.name)).toEqual(['A']);
  });
  it('copes with nonsense', () => {
    expect(parsePlaces(null)).toEqual([]);
    expect(parsePlaces({})).toEqual([]);
  });
});
