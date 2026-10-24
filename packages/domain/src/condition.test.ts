import { describe, expect, it } from "vitest";
import { effectiveCondition, isClosed } from "./condition";

const now = new Date("2026-06-01T12:00:00Z");

describe("effectiveCondition", () => {
  it("is unknown without any event", () => {
    expect(effectiveCondition(null, now)).toBe("unknown");
  });
  it("falls back to unknown when a temporary closure is overdue", () => {
    expect(effectiveCondition({ status: "temporarily_closed", expectedUntil: "2026-05-31T00:00:00Z" }, now)).toBe("unknown");
  });
  it("keeps a temporary closure that has not reached its end date", () => {
    expect(effectiveCondition({ status: "temporarily_closed", expectedUntil: "2026-06-30T00:00:00Z" }, now)).toBe("temporarily_closed");
  });
  it("keeps a temporary closure with no end date", () => {
    expect(effectiveCondition({ status: "temporarily_closed", expectedUntil: null }, now)).toBe("temporarily_closed");
  });
  it("treats a date-only end date as the end of that UTC day", () => {
    expect(effectiveCondition({ status: "temporarily_closed", expectedUntil: "2026-06-01" }, now)).toBe("temporarily_closed");
    expect(effectiveCondition({ status: "temporarily_closed", expectedUntil: "2026-05-31" }, now)).toBe("unknown");
  });
  it.each(["open", "seasonal", "permanently_closed", "unknown"] as const)("passes %s through", (status) => {
    expect(effectiveCondition({ status, expectedUntil: "2020-01-01" }, now)).toBe(status);
  });
});

describe("isClosed", () => {
  const nowLocal = new Date("2026-06-01T12:00:00Z");
  it("is true for permanent closures and current temporary closures", () => {
    expect(isClosed({ status: "permanently_closed", expectedUntil: null }, nowLocal)).toBe(true);
    expect(isClosed({ status: "temporarily_closed", expectedUntil: "2026-06-30" }, nowLocal)).toBe(true);
    expect(isClosed({ status: "temporarily_closed", expectedUntil: null }, nowLocal)).toBe(true);
  });
  it("is false for an overdue temporary closure, open, seasonal, unknown and no event", () => {
    expect(isClosed({ status: "temporarily_closed", expectedUntil: "2026-05-31" }, nowLocal)).toBe(false);
    expect(isClosed({ status: "open", expectedUntil: null }, nowLocal)).toBe(false);
    expect(isClosed({ status: "seasonal", expectedUntil: null }, nowLocal)).toBe(false);
    expect(isClosed({ status: "unknown", expectedUntil: null }, nowLocal)).toBe(false);
    expect(isClosed(null, nowLocal)).toBe(false);
  });
});
