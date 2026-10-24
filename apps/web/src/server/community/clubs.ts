import type { Sql, TransactionSql } from "postgres";
import { CLUB_CREATES_PER_DAY, CLUB_POSTS_PER_HOUR, JOIN_PHONE_RETENTION_DAYS, JOIN_REQUESTS_PER_DAY } from "./constants";
import { cleanBody, LINK } from "./comments";
import { decryptSecret, encryptSecret } from "./crypto-box";
import { isMember } from "./members";
import { normalizePhone } from "./questions";

type Db = Sql | TransactionSql;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = 86_400_000;
const line = (s: unknown) => cleanBody(s).replace(/\s*\n\s*/g, " ");
const uniqueViolation = (e: unknown) => typeof e === "object" && e !== null && (e as { code?: string }).code === "23505";

type Club = { id: string; womenOnly: boolean };
async function findClub(sql: Db, publicId: string): Promise<Club | null> {
  if (!UUID.test(publicId)) return null;
  const [c] = await sql`select id, women_only from club where public_id = ${publicId} and archived_at is null`;
  return c ? { id: c.id as string, womenOnly: c.women_only as boolean } : null;
}
async function roleIn(sql: Db, clubId: string, userId: string): Promise<"admin" | "member" | null> {
  if (!UUID.test(userId)) return null;
  const [m] = await sql`select cm.role from club_member cm join app_user u on u.id = cm.user_id where cm.club_id = ${clubId} and cm.user_id = ${userId} and u.status = 'active'`;
  return m ? (m.role as "admin" | "member") : null;
}
async function isWoman(sql: Db, userId: string): Promise<boolean> {
  const [u] = await sql`select is_woman from app_user where id = ${userId}`;
  return u?.is_woman === true;
}

// ---- creating and browsing ---------------------------------------------------------------------------------

export async function createClub(
  sql: Sql,
  i: { userId: string; name: string; description: string; womenOnly: boolean; now: Date },
): Promise<{ ok: true; clubId: string } | { ok: false; reason: "not_member" | "invalid" | "name_taken" | "women_only" | "rate_limited" }> {
  if (!(await isMember(sql, i.userId))) return { ok: false, reason: "not_member" };
  const name = line(i.name);
  const description = cleanBody(i.description);
  if (name.length < 3 || name.length > 60 || description.length > 500 || LINK.test(name) || LINK.test(description)) return { ok: false, reason: "invalid" };
  if (i.womenOnly && !(await isWoman(sql, i.userId))) return { ok: false, reason: "women_only" };
  try {
    return await sql.begin(async (tx) => {
      const [taken] = await tx`select 1 as x from club where lower(name) = lower(${name}) and archived_at is null`;
      if (taken) return { ok: false, reason: "name_taken" } as const;
      const [hit] = await tx`select rate_limit_hit(${`club-create:${i.userId}`}, ${CLUB_CREATES_PER_DAY}, 86400) as ok`;
      if (!hit!.ok) return { ok: false, reason: "rate_limited" } as const;
      const [c] = await tx`insert into club (name, description, women_only, created_by) values (${name}, ${description}, ${i.womenOnly === true}, ${i.userId}) returning id, public_id`;
      await tx`insert into club_member (club_id, user_id, role) values (${c!.id}, ${i.userId}, 'admin')`;
      return { ok: true, clubId: c!.public_id as string } as const;
    });
  } catch (e) {
    if (uniqueViolation(e)) return { ok: false, reason: "name_taken" };
    throw e;
  }
}

export type ClubSummary = { clubId: string; name: string; description: string; womenOnly: boolean; memberCount: number; role: "admin" | "member" | null; requested: boolean };

/** Every club, for declared members only; anyone else gets nothing. */
export async function listClubs(sql: Sql, userId: string): Promise<ClubSummary[]> {
  if (!(await isMember(sql, userId))) return [];
  const rows = await sql`
    select c.public_id, c.name, c.description, c.women_only,
      (select count(*)::int from club_member m where m.club_id = c.id) as members,
      (select m.role from club_member m where m.club_id = c.id and m.user_id = ${userId}) as role,
      exists (select 1 from club_join_request r where r.club_id = c.id and r.user_id = ${userId} and r.status = 'pending') as requested
    from club c where c.archived_at is null order by c.created_at desc limit 100`;
  return rows.map((r) => ({ clubId: r.public_id, name: r.name, description: r.description, womenOnly: r.women_only, memberCount: r.members, role: r.role, requested: r.requested }));
}

