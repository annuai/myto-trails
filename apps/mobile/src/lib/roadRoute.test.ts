import { describe, expect, it } from 'vitest';
import { chunkStops, decodePolyline } from './roadRoute';

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
