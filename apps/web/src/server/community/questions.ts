import type { Sql, TransactionSql } from "postgres";
import { OFFER_TTL_HOURS, PHONE_OFFERS_PER_DAY, QUESTIONS_PER_DAY, QUESTION_TTL_DAYS, REVEAL_WINDOW_SECONDS } from "./constants";
import { decryptSecret, encryptSecret } from "./crypto-box";
import { isMember } from "./members";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Db = Sql | TransactionSql;
const clean = (s: unknown) => String(s ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").replace(/\r\n?/g, "\n").trim();
const LINK = /(https?:\/\/|www\.)/i;

import { normalizePhone } from "./phone";
export { normalizePhone };

async function blockedEitherWay(sql: Db, a: string, b: string): Promise<boolean> {
  const [r] = await sql`select 1 as x from rider_block where (blocker_id = ${a} and blocked_id = ${b}) or (blocker_id = ${b} and blocked_id = ${a})`;
  return Boolean(r);
}

/** Phone numbers whose time has run out are wiped, wherever they are read. Also run it on a schedule. */
export async function purgeExpiredContactShares(sql: Db, now: Date): Promise<number> {
  const rows = await sql`
    update contact_share set phone_ciphertext = null,
      status = case when status = 'offered' and offer_expires_at <= ${now} then 'expired' when status = 'revealed' and reveal_expires_at <= ${now} then 'expired' else status end
    where phone_ciphertext is not null and ((status = 'offered' and offer_expires_at <= ${now}) or (status = 'revealed' and reveal_expires_at <= ${now}))
    returning id`;
  return rows.length;
}

async function audit(sql: Db, userId: string, action: string, entityId: string): Promise<void> {
  await sql`insert into audit_log (actor_id, actor_role, action, entity_type, entity_id) values (${userId}, 'member', ${action}, 'contact_share', ${entityId})`;
}

// ---- asking -------------------------------------------------------------------------------------------------

type AskFail = { ok: false; reason: "not_member" | "not_found" | "invalid" | "blocked" | "already_pending" | "rate_limited" };

export async function askRider(sql: Sql, i: { userId: string; riderId: string; slug?: string | null; question: string; now: Date }): Promise<{ ok: true; id: string; answererId: string } | AskFail> {
  if (!(await isMember(sql, i.userId))) return { ok: false, reason: "not_member" };
  const question = clean(i.question);
  if (question.length < 5 || question.length > 500) return { ok: false, reason: "invalid" };
  if (LINK.test(question)) return { ok: false, reason: "invalid" };
  if (!UUID.test(i.riderId)) return { ok: false, reason: "not_found" };
  return sql.begin(async (tx) => {
    // Only riders who chose to be public can be asked; everyone else looks the same as a rider who does not exist.
    const [rider] = await tx`select id from app_user where public_id = ${i.riderId} and status = 'active' and profile_public and adult_confirmed_at is not null`;
    if (!rider || rider.id === i.userId) return { ok: false, reason: "not_found" } as const;
    if (await blockedEitherWay(tx, i.userId, rider.id)) return { ok: false, reason: "blocked" } as const;
    const [hit] = await tx`select rate_limit_hit(${`ask:${i.userId}`}, ${QUESTIONS_PER_DAY}, 86400) as ok`;
    if (!hit!.ok) return { ok: false, reason: "rate_limited" } as const;
    await tx`update rider_question set status = 'expired' where asker_id = ${i.userId} and answerer_id = ${rider.id} and status = 'pending' and expires_at <= ${i.now}`;
    const [open] = await tx`select 1 as x from rider_question where asker_id = ${i.userId} and answerer_id = ${rider.id} and status = 'pending'`;
    if (open) return { ok: false, reason: "already_pending" } as const;
    const [trail] = i.slug ? await tx`select id from trail where slug = ${i.slug} and lifecycle = 'published'` : [];
    const [q] = await tx`
      insert into rider_question (asker_id, answerer_id, trail_id, question, expires_at)
      values (${i.userId}, ${rider.id}, ${trail?.id ?? null}, ${question}, ${new Date(i.now.getTime() + QUESTION_TTL_DAYS * 86_400_000)}) returning id`;
    return { ok: true, id: q!.id as string, answererId: rider.id as string } as const;
  });
}

// ---- inbox ---------------------------------------------------------------------------------------------------

export type ShareView = {
  state: "none" | "offered" | "revealed" | "expired" | "withdrawn";
  /** Seconds left to reveal (offered) or to save the number (revealed). */
  remainingSeconds: number;
};
export type QuestionView = {
  id: string; otherName: string; trailSlug: string | null; trailName: string | null; question: string; answer: string | null;
  status: "pending" | "answered" | "declined" | "expired"; createdAt: string; share: ShareView;
  /** The viewer is the one who can offer a number (answerer, answered, nothing offered yet). */
  canOffer: boolean;
  /** The viewer is the one who can reveal a number (asker, offer waiting). */
  canReveal: boolean;
};

export async function listQuestions(sql: Sql, userId: string, now: Date): Promise<{ received: QuestionView[]; sent: QuestionView[] }> {
  await purgeExpiredContactShares(sql, now);
  await sql`update rider_question set status = 'expired' where status = 'pending' and expires_at <= ${now} and (asker_id = ${userId} or answerer_id = ${userId})`;
  const rows = await sql`
    select q.id, q.asker_id, q.answerer_id, q.question, q.answer, q.status, q.created_at, t.slug, rev.name as trail_name,
      asker.display_name as asker_name, ans.display_name as answerer_name,
      s.status as share_status, s.offer_expires_at, s.reveal_expires_at
    from rider_question q
    join app_user asker on asker.id = q.asker_id join app_user ans on ans.id = q.answerer_id
    left join trail t on t.id = q.trail_id left join trail_revision rev on rev.id = t.published_revision_id
    left join contact_share s on s.question_id = q.id
    where q.asker_id = ${userId} or q.answerer_id = ${userId}
    order by q.created_at desc limit 100`;
  const view = (r: Record<string, unknown>): QuestionView => {
    const mineAsAnswerer = r.answerer_id === userId;
    const share = (r.share_status as ShareView["state"] | null) ?? "none";
    const end = share === "offered" ? (r.offer_expires_at as Date) : share === "revealed" ? (r.reveal_expires_at as Date) : null;
    return {
      id: r.id as string, otherName: (mineAsAnswerer ? r.asker_name : r.answerer_name) as string,
      trailSlug: (r.slug as string | null) ?? null, trailName: (r.trail_name as string | null) ?? null,
      question: r.question as string, answer: (r.answer as string | null) ?? null, status: r.status as QuestionView["status"],
      createdAt: (r.created_at as Date).toISOString(),
      share: { state: share, remainingSeconds: end ? Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 1000)) : 0 },
      canOffer: mineAsAnswerer && r.status === "answered" && share === "none",
      canReveal: !mineAsAnswerer && (share === "offered" || share === "revealed"),
    };
  };
  return { received: rows.filter((r) => r.answerer_id === userId).map(view), sent: rows.filter((r) => r.asker_id === userId).map(view) };
}

