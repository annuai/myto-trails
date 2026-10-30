import { countryConfig } from '@moto-trails/domain';
import { COUNTRY_CURRENCY } from './countryData';

/** The phone's language and region as a BCP 47 tag ("en-IN"). Hermes and every browser have Intl, so no native module is needed. */
export const deviceLocale = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale || 'en';
  } catch {
    return 'en';
  }
};

/** The region part of a tag, upper case: "en-IN" is "IN", "en" is null. */
export const regionFromLocale = (tag: string): string | null => {
  try {
    const r = new Intl.Locale(tag).region;
    if (r) return r.toUpperCase();
  } catch {
    // fall through to the pattern
  }
  return /[-_]([A-Za-z]{2})(?:[-_]|$)/.exec(tag)?.[1]?.toUpperCase() ?? null;
};

export const deviceRegion = (tag: string = deviceLocale()): string | null => regionFromLocale(tag);

/** Places that sign roads in miles and speeds in mph. Everywhere else is kilometres. */
const MILE_REGIONS = new Set(['US', 'GB', 'LR', 'MM']);

/** What a rider in this region expects to read: the country's own setting, else miles in the few places that use them. */
export const defaultDistanceUnit = (region: string | null | undefined): 'km' | 'mi' =>
  countryConfig(region)?.distanceUnit ?? (region && MILE_REGIONS.has(region.toUpperCase()) ? 'mi' : 'km');

/** The currency fuel is paid for in: the country's own setting, else the bundled table (every country the app lists). Unknown regions get null. */
export const currencyFor = (region: string | null | undefined): string | null =>
  countryConfig(region)?.currency ?? (region ? COUNTRY_CURRENCY[region.toUpperCase()] ?? null : null);
