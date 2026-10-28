// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { insertTrailFixture } from "../testing/fixtures";
import { createTestDatabase } from "../testing/db";
import { makeUser } from "../testing/submission-fixture";
import { deleteComment, editComment, listComments, postComment, reportContent } from "./comments";
import { completeWelcome } from "./members";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
beforeAll(async () => {
  db = await createTestDatabase();
});
afterAll(async () => {
  await db.drop();
});
const member = async (o: { name?: string; pub?: boolean; role?: "moderator" } = {}) => {
  const id = await makeUser(db.sql, { name: o.name, role: o.role });
  await completeWelcome(db.sql, { userId: id, confirmed: true, displayName: o.name ?? "Some Rider", profilePublic: o.pub ?? false, isWoman: false });
  return id;
};
/** A member whose first comments have already been approved. */
const trusted = async (o: { name?: string; pub?: boolean } = {}) => {
  const id = await member(o);
  const t = await insertTrailFixture(db.sql, {});
  for (let i = 0; i < 2; i++) await db.sql`insert into trail_comment (trail_id, user_id, body, status) values (${t.trailId}, ${id}, 'Earlier approved comment', 'visible')`;
  return id;
};

describe("postComment", () => {
  it("lets a trusted member post and reply, and shows the thread with replies under their parent", async () => {
    const t = await insertTrailFixture(db.sql, {});
    const a = await trusted({ name: "Ann", pub: true });
    const b = await trusted({ name: "Bob" });
    const root = await postComment(db.sql, { userId: a, slug: t.slug, body: "Gate was open on Saturday.", tag: "tip" });
    if (!root.ok) throw new Error(root.reason);
    expect(root.status).toBe("visible");
    const reply = await postComment(db.sql, { userId: b, slug: t.slug, body: "Thanks, I'll check it.", parentId: root.id });
    expect(reply.ok).toBe(true);
    const list = await listComments(db.sql, t.slug, null);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ body: "Gate was open on Saturday.", tag: "tip", authorName: "Ann", mine: false, pending: false });
    expect(list[0]!.authorId).not.toBeNull();
    expect(list[0]!.replies.map((r) => [r.authorName, r.authorId])).toEqual([["Bob", null]]);
  });

  it("shows a new member's comments straight away, to everyone", async () => {
    const t = await insertTrailFixture(db.sql, {});
    const u = await member({ name: "Newbie" });
    expect(await postComment(db.sql, { userId: u, slug: t.slug, body: "My first comment here" })).toMatchObject({ ok: true, status: "visible" });
    expect((await listComments(db.sql, t.slug, null)).map((c) => c.body)).toEqual(["My first comment here"]);
  });

  it("lets moderators post straight away", async () => {
    const t = await insertTrailFixture(db.sql, {});
    const m = await member({ role: "moderator" });
    expect(await postComment(db.sql, { userId: m, slug: t.slug, body: "Official note on the gate" })).toMatchObject({ ok: true, status: "visible" });
  });

  it("requires membership and a published trail, and a valid parent on the same trail", async () => {
    const t = await insertTrailFixture(db.sql, {});
    const other = await insertTrailFixture(db.sql, {});
    const draft = await insertTrailFixture(db.sql, { lifecycle: "draft" });
    const nonMember = await makeUser(db.sql);
    const u = await trusted();
    expect(await postComment(db.sql, { userId: nonMember, slug: t.slug, body: "Hello there" })).toEqual({ ok: false, reason: "not_member" });
    expect(await postComment(db.sql, { userId: u, slug: draft.slug, body: "Hello there" })).toEqual({ ok: false, reason: "not_found" });
    const root = await postComment(db.sql, { userId: u, slug: other.slug, body: "Comment on another trail" });
    if (!root.ok) throw new Error();
    expect(await postComment(db.sql, { userId: u, slug: t.slug, body: "Reply across trails", parentId: root.id })).toEqual({ ok: false, reason: "not_found" });
    const reply = await postComment(db.sql, { userId: u, slug: other.slug, body: "A reply", parentId: root.id });
    if (!reply.ok) throw new Error();
    expect(await postComment(db.sql, { userId: u, slug: other.slug, body: "Reply to a reply", parentId: reply.id })).toEqual({ ok: false, reason: "not_found" });
    expect(await postComment(db.sql, { userId: u, slug: other.slug, body: "Bad parent", parentId: "nope" })).toEqual({ ok: false, reason: "not_found" });
  });

  it.each([
    ["too short", "x", "invalid"],
    ["too long", "x".repeat(1501), "invalid"],
    ["a link", "See https://example.com for more", "no_links"],
    ["a bare domain", "visit myspot.com now", "no_links"],
    ["www", "go to www.example today", "no_links"],
  ])("rejects a comment that is %s", async (_l, body, reason) => {
    const t = await insertTrailFixture(db.sql, {});
    expect(await postComment(db.sql, { userId: await trusted(), slug: t.slug, body })).toEqual({ ok: false, reason });
  });

  it("rejects an unknown tag, strips control characters, and allows ten comments an hour", async () => {
    const t = await insertTrailFixture(db.sql, {});
    const u = await trusted();
    expect(await postComment(db.sql, { userId: u, slug: t.slug, body: "Good comment here", tag: "spam" })).toEqual({ ok: false, reason: "invalid" });
    const r = await postComment(db.sql, { userId: u, slug: t.slug, body: "Clean\u0000 this\u0007 up" });
    if (!r.ok) throw new Error();
    expect((await listComments(db.sql, t.slug, null))[0]!.body).toBe("Clean this up");
    for (let i = 0; i < 9; i++) await postComment(db.sql, { userId: u, slug: t.slug, body: `Comment number ${i}` });
    expect(await postComment(db.sql, { userId: u, slug: t.slug, body: "One too many" })).toEqual({ ok: false, reason: "rate_limited" });
  });
});

