import { describe, expect, it } from "vitest";
import { formatClock, isNight, rideMessage } from "./ride-message";

// IST is UTC+5:30, so 12:00 UTC is 17:30 IST.
const utc = (h: number, m = 0) => new Date(Date.UTC(2026, 9, 24, h, m));

describe("rideMessage", () => {
  it("encourages a ride by day", () => {
    expect(rideMessage(utc(6, 0))).toEqual({ text: "Time for the next ride", night: false }); // 11:30 IST
    expect(rideMessage(utc(12, 0)).night).toBe(false); // 17:30 IST
  });
  it("adds the night warning from 7 pm to 5 am India time, whatever the visitor's own zone", () => {
    expect(isNight(utc(13, 30))).toBe(true); // 19:00 IST
    expect(isNight(utc(13, 29))).toBe(false); // 18:59 IST
    expect(isNight(utc(20, 0))).toBe(true); // 01:30 IST
    expect(isNight(utc(23, 29))).toBe(true); // 04:59 IST
    expect(isNight(utc(23, 30))).toBe(false); // 05:00 IST
    expect(rideMessage(utc(20, 0)).text).toMatch(/careful in the night/i);
  });
});

describe("formatClock", () => {
  it("shows India time with seconds and a lower-case am or pm", () => {
    expect(formatClock(utc(13, 42))).toBe("07:12:00 pm"); // 19:12 IST
    expect(formatClock(utc(0, 0))).toBe("05:30:00 am");
  });
});