// ---- answering, declining, blocking, reporting ------------------------------------------------------------

type Fail = { ok: false; reason: "not_member" | "not_found" | "invalid" | "wrong_state" | "rate_limited" | "expired" };

export async function answerQuestion(sql: Sql, i: { userId: string; questionId: string; answer: string; now: Date }): Promise<{ ok: true; askerId: string } | Fail> {
  if (!UUID.test(i.questionId)) return { ok: false, reason: "not_found" };
  const answer = clean(i.answer);
  if (answer.length < 1 || answer.length > 1000 || LINK.test(answer)) return { ok: false, reason: "invalid" };
  const rows = await sql`
    update rider_question set status = 'answered', answer = ${answer}, answered_at = ${i.now}
    where id = ${i.questionId} and answerer_id = ${i.userId} and status = 'pending' and expires_at > ${i.now} returning asker_id`;
  if (rows.length) return { ok: true, askerId: rows[0]!.asker_id as string };
  const [q] = await sql`select status from rider_question where id = ${i.questionId} and answerer_id = ${i.userId}`;
  return { ok: false, reason: !q ? "not_found" : q.status === "pending" ? "expired" : "wrong_state" };
}

export async function declineQuestion(sql: Sql, i: { userId: string; questionId: string }): Promise<{ ok: true } | Fail> {
  if (!UUID.test(i.questionId)) return { ok: false, reason: "not_found" };
  const rows = await sql`update rider_question set status = 'declined' where id = ${i.questionId} and answerer_id = ${i.userId} and status = 'pending' returning id`;
  return rows.length ? { ok: true } : { ok: false, reason: "not_found" };
}

