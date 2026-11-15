import { describe, expect, it } from 'vitest';
import { chunkStops, decodePolyline, roadRoute } from './roadRoute';

describe('decodePolyline', () => {
  it('decodes the worked example from the format\'s documentation', () => {
    const r = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@', 5);
    expect(r).toEqual([{ lat: 38.5, lng: -120.2 }, { lat: 40.7, lng: -120.95 }, { lat: 43.252, lng: -126.453 }]);
  });
  it('gives nothing for an empty string', () => { expect(decodePolyline('')).toEqual([]); });
});

describe('chunkStops', () => {
  it('keeps a short list in one request', () => { expect(chunkStops([1, 2, 3], 20)).toEqual([[1, 2, 3]]); });
  it('splits a long list so neighbouring runs share their joining stop', () => {
    expect(chunkStops([1, 2, 3, 4, 5, 6, 7], 3)).toEqual([[1, 2, 3], [3, 4, 5], [5, 6, 7]]);
    expect(chunkStops([1, 2, 3, 4, 5, 6], 3)).toEqual([[1, 2, 3], [3, 4, 5], [5, 6]]);
  });
});

describe('roadRoute', () => {
  const A = { lat: 0, lng: 0 }, B = { lat: 0, lng: 0.01 };
  const road = (stops: { lat: number; lng: number }[]) => [{ line: stops, steps: [], totalM: 2000, etaMin: 3 }];
  it('joins a run it could not route with a straight line and still follows roads elsewhere', async () => {
    const stops = Array.from({ length: 30 }, (_, i) => ({ lat: 0, lng: i * 0.001 }));
    let n = 0;
    const plan = await roadRoute(stops, {}, async (r) => { if (n++ === 1) throw new Error('routing 502'); return road(r.stops); });
    expect(plan.straightRuns).toBe(1);
    expect(plan.routes).toHaveLength(1);
  });
  it('throws when nothing could be routed', async () => {
    await expect(roadRoute([A, B], {}, async () => { throw new Error('routing 502'); })).rejects.toThrow('routing 502');
  });
  it('offers alternatives between two stops', async () => {
    const plan = await roadRoute([A, B], { alternates: 2 }, async (r) => [...road(r.stops), ...road(r.stops)]);
    expect(plan.routes).toHaveLength(2);
  });
});
