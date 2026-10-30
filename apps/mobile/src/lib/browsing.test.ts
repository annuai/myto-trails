import { describe, expect, it } from 'vitest';
import type { Country } from '@/api/countries';
import { countryQuery, resolveBrowsing, validEmail } from './browsing';

const IN: Country = { iso2: 'IN', name: 'India', slug: 'india', enabled: true, comingSoon: false };
const NP: Country = { iso2: 'NP', name: 'Nepal', slug: 'nepal', enabled: false, comingSoon: true };
const AU: Country = { iso2: 'AU', name: 'Australia', slug: 'australia', enabled: false, comingSoon: true };
const countries = [NP, IN, AU];

describe('resolveBrowsing', () => {
  it('uses the rider choice when that country is open', () => {
    expect(resolveBrowsing({ chosen: 'IN', detected: null, countries })).toBe('IN');
  });
  it('falls back to the detected country when it is open', () => {
    expect(resolveBrowsing({ chosen: null, detected: 'in', countries })).toBe('IN');
  });
  it('never filters to a country that is only coming soon', () => {
    expect(resolveBrowsing({ chosen: 'NP', detected: 'AU', countries })).toBeNull();
  });
  it('shows every open country when nothing is known', () => {
    expect(resolveBrowsing({ chosen: null, detected: null, countries })).toBeNull();
  });
});

describe('browsing helpers', () => {
  it('adds the country to a request only when there is one', () => {
    expect(countryQuery('IN')).toEqual({ country: 'IN' });
    expect(countryQuery(null)).toEqual({});
  });
  it('checks an email before it is sent', () => {
    expect(validEmail(' a@b.co ')).toBe(true);
    expect(validEmail('nope')).toBe(false);
    expect(validEmail('a@b')).toBe(false);
  });
});
