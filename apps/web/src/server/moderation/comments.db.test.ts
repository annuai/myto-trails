// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { insertTrailFixture } from "../testing/fixtures";
import { createTestDatabase } from "../testing/db";
import { makeUser } from "../testing/submission-fixture";
import { listComments, postComment, reportContent } from "../community/comments";
import { completeWelcome } from "../community/members";
import { listCommentQueue, moderateComment } from "./comments";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
beforeAll(async () => {
  db = await createTestDatabase();
});
afterAll(async () => {
  await db.drop();
});
const member = async (name = "Some Rider") => {
  const id = await makeUser(db.sql, { name });
  await completeWelcome(db.sql, { userId: id, confirmed: true, displayName: name, profilePublic: false, isWoman: false });
  return id;
};
const mod = () => makeUser(db.sql, { role: "moderator" });
const audits = (id: string) => db.sql`select action, actor_role from audit_log where entity_id = ${id} order by created_at`;

async function pendingComment() {
  const t = await insertTrailFixture(db.sql, {});
  const author = await member("New Author");
  const r = await postComment(db.sql, { userId: author, slug: t.slug, body: "My first comment here" });
  if (!r.ok) throw new Error();
  return { t, author, id: r.id };
}

describe("comment moderation", () => {
  it("queues pending comments and reported ones; approving makes a comment public and is audited", async () => {
    const m = await mod();
    const p = await pendingComment();
    const q = await listCommentQueue(db.sql, m);
    if (!q.ok) throw new Error();
    expect(q.items.find((i) => i.commentId === p.id)).toMatchObject({ status: "pending", authorName: "New Author", trailSlug: p.t.slug, reports: [] });
    expect(await listComments(db.sql, p.t.slug, null)).toEqual([]);
    expect(await moderateComment(db.sql, { actorId: m, commentId: p.id, action: "approve" })).toEqual({ ok: true, trailSlug: p.t.slug });
    expect((await listComments(db.sql, p.t.slug, null)).map((c) => c.body)).toEqual(["My first comment here"]);
    expect(await audits(p.id)).toEqual([{ action: "comment_approve", actor_role: "moderator" }]);
    expect(await moderateComment(db.sql, { actorId: m, commentId: p.id, action: "approve" })).toEqual({ ok: false, reason: "wrong_state" });
  });

  it("hides a reported comment with a reason, resolves its reports, and restores it later", async () => {
    const m = await mod();
    const p = await pendingComment();
    await moderateComment(db.sql, { actorId: m, commentId: p.id, action: "approve" });
    const reporter = await member("Reporter");
    await reportContent(db.sql, { userId: reporter, subjectType: "comment", subjectId: p.id, reason: "Rude to other riders" });
    const q = await listCommentQueue(db.sql, m);
    if (!q.ok) throw new Error();
    const item = q.items.find((i) => i.commentId === p.id)!;
    expect(item.reports).toEqual([{ reason: "Rude to other riders", createdAt: expect.any(String) }]);
    expect(JSON.stringify(item)).not.toContain(reporter);
    expect(await moderateComment(db.sql, { actorId: m, commentId: p.id, action: "hide" })).toEqual({ ok: false, reason: "invalid" });
    expect(await moderateComment(db.sql, { actorId: m, commentId: p.id, action: "hide", reason: "Abusive language" })).toMatchObject({ ok: true });
    expect(await listComments(db.sql, p.t.slug, null)).toEqual([]);
    expect((await db.sql`select status from content_report where subject_id = ${p.id}`)[0]!.status).toBe("resolved");
    expect(await moderateComment(db.sql, { actorId: m, commentId: p.id, action: "hide", reason: "Again" })).toEqual({ ok: false, reason: "wrong_state" });
    expect(await moderateComment(db.sql, { actorId: m, commentId: p.id, action: "restore" })).toMatchObject({ ok: true });
    expect(await listComments(db.sql, p.t.slug, null)).toHaveLength(1);
    expect((await audits(p.id)).map((a) => a.action)).toEqual(["comment_approve", "comment_hide", "comment_restore"]);
  });

  it("can dismiss reports without hiding", async () => {
    const m = await mod();
    const p = await pendingComment();
    await moderateComment(db.sql, { actorId: m, commentId: p.id, action: "approve" });
    await reportContent(db.sql, { userId: await member("R2"), subjectType: "comment", subjectId: p.id, reason: "Not actually a problem" });
    expect(await moderateComment(db.sql, { actorId: m, commentId: p.id, action: "dismiss" })).toMatchObject({ ok: true });
    expect(await listComments(db.sql, p.t.slug, null)).toHaveLength(1);
    const q = await listCommentQueue(db.sql, m);
    if (!q.ok) throw new Error();
    expect(q.items.find((i) => i.commentId === p.id)).toBeUndefined();
  });

  it("refuses riders and unknown comments, and bad actions", async () => {
    const p = await pendingComment();
    const rider = await member("Plain Rider");
    expect(await listCommentQueue(db.sql, rider)).toEqual({ ok: false, reason: "forbidden" });
    expect(await moderateComment(db.sql, { actorId: rider, commentId: p.id, action: "approve" })).toEqual({ ok: false, reason: "forbidden" });
    const m = await mod();
    expect(await moderateComment(db.sql, { actorId: m, commentId: crypto.randomUUID(), action: "approve" })).toEqual({ ok: false, reason: "not_found" });
    expect(await moderateComment(db.sql, { actorId: m, commentId: p.id, action: "explode" as never })).toEqual({ ok: false, reason: "invalid" });
    expect(await audits(p.id)).toHaveLength(0);
  });
});
