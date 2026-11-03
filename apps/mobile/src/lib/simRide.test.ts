import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.fn();
const fetchDirections = vi.fn();
vi.mock('@/api/client', () => ({ api: (...a: unknown[]) => api(...a) }));
vi.mock('./turnByTurn', () => ({ fetchDirections: (...a: unknown[]) => fetchDirections(...a) }));

import { prepareSimRide } from './simRide';

const line = [{ lat: 12.9, lng: 77.5 }, { lat: 12.88, lng: 77.34 }];
beforeEach(() => { api.mockReset(); fetchDirections.mockReset(); });

describe('prepareSimRide', () => {
  it("asks for the road from the phone to the trail's start point in the database", async () => {
    api.mockResolvedValue({ name: 'Manchanabele Dam', location: { lat: 12.878434, lon: 77.34427 } });
    fetchDirections.mockResolvedValue({ line, steps: [], totalM: 20000, etaMin: 30 });
    const ride = await prepareSimRide({ lat: 12.9, lng: 77.5 });
    expect(api.mock.calls[0]![0]).toBe('/trails/manchanabele-dam');
    expect(fetchDirections.mock.calls[0]!.slice(0, 2)).toEqual([{ lat: 12.9, lng: 77.5 }, { lat: 12.878434, lng: 77.34427 }]);
    expect(ride.name).toBe('Manchanabele Dam');
    expect(ride.trail.line).toBe(line);
  });
  it('fails clearly when the trail has no start point', async () => {
    api.mockResolvedValue({ name: 'X', location: null });
    await expect(prepareSimRide({ lat: 1, lng: 1 })).rejects.toThrow('no start point');
  });
});