/** Stops a rider from asking this one again, and declines anything they have pending. Reversible with unblockRider. */
export async function blockAsker(sql: Sql, i: { userId: string; questionId: string }): Promise<{ ok: true } | Fail> {
  if (!UUID.test(i.questionId)) return { ok: false, reason: "not_found" };
  return sql.begin(async (tx) => {
    const [q] = await tx`select asker_id from rider_question where id = ${i.questionId} and answerer_id = ${i.userId}`;
    if (!q) return { ok: false, reason: "not_found" } as const;
    await tx`insert into rider_block (blocker_id, blocked_id) values (${i.userId}, ${q.asker_id}) on conflict do nothing`;
    await tx`update rider_question set status = 'declined' where asker_id = ${q.asker_id} and answerer_id = ${i.userId} and status = 'pending'`;
    await tx`update contact_share set phone_ciphertext = null, status = 'withdrawn' where sharer_id = ${i.userId} and recipient_id = ${q.asker_id} and status in ('offered', 'revealed')`;
    return { ok: true } as const;
  });
}

export async function unblockRider(sql: Sql, i: { userId: string; blockedId: string }): Promise<{ ok: true }> {
  if (UUID.test(i.blockedId)) await sql`delete from rider_block where blocker_id = ${i.userId} and blocked_id = ${i.blockedId}`;
  return { ok: true };
}

export async function listBlocked(sql: Sql, userId: string): Promise<{ blockedId: string; name: string }[]> {
  const rows = await sql`select b.blocked_id, u.display_name from rider_block b join app_user u on u.id = b.blocked_id where b.blocker_id = ${userId} order by b.created_at desc`;
  return rows.map((r) => ({ blockedId: r.blocked_id, name: r.display_name }));
}

/** The person asked reports an abusive question: it is declined and a moderator sees it. */
export async function reportQuestion(sql: Sql, i: { userId: string; questionId: string; reason: string }): Promise<{ ok: true } | Fail> {
  if (!UUID.test(i.questionId)) return { ok: false, reason: "not_found" };
  const reason = clean(i.reason);
  if (reason.length < 5 || reason.length > 500) return { ok: false, reason: "invalid" };
  return sql.begin(async (tx) => {
    const [q] = await tx`select id from rider_question where id = ${i.questionId} and answerer_id = ${i.userId}`;
    if (!q) return { ok: false, reason: "not_found" } as const;
    await tx`insert into content_report (subject_type, subject_id, reporter_id, reason) values ('question', ${q.id}, ${i.userId}, ${reason}) on conflict do nothing`;
    await tx`update rider_question set status = 'declined' where id = ${q.id} and status = 'pending'`;
    return { ok: true } as const;
  });
}

// ---- phone sharing ---------------------------------------------------------------------------------------------

