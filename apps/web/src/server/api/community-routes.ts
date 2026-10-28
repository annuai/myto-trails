import { isValidSlug } from "@moto-trails/domain";
import { clubAdminIds, createClub, decideJoinRequest, hidePost, leaveClub, listFeed, listJoinRequests, postToClub, removeMember, requestJoin, respondToRide, setMemberRole, withdrawJoinRequest } from "../community/clubs";
import { deleteComment, editComment, listComments, postComment, reportContent } from "../community/comments";
import { joinDecisionEmail, joinRequestEmail } from "../community/emails";
import { sendToUser } from "../moderation/notify";
import { ApiError, fail, ok, type Ctx, type RouteDef } from "./http";

const asObject = async (c: Ctx): Promise<Record<string, unknown>> => {
  const b = await c.body();
  if (typeof b !== "object" || b === null || Array.isArray(b)) throw new ApiError(400, "invalid_request", "The body must be a JSON object.");
  return b as Record<string, unknown>;
};
const noContent = () => new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
const str = (v: unknown) => (typeof v === "string" ? v : "");
const clubUrl = (c: Ctx, id: string) => `${c.siteUrl}/club/${encodeURIComponent(id)}`;

/** Emails go through the website's sender. A missing or failing provider never breaks the action. */
async function notify(c: Ctx, userId: string, message: Parameters<typeof sendToUser>[3]) {
  try {
    const { getEmailSender } = await import("../auth/session");
    await sendToUser(c.sql, getEmailSender(), userId, message);
  } catch (e) {
    console.error("Notification failed", e instanceof Error ? e.message : "unknown");
  }
}

type Reasons = Record<string, readonly [number, string]>;
/** One error answer per failure reason, so every route reports them the same way. */
const failWith = (map: Reasons, reason: string) => {
  const [status, message] = map[reason] ?? [400, "That can't be done."];
  return fail(status, reason, message);
};

const NOT_MEMBER = [403, "Finish the welcome step on moto-trails.com first."] as const;
const CLUB_GONE = [404, "That club isn't available."] as const;
const ADMIN_ONLY = [403, "Only club admins can do that."] as const;
const LAST_ADMIN = [409, "A club needs at least one admin. Make someone else an admin first."] as const;
const RATE = [429, "Too many attempts. Try again a little later."] as const;
const COMMON: Reasons = { not_member: NOT_MEMBER, not_found: CLUB_GONE, not_admin: ADMIN_ONLY, last_admin: LAST_ADMIN, rate_limited: RATE, invalid: [422, "That can't be done."] };

const CREATE: Reasons = {
  ...COMMON,
  invalid: [422, "Use 3 to 60 characters for the name, 500 or fewer for the description, and leave out web addresses."],
  name_taken: [409, "A club with that name already exists."],
  women_only: [403, "Women-only clubs can be created by riders who have said they ride as women, in Account."],
  rate_limited: [429, "You can create two clubs a day."],
};
const JOIN: Reasons = {
  ...COMMON,
  invalid: [422, "Enter a valid phone number (for India, 10 digits), and leave web addresses out of your message."],
  already_member: [409, "You are already a member."],
  already_pending: [409, "You already have a request waiting."],
  women_only: [403, "This club is for women riders. You can say that you ride as a woman in Account."],
  rate_limited: [429, "Too many requests today. Try again tomorrow."],
};
const DECIDE: Reasons = { ...COMMON, wrong_state: [409, "That request was already decided."], women_only: [409, "This rider no longer qualifies for a women-only club."] };
const POST: Reasons = {
  ...COMMON,
  invalid: [422, "Write 1 to 1000 characters, leave out web addresses, and give a future date and a place for a ride."],
  rate_limited: [429, "You are posting too fast. Try again in a little while."],
};
const HIDE: Reasons = { ...COMMON, not_allowed: [403, "You can't remove that post."] };
const COMMENT: Reasons = {
  not_member: NOT_MEMBER,
  not_found: [404, "That isn't available any more."],
  invalid: [422, "Write 2 to 1500 characters."],
  no_links: [422, "Please leave web addresses out."],
  rate_limited: [429, "You are commenting too fast. Try again in a little while."],
  too_late: [409, "Comments can be edited for 10 minutes after posting."],
  forbidden: [403, "A moderator removed this comment, so it can't be edited."],
};
const REPORT: Reasons = { ...COMMENT, invalid: [422, "Describe the problem in 5 to 500 characters."] };

