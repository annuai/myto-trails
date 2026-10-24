const IST = "Asia/Kolkata";

/** The hour (0-23) in the given time zone. */
export function hourIn(now: Date, timeZone: string): number {
  return Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone }).format(now));
}

/** Night is 7 pm to 5 am where the visitor is. */
export function isNight(now: Date, timeZone: string = IST): boolean {
  const h = hourIn(now, timeZone);
  return h >= 19 || h < 5;
}

/** The badge under the clock: a nudge to ride, with a reminder to be careful after dark. */
export function rideMessage(now: Date, timeZone: string = IST): { text: string; night: boolean } {
  return isNight(now, timeZone)
    ? { text: "Time for the next ride. Be careful in the night as well.", night: true }
    : { text: "Time for the next ride", night: false };
}

export function formatClock(now: Date, timeZone: string = IST): string {
  return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true, timeZone })
    .format(now)
    .replace(/\s?(AM|PM)$/i, (m) => ` ${m.trim().toLowerCase()}`);
}

/** "IST · UTC +5:30" in India, "UTC +4:00" elsewhere, for the zone at this moment. */
export function zoneLabel(now: Date, timeZone: string = IST): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" }).formatToParts(now);
  const raw = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const m = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(raw);
  const utc = m ? `UTC ${m[1]}${Number(m[2])}:${m[3] ?? "00"}` : "UTC +0:00";
  return timeZone === IST || timeZone === "Asia/Calcutta" ? `IST · ${utc}` : utc;
}

/** A readable place for a time zone when we have no better one: "Asia/Kolkata" is India, "Europe/London" is London. */
export function placeFromZone(timeZone: string): string {
  if (timeZone === IST || timeZone === "Asia/Calcutta") return "India";
  const city = timeZone.split("/").pop() ?? timeZone;
  return city.replaceAll("_", " ");
}
