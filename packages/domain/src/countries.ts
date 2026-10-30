// Countries as data. Only countries whose numbers and rules a person has checked belong in COUNTRY_CONFIGS;
// every other country stays "coming soon" until it is added here and enabled in the database.

export type CountryConfig = {
  iso2: string;
  name: string;
  /** What to dial in an emergency. `others` are extra lines (ambulance, mountain rescue) shown beside it. */
  emergency: { primary: string; others: { label: string; number: string }[] };
  dialCode: string;
  currency: string;
  distanceUnit: "km" | "mi";
  /** IANA zone used when nothing more specific is known. */
  timeZone: string;
  /** What this country calls its first and second administrative levels. */
  adminLabels: { level1: string; level2: string };
};

export const COUNTRY_CONFIGS: Record<string, CountryConfig> = {
  IN: {
    iso2: "IN",
    name: "India",
    emergency: { primary: "112", others: [] },
    dialCode: "+91",
    currency: "INR",
    distanceUnit: "km",
    timeZone: "Asia/Kolkata",
    adminLabels: { level1: "state", level2: "district" },
  },
};

export function countryConfig(iso2: string | null | undefined): CountryConfig | null {
  return iso2 ? COUNTRY_CONFIGS[iso2.toUpperCase()] ?? null : null;
}

const isText = (v: unknown): v is string => typeof v === "string" && v.length > 0;

/** Reads the `region.config` JSON. Returns null unless every field is present and well formed. */
export function parseCountryConfig(raw: unknown): CountryConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;
  const e = c.emergency as { primary?: unknown; others?: unknown } | undefined;
  const a = c.adminLabels as { level1?: unknown; level2?: unknown } | undefined;
  if (!isText(c.iso2) || !/^[A-Za-z]{2}$/.test(c.iso2) || !isText(c.name) || !isText(c.dialCode) || !isText(c.currency) || !isText(c.timeZone)) return null;
  if (c.distanceUnit !== "km" && c.distanceUnit !== "mi") return null;
  if (!e || !isText(e.primary) || !Array.isArray(e.others) || !a || !isText(a.level1) || !isText(a.level2)) return null;
  const others = e.others.filter((o): o is { label: string; number: string } => !!o && isText((o as { label?: unknown }).label) && isText((o as { number?: unknown }).number));
  if (others.length !== e.others.length) return null;
  return {
    iso2: c.iso2.toUpperCase(),
    name: c.name,
    emergency: { primary: e.primary, others },
    dialCode: c.dialCode,
    currency: c.currency,
    distanceUnit: c.distanceUnit,
    timeZone: c.timeZone,
    adminLabels: { level1: a.level1, level2: a.level2 },
  };
}
