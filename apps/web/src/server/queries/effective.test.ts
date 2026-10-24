import { describe, expect, it } from "vitest";
import { makeTrail } from "@/features/trail/test-trail";
import { applyNow } from "./effective";

describe("applyNow", () => {
  const cached = makeTrail({
    // Computed earlier (cache time): the closure looked current.
    condition: "temporarily_closed",
    rawCondition: "temporarily_closed",
    conditionExpectedUntil: "2026-06-01",
    verification: { level: "moderator_verified", needsRecheck: false },
    rawVerificationLevel: "moderator_verified",
    validUntil: "2026-06-01",
  });

  it("recomputes the condition with the current time, not the cached one", () => {
    expect(applyNow(cached, new Date("2026-06-01T12:00:00Z")).condition).toBe("temporarily_closed");
    expect(applyNow(cached, new Date("2026-06-02T00:00:01Z")).condition).toBe("unknown");
  });

  it("recomputes verification across the expiry and downgrade boundaries", () => {
    expect(applyNow(cached, new Date("2026-06-01T23:00:00Z")).verification).toEqual({ level: "moderator_verified", needsRecheck: false });
    expect(applyNow(cached, new Date("2026-06-10T00:00:00Z")).verification).toEqual({ level: "moderator_verified", needsRecheck: true });
    expect(applyNow(cached, new Date("2026-07-05T00:00:00Z")).verification).toEqual({ level: "unverified", needsRecheck: true });
  });

  it("does not mutate the cached object and keeps other fields", () => {
    const out = applyNow(cached, new Date("2027-01-01T00:00:00Z"));
    expect(cached.condition).toBe("temporarily_closed");
    expect(out.name).toBe(cached.name);
    expect(out).not.toBe(cached);
  });
});
