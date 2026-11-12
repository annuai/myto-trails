import { describe, expect, it } from "vitest";
import { CONTRIBUTION_EVENTS, CONTRIBUTION_STATES, stateOfConditionReport, stateOfSubmission, stateOfTrailReport, transition, trustLabel } from "./contribution";

const now = new Date("2026-11-12T10:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);

describe("transition", () => {
  it("follows the happy path draft -> pending -> approved", () => {
    expect(transition("draft", "submit")).toBe("pending");
    expect(transition("pending", "approve")).toBe("approved");
  });
  it("returns changes and withdrawals to draft", () => {
    expect(transition("pending", "request_changes")).toBe("draft");
    expect(transition("pending", "withdraw")).toBe("draft");
  });
  it("lets approved information be disputed, go stale, and be re-checked", () => {
    expect(transition("approved", "dispute")).toBe("disputed");
    expect(transition("disputed", "resolve_dispute")).toBe("approved");
    expect(transition("approved", "expire")).toBe("outdated");
    expect(transition("outdated", "refresh")).toBe("pending");
  });
  it("never leaves rejected, and refuses skipping review", () => {
    for (const e of CONTRIBUTION_EVENTS) expect(transition("rejected", e)).toBeNull();
    expect(transition("draft", "approve")).toBeNull();
    expect(transition("pending", "dispute")).toBeNull();
  });
  it("only ever lands on a known state", () => {
    for (const s of CONTRIBUTION_STATES) for (const e of CONTRIBUTION_EVENTS) { const n = transition(s, e); if (n) expect(CONTRIBUTION_STATES).toContain(n); }
  });
});

describe("existing statuses map onto the states", () => {
  it("maps submissions", () => {
    expect(["draft", "changes_requested", "withdrawn", "submitted", "approved", "rejected", "x"].map(stateOfSubmission)).toEqual(["draft", "draft", "draft", "pending", "approved", "rejected", null]);
  });
  it("maps trail reports, treating duplicates as rejected", () => {
    expect(["open", "triaged", "needs_info", "accepted", "rejected", "duplicate_of_report", "x"].map(stateOfTrailReport)).toEqual(["pending", "pending", "pending", "approved", "rejected", "rejected", null]);
  });
  it("derives condition-report state from votes and age", () => {
    const base = { hidden: false, confirmations: 0, disputes: 0, reportedAt: daysAgo(1) };
    expect(stateOfConditionReport(base, now)).toBe("pending");
    expect(stateOfConditionReport({ ...base, confirmations: 2 }, now)).toBe("approved");
    expect(stateOfConditionReport({ ...base, confirmations: 1, disputes: 2 }, now)).toBe("disputed");
    expect(stateOfConditionReport({ ...base, reportedAt: daysAgo(15), confirmations: 3 }, now)).toBe("outdated");
    expect(stateOfConditionReport({ ...base, hidden: true }, now)).toBe("rejected");
  });
});

describe("trustLabel", () => {
  const rider = { source: "rider" as const, state: "pending" as const, reportedAt: daysAgo(1), now };
  it("calls a fresh unconfirmed rider report community reported", () => {
    expect(trustLabel(rider)).toBe("community_reported");
    expect(trustLabel({ ...rider, confirmations: 1 })).toBe("community_reported");
  });
  it("calls a confirmed fresh rider report recently verified, never officially confirmed", () => {
    expect(trustLabel({ ...rider, state: "approved", confirmations: 5 })).toBe("recently_verified");
    for (const state of CONTRIBUTION_STATES) for (const confirmations of [0, 2, 50]) expect(trustLabel({ ...rider, state, confirmations })).not.toBe("officially_confirmed");
  });
  it("ages a rider report out after two weeks, even if confirmed", () => {
    expect(trustLabel({ ...rider, reportedAt: daysAgo(14), confirmations: 3 })).toBe("recently_verified");
    expect(trustLabel({ ...rider, reportedAt: daysAgo(15), confirmations: 3 })).toBe("outdated");
  });
  it("lets disputes win over everything", () => {
    expect(trustLabel({ ...rider, confirmations: 2, disputes: 2 })).toBe("disputed");
    expect(trustLabel({ source: "moderator", state: "disputed", reportedAt: daysAgo(1), now })).toBe("disputed");
  });
  it("gives moderator and official facts Officially confirmed until they lapse", () => {
    const m = { source: "moderator" as const, state: "approved" as const, reportedAt: daysAgo(100), now };
    expect(trustLabel(m)).toBe("officially_confirmed");
    expect(trustLabel({ ...m, source: "official", validUntil: daysAgo(1) })).toBe("outdated");
    expect(trustLabel({ ...m, validUntil: new Date(now.getTime() + 1000) })).toBe("officially_confirmed");
  });
  it("shows nothing for drafts and rejected items", () => {
    expect(trustLabel({ ...rider, state: "draft" })).toBeNull();
    expect(trustLabel({ ...rider, state: "rejected" })).toBeNull();
  });
});