describe("editComment and deleteComment", () => {
  it("lets the author edit within ten minutes only, and delete at any time", async () => {
    const t = await insertTrailFixture(db.sql, {});
    const u = await trusted();
    const r = await postComment(db.sql, { userId: u, slug: t.slug, body: "Original wording" });
    if (!r.ok) throw new Error();
    const [{ created_at }] = await db.sql`select created_at from trail_comment where id = ${r.id}`;
    const at = (min: number) => new Date((created_at as Date).getTime() + min * 60_000);
    expect(await editComment(db.sql, { userId: u, commentId: r.id, body: "Better wording", now: at(5) })).toEqual({ ok: true });
    expect((await listComments(db.sql, t.slug, u))[0]).toMatchObject({ body: "Better wording", editedAt: expect.any(String) });
    expect(await editComment(db.sql, { userId: u, commentId: r.id, body: "Too late now", now: at(11) })).toEqual({ ok: false, reason: "too_late" });
    expect(await deleteComment(db.sql, { userId: u, commentId: r.id })).toEqual({ ok: true });
    expect(await listComments(db.sql, t.slug, u)).toEqual([]);
    expect(await deleteComment(db.sql, { userId: u, commentId: r.id })).toEqual({ ok: false, reason: "not_found" });
  });

  it("will not let anyone else edit or delete, or edit a hidden comment, or add links when editing", async () => {
    const t = await insertTrailFixture(db.sql, {});
    const a = await trusted();
    const b = await trusted();
    const r = await postComment(db.sql, { userId: a, slug: t.slug, body: "Mine, not yours" });
    if (!r.ok) throw new Error();
    const now = new Date();
    expect(await editComment(db.sql, { userId: b, commentId: r.id, body: "Hijacked text", now })).toEqual({ ok: false, reason: "not_found" });
    expect(await deleteComment(db.sql, { userId: b, commentId: r.id })).toEqual({ ok: false, reason: "not_found" });
    expect(await editComment(db.sql, { userId: a, commentId: r.id, body: "Now see example.com", now })).toEqual({ ok: false, reason: "no_links" });
    await db.sql`update trail_comment set status = 'hidden' where id = ${r.id}`;
    expect(await editComment(db.sql, { userId: a, commentId: r.id, body: "Edited after hiding", now })).toEqual({ ok: false, reason: "forbidden" });
  });
});

describe("reportContent", () => {
  it("records one report per rider per comment and refuses junk", async () => {
    const t = await insertTrailFixture(db.sql, {});
    const author = await trusted();
    const reporter = await member();
    const r = await postComment(db.sql, { userId: author, slug: t.slug, body: "Something rude to report" });
    if (!r.ok) throw new Error();
    expect(await reportContent(db.sql, { userId: reporter, subjectType: "comment", subjectId: r.id, reason: "This is abusive" })).toEqual({ ok: true });
    expect(await reportContent(db.sql, { userId: reporter, subjectType: "comment", subjectId: r.id, reason: "Reporting it twice" })).toEqual({ ok: true });
    expect((await db.sql`select count(*)::int as n from content_report where subject_id = ${r.id}`)[0]!.n).toBe(1);
    expect(await reportContent(db.sql, { userId: reporter, subjectType: "comment", subjectId: r.id, reason: "no" })).toEqual({ ok: false, reason: "invalid" });
    expect(await reportContent(db.sql, { userId: reporter, subjectType: "comment", subjectId: crypto.randomUUID(), reason: "Does not exist" })).toEqual({ ok: false, reason: "not_found" });
    expect(await reportContent(db.sql, { userId: await makeUser(db.sql), subjectType: "comment", subjectId: r.id, reason: "I am not a member" })).toEqual({ ok: false, reason: "not_member" });
  });
});
