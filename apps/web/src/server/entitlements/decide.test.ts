import { describe, expect, it } from "vitest";
import { addMonths, decideEvent, validateEntitlement, type EntitlementStatus } from "./decide";

const now = new Date("2026-11-01T00:00:00Z");
const base = { userId: "u1", now, requireFutureEnd: true };

describe("validateEntitlement", () => {
  it("a pass needs a ride the user leads", () => {
    expect(validateEntitlement({ ...base, kind: "large_ride_pass", rideId: null, leaderId: null })).toBe("needs_ride");
    expect(validateEntitlement({ ...base, kind: "large_ride_pass", rideId: "r", leaderId: null })).toBe("not_ride_leader");
    expect(validateEntitlement({ ...base, kind: "large_ride_pass", rideId: "r", leaderId: "u2" })).toBe("not_ride_leader");
    expect(validateEntitlement({ ...base, kind: "large_ride_pass", rideId: "r", leaderId: "u1" })).toBeNull();
  });
  it("organiser needs an end date, in the future for a grant", () => {
    expect(validateEntitlement({ ...base, kind: "organiser", leaderId: null })).toBe("needs_end_date");
    expect(validateEntitlement({ ...base, kind: "organiser", leaderId: null, endsAt: new Date("nope") })).toBe("needs_end_date");
    expect(validateEntitlement({ ...base, kind: "organiser", leaderId: null, endsAt: new Date("2026-10-01") })).toBe("end_in_past");
    expect(validateEntitlement({ ...base, kind: "organiser", leaderId: null, endsAt: new Date("2026-12-01") })).toBeNull();
    expect(validateEntitlement({ ...base, requireFutureEnd: false, kind: "organiser", leaderId: null, endsAt: new Date("2026-10-01") })).toBeNull();
  });
  it("rejects an unknown kind", () => expect(validateEntitlement({ ...base, kind: "gold", leaderId: null })).toBe("invalid_kind"));
});

describe("decideEvent", () => {
  it("records a first event as it says", () => {
    expect(decideEvent(null, "paid")).toEqual({ action: "insert", status: "active" });
    expect(decideEvent(null, "failed")).toEqual({ action: "insert", status: "failed" });
    expect(decideEvent(null, "refunded")).toEqual({ action: "insert", status: "refunded" });
  });
  it("a repeated event changes nothing", () => {
    for (const [s, t] of [["active", "paid"], ["failed", "failed"], ["cancelled", "cancelled"], ["refunded", "refunded"]] as const) expect(decideEvent(s, t)).toEqual({ action: "noop" });
  });
  it("cancel and refund take an active entitlement away", () => {
    expect(decideEvent("active", "cancelled")).toEqual({ action: "update", status: "cancelled" });
    expect(decideEvent("active", "refunded")).toEqual({ action: "update", status: "refunded" });
    expect(decideEvent("cancelled", "refunded")).toEqual({ action: "update", status: "refunded" });
  });
  it("a paid after a refund never reactivates", () => {
    expect(decideEvent("refunded", "paid")).toEqual({ action: "noop" });
    for (const t of ["failed", "cancelled"] as const) expect(decideEvent("refunded", t)).toEqual({ action: "noop" });
  });
  it("a paid after a cancel is ignored, but a retried payment after a failure activates", () => {
    expect(decideEvent("cancelled", "paid")).toEqual({ action: "noop" });
    expect(decideEvent("failed", "paid")).toEqual({ action: "update", status: "active" });
    expect(decideEvent("pending", "paid")).toEqual({ action: "update", status: "active" });
  });
  it("a late failure does not take away a paid entitlement", () => {
    expect(decideEvent("active", "failed")).toEqual({ action: "noop" });
  });
  it("is stable under replay of any ordering: replaying the whole sequence ends where one pass does", () => {
    const run = (seq: ("paid" | "failed" | "cancelled" | "refunded")[]) => seq.reduce<EntitlementStatus | null>((s, t) => { const d = decideEvent(s, t); return d.action === "noop" ? s : d.status; }, null);
    const seq = ["paid", "cancelled", "refunded"] as const;
    expect(run([...seq])).toBe("refunded");
    expect(run([...seq, ...seq])).toBe("refunded");
    expect(run(["refunded", "paid"])).toBe("refunded");
  });
});

describe("addMonths", () => {
  it("adds calendar months in UTC", () => expect(addMonths(new Date("2026-11-12T10:00:00Z"), 3).toISOString()).toBe("2027-02-12T10:00:00.000Z"));
  it("stops at the end of a shorter month", () => expect(addMonths(new Date("2026-01-31T00:00:00Z"), 1).toISOString()).toBe("2026-02-28T00:00:00.000Z"));
  it("crosses a year", () => expect(addMonths(new Date("2026-11-30T00:00:00Z"), 12).toISOString()).toBe("2027-11-30T00:00:00.000Z"));
});