/** The rider who was asked offers their number to the asker. It waits to be revealed, once, for a few minutes. */
export async function offerPhone(sql: Sql, i: { userId: string; questionId: string; phone: string; now: Date }): Promise<{ ok: true; askerId: string } | Fail> {
  if (!UUID.test(i.questionId)) return { ok: false, reason: "not_found" };
  const phone = normalizePhone(i.phone);
  if (!phone) return { ok: false, reason: "invalid" };
  return sql.begin(async (tx) => {
    const [q] = await tx`select id, asker_id, status from rider_question where id = ${i.questionId} and answerer_id = ${i.userId} for update`;
    if (!q) return { ok: false, reason: "not_found" } as const;
    if (q.status !== "answered") return { ok: false, reason: "wrong_state" } as const;
    if (await blockedEitherWay(tx, i.userId, q.asker_id)) return { ok: false, reason: "wrong_state" } as const;
    const [existing] = await tx`select 1 as x from contact_share where question_id = ${q.id}`;
    if (existing) return { ok: false, reason: "wrong_state" } as const;
    const [hit] = await tx`select rate_limit_hit(${`phone-offer:${i.userId}`}, ${PHONE_OFFERS_PER_DAY}, 86400) as ok`;
    if (!hit!.ok) return { ok: false, reason: "rate_limited" } as const;
    const [share] = await tx`
      insert into contact_share (question_id, sharer_id, recipient_id, phone_ciphertext, offer_expires_at)
      values (${q.id}, ${i.userId}, ${q.asker_id}, ${encryptSecret(phone)}, ${new Date(i.now.getTime() + OFFER_TTL_HOURS * 3_600_000)}) returning id`;
    await audit(tx, i.userId, "contact_offer", share!.id as string);
    return { ok: true, askerId: q.asker_id as string } as const;
  });
}

export async function withdrawPhoneOffer(sql: Sql, i: { userId: string; questionId: string }): Promise<{ ok: true } | Fail> {
  if (!UUID.test(i.questionId)) return { ok: false, reason: "not_found" };
  const rows = await sql`update contact_share set phone_ciphertext = null, status = 'withdrawn' where question_id = ${i.questionId} and sharer_id = ${i.userId} and status in ('offered', 'revealed') returning id`;
  return rows.length ? { ok: true } : { ok: false, reason: "not_found" };
}

/**
 * The asker presses "Reveal". The number is returned for REVEAL_WINDOW_SECONDS from the first reveal (pressing again
 * inside the window shows the same time left); after that it is deleted for good.
 */
export async function revealPhone(sql: Sql, i: { userId: string; questionId: string; now: Date }): Promise<{ ok: true; phone: string; expiresAt: string; remainingSeconds: number } | { ok: false; reason: "not_found" | "expired" }> {
  if (!UUID.test(i.questionId)) return { ok: false, reason: "not_found" };
  return sql.begin(async (tx) => {
    await purgeExpiredContactShares(tx, i.now);
    const [s] = await tx`select id, status, phone_ciphertext, reveal_expires_at from contact_share where question_id = ${i.questionId} and recipient_id = ${i.userId} for update`;
    if (!s) return { ok: false, reason: "not_found" } as const;
    if (!s.phone_ciphertext || (s.status !== "offered" && s.status !== "revealed")) return { ok: false, reason: "expired" } as const;
    let end = s.reveal_expires_at as Date | null;
    if (s.status === "offered") {
      end = new Date(i.now.getTime() + REVEAL_WINDOW_SECONDS * 1000);
      await tx`update contact_share set status = 'revealed', revealed_at = ${i.now}, reveal_expires_at = ${end} where id = ${s.id}`;
      await audit(tx, i.userId, "contact_reveal", s.id as string);
    }
    const phone = decryptSecret(s.phone_ciphertext as string);
    if (!phone || !end) return { ok: false, reason: "expired" } as const;
    return { ok: true, phone, expiresAt: end.toISOString(), remainingSeconds: Math.max(0, Math.ceil((end.getTime() - i.now.getTime()) / 1000)) } as const;
  });
}
