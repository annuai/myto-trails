import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';

/** "98123 45678", "+91-98123-45678" or "(415) 555-2671" as E.164 ("+919812345678"), read as a number of `region` unless it starts with "+". Null when it is not a real number. */
export function normalizePhone(raw: string, region: string = 'IN'): string | null {
  const text = String(raw ?? '').trim();
  if (!text) return null;
  const p = parsePhoneNumberFromString(text, region.toUpperCase() as CountryCode);
  return p?.isValid() ? p.number : null;
}
