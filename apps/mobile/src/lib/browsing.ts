import type { Country } from '@/api/countries';

/**
 * Which country the lists show. The rider's choice if that country is open; else the country their phone or GPS says they are in, if it
 * is open; else null, meaning every open country. A country that is only "coming soon" never filters lists down to nothing.
 */
export function resolveBrowsing(i: { chosen: string | null; detected: string | null; countries: Country[] }): string | null {
  const open = (iso2: string | null) => (iso2 && i.countries.find((c) => c.enabled && c.iso2 === iso2.toUpperCase())?.iso2) || null;
  return open(i.chosen) ?? open(i.detected);
}

/**
 * True once the rider has chosen both a home country and a unit in settings. From then on the lists follow that country and the
 * country picker on Trails and Clubs is not shown again: one place to set it, not two.
 */
export const countrySettled = (s: { home: string | null; unit: string | null }): boolean => s.home !== null && s.unit !== null;

/** The country the rider has picked for the lists: their settings once settled, otherwise what they chose with the picker. */
export const browsingChoice = (s: { home: string | null; unit: string | null; browsing: string | null }): string | null => (countrySettled(s) ? s.home : s.browsing);

/** "Showing: India" or, with no single country, "Showing: All open countries". */
export function chipLabel(browsing: string | null, countries: Country[]): string {
  const name = browsing ? countries.find((c) => c.iso2 === browsing)?.name : undefined;
  return `Showing: ${name ?? 'All open countries'}`;
}

/** The `country` query for list requests; absent when no single country is chosen so the server's answer stays as it was. */
export const countryQuery = (browsing: string | null): Record<string, string> => (browsing ? { country: browsing } : {});

/** Countries to offer in the picker: open ones first, then coming soon, each in alphabetical order. */
export const pickerOrder = (countries: Country[]): Country[] =>
  [...countries].sort((a, b) => Number(b.enabled) - Number(a.enabled) || a.name.localeCompare(b.name));

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const validEmail = (text: string): boolean => text.trim().length <= 254 && EMAIL.test(text.trim());