export type ClubView = ClubSummary & { myHandle: string };

export async function getClub(sql: Sql, i: { userId: string; clubId: string }): Promise<ClubView | null> {
  if (!(await isMember(sql, i.userId))) return null;
  const all = await listClubs(sql, i.userId);
  const c = all.find((x) => x.clubId === i.clubId);
  if (!c) return null;
  const [u] = await sql`select public_id from app_user where id = ${i.userId}`;
  return { ...c, myHandle: u!.public_id as string };
}

export type ClubMember = { handle: string; name: string; role: "admin" | "member" };
export async function listMembers(sql: Sql, i: { userId: string; clubId: string }): Promise<ClubMember[] | null> {
  const club = await findClub(sql, i.clubId);
  if (!club || !(await roleIn(sql, club.id, i.userId))) return null;
  const rows = await sql`select u.public_id, u.display_name, m.role from club_member m join app_user u on u.id = m.user_id where m.club_id = ${club.id} and u.status = 'active' order by m.role, m.joined_at`;
  return rows.map((r) => ({ handle: r.public_id, name: r.display_name, role: r.role }));
}

// ---- join requests -------------------------------------------------------------------------------------------

type JoinFail = { ok: false; reason: "not_member" | "not_found" | "invalid" | "already_member" | "already_pending" | "women_only" | "rate_limited" };

/** The phone number is encrypted and readable only by the club's admins, until JOIN_PHONE_RETENTION_DAYS after they decide. */
export async function requestJoin(sql: Sql, i: { userId: string; clubId: string; phone: string; message?: string | null; now: Date }): Promise<{ ok: true; requestId: string } | JoinFail> {
  if (!(await isMember(sql, i.userId))) return { ok: false, reason: "not_member" };
  const phone = normalizePhone(i.phone);
  const message = cleanBody(i.message ?? "");
  if (!phone || message.length > 300 || LINK.test(message)) return { ok: false, reason: "invalid" };
  const club = await findClub(sql, i.clubId);
  if (!club) return { ok: false, reason: "not_found" };
  try {
    return await sql.begin(async (tx) => {
      if (club.womenOnly && !(await isWoman(tx, i.userId))) return { ok: false, reason: "women_only" } as const;
      if (await roleIn(tx, club.id, i.userId)) return { ok: false, reason: "already_member" } as const;
      const [open] = await tx`select 1 as x from club_join_request where club_id = ${club.id} and user_id = ${i.userId} and status = 'pending'`;
      if (open) return { ok: false, reason: "already_pending" } as const;
      const [hit] = await tx`select rate_limit_hit(${`club-join:${i.userId}`}, ${JOIN_REQUESTS_PER_DAY}, 86400) as ok`;
      if (!hit!.ok) return { ok: false, reason: "rate_limited" } as const;
      const [r] = await tx`insert into club_join_request (club_id, user_id, message, phone_ciphertext) values (${club.id}, ${i.userId}, ${message || null}, ${encryptSecret(phone)}) returning id`;
      return { ok: true, requestId: r!.id as string } as const;
    });
  } catch (e) {
    if (uniqueViolation(e)) return { ok: false, reason: "already_pending" };
    throw e;
  }
}

export async function withdrawJoinRequest(sql: Sql, i: { userId: string; clubId: string }): Promise<{ ok: true }> {
  const club = await findClub(sql, i.clubId);
  if (club && UUID.test(i.userId)) {
    await sql`update club_join_request set status = 'withdrawn', phone_ciphertext = null where club_id = ${club.id} and user_id = ${i.userId} and status = 'pending'`;
  }
  return { ok: true };
}

export type JoinRequestView = { id: string; name: string; phone: string | null; message: string | null; status: "pending" | "accepted" | "declined" | "withdrawn"; createdAt: Date };

