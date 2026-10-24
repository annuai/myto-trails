// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedRegions } from "../db/seed-regions";
import { asAnon, createTestDatabase } from "../testing/db";
import { makeUser, submittedSubmission } from "../testing/submission-fixture";
import { approve, getReview, listQueue, rejectSubmission, requestChanges } from "./decisions";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
beforeAll(async () => {
  db = await createTestDatabase();
  await seedRegions(db.sql);
});
afterAll(async () => {
  await db.drop();
});

const mod = (role: "moderator" | "admin" = "moderator") => makeUser(db.sql, { role, name: "Mod Meera" });
const submitted = async (o: Parameters<typeof submittedSubmission>[2] = {}) => {
  const rider = await makeUser(db.sql);
  return { rider, ...(await submittedSubmission(db.sql, rider, o)) };
};
const audits = async (entityId: string) => db.sql`select action, actor_role from audit_log where entity_id = ${entityId} order by created_at`;
const publish = { sensitivity: "standard" as const };

describe("privilege", () => {
  it("refuses riders, suspended moderators and anonymous ids at every entry point", async () => {
    const s = await submitted();
    const rider = await makeUser(db.sql);
    const suspended = await mod();
    await db.sql`update app_user set status = 'suspended' where id = ${suspended}`;
    for (const actor of [rider, suspended, crypto.randomUUID(), "not-a-uuid"]) {
      expect(await listQueue(db.sql, actor)).toEqual({ ok: false, reason: "forbidden" });
      expect(await getReview(db.sql, actor, s.submissionId)).toEqual({ ok: false, reason: "forbidden" });
      expect(await requestChanges(db.sql, { actorId: actor, submissionId: s.submissionId, comment: "Please add the gate location." })).toEqual({ ok: false, reason: "forbidden" });
      expect(await rejectSubmission(db.sql, { actorId: actor, submissionId: s.submissionId, reasonCode: "spam", comment: "" })).toEqual({ ok: false, reason: "forbidden" });
      expect(await approve(db.sql, { actorId: actor, submissionId: s.submissionId, ...publish })).toEqual({ ok: false, reason: "forbidden" });
    }
    expect(await audits(s.revisionId)).toHaveLength(0);
  });

  it("will not let a moderator decide on their own submission", async () => {
    const m = await mod();
    const own = await submittedSubmission(db.sql, m);
    expect(await approve(db.sql, { actorId: m, submissionId: own.submissionId, ...publish })).toEqual({ ok: false, reason: "own_submission" });
    expect(await requestChanges(db.sql, { actorId: m, submissionId: own.submissionId, comment: "Please add the gate location." })).toEqual({ ok: false, reason: "own_submission" });
  });
});

describe("queue and review", () => {
  it("lists submitted trails oldest first and gives the full review package", async () => {
    const m = await mod();
    const a = await submitted({ name: "Queue first trail" });
    await submitted({ name: "Queue second trail", accessClass: "restricted" });
    const q = await listQueue(db.sql, m);
    if (!q.ok) throw new Error();
    const names = q.items.map((i) => i.title);
    expect(names.indexOf("Queue first trail")).toBeLessThan(names.indexOf("Queue second trail"));
    expect(q.items.find((i) => i.title === "Queue second trail")).toMatchObject({ accessClass: "restricted", needsSecondApproval: true });

    const r = await getReview(db.sql, m, a.submissionId);
    if (!r.ok) throw new Error();
    expect(r.review).toMatchObject({ title: "Queue first trail", status: "submitted", contributorName: "Rider Ravi", needsSecondApproval: false });
    expect(r.review.access).toMatchObject({ accessClass: "public", basis: "rider_observed", level: "community_reported" });
    expect(r.review.access.evidence).toHaveLength(1);
    expect(JSON.stringify(r.review)).not.toMatch(/@example\.test/); // contributor email is not part of the package
  });

  it("returns not_found for an unknown submission", async () => {
    expect(await getReview(db.sql, await mod(), crypto.randomUUID())).toEqual({ ok: false, reason: "not_found" });
  });
});

