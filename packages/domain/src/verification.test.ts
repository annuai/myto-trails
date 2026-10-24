import { describe, expect, it } from "vitest";
import { effectiveVerificationLevel } from "./verification";

const DAY = 86_400_000;
const validUntil = "2026-06-01T00:00:00.000Z";
const at = (offsetMs: number) => new Date(Date.parse(validUntil) + offsetMs);

describe("effectiveVerificationLevel", () => {
  it.each(["officially_verified", "moderator_verified"] as const)("%s keeps its level until validUntil", (level) => {
    expect(effectiveVerificationLevel({ level, validUntil }, at(-DAY))).toEqual({ level, needsRecheck: false });
    expect(effectiveVerificationLevel({ level, validUntil }, at(0))).toEqual({ level, needsRecheck: false });
  });

  it("asks for a re-check the instant after expiry but keeps the level", () => {
    expect(effectiveVerificationLevel({ level: "moderator_verified", validUntil }, at(1000))).toEqual({
      level: "moderator_verified",
      needsRecheck: true,
    });
  });

  it("keeps the level for exactly 30 days after expiry", () => {
    expect(effectiveVerificationLevel({ level: "officially_verified", validUntil }, at(30 * DAY))).toEqual({
      level: "officially_verified",
      needsRecheck: true,
    });
  });

  it("downgrades to unverified once more than 30 days past expiry", () => {
    expect(effectiveVerificationLevel({ level: "officially_verified", validUntil }, at(30 * DAY + 1000))).toEqual({
      level: "unverified",
      needsRecheck: true,
    });
  });

  it.each(["community_reported", "unverified"] as const)("%s never expires", (level) => {
    expect(effectiveVerificationLevel({ level, validUntil }, at(400 * DAY))).toEqual({ level, needsRecheck: false });
  });

  it("never expires without a validUntil", () => {
    expect(effectiveVerificationLevel({ level: "moderator_verified", validUntil: null }, at(9999 * DAY))).toEqual({
      level: "moderator_verified",
      needsRecheck: false,
    });
  });

  it("treats a date-only validUntil as valid through the end of that UTC day", () => {
    const a = { level: "moderator_verified" as const, validUntil: "2026-06-01" };
    expect(effectiveVerificationLevel(a, new Date("2026-06-01T23:59:00Z")).needsRecheck).toBe(false);
    expect(effectiveVerificationLevel(a, new Date("2026-06-02T00:00:01Z")).needsRecheck).toBe(true);
  });
});