/** Admins only. Pending requests and decisions from the last 30 days; a number past its retention time is never returned. */
export async function listJoinRequests(sql: Sql, i: { userId: string; clubId: string }, now: Date = new Date()): Promise<JoinRequestView[] | null> {
  const club = await findClub(sql, i.clubId);
  if (!club || (await roleIn(sql, club.id, i.userId)) !== "admin") return null;
  const rows = await sql`
    select r.id, u.display_name, r.message, r.status, r.created_at, r.phone_ciphertext, r.phone_delete_at
    from club_join_request r join app_user u on u.id = r.user_id
    where r.club_id = ${club.id} and r.status in ('pending', 'accepted', 'declined') and (r.status = 'pending' or r.decided_at > ${new Date(now.getTime() - 30 * DAY)})
    order by (r.status = 'pending') desc, r.created_at desc limit 100`;
  return rows.map((r) => {
    const live = r.phone_ciphertext && (r.status === "pending" || (r.phone_delete_at && r.phone_delete_at > now));
    return { id: r.id, name: r.display_name, phone: live ? decryptSecret(r.phone_ciphertext) : null, message: r.message, status: r.status, createdAt: r.created_at };
  });
}

export async function decideJoinRequest(sql: Sql, i: { userId: string; requestId: string; accept: boolean; now: Date }): Promise<{ ok: true; applicantId: string; clubName: string } | { ok: false; reason: "not_found" | "not_admin" | "wrong_state" | "women_only" }> {
  if (!UUID.test(i.requestId)) return { ok: false, reason: "not_found" };
  return sql.begin(async (tx) => {
    const [r] = await tx`select r.id, r.club_id, r.user_id, r.status, c.name, c.women_only from club_join_request r join club c on c.id = r.club_id where r.id = ${i.requestId} and c.archived_at is null for update of r`;
    if (!r) return { ok: false, reason: "not_found" } as const;
    if ((await roleIn(tx, r.club_id, i.userId)) !== "admin") return { ok: false, reason: "not_admin" } as const;
    if (r.status !== "pending") return { ok: false, reason: "wrong_state" } as const;
    if (i.accept && r.women_only && !(await isWoman(tx, r.user_id))) return { ok: false, reason: "women_only" } as const;
    await tx`
      update club_join_request set status = ${i.accept ? "accepted" : "declined"}, decided_by = ${i.userId}, decided_at = ${i.now},
        phone_delete_at = ${new Date(i.now.getTime() + JOIN_PHONE_RETENTION_DAYS * DAY)}
      where id = ${r.id}`;
    if (i.accept) await tx`insert into club_member (club_id, user_id) values (${r.club_id}, ${r.user_id}) on conflict do nothing`;
    await tx`insert into audit_log (actor_id, actor_role, action, entity_type, entity_id) values (${i.userId}, 'member', ${i.accept ? "club_join_accept" : "club_join_decline"}, 'club_join_request', ${r.id})`;
    return { ok: true, applicantId: r.user_id as string, clubName: r.name as string } as const;
  });
}

/** Wipes numbers whose retention time has passed. Runs from the scheduled job and whenever requests are listed. */
export async function purgeJoinPhones(sql: Db, now: Date): Promise<number> {
  const rows = await sql`update club_join_request set phone_ciphertext = null where phone_ciphertext is not null and phone_delete_at <= ${now} returning id`;
  return rows.length;
}

/** Ids of a club's admins, for notifications. */
export async function clubAdminIds(sql: Sql, clubId: string): Promise<string[]> {
  const club = await findClub(sql, clubId);
  if (!club) return [];
  return (await sql`select user_id from club_member where club_id = ${club.id} and role = 'admin'`).map((r) => r.user_id as string);
}

// ---- membership ---------------------------------------------------------------------------------------------

type AdminFail = { ok: false; reason: "not_found" | "not_admin" | "last_admin" | "invalid" };

export async function leaveClub(sql: Sql, i: { userId: string; clubId: string }): Promise<{ ok: true } | { ok: false; reason: "not_found" | "last_admin" }> {
  const club = await findClub(sql, i.clubId);
  if (!club) return { ok: false, reason: "not_found" };
  return sql.begin(async (tx) => {
    const admins = await tx`select user_id from club_member where club_id = ${club.id} and role = 'admin' for update`;
    if (admins.length === 1 && admins[0]!.user_id === i.userId) return { ok: false, reason: "last_admin" } as const;
    await tx`delete from club_member where club_id = ${club.id} and user_id = ${i.userId}`;
    return { ok: true } as const;
  });
}

