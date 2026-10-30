import { describe, expect, it } from 'vitest';
import { currencyFor, defaultDistanceUnit, deviceRegion, regionFromLocale } from './locale';

describe('locale', () => {
  it('reads the region from a tag', () => {
    expect(regionFromLocale('en-IN')).toBe('IN');
    expect(regionFromLocale('pt_br')).toBe('BR');
    expect(regionFromLocale('en')).toBeNull();
    expect(deviceRegion('en-GB')).toBe('GB');
  });
  it('defaults to kilometres, and to miles where roads use them', () => {
    expect(defaultDistanceUnit('IN')).toBe('km');
    expect(defaultDistanceUnit('us')).toBe('mi');
    expect(defaultDistanceUnit('GB')).toBe('mi');
    expect(defaultDistanceUnit(null)).toBe('km');
    expect(defaultDistanceUnit('DE')).toBe('km');
  });
  it('knows a currency for the home region, or says it does not', () => {
    expect(currencyFor('IN')).toBe('INR');
    expect(currencyFor('us')).toBe('USD');
    expect(currencyFor('DE')).toBe('EUR');
    expect(currencyFor('ZZ')).toBeNull();
    expect(currencyFor(null)).toBeNull();
  });
});