describe("requestChanges and reject", () => {
  it("moves the submission and revision, records the decision for the author, and audits it", async () => {
    const m = await mod();
    const s = await submitted();
    const r = await requestChanges(db.sql, { actorId: m, submissionId: s.submissionId, comment: "Please add the exact gate location.", fieldComments: { access: "Which gate?" } });
    expect(r).toMatchObject({ ok: true, notify: { contributorId: s.rider, outcome: "changes_requested" } });
    const [sub] = await db.sql`select status, moderator_feedback from submission where id = ${s.submissionId}`;
    expect(sub).toMatchObject({ status: "changes_requested", moderator_feedback: "Please add the exact gate location." });
    const [rev] = await db.sql`select state from trail_revision where id = ${s.revisionId}`;
    expect(rev!.state).toBe("changes_requested");
    const [rec] = await db.sql`select action, visible_to_author, field_comments from moderation_record where subject_id = ${s.revisionId}`;
    expect(rec).toMatchObject({ action: "request_changes", visible_to_author: true, field_comments: { access: "Which gate?" } });
    expect(await audits(s.revisionId)).toEqual([{ action: "request_changes", actor_role: "moderator" }]);
    // The contributor can edit again (M5).
    expect((await db.sql`select 1 from trail where id = ${s.trailId} and lifecycle = 'in_review'`)).toHaveLength(1);
  });

  it("requires a real comment for changes and a reason code for rejection", async () => {
    const m = await mod();
    const s = await submitted();
    expect(await requestChanges(db.sql, { actorId: m, submissionId: s.submissionId, comment: "no" })).toEqual({ ok: false, reason: "invalid" });
    expect(await rejectSubmission(db.sql, { actorId: m, submissionId: s.submissionId, reasonCode: "because" as never, comment: "" })).toEqual({ ok: false, reason: "invalid" });
    expect(await audits(s.revisionId)).toHaveLength(0);
  });

  it("rejects with a reason code and note; the trail never goes public", async () => {
    const m = await mod();
    const s = await submitted();
    const r = await rejectSubmission(db.sql, { actorId: m, submissionId: s.submissionId, reasonCode: "private_property", comment: "This crosses a private estate with no permission path." });
    expect(r).toMatchObject({ ok: true, notify: { outcome: "rejected" } });
    const [sub] = await db.sql`select status, moderator_feedback from submission where id = ${s.submissionId}`;
    expect(sub).toMatchObject({ status: "rejected", moderator_feedback: expect.stringContaining("private estate") });
    expect((await db.sql`select state from trail_revision where id = ${s.revisionId}`)[0]!.state).toBe("rejected");
    expect((await db.sql`select lifecycle from trail where id = ${s.trailId}`)[0]!.lifecycle).toBe("archived");
    expect(await asAnon(db.sql, (tx) => tx`select 1 from public_trails where slug = ${s.slug}`)).toHaveLength(0);
  });

  it("refuses a second decision on the same submission", async () => {
    const m = await mod();
    const s = await submitted();
    await requestChanges(db.sql, { actorId: m, submissionId: s.submissionId, comment: "Please add the exact gate location." });
    expect(await rejectSubmission(db.sql, { actorId: m, submissionId: s.submissionId, reasonCode: "spam", comment: "" })).toEqual({ ok: false, reason: "wrong_state" });
    expect(await approve(db.sql, { actorId: m, submissionId: s.submissionId, ...publish })).toEqual({ ok: false, reason: "wrong_state" });
  });
});