async function adminTarget(tx: Db, i: { userId: string; clubId: string; memberId: string }): Promise<{ fail: AdminFail } | { fail?: undefined; club: Club; target: { id: string; role: string } }> {
  const club = await findClub(tx, i.clubId);
  if (!club || !UUID.test(i.memberId)) return { fail: { ok: false, reason: "not_found" } as const };
  if ((await roleIn(tx, club.id, i.userId)) !== "admin") return { fail: { ok: false, reason: "not_admin" } as const };
  const [t] = await tx`select m.user_id, m.role from club_member m join app_user u on u.id = m.user_id where m.club_id = ${club.id} and u.public_id = ${i.memberId}`;
  if (!t) return { fail: { ok: false, reason: "not_found" } as const };
  return { club, target: { id: t.user_id as string, role: t.role as string } };
}

export async function removeMember(sql: Sql, i: { userId: string; clubId: string; memberId: string }): Promise<{ ok: true } | AdminFail> {
  return sql.begin(async (tx): Promise<{ ok: true } | AdminFail> => {
    const r = await adminTarget(tx, i);
    if (r.fail) return r.fail;
    if (r.target.id === i.userId) return { ok: false, reason: "invalid" } as const;
    await tx`delete from club_member where club_id = ${r.club.id} and user_id = ${r.target.id}`;
    await tx`insert into audit_log (actor_id, actor_role, action, entity_type, entity_id) values (${i.userId}, 'member', 'club_member_remove', 'club', ${r.club.id})`;
    return { ok: true } as const;
  });
}

export async function setMemberRole(sql: Sql, i: { userId: string; clubId: string; memberId: string; role: "admin" | "member" }): Promise<{ ok: true } | AdminFail> {
  if (i.role !== "admin" && i.role !== "member") return { ok: false, reason: "invalid" };
  return sql.begin(async (tx): Promise<{ ok: true } | AdminFail> => {
    const r = await adminTarget(tx, i);
    if (r.fail) return r.fail;
    if (i.role === "member" && r.target.role === "admin") {
      const admins = await tx`select 1 as x from club_member where club_id = ${r.club.id} and role = 'admin' for update`;
      if (admins.length < 2) return { ok: false, reason: "last_admin" } as const;
    }
    await tx`update club_member set role = ${i.role} where club_id = ${r.club.id} and user_id = ${r.target.id}`;
    await tx`insert into audit_log (actor_id, actor_role, action, entity_type, entity_id) values (${i.userId}, 'member', 'club_role_change', 'club', ${r.club.id})`;
    return { ok: true } as const;
  });
}

// ---- posts and ride plans ----------------------------------------------------------------------------------------

type PostFail = { ok: false; reason: "not_member" | "not_found" | "invalid" | "rate_limited" };

export async function postToClub(
  sql: Sql,
  i: { userId: string; clubId: string; body: string; parentId?: string | null; ridePlan?: { at: Date; place: string } | null; now: Date },
): Promise<{ ok: true; postId: string } | PostFail> {
  if (!(await isMember(sql, i.userId))) return { ok: false, reason: "not_member" };
  const club = await findClub(sql, i.clubId);
  if (!club) return { ok: false, reason: "not_found" };
  if (!(await roleIn(sql, club.id, i.userId))) return { ok: false, reason: "not_member" };
  const body = cleanBody(i.body);
  if (body.length < 1 || body.length > 1000 || LINK.test(body)) return { ok: false, reason: "invalid" };
  const plan = i.ridePlan ?? null;
  const place = plan ? line(plan.place) : null;
  if (plan) {
    const ahead = plan.at.getTime() - i.now.getTime();
    if (i.parentId || !(ahead > 0 && ahead < 366 * DAY) || !place || place.length > 120 || LINK.test(place)) return { ok: false, reason: "invalid" };
  }
  if (i.parentId) {
    if (!UUID.test(i.parentId)) return { ok: false, reason: "not_found" };
    const [parent] = await sql`select 1 as x from club_post where id = ${i.parentId} and club_id = ${club.id} and parent_id is null and status = 'visible'`;
    if (!parent) return { ok: false, reason: "not_found" };
  }
  const [hit] = await sql`select rate_limit_hit(${`club-post:${i.userId}`}, ${CLUB_POSTS_PER_HOUR}, 3600) as ok`;
  if (!hit!.ok) return { ok: false, reason: "rate_limited" };
  const [p] = await sql`
    insert into club_post (club_id, author_id, parent_id, kind, body, ride_at, ride_place)
    values (${club.id}, ${i.userId}, ${i.parentId ?? null}, ${plan ? "ride_plan" : "post"}, ${body}, ${plan?.at ?? null}, ${place})
    returning id`;
  return { ok: true, postId: p!.id as string };
}

