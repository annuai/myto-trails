import { describe, expect, it } from "vitest";
import { REPORT_TYPES, reportPriority, validateReport } from "./reports";

describe("REPORT_TYPES", () => {
  it("lists the eight report types", () => {
    expect(REPORT_TYPES).toEqual(["closure", "wrong_access", "wrong_location", "unsafe_info", "duplicate", "inaccurate_gpx", "environmental", "other"]);
  });
});

describe("reportPriority", () => {
  it.each([["environmental", "high"], ["unsafe_info", "high"], ["closure", "normal"], ["wrong_access", "normal"], ["other", "normal"]] as const)("%s -> %s", (type, priority) => {
    expect(reportPriority(type)).toBe(priority);
  });
});

describe("validateReport", () => {
  const ok = { type: "closure", details: "The gate was locked when I arrived on Saturday." };
  it("accepts a known type with 20 to 2000 characters", () => {
    expect(validateReport(ok)).toEqual({ ok: true, value: { type: "closure", details: "The gate was locked when I arrived on Saturday." } });
    expect(validateReport({ ...ok, details: "x".repeat(20) }).ok).toBe(true);
    expect(validateReport({ ...ok, details: "x".repeat(2000) }).ok).toBe(true);
  });
  it("trims whitespace before counting and strips control characters", () => {
    expect(validateReport({ ...ok, details: `   ${"y".repeat(20)}\u0000\u0007   ` })).toEqual({ ok: true, value: { type: "closure", details: "y".repeat(20) } });
  });
  it("explains what is wrong", () => {
    expect(validateReport({ type: "nonsense", details: "x".repeat(30) })).toEqual({ ok: false, errors: { type: "Choose what kind of problem this is." } });
    expect(validateReport({ type: "closure", details: "too short" })).toEqual({ ok: false, errors: { details: "Describe the problem in at least 20 characters." } });
    expect(validateReport({ type: "closure", details: "x".repeat(2001) })).toEqual({ ok: false, errors: { details: "Keep it under 2,000 characters." } });
    expect(validateReport({ type: undefined, details: undefined })).toMatchObject({ ok: false, errors: { type: expect.any(String), details: expect.any(String) } });
  });
  it("counts only visible characters after trimming", () => {
    expect(validateReport({ type: "closure", details: `${" ".repeat(50)}short${" ".repeat(50)}` }).ok).toBe(false);
  });
});
