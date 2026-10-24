const IST = "Asia/Kolkata";

/** The hour (0-23) in India Standard Time, whatever the visitor's own time zone. */
export function istHour(now: Date): number {
  return Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: IST }).format(now));
}

export function isNight(now: Date): boolean {
  const h = istHour(now);
  return h >= 19 || h < 5;
}

/** The badge under the clock: a nudge to ride, with a reminder to be careful after dark. */
export function rideMessage(now: Date): { text: string; night: boolean } {
  return isNight(now)
    ? { text: "Time for the next ride. Be careful in the night as well.", night: true }
    : { text: "Time for the next ride", night: false };
}

export function formatClock(now: Date): string {
  return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true, timeZone: IST })
    .format(now)
    .replace(/\s?(AM|PM)$/i, (m) => ` ${m.trim().toLowerCase()}`);
}
