import { afterEach, describe, expect, it, vi } from 'vitest';
import { parsePlaces, searchPlaces } from './placeSearch';

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

describe('searchPlaces', () => {
  const mysuru = { lat: 12.3, lng: 76.65 };
  const answer = (...features: ReturnType<typeof f>[]) => ({ ok: true, json: async () => ({ features }) });
  const paris = f({ name: 'Paris Cafe', country: 'France' }, [2.35, 48.85]);
  const local = f({ name: 'Paris Bakery', state: 'Karnataka', country: 'India' }, [76.7, 12.4]);
  afterEach(() => vi.unstubAllGlobals());

  it('asks Photon for a box around the rider and says it was limited', async () => {
    const fetchMock = vi.fn(async (..._a: unknown[]) => answer(local));
    vi.stubGlobal('fetch', fetchMock);
    const r = await searchPlaces('paris', { near: mysuru });
    expect(String(fetchMock.mock.calls[0]![0])).toContain('bbox=');
    expect(r).toMatchObject({ limited: true, widened: false });
    expect(r.places.map((p) => p.name)).toEqual(['Paris Bakery']);
  });
  it('drops a far result even if the service sends one', async () => {
    vi.stubGlobal('fetch', vi.fn(async (..._a: unknown[]) => answer(paris, local)));
    expect((await searchPlaces('paris', { near: mysuru })).places.map((p) => p.name)).toEqual(['Paris Bakery']);
  });
  it('widens by itself when nothing is nearby, and says how far each place is', async () => {
    const fetchMock = vi.fn(async (url: string) => (url.includes('bbox=') ? answer() : answer(paris)));
    vi.stubGlobal('fetch', fetchMock);
    const r = await searchPlaces('eiffel', { near: mysuru });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(r).toMatchObject({ limited: false, widened: true });
    expect(r.places[0]!.farKm).toBeGreaterThan(6000);
  });
  it('everywhere skips the box and marks far places', async () => {
    const fetchMock = vi.fn(async (..._a: unknown[]) => answer(paris, local));
    vi.stubGlobal('fetch', fetchMock);
    const r = await searchPlaces('paris', { near: mysuru, scope: 'everywhere' });
    expect(String(fetchMock.mock.calls[0]![0])).not.toContain('bbox=');
    expect(r).toMatchObject({ limited: false, widened: false });
    expect(r.places.map((p) => p.farKm !== undefined)).toEqual([true, false]);
  });
  it('limits nothing without a centre', async () => {
    const fetchMock = vi.fn(async (..._a: unknown[]) => answer(paris));
    vi.stubGlobal('fetch', fetchMock);
    const r = await searchPlaces('paris');
    expect(String(fetchMock.mock.calls[0]![0])).not.toContain('bbox=');
    expect(r).toMatchObject({ limited: false, widened: false });
  });
  it('an offline search still throws', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    await expect(searchPlaces('x', { near: mysuru })).rejects.toThrow();
  });
});
