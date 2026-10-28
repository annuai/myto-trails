import type { Sql } from "postgres";
import type { StorageBucket, StorageProvider } from "../storage";

/** The word a person types to confirm, on the website and in the app. */
export const DELETE_CONFIRMATION = "delete";

export function isDeleteConfirmed(value: unknown): boolean {
  return typeof value === "string" && value.trim().toLowerCase() === DELETE_CONFIRMATION;
}

export type DeleteAccountResult = { ok: true } | { ok: false; reason: "club_admin"; clubs: string[] };

/** The public files an uploaded image was converted to (`image/<upload id>-<width>.<format>`), from the widths recorded on its media row. */
export function publicVariantKeys(uploadId: string, webp: Record<string, unknown>, avif: Record<string, unknown>): string[] {
  const keys = (format: "webp" | "avif", widths: Record<string, unknown>) =>
    Object.keys(widths).filter((w) => /^\d{1,5}$/.test(w)).map((w) => `image/${uploadId}-${w}.${format}`);
  return [...keys("webp", webp), ...keys("avif", avif)];
}

/**
 * Deletes a rider's account and the personal data tied to it.
 *
 * Removed: the account, sessions and device tokens, saved trails, comments and club posts (with the replies under them),
 * memberships, join requests and the phone numbers in them, questions, avatar, bike, drafts, and every uploaded file that
 * is not part of a published trail. Clubs the rider is the only member of go with them.
 * Kept: published trails and their photos and route files, with the contributor's name taken off; reports the rider filed
 * (shown as "Former rider"); the append-only moderation and audit records, which hold no personal details.
 * Refused: while the rider is the only admin of a club other people belong to; they hand it over first.
 */
export async function deleteAccount(sql: Sql, storage: StorageProvider, userId: string): Promise<DeleteAccountResult> {
  const doomed: { bucket: StorageBucket; key: string }[] = [];

  const result = await sql.begin(async (tx): Promise<DeleteAccountResult> => {
    const [user] = await tx`select email, display_name from app_user where id = ${userId} for update`;
    if (!user) return { ok: true };

    const blocking = await tx`
      select c.name from club c
      join club_member me on me.club_id = c.id and me.user_id = ${userId} and me.role = 'admin'
      where c.archived_at is null
        and exists (select 1 from club_member o where o.club_id = c.id and o.user_id <> ${userId})
        and not exists (
          select 1 from club_member a join app_user au on au.id = a.user_id
          where a.club_id = c.id and a.user_id <> ${userId} and a.role = 'admin' and au.status = 'active')
      order by c.name`;
    if (blocking.length > 0) return { ok: false, reason: "club_admin", clubs: blocking.map((r) => r.name as string) };

    await tx`
      delete from club where id in (
        select m.club_id from club_member m
        where m.user_id = ${userId} and not exists (select 1 from club_member o where o.club_id = m.club_id and o.user_id <> ${userId}))`;

    // Files that belong only to this person: not attached to a published trail, not a club's cover picture.
    const uploads = await tx`
      select up.id, up.bucket, up.storage_key, m.variants, m.variants_avif
      from upload up
      left join media m on m.id = up.media_id
      left join route r on r.id = up.route_id
      where up.user_id = ${userId}
        and (m.id is null or m.revision_id is null)
        and (r.id is null or r.revision_id is null)
        and (m.id is null or not exists (select 1 from club c where c.cover_media_id = m.id))`;
    for (const up of uploads) {
      doomed.push({ bucket: up.bucket as StorageBucket, key: up.storage_key as string });
      if (up.variants || up.variants_avif) {
        for (const key of publicVariantKeys(up.id as string, (up.variants ?? {}) as Record<string, unknown>, (up.variants_avif ?? {}) as Record<string, unknown>)) {
          doomed.push({ bucket: "public", key });
        }
      }
    }

    // Published trails stay; the contributor's name comes off them.
    await tx`
      update trail_revision set contributor_credit = null
      where id in (select revision_id from submission where user_id = ${userId} and revision_id is not null)`;
    await tx`
      update media set credit = null
      where credit = ${user.display_name as string}
        and (uploaded_by = ${userId} or revision_id in (select revision_id from submission where user_id = ${userId} and revision_id is not null))`;

    await tx`delete from login_token where email = ${user.email as string}`;
    await tx`delete from app_user where id = ${userId}`;
    return { ok: true };
  });

  // The files go after the database commit; a failure here leaves an unreachable file, never a half-deleted account.
  if (result.ok) {
    const outcomes = await Promise.allSettled(doomed.map((d) => storage.remove(d.bucket, d.key)));
    const failed = outcomes.filter((o) => o.status === "rejected").length;
    if (failed > 0) console.error(`Account deletion: ${failed} of ${doomed.length} stored files could not be removed`);
  }
  return result;
}
