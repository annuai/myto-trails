import type { Sql, TransactionSql } from "postgres";
import { cleanBody } from "./comments";

type Db = Sql | TransactionSql;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Bike = { name: string; modelYear: number | null; photoUrl: string | null };

/** Smallest WebP variant at least `width` wide, else the largest one. Variants are { "400": url, ... }. */
export function pickVariant(variants: unknown, width: number): string | null {
  if (typeof variants !== "object" || variants === null) return null;
  const sizes = Object.entries(variants as Record<string, string>).map(([w, url]) => [Number(w), url] as const).filter(([w]) => Number.isFinite(w)).sort((a, b) => a[0] - b[0]);
  if (!sizes.length) return null;
  return (sizes.find(([w]) => w >= width) ?? sizes[sizes.length - 1]!)[1];
}

/** A media row the user uploaded themselves and that no trail uses. Anyone else's photo is refused. */
export async function ownsMedia(sql: Db, userId: string, mediaId: string): Promise<boolean> {
  if (!UUID.test(userId) || !UUID.test(mediaId)) return false;
  const [m] = await sql`select 1 as ok from media where id = ${mediaId} and uploaded_by = ${userId} and revision_id is null`;
  return Boolean(m);
}

export async function setAvatar(sql: Sql, i: { userId: string; mediaId: string | null }): Promise<{ ok: true } | { ok: false; reason: "invalid" }> {
  if (i.mediaId !== null && !(await ownsMedia(sql, i.userId, i.mediaId))) return { ok: false, reason: "invalid" };
  await sql`update app_user set avatar_media_id = ${i.mediaId} where id = ${i.userId}`;
  return { ok: true };
}

export async function getAvatarUrl(sql: Db, userId: string): Promise<string | null> {
  if (!UUID.test(userId)) return null;
  const [r] = await sql`select m.variants from app_user u join media m on m.id = u.avatar_media_id where u.id = ${userId}`;
  return r ? pickVariant(r.variants, 200) : null;
}

export async function getBike(sql: Db, userId: string): Promise<Bike | null> {
  if (!UUID.test(userId)) return null;
  const [r] = await sql`select b.name, b.model_year, m.variants from rider_bike b left join media m on m.id = b.photo_media_id where b.user_id = ${userId}`;
  return r ? { name: r.name, modelYear: r.model_year, photoUrl: pickVariant(r.variants, 400) } : null;
}

/** `photoMediaId`: undefined keeps the current photo, null removes it, an id replaces it. */
export async function saveBike(
  sql: Sql,
  i: { userId: string; name: unknown; modelYear: unknown; photoMediaId?: string | null },
): Promise<{ ok: true } | { ok: false; reason: "invalid" }> {
  const name = cleanBody(i.name).replace(/\s*\n\s*/g, " ");
  const raw = i.modelYear === "" || i.modelYear === null || i.modelYear === undefined ? null : Number(i.modelYear);
  const year = raw !== null && Number.isInteger(raw) && raw >= 1900 && raw <= 2100 ? raw : null;
  if (name.length < 2 || name.length > 60 || (raw !== null && year === null)) return { ok: false, reason: "invalid" };
  if (i.photoMediaId && !(await ownsMedia(sql, i.userId, i.photoMediaId))) return { ok: false, reason: "invalid" };
  const photo = i.photoMediaId === undefined ? sql`rider_bike.photo_media_id` : sql`${i.photoMediaId}`;
  await sql`
    insert into rider_bike (user_id, name, model_year, photo_media_id) values (${i.userId}, ${name}, ${year}, ${i.photoMediaId ?? null})
    on conflict (user_id) do update set name = excluded.name, model_year = excluded.model_year, photo_media_id = ${photo}, updated_at = now()`;
  return { ok: true };
}

export async function removeBike(sql: Sql, userId: string): Promise<void> {
  if (UUID.test(userId)) await sql`delete from rider_bike where user_id = ${userId}`;
}
