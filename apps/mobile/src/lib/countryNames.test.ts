import { afterEach, describe, expect, it, vi } from 'vitest';
import { knownCountryCodes } from './countryBoundaries';
import { COUNTRY_CURRENCY, COUNTRY_NAMES, CURRENCY_NAMES } from './countryData';
import { countryName } from './countryNames';

afterEach(() => vi.unstubAllGlobals());

describe('country names', () => {
  it('gives the full name, never the two-letter code', () => {
    expect(countryName('IN', 'en')).toBe('India');
    expect(countryName('us', 'en')).toBe('United States');
    expect(countryName(null)).toBe('');
  });
  it('still gives the full name on a phone whose engine has no Intl.DisplayNames', () => {
    vi.stubGlobal('Intl', { ...Intl, DisplayNames: class { constructor() { throw new Error('not supported'); } } });
    expect(countryName('IN', 'en')).toBe('India');
    expect(countryName('DE', 'en')).toBe('Germany');
  });
  it('gives a code only for a country it does not know', () => {
    vi.stubGlobal('Intl', { ...Intl, DisplayNames: class { constructor() { throw new Error('not supported'); } } });
    expect(countryName('ZZ', 'en')).toBe('ZZ');
  });
  it('has a name and a currency for every country the app lists', () => {
    for (const c of knownCountryCodes()) {
      expect(COUNTRY_NAMES[c], c).toBeTruthy();
      expect(COUNTRY_NAMES[c], c).not.toBe(c);
      expect(COUNTRY_CURRENCY[c], c).toMatch(/^[A-Z]{3}$/);
      expect(CURRENCY_NAMES[COUNTRY_CURRENCY[c]!], c).toBeTruthy();
    }
  });
});
