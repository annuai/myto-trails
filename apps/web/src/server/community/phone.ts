import { getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

/**
 * A phone number as international E.164 ("+919812345678"), or null when it is not a real number. Numbers typed without a
 * country code are read in `defaultRegion` (an ISO code, India unless told otherwise); a leading + always wins.
 */
export function normalizePhone(raw: string, defaultRegion: string = "IN"): string | null {
  const t = String(raw ?? "").replace(/[\s().-]/g, "");
  if (!t) return null;
  const region = /^[A-Za-z]{2}$/.test(defaultRegion) ? (defaultRegion.toUpperCase() as CountryCode) : "IN";
  // "919812345678": digits that already start with the home country's code are read as international.
  const p = parsePhoneNumberFromString(t, region) ?? (t.startsWith(getCountryCallingCode(region)) ? parsePhoneNumberFromString(`+${t}`, region) : undefined);
  return p?.isValid() ? p.number : null;
}
