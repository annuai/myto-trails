import type { Country } from '@/api/countries';

/**
 * Which country the lists show: the rider's home country (their choice in settings, else their phone's region) if it is open; else the
 * country their GPS says they are in, if it is open; else null, meaning every open country. A country that is only "coming soon"
 * never filters lists down to nothing.
 */
export function resolveBrowsing(i: { home: string | null; detected: string | null; countries: Country[] }): string | null {
  const open = (iso2: string | null) => (iso2 && i.countries.find((c) => c.enabled && c.iso2 === iso2.toUpperCase())?.iso2) || null;
  return open(i.home) ?? open(i.detected);
}

/** The home country, when it is one we know but have not opened yet: the lists show every open country and say why. */
export function notOpenCountry(home: string | null, countries: Country[]): Country | undefined {
  const c = home ? countries.find((x) => x.iso2 === home.toUpperCase()) : undefined;
  return c && !c.enabled ? c : undefined;
}

/** The `country` query for list requests; absent when no single country is chosen so the server's answer stays as it was. */
export const countryQuery = (browsing: string | null): Record<string, string> => (browsing ? { country: browsing } : {});

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const validEmail = (text: string): boolean => text.trim().length <= 254 && EMAIL.test(text.trim());
