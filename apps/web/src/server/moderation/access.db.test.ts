// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedRegions } from "../db/seed-regions";
import { asAnon, createTestDatabase } from "../testing/db";
import { insertTrailFixture } from "../testing/fixtures";
import { makeUser } from "../testing/submission-fixture";
import { getTrailForModeration, listDueForRecheck, release, setCondition, unpublish, verifyAccess } from "./access";
import { listReports, resolveReport } from "./reports";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
const now = new Date("2026-06-01T12:00:00Z");
beforeAll(async () => {
  db = await createTestDatabase();
  await seedRegions(db.sql);
});
afterAll(async () => {
  await db.drop();
});
const mod = () => makeUser(db.sql, { role: "moderator" });
const trail = (o: Parameters<typeof insertTrailFixture>[1] = {}) => insertTrailFixture(db.sql, { state: { slug: "acc-state", name: "Acc State" }, district: null, verificationLevel: "community_reported", verifiedAt: null, validUntil: null, ...o });
const audits = (id: string) => db.sql`select action from audit_log where entity_id = ${id}`;

describe("verifyAccess", () => {
  it("appends a moderator_verified assessment with evidence and a 12 month expiry, keeping history", async () => {
    const m = await mod();
    const t = await trail();
    const r = await verifyAccess(db.sql, { actorId: m, trailId: t.trailId, level: "moderator_verified", evidence: [{ kind: "call_note", description: "Spoke to the range office on 3 June." }], now });
    expect(r).toEqual({ ok: true, validUntil: "2027-06-01" });
    const rows = await db.sql`select level, verified_at::text, valid_until::text from access_assessment where trail_id = ${t.trailId} order by created_at`;
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({ level: "moderator_verified", verified_at: "2026-06-01", valid_until: "2027-06-01" });
    const [pub] = await asAnon(db.sql, (tx) => tx`select verification_level, valid_until::text from public_trails where slug = ${t.slug}`);
    expect(pub).toMatchObject({ verification_level: "moderator_verified", valid_until: "2027-06-01" });
    expect((await audits(t.revisionId)).map((a) => a.action)).toEqual(["verify_access"]);
  });

  it("uses 3 months for permission-based access and 6 for seasonal trails", async () => {
    const m = await mod();
    const perm = await trail({ accessClass: "permission_required" });
    expect(await verifyAccess(db.sql, { actorId: m, trailId: perm.trailId, level: "moderator_verified", evidence: [{ kind: "call_note", description: "Called the estate office." }], now })).toMatchObject({ validUntil: "2026-09-01" });
    const seasonal = await trail({ conditionStatus: "seasonal" });
    expect(await verifyAccess(db.sql, { actorId: m, trailId: seasonal.trailId, level: "moderator_verified", evidence: [{ kind: "call_note", description: "Called the forest office." }], now })).toMatchObject({ validUntil: "2026-12-01" });
  });

  it("requires evidence, and for official verification a document and an authority name", async () => {
    const m = await mod();
    const t = await trail();
    expect(await verifyAccess(db.sql, { actorId: m, trailId: t.trailId, level: "moderator_verified", now })).toEqual({ ok: false, reason: "evidence_required" });
    expect(await verifyAccess(db.sql, { actorId: m, trailId: t.trailId, level: "officially_verified", evidence: [{ kind: "call_note", description: "Phoned them." }], authority: "Forest Dept", now })).toEqual({ ok: false, reason: "evidence_required" });
    expect(await verifyAccess(db.sql, { actorId: m, trailId: t.trailId, level: "officially_verified", evidence: [{ kind: "official_document", description: "Permit letter ref 12." }], now })).toEqual({ ok: false, reason: "authority_required" });
    expect(await verifyAccess(db.sql, { actorId: m, trailId: t.trailId, level: "officially_verified", evidence: [{ kind: "official_document", description: "Permit letter ref 12." }], authority: "Forest Dept", now })).toMatchObject({ ok: true });
    expect(await audits(t.revisionId)).toHaveLength(1);
  });

  it("refuses riders, bad levels, unknown trails and an expiry that is too far away or in the past", async () => {
    const m = await mod();
    const t = await trail();
    const ev = [{ kind: "call_note" as const, description: "Called the office." }];
    expect(await verifyAccess(db.sql, { actorId: await makeUser(db.sql), trailId: t.trailId, level: "moderator_verified", evidence: ev, now })).toEqual({ ok: false, reason: "forbidden" });
    expect(await verifyAccess(db.sql, { actorId: m, trailId: t.trailId, level: "community_reported" as never, evidence: ev, now })).toEqual({ ok: false, reason: "invalid" });
    expect(await verifyAccess(db.sql, { actorId: m, trailId: crypto.randomUUID(), level: "moderator_verified", evidence: ev, now })).toEqual({ ok: false, reason: "not_found" });
    expect(await verifyAccess(db.sql, { actorId: m, trailId: t.trailId, level: "moderator_verified", evidence: ev, validUntil: "2026-05-01", now })).toEqual({ ok: false, reason: "invalid" });
    expect(await verifyAccess(db.sql, { actorId: m, trailId: t.trailId, level: "moderator_verified", evidence: ev, validUntil: "2030-01-01", now })).toEqual({ ok: false, reason: "invalid" });
    expect(await audits(t.revisionId)).toHaveLength(0);
  });
});

