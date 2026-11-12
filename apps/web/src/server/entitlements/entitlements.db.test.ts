// @vitest-environment node
// Needs local PostGIS (see docs/runbooks/dev-setup.md); not run routinely.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createGroupRide } from "../rides/group-rides";
import { completeWelcome } from "../community/members";
import { createTestDatabase } from "../testing/db";
import { makeUser } from "../testing/submission-fixture";
import { applyBillingEvent, grantEntitlement, revokeEntitlement } from "./entitlements";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
const now = new Date("2026-11-01T06:00:00Z");
const later = new Date("2027-02-01T00:00:00Z");
beforeAll(async () => { db = await createTestDatabase(); });
afterAll(async () => { await db.drop(); });

const leaderWithRide = async () => {
  const userId = await makeUser(db.sql, { name: "Leader" });
  await completeWelcome(db.sql, { userId, confirmed: true, displayName: "Leader", profilePublic: false, gender: null });
  const r = await createGroupRide(db.sql, { userId, name: "Sunday", clubId: null, now });
  if (!r.ok) throw new Error(r.reason);
  return { userId, rideId: r.id };
};
const statuses = async (userId: string) => (await db.sql`select status from entitlement where user_id = ${userId} order by created_at`).map((r) => r.status);

describe("grantEntitlement", () => {
  it("grants a pass only for a ride the user leads", async () => {
    const a = await leaderWithRide(), b = await leaderWithRide();
    expect(await grantEntitlement(db.sql, { userId: a.userId, kind: "large_ride_pass", rideId: b.rideId, now })).toEqual({ ok: false, reason: "not_ride_leader" });
    expect((await grantEntitlement(db.sql, { userId: a.userId, kind: "large_ride_pass", rideId: a.rideId, now })).ok).toBe(true);
  });
  it("needs an end date for organiser, and can be revoked", async () => {
    const a = await leaderWithRide();
    expect(await grantEntitlement(db.sql, { userId: a.userId, kind: "organiser", now })).toEqual({ ok: false, reason: "needs_end_date" });
    const g = await grantEntitlement(db.sql, { userId: a.userId, kind: "organiser", endsAt: later, now });
    if (!g.ok) throw new Error(g.reason);
    expect(await revokeEntitlement(db.sql, g.id)).toBe(true);
    expect(await revokeEntitlement(db.sql, g.id)).toBe(false);
    expect(await statuses(a.userId)).toEqual(["cancelled"]);
  });
});

describe("applyBillingEvent", () => {
  const ev = (userId: string, type: "paid" | "failed" | "cancelled" | "refunded", ref = "ref1") => ({ provider: "test", providerRef: ref, userId, kind: "organiser" as const, type, endsAt: later });
  it("is idempotent: the same ref twice is one row", async () => {
    const a = await leaderWithRide();
    expect(await applyBillingEvent(db.sql, ev(a.userId, "paid"), now)).toEqual({ ok: true, outcome: "inserted" });
    expect(await applyBillingEvent(db.sql, ev(a.userId, "paid"), now)).toEqual({ ok: true, outcome: "unchanged" });
    expect(await statuses(a.userId)).toEqual(["active"]);
  });
  it("refund flips status and a later paid does not reactivate", async () => {
    const a = await leaderWithRide();
    await applyBillingEvent(db.sql, ev(a.userId, "paid"), now);
    await applyBillingEvent(db.sql, ev(a.userId, "refunded"), now);
    await applyBillingEvent(db.sql, ev(a.userId, "paid"), now);
    expect(await statuses(a.userId)).toEqual(["refunded"]);
  });
  it("a refund seen before its payment keeps the payment dead", async () => {
    const a = await leaderWithRide();
    await applyBillingEvent(db.sql, ev(a.userId, "refunded", "early"), now);
    await applyBillingEvent(db.sql, ev(a.userId, "paid", "early"), now);
    expect(await statuses(a.userId)).toEqual(["refunded"]);
  });
  it("a paid pass for a ride the buyer does not lead is rejected", async () => {
    const a = await leaderWithRide(), b = await leaderWithRide();
    expect(await applyBillingEvent(db.sql, { provider: "test", providerRef: "p1", userId: a.userId, kind: "large_ride_pass", rideId: b.rideId, type: "paid" }, now)).toEqual({ ok: false, reason: "not_ride_leader" });
  });
});
