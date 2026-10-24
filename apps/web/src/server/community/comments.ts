import type { Sql } from "postgres";
import { isValidSlug } from "@moto-trails/domain";
import { withPublicRole } from "../db/client";
import { isMember } from "./members";

export const COMMENT_TAGS = ["gate_closed", "water_high", "blocked", "good_condition", "tip"] as const;
export type CommentTag = (typeof COMMENT_TAGS)[number];
const EDIT_WINDOW_MS = 10 * 60_000;
const PENDING_FIRST = 2;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LINK = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|in|org|net|co|io|app|dev|me|ly)\b\/?)/i;

/** Control characters are removed, line breaks are kept but limited to two in a row. */
export function cleanBody(raw: unknown): string {
  return String(raw ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

type Fail = { ok: false; reason: "not_member" | "not_found" | "invalid" | "no_links" | "rate_limited" | "too_late" | "forbidden" };

export async function postComment(
  sql: Sql,
  i: { userId: string; slug: string; body: string; tag?: string | null; parentId?: string | null },
): Promise<{ ok: true; id: string; status: "visible" | "pending" } | Fail> {
  if (!isValidSlug(i.slug)) return { ok: false, reason: "not_found" };
  if (!(await isMember(sql, i.userId))) return { ok: false, reason: "not_member" };
  const body = cleanBody(i.body);
  if (body.length < 2 || body.length > 1500) return { ok: false, reason: "invalid" };
  if (LINK.test(body)) return { ok: false, reason: "no_links" };
  const tag = i.tag ? (COMMENT_TAGS as readonly string[]).includes(i.tag) ? i.tag : undefined : null;
  if (tag === undefined) return { ok: false, reason: "invalid" };
  return sql.begin(async (tx) => {
    const [hit] = await tx`select rate_limit_hit(${`comment:${i.userId}`}, 10, 3600) as ok`;
    if (!hit!.ok) return { ok: false, reason: "rate_limited" } as const;
    const [trail] = await tx`select id from trail where slug = ${i.slug} and lifecycle = 'published'`;
    if (!trail) return { ok: false, reason: "not_found" } as const;
    if (i.parentId) {
      if (!UUID.test(i.parentId)) return { ok: false, reason: "not_found" } as const;
      const [p] = await tx`select 1 from trail_comment where id = ${i.parentId} and trail_id = ${trail.id} and parent_id is null and status = 'visible' and deleted_at is null`;
      if (!p) return { ok: false, reason: "not_found" } as const;
    }
    // New members' first comments wait for a moderator; moderators and admins post straight away.
    const [trusted] = await tx`
      select (exists (select 1 from user_role where user_id = ${i.userId})
        or (select count(*) from trail_comment where user_id = ${i.userId} and status = 'visible') >= ${PENDING_FIRST}) as ok`;
    const status = trusted!.ok ? "visible" : "pending";
    const [row] = await tx`
      insert into trail_comment (trail_id, user_id, parent_id, body, tag, status)
      values (${trail.id}, ${i.userId}, ${i.parentId ?? null}, ${body}, ${tag}, ${status}) returning id`;
    return { ok: true, id: row!.id as string, status } as const;
  });
}

export async function editComment(sql: Sql, i: { userId: string; commentId: string; body: string; now: Date }): Promise<{ ok: true } | Fail> {
  if (!UUID.test(i.commentId)) return { ok: false, reason: "not_found" };
  const body = cleanBody(i.body);
  if (body.length < 2 || body.length > 1500) return { ok: false, reason: "invalid" };
  if (LINK.test(body)) return { ok: false, reason: "no_links" };
  const [c] = await sql`select user_id, created_at, status, deleted_at from trail_comment where id = ${i.commentId}`;
  if (!c || c.user_id !== i.userId || c.deleted_at) return { ok: false, reason: "not_found" };
  if (c.status === "hidden") return { ok: false, reason: "forbidden" };
  if (i.now.getTime() - (c.created_at as Date).getTime() > EDIT_WINDOW_MS) return { ok: false, reason: "too_late" };
  await sql`update trail_comment set body = ${body}, edited_at = ${i.now} where id = ${i.commentId}`;
  return { ok: true };
}

export async function deleteComment(sql: Sql, i: { userId: string; commentId: string }): Promise<{ ok: true } | Fail> {
  if (!UUID.test(i.commentId)) return { ok: false, reason: "not_found" };
  const rows = await sql`update trail_comment set deleted_at = now() where id = ${i.commentId} and user_id = ${i.userId} and deleted_at is null returning id`;
  return rows.length ? { ok: true } : { ok: false, reason: "not_found" };
}

export type CommentView = {
  id: string;
  body: string;
  tag: CommentTag | null;
  createdAt: string;
  editedAt: string | null;
  authorName: string;
  /** Opaque rider handle, present only when the author's profile is public. */
  authorId: string | null;
  mine: boolean;
  pending: boolean;
  replies: CommentView[];
};

/** Visible comments with their replies, plus the viewer's own comments that are still waiting for approval. */
export async function listComments(sql: Sql, slug: string, viewerId: string | null): Promise<CommentView[]> {
  if (!isValidSlug(slug)) return [];
  const visible = await withPublicRole(sql, (tx) => tx`
    select id, parent_id, body, tag, created_at, edited_at, author_name, author_id from public_trail_comments where trail_slug = ${slug} order by created_at asc limit 500`);
  const mineRows = viewerId
    ? await sql`
        select c.id, c.parent_id, c.body, c.tag, c.created_at, c.edited_at, c.status, u.display_name as author_name
        from trail_comment c join trail t on t.id = c.trail_id join app_user u on u.id = c.user_id
        where t.slug = ${slug} and c.user_id = ${viewerId} and c.deleted_at is null and c.status in ('visible', 'pending')`
    : [];
  const mineIds = new Set(mineRows.map((r) => r.id as string));
  const toView = (r: Record<string, unknown>, pending: boolean): CommentView => ({
    id: r.id as string, body: r.body as string, tag: (r.tag as CommentTag | null) ?? null,
    createdAt: (r.created_at as Date).toISOString(), editedAt: r.edited_at ? (r.edited_at as Date).toISOString() : null,
    authorName: r.author_name as string, authorId: (r.author_id as string | null | undefined) ?? null,
    mine: mineIds.has(r.id as string), pending, replies: [],
  });
  const all = new Map<string, { view: CommentView; parent: string | null }>();
  for (const r of visible) all.set(r.id, { view: toView(r, false), parent: r.parent_id });
  for (const r of mineRows) if (r.status === "pending") all.set(r.id as string, { view: toView(r, true), parent: r.parent_id as string | null });
  const roots: CommentView[] = [];
  for (const { view, parent } of all.values()) {
    const p = parent ? all.get(parent) : undefined;
    if (p) p.view.replies.push(view);
    else if (!parent) roots.push(view);
  }
  const byDate = (a: CommentView, b: CommentView) => a.createdAt.localeCompare(b.createdAt);
  roots.sort((a, b) => byDate(b, a)); // newest conversations first
  for (const r of roots) r.replies.sort(byDate);
  return roots;
}

/** Report a comment to the moderators. One report per rider per comment. */
export async function reportContent(
  sql: Sql,
  i: { userId: string; subjectType: "comment"; subjectId: string; reason: string },
): Promise<{ ok: true } | Fail> {
  if (!(await isMember(sql, i.userId))) return { ok: false, reason: "not_member" };
  if (!UUID.test(i.subjectId)) return { ok: false, reason: "not_found" };
  const reason = cleanBody(i.reason);
  if (reason.length < 5 || reason.length > 500) return { ok: false, reason: "invalid" };
  const [hit] = await sql`select rate_limit_hit(${`report:${i.userId}`}, 20, 86400) as ok`;
  if (!hit!.ok) return { ok: false, reason: "rate_limited" };
  const [c] = await sql`select 1 from trail_comment where id = ${i.subjectId} and status <> 'hidden' and deleted_at is null`;
  if (!c) return { ok: false, reason: "not_found" };
  await sql`insert into content_report (subject_type, subject_id, reporter_id, reason) values (${i.subjectType}, ${i.subjectId}, ${i.userId}, ${reason}) on conflict do nothing`;
  return { ok: true };
}
