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

/**
 * A phone number typed into a profile form or sent to the API: a normalized number, null for none (null, undefined or
 * blank), or "invalid" for text that is not a real number or a value that is not text.
 */
export function parsePhoneInput(v: unknown): string | null | "invalid" {
  if (v === null || v === undefined) return null;
  if (typeof v !== "string") return "invalid";
  if (!v.trim()) return null;
  return normalizePhone(v) ?? "invalid";
}

export const PHONE_INVALID_MESSAGE = "Enter a valid phone number (for India, 10 digits), or leave it empty.";
