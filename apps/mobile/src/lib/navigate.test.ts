import { describe, expect, it } from 'vitest';
import { mapsDirectionsUrl } from './navigate';

describe('mapsDirectionsUrl', () => {
  it('points Google Maps directions at the position, with no key', () => {
    expect(mapsDirectionsUrl({ lat: 12.971599, lng: 77.594566 })).toBe('https://www.google.com/maps/dir/?api=1&destination=12.971599,77.594566&travelmode=driving');
  });
  it('keeps negative coordinates and rounds to about a tenth of a metre', () => {
    expect(mapsDirectionsUrl({ lat: -33.8688197, lng: 151.2092 })).toContain('destination=-33.868820,151.209200');
  });
});