/** Ride times come in as an ISO 8601 instant, for example 2026-11-01T06:30:00+05:30. */
function rideAt(v: unknown): Date | null {
  if (v === undefined || v === null || v === "") return null;
  const d = new Date(str(v));
  if (typeof v !== "string" || Number.isNaN(d.getTime())) throw new ApiError(422, "invalid", "That date and time isn't valid.");
  return d;
}

const trailSlug = (c: Ctx) => {
  const s = c.params.slug!;
  if (!isValidSlug(s)) throw new ApiError(404, "not_found", "No such trail.");
  return s;
};

export const communityRoutes: RouteDef[] = [
  {
    method: "POST", path: "/clubs", access: "write:submission", summary: "Start a club; you become its admin (body: name, description, womenOnly)",
    async handler(c) {
      const b = await asObject(c);
      const r = await createClub(c.sql, { userId: c.userId, name: str(b.name), description: str(b.description), womenOnly: b.womenOnly === true, now: c.now });
      return r.ok ? ok({ clubId: r.clubId }, 201) : failWith(CREATE, r.reason);
    },
  },
  {
    method: "POST", path: "/clubs/{id}/join", access: "write:submission", summary: "Ask to join a club (body: phone, message). Only the club's admins can see the number",
    async handler(c) {
      const b = await asObject(c);
      const id = c.params.id!;
      const r = await requestJoin(c.sql, { userId: c.userId, clubId: id, phone: str(b.phone), message: str(b.message), now: c.now });
      if (!r.ok) return failWith(JOIN, r.reason);
      const [who] = await c.sql`select display_name from app_user where id = ${c.userId}`;
      const [club] = await c.sql`select name from club where public_id = ${id}`;
      for (const adminId of await clubAdminIds(c.sql, id)) await notify(c, adminId, joinRequestEmail(String(who?.display_name ?? "A rider"), String(club?.name ?? "your club"), clubUrl(c, id)));
      return ok({ requestId: r.requestId }, 201);
    },
  },
  {
    method: "DELETE", path: "/clubs/{id}/join", access: "write:submission", summary: "Withdraw your join request and delete your phone number",
    async handler(c) {
      await withdrawJoinRequest(c.sql, { userId: c.userId, clubId: c.params.id! });
      return noContent();
    },
  },
  {
    method: "GET", path: "/clubs/{id}/requests", access: "token", summary: "Join requests with phone numbers, club admins only",
    async handler(c) {
      const items = await listJoinRequests(c.sql, { userId: c.userId, clubId: c.params.id! }, c.now);
      return items ? ok({ items }) : fail(403, "not_admin", ADMIN_ONLY[1]);
    },
  },
  {
    method: "POST", path: "/clubs/{id}/requests/{requestId}", access: "write:submission", summary: "Accept or decline a join request, club admins only (body: decision accept|decline)",
    async handler(c) {
      const b = await asObject(c);
      if (b.decision !== "accept" && b.decision !== "decline") throw new ApiError(400, "invalid_request", "decision must be accept or decline.");
      const accept = b.decision === "accept";
      const r = await decideJoinRequest(c.sql, { userId: c.userId, requestId: c.params.requestId!, accept, now: c.now });
      if (!r.ok) return failWith(DECIDE, r.reason);
      await notify(c, r.applicantId, joinDecisionEmail(r.clubName, accept, clubUrl(c, c.params.id!)));
      return noContent();
    },
  },
  {
    method: "POST", path: "/clubs/{id}/leave", access: "write:submission", summary: "Leave a club. The last admin cannot leave",
    async handler(c) {
      const r = await leaveClub(c.sql, { userId: c.userId, clubId: c.params.id! });
      return r.ok ? noContent() : failWith(COMMON, r.reason);
    },
  },
  {
    method: "DELETE", path: "/clubs/{id}/members/{memberId}", access: "write:submission", summary: "Remove a member, club admins only (memberId is the member's handle)",
    async handler(c) {
      const r = await removeMember(c.sql, { userId: c.userId, clubId: c.params.id!, memberId: c.params.memberId! });
      return r.ok ? noContent() : failWith(COMMON, r.reason);
    },
  },
  {
    method: "PUT", path: "/clubs/{id}/members/{memberId}/role", access: "write:submission", summary: "Make a member an admin or back to member, club admins only (body: role admin|member)",
    async handler(c) {
      const b = await asObject(c);
      if (b.role !== "admin" && b.role !== "member") throw new ApiError(400, "invalid_request", "role must be admin or member.");
      const r = await setMemberRole(c.sql, { userId: c.userId, clubId: c.params.id!, memberId: c.params.memberId!, role: b.role });
      return r.ok ? noContent() : failWith(COMMON, r.reason);
    },
  },
  {
    method: "GET", path: "/clubs/{id}/posts", access: "token", summary: "The club's posts and ride plans with replies and Going/Maybe counts, newest first (club members only)",
    async handler(c) {
      const feed = await listFeed(c.sql, { userId: c.userId, clubId: c.params.id! });
      return feed ? ok(feed) : fail(403, "not_member", "Posts are only visible to the club's members.");
    },
  },
  {
    method: "POST", path: "/clubs/{id}/posts", access: "write:submission", summary: "Post to a club, reply to a post, or plan a ride (body: body, parentId, rideAt ISO 8601 with place)",
    async handler(c) {
      const b = await asObject(c);
      const at = rideAt(b.rideAt);
      const r = await postToClub(c.sql, {
        userId: c.userId, clubId: c.params.id!, body: str(b.body), parentId: str(b.parentId) || null,
        ridePlan: at ? { at, place: str(b.place) } : null, now: c.now,
      });
      return r.ok ? ok({ postId: r.postId }, 201) : failWith(POST, r.reason);
    },
  },
  {
    method: "PUT", path: "/club-posts/{postId}/response", access: "write:submission", summary: "Say you are going or maybe going to a ride plan (body: response going|maybe|null)",
    async handler(c) {
      const b = await asObject(c);
      const r = await respondToRide(c.sql, { userId: c.userId, postId: c.params.postId!, response: b.response === "going" || b.response === "maybe" ? b.response : null });
      return r.ok ? noContent() : failWith(COMMON, r.reason);
    },
  },
  {
    method: "DELETE", path: "/club-posts/{postId}", access: "write:submission", summary: "Remove a post and its replies: its author or a club admin",
    async handler(c) {
      const r = await hidePost(c.sql, { userId: c.userId, postId: c.params.postId! });
      return r.ok ? noContent() : failWith(HIDE, r.reason);
    },
  },

  {
    method: "GET", path: "/trails/{slug}/comments", access: "public", cache: "none", /* not cached: with a token it includes the caller's own pending comments */ summary: "A trail's comments with replies, newest conversation first. With a token, your own comments waiting for a moderator are included",
    async handler(c) {
      return ok({ items: await listComments(c.sql, trailSlug(c), c.auth?.userId ?? null) });
    },
  },
  {
    method: "POST", path: "/trails/{slug}/comments", access: "write:submission", summary: "Comment on a trail or reply to a comment (body: body, tag gate_closed|water_high|blocked|good_condition|tip, parentId). New riders' first comments wait for a moderator",
    async handler(c) {
      const b = await asObject(c);
      const r = await postComment(c.sql, { userId: c.userId, slug: trailSlug(c), body: str(b.body), tag: str(b.tag) || null, parentId: str(b.parentId) || null });
      return r.ok ? ok({ id: r.id, status: r.status }, 201) : failWith(COMMENT, r.reason);
    },
  },
  {
    method: "PATCH", path: "/comments/{id}", access: "write:submission", summary: "Edit your comment within 10 minutes of posting (body: body)",
    async handler(c) {
      const b = await asObject(c);
      const r = await editComment(c.sql, { userId: c.userId, commentId: c.params.id!, body: str(b.body), now: c.now });
      return r.ok ? noContent() : failWith(COMMENT, r.reason);
    },
  },
  {
    method: "DELETE", path: "/comments/{id}", access: "write:submission", summary: "Delete your comment",
    async handler(c) {
      const r = await deleteComment(c.sql, { userId: c.userId, commentId: c.params.id! });
      return r.ok ? noContent() : failWith(COMMENT, r.reason);
    },
  },
  {
    method: "POST", path: "/comments/{id}/reports", access: "write:submission", summary: "Report someone else's comment to the moderators (body: reason)",
    async handler(c) {
      const b = await asObject(c);
      const r = await reportContent(c.sql, { userId: c.userId, subjectType: "comment", subjectId: c.params.id!, reason: str(b.reason) });
      return r.ok ? noContent() : failWith(REPORT, r.reason);
    },
  },
];
