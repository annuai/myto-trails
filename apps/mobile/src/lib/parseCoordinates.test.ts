import { describe, expect, it } from 'vitest';
import { parseCoordinates } from './parseCoordinates';

const blr = { lat: 12.9716, lng: 77.5946 };

describe('parseCoordinates', () => {
  it('reads what Google Maps copies: "lat, lng"', () => { expect(parseCoordinates('12.9716, 77.5946')).toEqual(blr); });
  it('accepts a comma without a space, or only a space', () => {
    expect(parseCoordinates('12.9716,77.5946')).toEqual(blr);
    expect(parseCoordinates('12.9716 77.5946')).toEqual(blr);
  });
  it('ignores surrounding space and brackets', () => { expect(parseCoordinates('  (12.9716, 77.5946) ')).toEqual(blr); });
  it('reads negative values', () => { expect(parseCoordinates('-33.8688, 151.2093')).toEqual({ lat: -33.8688, lng: 151.2093 }); });
  it('reads degrees, minutes and seconds with N/E', () => {
    const p = parseCoordinates('12°58\'18.0"N 77°35\'40.6"E');
    expect(p?.lat).toBeCloseTo(12.97167, 4); expect(p?.lng).toBeCloseTo(77.59461, 4);
  });
  it('makes S and W negative', () => {
    const p = parseCoordinates('33°52\'07.7"S 151°12\'33.5"W');
    expect(p?.lat).toBeLessThan(0); expect(p?.lng).toBeLessThan(0);
  });
  it('reads decimal degrees with a letter', () => { expect(parseCoordinates('12.9716° N, 77.5946° E')).toEqual(blr); });
  it('reads a Google Maps link with @lat,lng', () => { expect(parseCoordinates('https://www.google.com/maps/place/Bengaluru/@12.9716,77.5946,12z/data=x')).toEqual(blr); });
  it('prefers the pin (!3d!4d) over the map centre in a link', () => { expect(parseCoordinates('https://www.google.com/maps/place/X/@1.0,2.0,15z/data=!3d12.9716!4d77.5946')).toEqual(blr); });
  it('reads a link with ?q=lat,lng', () => { expect(parseCoordinates('https://maps.google.com/?q=12.9716,77.5946')).toEqual(blr); });
  it('refuses a place name, a number, or values out of range', () => {
    expect(parseCoordinates('Mysuru')).toBeUndefined();
    expect(parseCoordinates('560001')).toBeUndefined();
    expect(parseCoordinates('95.0, 77.5')).toBeUndefined();
    expect(parseCoordinates('12.9, 190.0')).toBeUndefined();
    expect(parseCoordinates('')).toBeUndefined();
  });
});
