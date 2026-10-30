/** The zone used when a ride or check-in does not say where it is. Rows from before time zones were stored are India's. */
export const DEFAULT_TIME_ZONE = "Asia/Kolkata";

/** An IANA zone name the runtime knows, or null. */
export function validTimeZone(v: unknown): string | null {
  if (typeof v !== "string" || v.length === 0 || v.length > 64) return null;
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: v });
    return v;
  } catch {
    return null;
  }
}

/** A short name for the zone at a moment, for sentences: "India time" for Kolkata, otherwise "GMT+1", "GMT-7". */
export function zoneName(timeZone: string, at: Date): string {
  if (timeZone === "Asia/Kolkata" || timeZone === "Asia/Calcutta") return "India time";
  return new Intl.DateTimeFormat("en-GB", { timeZone, timeZoneName: "short" }).formatToParts(at).find((p) => p.type === "timeZoneName")?.value ?? timeZone;
}

/** "Fri 30 Oct, 07:30" in the given zone. */
export function formatWhen(at: Date | string, timeZone: string): string {
  return new Date(at).toLocaleString("en-GB", { timeZone, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
}
