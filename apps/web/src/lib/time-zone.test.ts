import { describe, expect, it } from "vitest";
import { DEFAULT_TIME_ZONE, formatWhen, validTimeZone, zoneName } from "./time-zone";

describe("validTimeZone", () => {
  it("accepts real zones and rejects anything else", () => {
    expect(validTimeZone("Europe/London")).toBe("Europe/London");
    expect(validTimeZone("Mars/Olympus")).toBeNull();
    expect(validTimeZone(42)).toBeNull();
    expect(validTimeZone("")).toBeNull();
  });
});

describe("formatWhen", () => {
  it("shows a ride in its own zone, across midnight", () => {
    const at = "2026-10-30T22:30:00Z"; // 22:30 in London (GMT since 25 Oct), 04:00 next day in India
    expect(formatWhen(at, "Europe/London")).toContain("22:30");
    expect(formatWhen(at, DEFAULT_TIME_ZONE)).toContain("04:00");
    expect(formatWhen(at, DEFAULT_TIME_ZONE)).toContain("31 Oct");
  });
});

describe("zoneName", () => {
  it("names India plainly and others by offset", () => {
    expect(zoneName("Asia/Kolkata", new Date())).toBe("India time");
    expect(zoneName("Europe/London", new Date("2026-12-01T12:00:00Z"))).toMatch(/GMT/);
  });
});
