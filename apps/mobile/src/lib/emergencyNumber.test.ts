import { describe, expect, it } from 'vitest';
import { countryAt, countryBox } from './countryBoundaries';
import { cleanDialNumber, emergencyNumberFor } from './emergencyNumber';

const BENGALURU = { lat: 12.97, lng: 77.59 };
const LONDON = { lat: 51.5, lng: -0.12 };

describe('countryAt', () => {
  it('finds India offline, and nothing for a country we have no number for', () => {
    expect(countryAt(BENGALURU.lat, BENGALURU.lng)).toBe('IN');
    expect(countryAt(28.6, 77.2)).toBe('IN');
    expect(countryAt(LONDON.lat, LONDON.lng)).toBeNull();
    expect(countryAt(0, -30)).toBeNull();
  });
  it('knows the box of a country, and has none for the unknown', () => {
    const box = countryBox('in')!;
    expect(box[0]).toBeLessThan(70);
    expect(box[3]).toBeGreaterThan(35);
    expect(countryBox('ZZ')).toBeNull();
    expect(countryBox(null)).toBeNull();
  });
});

describe('emergencyNumberFor', () => {
  it('follows the position', () => {
    expect(emergencyNumberFor(BENGALURU, null)).toMatchObject({ number: '112', source: 'position', iso2: 'IN', note: null });
  });
  it('follows the position even when the phone is set to another region', () => {
    expect(emergencyNumberFor(BENGALURU, 'GB').source).toBe('position');
  });
  it('uses the phone region when there is no position, and says so', () => {
    const e = emergencyNumberFor(null, 'IN');
    expect(e).toMatchObject({ number: '112', source: 'device_region', iso2: 'IN' });
    expect(e.note).toMatch(/phone's region/);
  });
  it('falls back to 112 and says it could not tell where the rider is', () => {
    const e = emergencyNumberFor(null, null);
    expect(e).toMatchObject({ number: '112', source: 'fallback', iso2: null });
    expect(e.note).toMatch(/Couldn't tell where you are/);
  });
  it('falls back, with its own warning, in a country with no number on file', () => {
    const e = emergencyNumberFor(LONDON, 'IN');
    expect(e.source).toBe('fallback');
    expect(e.note).toMatch(/don't have this country's emergency number/);
  });
});

describe('cleanDialNumber', () => {
  it('keeps what can be dialled', () => {
    expect(cleanDialNumber(' 9 1 1 ')).toBe('911');
    expect(cleanDialNumber('+44 (0) 999')).toBe('+440999');
    expect(cleanDialNumber('000')).toBe('000');
  });
  it('refuses the rest', () => {
    expect(cleanDialNumber('')).toBeNull();
    expect(cleanDialNumber('1')).toBeNull();
    expect(cleanDialNumber('call me')).toBeNull();
    expect(cleanDialNumber('1234567890123456')).toBeNull();
  });
});
