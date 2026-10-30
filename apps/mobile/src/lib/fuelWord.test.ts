import { describe, expect, it } from 'vitest';
import { currencyFor } from './locale';
import { countryName } from './countryNames';
import { COUNTRIES, countryEntry } from './countryList';
import { fuelWord } from './fuelCost';

describe('fuel word', () => {
  it('says gas where riders do, petrol elsewhere', () => {
    expect(fuelWord('US')).toBe('gas'); expect(fuelWord('ca')).toBe('gas'); expect(fuelWord('IN')).toBe('petrol'); expect(fuelWord(null)).toBe('petrol');
  });
});

describe('country list', () => {
  it('has unique codes and a three-letter currency for every country', () => {
    expect(new Set(COUNTRIES.map((c) => c.iso2)).size).toBe(COUNTRIES.length);
    expect(COUNTRIES.every((c) => /^[A-Z]{2}$/.test(c.iso2) && /^[A-Z]{3}$/.test(c.currency) && c.name.length > 2)).toBe(true);
  });
  it('sets the currency from the country', () => {
    expect(currencyFor('IN')).toBe('INR'); expect(currencyFor('us')).toBe('USD'); expect(currencyFor('DE')).toBe('EUR'); expect(currencyFor('JP')).toBe('JPY');
    expect(currencyFor('ZZ')).toBeNull(); expect(currencyFor(null)).toBeNull();
  });
  it('gives the full name, not the code, when the phone cannot', () => {
    expect(countryEntry('np')?.name).toBe('Nepal');
    expect(countryName('LK')).not.toBe('LK');
    expect(countryName('ZZ')).toBe('ZZ');
  });
});
