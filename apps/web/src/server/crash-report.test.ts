import { describe, expect, it } from "vitest";
import { startCrashReporting } from "./crash-report";

describe("crash reporting", () => {
  it("stays off when SENTRY_DSN is not set", () => {
    expect(startCrashReporting({})).toBe(false);
    expect(startCrashReporting({ SENTRY_DSN: "  " })).toBe(false);
  });
});
