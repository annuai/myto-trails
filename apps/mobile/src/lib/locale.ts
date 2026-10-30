import { countryConfig } from '@moto-trails/domain';
import { countryEntry } from './countryList';

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

/** The currency for a region: the country's own setting when the app has one, else the country list's, else null (amounts are then plain numbers). */
export const currencyFor = (region: string | null | undefined): string | null =>
  countryConfig(region)?.currency ?? countryEntry(region)?.currency ?? null;
