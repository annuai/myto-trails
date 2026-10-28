import { describe, expect, it } from 'vitest';
import { asText, distanceKm, durationParts, elevationM, NARROW_SPACE, speedKmh, spoken } from './units';

describe('units', () => {
  it('formats distance with one decimal and Indian grouping', () => {
    expect(distanceKm(0.52)).toEqual({ value: '0.5', unit: 'km' });
    expect(distanceKm(37)).toEqual({ value: '37', unit: 'km' });
    expect(distanceKm(12345.67)).toEqual({ value: '12,345.7', unit: 'km' });
    expect(distanceKm(0)).toEqual({ value: '0', unit: 'km' });
  });
  it('rounds speed and elevation to whole numbers', () => {
    expect(speedKmh(45.4)).toEqual({ value: '45', unit: 'km/h' });
    expect(elevationM(1234.6)).toEqual({ value: '1,235', unit: 'm' });
  });
  it('splits durations into parts', () => {
    expect(durationParts(39)).toEqual([{ value: '39', unit: 'sec' }]);
    expect(durationParts(45 * 60)).toEqual([{ value: '45', unit: 'min' }]);
    expect(durationParts(3600 + 5 * 60)).toEqual([{ value: '1', unit: 'h' }, { value: '5', unit: 'min' }]);
    expect(durationParts(-3)).toEqual([{ value: '0', unit: 'sec' }]);
  });
  it('writes text with a narrow no-break space, never a wide one', () => {
    expect(asText(distanceKm(37))).toBe(`37${NARROW_SPACE}km`);
    expect(asText(durationParts(3900))).toBe(`1${NARROW_SPACE}h 5${NARROW_SPACE}min`);
    expect(asText(distanceKm(37))).not.toContain(' ');
  });
  it('reads out full unit names', () => {
    expect(spoken(distanceKm(37))).toBe('37 kilometres');
    expect(spoken(durationParts(3900))).toBe('1 hours 5 minutes');
  });
});
