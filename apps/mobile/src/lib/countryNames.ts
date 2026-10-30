import { countryEntry } from './countryList';
import { deviceLocale } from './locale';

/**
 * The country's full name in the rider's language ("India", "Deutschland") when the phone can say it, else its English name from the
 * country list, else the code. Not every phone's JavaScript engine has Intl.DisplayNames, which used to leave the bare code ("IN") on screen.
 */
export function countryName(iso2: string | null | undefined, locale: string = deviceLocale()): string {
  if (!iso2) return '';
  const code = iso2.toUpperCase();
  const known = countryEntry(code);
  if (!known) return code; // not a country we list: Intl answers "Unknown Region", which is worse than the code
  try {
    const name = new Intl.DisplayNames([locale], { type: 'region' }).of(code);
    if (name && name !== code) return name;
  } catch {
    // no Intl.DisplayNames here: use the table below
  }
  return known.name;
}