describe("approve", () => {
  it("publishes: the trail appears publicly with its district, and everything is audited", async () => {
    const m = await mod();
    const s = await submitted({ withRoute: true, district: "Wayanad" });
    const r = await approve(db.sql, { actorId: m, submissionId: s.submissionId, ...publish });
    expect(r).toMatchObject({ ok: true, published: true, slug: s.slug, notify: { outcome: "approved" } });
    const [t] = await asAnon(db.sql, (tx) => tx`select slug, district_slug, access_class from public_trails where slug = ${s.slug}`);
    expect(t).toMatchObject({ district_slug: "wayanad", access_class: "public" });
    const [d] = await asAnon(db.sql, (tx) => tx`select has_gpx from public_trail_detail where slug = ${s.slug}`);
    expect(d!.has_gpx).toBe(true);
    expect((await db.sql`select state from trail_revision where id = ${s.revisionId}`)[0]!.state).toBe("approved");
    expect((await db.sql`select status, decided_by from submission where id = ${s.submissionId}`)[0]).toMatchObject({ status: "approved", decided_by: m });
    expect(await audits(s.revisionId)).toEqual([{ action: "approve", actor_role: "moderator" }]);
  });

  it("can publish without the GPX", async () => {
    const m = await mod();
    const s = await submitted({ withRoute: true });
    await approve(db.sql, { actorId: m, submissionId: s.submissionId, ...publish, publishGpx: false });
    const [d] = await asAnon(db.sql, (tx) => tx`select has_gpx from public_trail_detail where slug = ${s.slug}`);
    expect(d!.has_gpx).toBe(false);
  });

  it("requires a public point for a sensitive trail and keeps the exact start private", async () => {
    const m = await mod();
    const s = await submitted();
    expect(await approve(db.sql, { actorId: m, submissionId: s.submissionId, sensitivity: "sensitive" })).toEqual({ ok: false, reason: "invalid" });
    const r = await approve(db.sql, { actorId: m, submissionId: s.submissionId, sensitivity: "sensitive", publicPoint: { lat: 11.7, lon: 76.2 } });
    expect(r).toMatchObject({ ok: true, published: true });
    const [t] = await asAnon(db.sql, (tx) => tx`select lat, lon from public_trail_search where slug = ${s.slug}`);
    expect(Number(t!.lat)).toBeCloseTo(11.7, 3);
  });

  it("never publishes private/no-access trails", async () => {
    const m = await mod();
    const s = await submitted({ accessClass: "private_no_access" });
    expect(await approve(db.sql, { actorId: m, submissionId: s.submissionId, ...publish })).toEqual({ ok: false, reason: "cannot_publish" });
    expect((await db.sql`select status from submission where id = ${s.submissionId}`)[0]!.status).toBe("submitted");
  });

  it("needs two different people for restricted access and for protected areas", async () => {
    const m1 = await mod();
    const m2 = await mod("admin");
    for (const o of [{ accessClass: "restricted" }, { accessClass: "public", restrictions: ["protected_area"] }]) {
      const s = await submitted(o);
      const first = await approve(db.sql, { actorId: m1, submissionId: s.submissionId, ...publish });
      expect(first).toMatchObject({ ok: true, published: false, awaitingSecond: true });
      expect(await asAnon(db.sql, (tx) => tx`select 1 from public_trails where slug = ${s.slug}`)).toHaveLength(0);
      expect(await approve(db.sql, { actorId: m1, submissionId: s.submissionId, ...publish })).toEqual({ ok: false, reason: "same_approver" });
      expect(await approve(db.sql, { actorId: m2, submissionId: s.submissionId, ...publish })).toMatchObject({ ok: true, published: true });
      expect(await asAnon(db.sql, (tx) => tx`select 1 from public_trails where slug = ${s.slug}`)).toHaveLength(1);
      expect((await audits(s.revisionId)).map((a) => a.action)).toEqual(["approve", "approve"]);
    }
  });

  it("handles two simultaneous approvals with one publication", async () => {
    const m1 = await mod();
    const m2 = await mod();
    const s = await submitted();
    const rs = await Promise.all([approve(db.sql, { actorId: m1, submissionId: s.submissionId, ...publish }), approve(db.sql, { actorId: m2, submissionId: s.submissionId, ...publish })]);
    expect(rs.filter((r) => r.ok)).toHaveLength(1);
    expect((await audits(s.revisionId)).filter((a) => a.action === "approve")).toHaveLength(1);
  });

  it("rolls back completely (no audit row, still in review) if publishing fails", async () => {
    const m = await mod();
    const s = await submitted();
    await db.sql`create or replace function mt_fail_pub() returns trigger language plpgsql as $$ begin raise exception 'boom'; end $$`;
    await db.sql`create trigger mt_fail_pub before update of lifecycle on trail for each row when (new.lifecycle = 'published') execute function mt_fail_pub()`;
    try {
      await expect(approve(db.sql, { actorId: m, submissionId: s.submissionId, ...publish })).rejects.toThrow(/boom/);
    } finally {
      await db.sql`drop trigger mt_fail_pub on trail`;
    }
    expect(await audits(s.revisionId)).toHaveLength(0);
    expect((await db.sql`select status from submission where id = ${s.submissionId}`)[0]!.status).toBe("submitted");
  });
});
