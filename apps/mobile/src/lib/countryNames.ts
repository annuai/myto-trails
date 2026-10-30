import { COUNTRY_NAMES } from './countryData';
import { deviceLocale } from './locale';

/**
 * The country's full name ("India", "Deutschland"), never its code unless the country is unknown. The phone's own translation is used
 * when it has one; some phones' JavaScript engines have none, and then the bundled English name is used.
 */
export function countryName(iso2: string | null | undefined, locale: string = deviceLocale()): string {
  if (!iso2) return '';
  const code = iso2.toUpperCase();
  try {
    const n = new Intl.DisplayNames([locale], { type: 'region' }).of(code);
    if (n && n !== code) return n;
  } catch {
    // fall through to the bundled name
  }
  return COUNTRY_NAMES[code] ?? code;
}
