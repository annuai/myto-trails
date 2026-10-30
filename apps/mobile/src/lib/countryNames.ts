import { deviceLocale } from './locale';

/** The country's name in the rider's language ("India", "Deutschland"), or the code when the phone does not know it. */
export function countryName(iso2: string | null | undefined, locale: string = deviceLocale()): string {
  if (!iso2) return '';
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(iso2.toUpperCase()) ?? iso2.toUpperCase();
  } catch {
    return iso2.toUpperCase();
  }
}
