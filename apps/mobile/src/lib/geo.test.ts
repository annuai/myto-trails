import { describe, expect, it } from 'vitest';
import { travelHeading } from './geo';

describe('travelHeading', () => {
  it('is undefined with no track or no movement', () => {
    expect(travelHeading([])).toBeUndefined();
    expect(travelHeading([{ lat: 12, lng: 77 }, { lat: 12.00001, lng: 77 }])).toBeUndefined();
  });

  it('points north, east and south along a track', () => {
    expect(travelHeading([{ lat: 12, lng: 77 }, { lat: 12.001, lng: 77 }])).toBeCloseTo(0, 0);
    expect(travelHeading([{ lat: 12, lng: 77 }, { lat: 12, lng: 77.001 }])).toBeCloseTo(90, 0);
    expect(travelHeading([{ lat: 12.001, lng: 77 }, { lat: 12, lng: 77 }])).toBeCloseTo(180, 0);
  });
});
