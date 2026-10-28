// @vitest-environment node
import type { Sql } from "postgres";
import { describe, expect, it, vi } from "vitest";
import { createConditionReport, FRESH_DAYS, isFresh, KINDS } from "./condition-reports";

const now = new Date("2026-11-01T10:00:00Z");
const DAY = 86_400_000;

describe("report freshness", () => {
  it("is fresh for 14 days, then old", () => {
    expect(isFresh(new Date(now.getTime() - FRESH_DAYS * DAY), now)).toBe(true);
    expect(isFresh(new Date(now.getTime() - FRESH_DAYS * DAY - 1), now)).toBe(false);
  });
});

describe("report input (checked before the database is touched)", () => {
  const sql = vi.fn(async () => [{ ok: 1 }]) as unknown as Sql;
  const base = { userId: "6f1b6c9e-3c0e-4c3a-9a53-0a6f0d4a8b11", slug: "nandi-loop", clientId: "abcd1234", kind: "blocked", note: undefined, at: now.toISOString(), lat: undefined, lng: undefined, mediaId: undefined, now };
  const reason = async (over: Partial<typeof base>) => {
    const r = await createConditionReport(sql, { ...base, ...over });
    return r.ok ? "ok" : r.reason;
  };

  it("lists the kinds the contract promises", () => {
    expect([...KINDS]).toEqual(["clear", "muddy", "blocked", "washed_out", "closed"]);
  });

  it.each([
    ["an unknown kind", { kind: "on_fire" }, "invalid"],
    ["a short client id", { clientId: "abc" }, "invalid"],
    ["a time in the future", { at: new Date(now.getTime() + 3_600_000).toISOString() }, "invalid"],
    ["a time over 30 days old", { at: new Date(now.getTime() - 31 * DAY).toISOString() }, "invalid"],
    ["a time that is not a time", { at: "yesterday" }, "invalid"],
    ["a note with a web address", { note: "see www.x.com" }, "no_links"],
    ["a note over 300 characters", { note: "x".repeat(301) }, "invalid"],
    ["a position out of range", { lat: 95, lng: 10 }, "invalid"],
    ["a bad trail slug", { slug: "../etc" }, "not_found"],
  ] as const)("refuses %s", async (_n, over, expected) => {
    expect(await reason(over as Partial<typeof base>)).toBe(expected);
  });
});
