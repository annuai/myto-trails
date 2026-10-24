import { describe, expect, it } from "vitest";
import { formatClock, isNight, placeFromZone, rideMessage, zoneLabel } from "./ride-message";

// IST is UTC+5:30, so 12:00 UTC is 17:30 IST.
const utc = (h: number, m = 0) => new Date(Date.UTC(2026, 9, 24, h, m));

describe("rideMessage", () => {
  it("encourages a ride by day", () => {
    expect(rideMessage(utc(6, 0))).toEqual({ text: "Time for the next ride", night: false }); // 11:30 IST
    expect(rideMessage(utc(12, 0)).night).toBe(false); // 17:30 IST
  });
  it("adds the night warning from 7 pm to 5 am where the visitor is", () => {
    expect(isNight(utc(13, 30))).toBe(true); // 19:00 IST
    expect(isNight(utc(13, 29))).toBe(false); // 18:59 IST
    expect(isNight(utc(23, 29))).toBe(true); // 04:59 IST
    expect(isNight(utc(23, 30))).toBe(false); // 05:00 IST
    expect(rideMessage(utc(20, 0)).text).toMatch(/careful in the night/i);
  });
  it("uses the visitor's own zone: the same moment is day in Dubai and night in Delhi", () => {
    const t = utc(14, 0); // 19:30 IST, 18:00 in Dubai
    expect(isNight(t, "Asia/Kolkata")).toBe(true);
    expect(isNight(t, "Asia/Dubai")).toBe(false);
  });
});

describe("formatClock", () => {
  it("shows the time in the zone with seconds and a lower-case am or pm", () => {
    expect(formatClock(utc(13, 42))).toBe("07:12:00 pm"); // 19:12 IST
    expect(formatClock(utc(0, 0))).toBe("05:30:00 am");
    expect(formatClock(utc(14, 0), "Asia/Dubai")).toBe("06:00:00 pm");
  });
});

describe("zoneLabel and placeFromZone", () => {
  it("labels India time as IST and other zones by their offset", () => {
    expect(zoneLabel(utc(0), "Asia/Kolkata")).toBe("IST · UTC +5:30");
    expect(zoneLabel(utc(0), "Asia/Dubai")).toBe("UTC +4:00");
    expect(zoneLabel(utc(0), "UTC")).toBe("UTC +0:00");
  });
  it("names a place from a time zone when nothing better is known", () => {
    expect(placeFromZone("Asia/Kolkata")).toBe("India");
    expect(placeFromZone("Europe/London")).toBe("London");
    expect(placeFromZone("America/Los_Angeles")).toBe("Los Angeles");
  });
});