export type FeedReply = { id: string; authorName: string; body: string; createdAt: Date; mine: boolean };
export type FeedPost = {
  id: string; kind: "post" | "ride_plan"; authorName: string; authorHandle: string; body: string; createdAt: Date; mine: boolean;
  at: Date | null; place: string | null; going: number; maybe: number; myResponse: "going" | "maybe" | null; replies: FeedReply[];
};

/** Members of the club only (null for anyone else). */
export async function listFeed(sql: Sql, i: { userId: string; clubId: string }): Promise<{ posts: FeedPost[] } | null> {
  if (!(await isMember(sql, i.userId))) return null;
  const club = await findClub(sql, i.clubId);
  if (!club || !(await roleIn(sql, club.id, i.userId))) return null;
  const posts = await sql`
    select p.id, p.kind, p.body, p.created_at, p.ride_at, p.ride_place, p.author_id, u.display_name, u.public_id,
      (select count(*)::int from club_ride_response r where r.post_id = p.id and r.response = 'going') as going,
      (select count(*)::int from club_ride_response r where r.post_id = p.id and r.response = 'maybe') as maybe,
      (select r.response from club_ride_response r where r.post_id = p.id and r.user_id = ${i.userId}) as mine_response
    from club_post p join app_user u on u.id = p.author_id
    where p.club_id = ${club.id} and p.parent_id is null and p.status = 'visible' order by p.created_at desc limit 50`;
  const ids = posts.map((p) => p.id as string);
  const replies = ids.length
    ? await sql`select p.id, p.parent_id, p.body, p.created_at, p.author_id, u.display_name from club_post p join app_user u on u.id = p.author_id where p.parent_id in ${sql(ids)} and p.status = 'visible' order by p.created_at`
    : [];
  return {
    posts: posts.map((p) => ({
      id: p.id, kind: p.kind, authorName: p.display_name, authorHandle: p.public_id, body: p.body, createdAt: p.created_at, mine: p.author_id === i.userId,
      at: p.ride_at, place: p.ride_place, going: p.going, maybe: p.maybe, myResponse: p.mine_response,
      replies: replies.filter((r) => r.parent_id === p.id).map((r) => ({ id: r.id, authorName: r.display_name, body: r.body, createdAt: r.created_at, mine: r.author_id === i.userId })),
    })),
  };
}

export async function respondToRide(sql: Sql, i: { userId: string; postId: string; response: "going" | "maybe" | null }): Promise<{ ok: true } | { ok: false; reason: "not_member" | "not_found" | "invalid" }> {
  if (i.response !== null && i.response !== "going" && i.response !== "maybe") return { ok: false, reason: "invalid" };
  if (!UUID.test(i.postId) || !(await isMember(sql, i.userId))) return { ok: false, reason: UUID.test(i.postId) ? "not_member" : "not_found" };
  const [post] = await sql`select club_id from club_post where id = ${i.postId} and kind = 'ride_plan' and status = 'visible'`;
  if (!post) return { ok: false, reason: "not_found" };
  if (!(await roleIn(sql, post.club_id, i.userId))) return { ok: false, reason: "not_member" };
  if (i.response === null) await sql`delete from club_ride_response where post_id = ${i.postId} and user_id = ${i.userId}`;
  else await sql`insert into club_ride_response (post_id, user_id, response) values (${i.postId}, ${i.userId}, ${i.response}) on conflict (post_id, user_id) do update set response = excluded.response`;
  return { ok: true };
}

/** The author or a club admin hides a post (and its replies). */
export async function hidePost(sql: Sql, i: { userId: string; postId: string }): Promise<{ ok: true } | { ok: false; reason: "not_found" | "not_allowed" }> {
  if (!UUID.test(i.postId)) return { ok: false, reason: "not_found" };
  return sql.begin(async (tx) => {
    const [p] = await tx`select club_id, author_id from club_post where id = ${i.postId} and status = 'visible'`;
    if (!p) return { ok: false, reason: "not_found" } as const;
    const role = await roleIn(tx, p.club_id, i.userId);
    if (!role || (role !== "admin" && p.author_id !== i.userId)) return { ok: false, reason: "not_allowed" } as const;
    await tx`update club_post set status = 'hidden' where id = ${i.postId}`;
    await tx`insert into audit_log (actor_id, actor_role, action, entity_type, entity_id) values (${i.userId}, 'member', 'club_post_hide', 'club_post', ${i.postId})`;
    return { ok: true } as const;
  });
}