describe("unpublish and setCondition", () => {
  it("unpublishes a published trail and removes it from the public site", async () => {
    const m = await mod();
    const t = await trail();
    expect(await unpublish(db.sql, { actorId: m, trailId: t.trailId, reason: "Landowner asked for removal." })).toEqual({ ok: true, slug: t.slug });
    expect(await asAnon(db.sql, (tx) => tx`select 1 from public_trails where slug = ${t.slug}`)).toHaveLength(0);
    expect(await unpublish(db.sql, { actorId: m, trailId: t.trailId, reason: "Again." })).toEqual({ ok: false, reason: "wrong_state" });
    expect((await audits(t.revisionId)).map((a) => a.action)).toEqual(["unpublish"]);
  });

  it("records a condition event that the public page reflects, and validates input", async () => {
    const m = await mod();
    const t = await trail();
    expect(await setCondition(db.sql, { actorId: m, trailId: t.trailId, status: "temporarily_closed", reason: "landslide", expectedUntil: "2026-09-01", note: "Landslide at km 4.", now })).toMatchObject({ ok: true, slug: t.slug });
    const [pub] = await asAnon(db.sql, (tx) => tx`select condition_current from public_trails where slug = ${t.slug}`);
    expect(pub!.condition_current).toBe("temporarily_closed");
    expect(await setCondition(db.sql, { actorId: m, trailId: t.trailId, status: "exploded" as never, now })).toEqual({ ok: false, reason: "invalid" });
    expect(await setCondition(db.sql, { actorId: m, trailId: t.trailId, status: "open", expectedUntil: "2026-01-01", now })).toEqual({ ok: false, reason: "invalid" });
    expect(await setCondition(db.sql, { actorId: await makeUser(db.sql), trailId: t.trailId, status: "open", now })).toEqual({ ok: false, reason: "forbidden" });
  });
});

describe("listDueForRecheck", () => {
  it("lists published trails whose verification expires within 30 days or has lapsed, soonest first", async () => {
    const m = await mod();
    const soon = await trail({ verificationLevel: "moderator_verified", verifiedAt: "2025-06-20", validUntil: "2026-06-20" });
    const lapsed = await trail({ verificationLevel: "moderator_verified", verifiedAt: "2025-04-01", validUntil: "2026-04-01" });
    await trail({ verificationLevel: "moderator_verified", verifiedAt: "2026-01-01", validUntil: "2027-01-01" });
    await trail({ verificationLevel: "moderator_verified", verifiedAt: "2025-04-01", validUntil: "2026-04-01", lifecycle: "unpublished" });
    const r = await listDueForRecheck(db.sql, m, now);
    if (!r.ok) throw new Error();
    expect(r.items.map((i) => i.slug)).toEqual([lapsed.slug, soon.slug]);
    expect(r.items[0]).toMatchObject({ overdue: true });
    expect(r.items[1]).toMatchObject({ overdue: false });
    expect(await listDueForRecheck(db.sql, await makeUser(db.sql), now)).toEqual({ ok: false, reason: "forbidden" });
  });
});

describe("reports", () => {
  async function report(type = "closure", priority = "normal") {
    const t = await trail();
    const rider = await makeUser(db.sql, { name: "Reporter Rina" });
    const [r] = await db.sql`insert into trail_report (trail_id, reporter_id, type, details, priority) values (${t.trailId}, ${rider}, ${type}, 'The gate is locked and a guard turned us away.', ${priority}) returning id`;
    return { ...t, reportId: r!.id as string, rider };
  }

  it("lists open reports with high priority first and never shows reporter email", async () => {
    const m = await mod();
    await report("other", "normal");
    const high = await report("environmental", "high");
    const r = await listReports(db.sql, m);
    if (!r.ok) throw new Error();
    expect(r.items[0]).toMatchObject({ reportId: high.reportId, priority: "high", reporterName: "Reporter Rina" });
    expect(JSON.stringify(r)).not.toMatch(/@example\.test/);
    expect(await listReports(db.sql, await makeUser(db.sql))).toEqual({ ok: false, reason: "forbidden" });
  });

  it("accepting a closure report can set the condition, resolves it and tells the reporter", async () => {
    const m = await mod();
    const rp = await report();
    const r = await resolveReport(db.sql, { actorId: m, reportId: rp.reportId, outcome: "accepted", note: "Confirmed with the range office.", condition: { status: "temporarily_closed", reason: "regulatory", expectedUntil: "2026-12-01" }, now });
    expect(r).toMatchObject({ ok: true, notify: { reporterId: rp.rider, outcome: "accepted" } });
    const [row] = await db.sql`select status, resolved_by, resolution_note from trail_report where id = ${rp.reportId}`;
    expect(row).toMatchObject({ status: "accepted", resolved_by: m, resolution_note: "Confirmed with the range office." });
    expect((await asAnon(db.sql, (tx) => tx`select condition_current from public_trails where slug = ${rp.slug}`))[0]!.condition_current).toBe("temporarily_closed");
    expect((await audits(rp.reportId)).map((a) => a.action)).toEqual(["resolve_report"]);
  });

  it("rejects, asks for more information, and refuses a second resolution or a bad outcome", async () => {
    const m = await mod();
    const a = await report();
    expect(await resolveReport(db.sql, { actorId: m, reportId: a.reportId, outcome: "needs_info", note: "Which gate?", now })).toMatchObject({ ok: true });
    expect((await db.sql`select status, resolved_at from trail_report where id = ${a.reportId}`)[0]).toMatchObject({ status: "needs_info", resolved_at: null });
    expect(await resolveReport(db.sql, { actorId: m, reportId: a.reportId, outcome: "rejected", note: "Could not confirm.", now })).toMatchObject({ ok: true });
    expect(await resolveReport(db.sql, { actorId: m, reportId: a.reportId, outcome: "accepted", note: "x", now })).toEqual({ ok: false, reason: "wrong_state" });
    const b = await report();
    expect(await resolveReport(db.sql, { actorId: m, reportId: b.reportId, outcome: "deleted" as never, note: "", now })).toEqual({ ok: false, reason: "invalid" });
    expect(await resolveReport(db.sql, { actorId: await makeUser(db.sql), reportId: b.reportId, outcome: "rejected", note: "", now })).toEqual({ ok: false, reason: "forbidden" });
  });
});

