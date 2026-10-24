/** "2026-08-14" -> "14 Aug 2026" (UTC, so the day never shifts with the viewer's time zone). */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
