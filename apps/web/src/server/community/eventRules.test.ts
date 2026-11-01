import { describe, expect, it } from "vitest";
import { checkInVerdict, checkInWindow, distanceM, seatDecision, validStart } from "./eventRules";

const HOUR = 3_600_000;
const start = new Date("2026-12-06T00:30:00Z");
const ev = { lat: 12.9716, lng: 77.5946, radiusM: 150, startsAt: start };

describe("distanceM", () => {
  it("is zero for the same point and about 111 km per degree of latitude", () => {
    expect(distanceM({ lat: 12, lng: 77 }, { lat: 12, lng: 77 })).toBe(0);
    expect(Math.abs(distanceM({ lat: 12, lng: 77 }, { lat: 13, lng: 77 }) - 111_195)).toBeLessThan(200);
  });
});

describe("checkInWindow", () => {
  it("opens 60 minutes before the start and closes 6 hours after it", () => {
    expect(checkInWindow(start, new Date(start.getTime() - HOUR - 1))).toBe("early");
    expect(checkInWindow(start, new Date(start.getTime() - HOUR))).toBe("open");
    expect(checkInWindow(start, new Date(start.getTime() + 6 * HOUR))).toBe("open");
    expect(checkInWindow(start, new Date(start.getTime() + 6 * HOUR + 1))).toBe("closed");
  });
});

describe("checkInVerdict", () => {
  const now = new Date(start.getTime() - 10 * 60_000);
  it("accepts a rider inside the radius with a usable fix", () => {
    expect(checkInVerdict(ev, { lat: 12.9717, lng: 77.5946, accuracyM: 20 }, now)).toEqual({ ok: true });
  });
  it("refuses a rider outside the radius", () => {
    expect(checkInVerdict(ev, { lat: 12.98, lng: 77.5946, accuracyM: 20 }, now)).toEqual({ ok: false, reason: "far" });
  });
  it("refuses a fix whose accuracy is worse than the radius", () => {
    expect(checkInVerdict(ev, { lat: 12.9716, lng: 77.5946, accuracyM: 151 }, now)).toEqual({ ok: false, reason: "inaccurate" });
  });
  it("refuses outside the time window before checking the place", () => {
    expect(checkInVerdict(ev, { lat: 0, lng: 0, accuracyM: 5 }, new Date(start.getTime() - 2 * HOUR))).toEqual({ ok: false, reason: "early" });
  });
});

describe("seatDecision", () => {
  it("waitlists only once the capacity is reached", () => {
    expect(seatDecision(4, 5)).toBe("going");
    expect(seatDecision(5, 5)).toBe("waitlisted");
    expect(seatDecision(500, null)).toBe("going");
  });
});

describe("validStart", () => {
  const now = new Date("2026-11-01T00:00:00Z");
  it("must be in the future and under 366 days away", () => {
    expect(validStart(new Date(now.getTime() - 1), now)).toBe(false);
    expect(validStart(now, now)).toBe(false);
    expect(validStart(new Date(now.getTime() + 365 * 86_400_000), now)).toBe(true);
    expect(validStart(new Date(now.getTime() + 366 * 86_400_000), now)).toBe(false);
  });
});