describe("getTrailForModeration", () => {
  it("returns the moderator's view of a trail, including unpublished ones, and refuses riders", async () => {
    const m = await mod();
    const t = await trail({ lifecycle: "unpublished", accessClass: "permission_required", permissionContact: "ranger@example.test" });
    const r = await getTrailForModeration(db.sql, m, t.slug);
    expect(r).toMatchObject({ ok: true, trail: { trailId: t.trailId, lifecycle: "unpublished", accessClass: "permission_required", permissionContact: "ranger@example.test" } });
    expect(await getTrailForModeration(db.sql, m, "nope")).toEqual({ ok: false, reason: "not_found" });
    expect(await getTrailForModeration(db.sql, await makeUser(db.sql), t.slug)).toEqual({ ok: false, reason: "forbidden" });
  });
});

describe("release and input validation (M6 review)", () => {
  it("puts an unpublished trail back on the site, audited, and refuses other states", async () => {
    const m = await mod();
    const t = await trail();
    expect(await release(db.sql, { actorId: m, trailId: t.trailId, reason: "Removal request withdrawn." })).toEqual({ ok: false, reason: "wrong_state" });
    await unpublish(db.sql, { actorId: m, trailId: t.trailId, reason: "Owner asked for removal." });
    expect(await asAnon(db.sql, (tx) => tx`select 1 from public_trails where slug = ${t.slug}`)).toHaveLength(0);
    expect(await release(db.sql, { actorId: m, trailId: t.trailId, reason: "Removal request withdrawn." })).toEqual({ ok: true, slug: t.slug });
    expect(await asAnon(db.sql, (tx) => tx`select 1 from public_trails where slug = ${t.slug}`)).toHaveLength(1);
    expect((await audits(t.revisionId)).map((a) => a.action)).toEqual(["unpublish", "release"]);
    expect(await release(db.sql, { actorId: await makeUser(db.sql), trailId: t.trailId, reason: "x" })).toEqual({ ok: false, reason: "forbidden" });
  });

  it("refuses to release a trail that was never published", async () => {
    const m = await mod();
    const t = await trail({ lifecycle: "draft", linkPublishedRevision: false });
    expect(await release(db.sql, { actorId: m, trailId: t.trailId, reason: "Trying." })).toEqual({ ok: false, reason: "wrong_state" });
  });

  it("rejects an unknown evidence kind or a non-http link instead of failing in the database", async () => {
    const m = await mod();
    const t = await trail();
    expect(await verifyAccess(db.sql, { actorId: m, trailId: t.trailId, level: "moderator_verified", evidence: [{ kind: "nonsense" as never, description: "x" }], now })).toEqual({ ok: false, reason: "invalid" });
    expect(await verifyAccess(db.sql, { actorId: m, trailId: t.trailId, level: "moderator_verified", evidence: [{ kind: "url", description: "x", url: "javascript:alert(1)" }], now })).toEqual({ ok: false, reason: "invalid" });
  });

  it("only lets condition changes ride along with accepted closure reports", async () => {
    const m = await mod();
    const t = await trail();
    const rider = await makeUser(db.sql);
    const [r] = await db.sql`insert into trail_report (trail_id, reporter_id, type, details) values (${t.trailId}, ${rider}, 'other', 'Something else is wrong with the signage here.') returning id`;
    expect(await resolveReport(db.sql, { actorId: m, reportId: r!.id, outcome: "accepted", note: "", condition: { status: "temporarily_closed" }, now })).toEqual({ ok: false, reason: "invalid" });
    expect((await db.sql`select status from trail_report where id = ${r!.id}`)[0]!.status).toBe("open");
  });
});
