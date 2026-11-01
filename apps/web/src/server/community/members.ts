import type { Sql, TransactionSql } from "postgres";
import { LINK } from "./comments";
import { decryptSecret, encryptSecret } from "./crypto-box";
import { isWomanOf, type Gender } from "./gender";
import { parsePhoneInput } from "./phone";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type MemberState = { confirmed: boolean; displayName: string; profilePublic: boolean; isWoman: boolean; gender: Gender | null; bio: string | null; publicId: string };

/** An active account that has made the 18+ and driving-licence declaration. Every community action checks this. */
export async function isMember(sql: Sql | TransactionSql, userId: string): Promise<boolean> {
  if (!UUID.test(userId)) return false;
  const [row] = await sql`select 1 as ok from app_user where id = ${userId} and status = 'active' and adult_confirmed_at is not null`;
  return Boolean(row);
}

export async function getMemberState(sql: Sql, userId: string): Promise<MemberState | null> {
  if (!UUID.test(userId)) return null;
  const [u] = await sql`select adult_confirmed_at, display_name, profile_public, is_woman, gender, bio, public_id from app_user where id = ${userId} and status = 'active'`;
  return u ? { confirmed: u.adult_confirmed_at !== null, displayName: u.display_name, profilePublic: u.profile_public, isWoman: u.is_woman, gender: u.gender, bio: u.bio, publicId: u.public_id } : null;
}

/**
 * The rider's own phone number, normalized, or null. Only ever returned to its owner (GET /me, the account page); it is
 * deliberately not part of MemberState, which other code reads for club and rider responses.
 */
export async function getMyPhone(sql: Sql, userId: string): Promise<string | null> {
  if (!UUID.test(userId)) return null;
  const [u] = await sql`select phone_ciphertext from app_user where id = ${userId} and status = 'active'`;
  return u?.phone_ciphertext ? decryptSecret(u.phone_ciphertext as string) : null;
}

/**
 * First sign-in step: the rider declares they are 18 or older and hold a valid driving licence (only the time is
 * stored), picks a display name, and chooses whether to be listed publicly. Gender is optional and private (null is prefer not to say).
 */
export async function completeWelcome(
  sql: Sql,
  i: { userId: string; confirmed: boolean; displayName: string; profilePublic: boolean; gender: Gender | null; phone?: string | null },
): Promise<{ ok: true } | { ok: false; reason: "declaration_required" | "invalid" | "invalid_phone" | "not_found" }> {
  if (i.confirmed !== true) return { ok: false, reason: "declaration_required" };
  const name = String(i.displayName ?? "").trim();
  if (name.length < 2 || name.length > 40) return { ok: false, reason: "invalid" };
  const phone = i.phone === undefined ? undefined : parsePhoneInput(i.phone);
  if (phone === "invalid") return { ok: false, reason: "invalid_phone" };
  if (!UUID.test(i.userId)) return { ok: false, reason: "not_found" };
  const rows = await sql`
    update app_user set adult_confirmed_at = coalesce(adult_confirmed_at, now()), display_name = ${name},
      profile_public = ${i.profilePublic === true}, gender = ${i.gender}, is_woman = ${isWomanOf(i.gender)},
      phone_ciphertext = case when ${phone !== undefined}::boolean then ${phone ? encryptSecret(phone) : null}::text else phone_ciphertext end
    where id = ${i.userId} and status = 'active' returning id`;
  return rows.length ? { ok: true } : { ok: false, reason: "not_found" };
}

export async function updateMemberPrivacy(
  sql: Sql,
  i: { userId: string; profilePublic: boolean; gender: Gender | null; bio: string | null; phone?: string | null },
): Promise<{ ok: true } | { ok: false; reason: "not_member" | "invalid" | "invalid_phone" }> {
  const bio = i.bio === null ? null : String(i.bio).trim() || null;
  if (bio !== null && (bio.length > 300 || LINK.test(bio))) return { ok: false, reason: "invalid" };
  const phone = i.phone === undefined ? undefined : parsePhoneInput(i.phone);
  if (phone === "invalid") return { ok: false, reason: "invalid_phone" };
  if (!(await isMember(sql, i.userId))) return { ok: false, reason: "not_member" };
  await sql`
    update app_user set profile_public = ${i.profilePublic === true}, gender = ${i.gender}, is_woman = ${isWomanOf(i.gender)}, bio = ${bio},
      phone_ciphertext = case when ${phone !== undefined}::boolean then ${phone ? encryptSecret(phone) : null}::text else phone_ciphertext end
    where id = ${i.userId}`;
  return { ok: true };
}

export type RiderProfile = { name: string; bio: string | null; trails: { slug: string; name: string; month: string | null }[] };

/** A public rider's page, for declared members. Private riders and unknown handles look identical (null). */
export async function getRiderProfile(sql: Sql, i: { viewerId: string; handle: string }): Promise<RiderProfile | null> {
  if (!UUID.test(i.handle) || !(await isMember(sql, i.viewerId))) return null;
  const [u] = await sql`select id, display_name, bio from app_user where public_id = ${i.handle} and status = 'active' and profile_public and adult_confirmed_at is not null`;
  if (!u) return null;
  const trails = await sql`
    select t.slug, rev.name, r.ridden_month::text as month from trail_ridden r join trail t on t.id = r.trail_id
    join trail_revision rev on rev.id = t.published_revision_id
    where r.user_id = ${u.id} and t.lifecycle = 'published' order by r.created_at desc limit 50`;
  return { name: u.display_name, bio: u.bio, trails: trails.map((t) => ({ slug: t.slug, name: t.name, month: t.month })) };
}
