import type { Sql, TransactionSql } from "postgres";
import { pickVariant, resolveBikeImage, type Bike, type BikeImageVariants } from "@moto-trails/domain";
import { cleanBody } from "./comments";

type Db = Sql | TransactionSql;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export { pickVariant };
export type { Bike };

/** The shape every place that shows a bike uses, from a row with name, model_year, bike_model_id, own and catalogue variants. */
export function bikeFromRow(r: { name: string; model_year: number | null; bike_model_id: string | null; own_variants: BikeImageVariants | null; catalogue_variants: BikeImageVariants | null }, width: number): Bike {
  const image = resolveBikeImage(r.own_variants, r.catalogue_variants, width);
  return { name: r.name, modelYear: r.model_year, photoUrl: image.url, ownPhoto: image.own, bikeModelId: r.bike_model_id };
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
  const [r] = await sql`
    select b.name, b.model_year, b.bike_model_id, m.variants as own_variants, bm.image_variants as catalogue_variants
    from rider_bike b left join media m on m.id = b.photo_media_id left join bike_model bm on bm.id = b.bike_model_id
    where b.user_id = ${userId}`;
  return r ? bikeFromRow(r as never, 400) : null;
}

/** `photoMediaId` and `bikeModelId`: undefined keeps the current one, null removes it, an id replaces it (a model must exist and be active). */
export async function saveBike(
  sql: Sql,
  i: { userId: string; name: unknown; modelYear: unknown; photoMediaId?: string | null; bikeModelId?: string | null },
): Promise<{ ok: true } | { ok: false; reason: "invalid" }> {
  const name = cleanBody(i.name).replace(/\s*\n\s*/g, " ");
  const raw = i.modelYear === "" || i.modelYear === null || i.modelYear === undefined ? null : Number(i.modelYear);
  const year = raw !== null && Number.isInteger(raw) && raw >= 1900 && raw <= 2100 ? raw : null;
  if (name.length < 2 || name.length > 60 || (raw !== null && year === null)) return { ok: false, reason: "invalid" };
  if (i.photoMediaId && !(await ownsMedia(sql, i.userId, i.photoMediaId))) return { ok: false, reason: "invalid" };
  if (i.bikeModelId && !UUID.test(i.bikeModelId)) return { ok: false, reason: "invalid" };
  if (i.bikeModelId) {
    const [m] = await sql`select 1 as ok from bike_model where id = ${i.bikeModelId} and active`;
    if (!m) return { ok: false, reason: "invalid" };
  }
  const photo = i.photoMediaId === undefined ? sql`rider_bike.photo_media_id` : sql`${i.photoMediaId}`;
  const model = i.bikeModelId === undefined ? sql`rider_bike.bike_model_id` : sql`${i.bikeModelId}`;
  await sql`
    insert into rider_bike (user_id, name, model_year, photo_media_id, bike_model_id) values (${i.userId}, ${name}, ${year}, ${i.photoMediaId ?? null}, ${i.bikeModelId ?? null})
    on conflict (user_id) do update set name = excluded.name, model_year = excluded.model_year, photo_media_id = ${photo}, bike_model_id = ${model}, updated_at = now()`;
  return { ok: true };
}

export async function removeBike(sql: Sql, userId: string): Promise<void> {
  if (UUID.test(userId)) await sql`delete from rider_bike where user_id = ${userId}`;
}
