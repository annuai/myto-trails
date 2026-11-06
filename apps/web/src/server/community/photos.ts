import { randomUUID } from "node:crypto";
import sharp from "sharp";
import type { Sql } from "postgres";
import { DEFAULT_TIME_ZONE } from "@/lib/time-zone";
import type { StorageProvider } from "../storage";
import { cleanBody, LINK } from "./comments";
import { CLUB_POSTS_PER_HOUR, PHOTOS_PER_DAY } from "./constants";
import { findClub, roleIn } from "./clubs";
import { isMember } from "./members";
import { isReaction, PHOTO_SIZES, photoCopyKeys, photoKey, photoStem, photoUrls, REACTIONS, SIZES, type PhotoSize, type PhotoUrls, type Reaction } from "./photo-shared";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export { PHOTO_SIZES, REACTIONS, isReaction, photoCopyKeys, photoKey, photoStem, photoUrls, SIZES };
export type { PhotoSize, Reaction, PhotoUrls };

/** The most bytes a copy may have. A 2048-pixel JPEG at quality 82 is about 0.5 to 1.2 MB. */
export const PHOTO_MAX_BYTES: Record<PhotoSize, number> = { thumb: 250_000, view: 900_000, full: 4_000_000 };
/** How far past its nominal width a copy may run (the phone rounds), and the biggest picture accepted. */
const WIDTH_SLACK = 1.1;
export const PHOTOS_PER_POST = 10;
const UPLOAD_URL_SECONDS = 900;

type Access = { ok: true; clubId: string } | { ok: false; reason: "not_member" | "not_found" };
async function memberOf(sql: Sql, userId: string, clubPublicId: string): Promise<Access> {
  if (!(await isMember(sql, userId))) return { ok: false, reason: "not_member" };
  const club = await findClub(sql, clubPublicId);
  if (!club) return { ok: false, reason: "not_found" };
  return (await roleIn(sql, club.id, userId)) ? { ok: true, clubId: club.id } : { ok: false, reason: "not_member" };
}

export type PhotoIntent = { assetId: string; uploads: Record<PhotoSize, { url: string; method: "PUT"; headers: Record<string, string> }> };

/**
 * Step one of posting photos: the phone has made the three copies of each and says how big they are; it gets an address to send each to.
 * The copies go to the quarantine bucket, and are only made public once step two has checked them.
 */
export async function createPhotoIntents(
  sql: Sql, storage: StorageProvider,
  i: { userId: string; clubId: string; sizes: Record<PhotoSize, number>[] },
): Promise<{ ok: true; photos: PhotoIntent[] } | { ok: false; reason: "not_member" | "not_found" | "invalid" | "rate_limited" }> {
  const access = await memberOf(sql, i.userId, i.clubId);
  if (!access.ok) return access;
  if (i.sizes.length < 1 || i.sizes.length > PHOTOS_PER_POST) return { ok: false, reason: "invalid" };
  for (const s of i.sizes) for (const k of SIZES) if (!Number.isInteger(s[k]) || s[k] < 1 || s[k] > PHOTO_MAX_BYTES[k]) return { ok: false, reason: "invalid" };
  for (let n = 0; n < i.sizes.length; n++) {
    const [hit] = await sql`select rate_limit_hit(${`photo:${i.userId}`}, ${PHOTOS_PER_DAY}, 86400) as ok`;
    if (!hit!.ok) return { ok: false, reason: "rate_limited" };
  }
  const photos = await Promise.all(i.sizes.map(async (s) => {
    const assetId = randomUUID();
    const uploads = {} as PhotoIntent["uploads"];
    for (const k of SIZES) {
      uploads[k] = await storage.createUploadUrl({ bucket: "quarantine", key: photoKey(i.userId, assetId, k), contentType: "image/jpeg", sizeBytes: s[k], expiresInSeconds: UPLOAD_URL_SECONDS });
    }
    return { assetId, uploads };
  }));
  return { ok: true, photos };
}

const isJpeg = (b: Uint8Array) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;

type Checked = { assetId: string; width: number; height: number; colour: string | null; bytes: number; copies: Record<PhotoSize, Uint8Array> };

/** One photo's three copies, read back from quarantine and checked; the biggest has any embedded location and camera details removed. Null when anything is wrong. */
async function check(storage: StorageProvider, ownerId: string, assetId: string): Promise<Checked | null> {
  const copies = {} as Record<PhotoSize, Uint8Array>;
  for (const k of SIZES) {
    const key = photoKey(ownerId, assetId, k);
    const head = await storage.head("quarantine", key);
    if (!head || head.sizeBytes < 1 || head.sizeBytes > PHOTO_MAX_BYTES[k] || head.contentType !== "image/jpeg") return null;
    const bytes = await storage.get("quarantine", key);
    if (!bytes || !isJpeg(bytes)) return null;
    copies[k] = bytes;
  }
  try {
    const meta = await sharp(copies.full, { limitInputPixels: 40_000_000, failOn: "error" }).metadata();
    if (meta.format !== "jpeg" || !meta.width || !meta.height) return null;
    if (Math.max(meta.width, meta.height) > PHOTO_SIZES.full * WIDTH_SLACK) return null;
    let width = meta.width, height = meta.height;
    // The phone's own re-encoding drops the location, but the server does not take that on trust.
    if (meta.exif || meta.icc || meta.xmp || meta.iptc) {
      const out = await sharp(copies.full, { failOn: "error" }).rotate().jpeg({ quality: 85, mozjpeg: true }).toBuffer({ resolveWithObject: true });
      copies.full = new Uint8Array(out.data);
      width = out.info.width; height = out.info.height;
    } else if (meta.orientation && meta.orientation > 4) { [width, height] = [height, width]; }
    const dom = (await sharp(copies.thumb, { failOn: "error" }).stats()).dominant;
    const colour = `#${[dom.r, dom.g, dom.b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
    return { assetId, width, height, colour, bytes: copies.thumb.length + copies.view.length + copies.full.length, copies };
  } catch {
    return null;
  }
}

export type PhotoPostFail = { ok: false; reason: "not_member" | "not_found" | "invalid" | "rate_limited" | "bad_photo" };

/**
 * Step two: the copies have been sent. Each is read back, checked and made public, then the post (text, photos in order, and the
 * ride event's album it belongs to, if any) is written in one go. Photos alone are a post; so is text alone, through `postToClub`.
 */
export async function postPhotosToClub(
  sql: Sql, storage: StorageProvider,
  i: { userId: string; clubId: string; body: string; assetIds: string[]; eventId?: string | null; now: Date },
): Promise<{ ok: true; postId: string } | PhotoPostFail> {
  const access = await memberOf(sql, i.userId, i.clubId);
  if (!access.ok) return access;
  const body = cleanBody(i.body);
  const ids = i.assetIds;
  if (ids.length < 1 || ids.length > PHOTOS_PER_POST || new Set(ids).size !== ids.length || !ids.every((x) => UUID.test(x))) return { ok: false, reason: "invalid" };
  if (body.length > 1000 || (body.length > 0 && LINK.test(body))) return { ok: false, reason: "invalid" };
  let eventRow: string | null = null;
  if (i.eventId) {
    if (!UUID.test(i.eventId)) return { ok: false, reason: "not_found" };
    const [e] = await sql`select id from ride_event where public_id = ${i.eventId} and club_id = ${access.clubId}`;
    if (!e) return { ok: false, reason: "not_found" };
    eventRow = e.id as string;
  }
  const [hit] = await sql`select rate_limit_hit(${`club-post:${i.userId}`}, ${CLUB_POSTS_PER_HOUR}, 3600) as ok`;
  if (!hit!.ok) return { ok: false, reason: "rate_limited" };

  const checked = await Promise.all(ids.map((id) => check(storage, i.userId, id)));
  if (checked.some((c) => c === null)) return { ok: false, reason: "bad_photo" };
  const photos = checked as Checked[];

  const madePublic: string[] = [];
  const undo = () => Promise.allSettled(madePublic.map((k) => storage.remove("public", k)));
  try {
    for (const p of photos) for (const k of SIZES) {
      const key = photoKey(i.userId, p.assetId, k);
      await storage.put("public", key, p.copies[k], "image/jpeg");
      madePublic.push(key);
    }
  } catch {
    await undo();
    return { ok: false, reason: "bad_photo" };
  }

  try {
    const postId = await sql.begin(async (tx) => {
      const [post] = await tx`
        insert into club_post (club_id, author_id, kind, body, photo_count, event_id, time_zone)
        values (${access.clubId}, ${i.userId}, 'post', ${body}, ${photos.length}, ${eventRow}, ${DEFAULT_TIME_ZONE}) returning id`;
      for (const [n, p] of photos.entries()) {
        await tx`insert into asset (id, owner_id, stem, width, height, bytes, colour) values (${p.assetId}, ${i.userId}, ${photoStem(i.userId, p.assetId)}, ${p.width}, ${p.height}, ${p.bytes}, ${p.colour})`;
        await tx`insert into post_media (post_id, asset_id, position) values (${post!.id}, ${p.assetId}, ${n})`;
      }
      return post!.id as string;
    });
    // The checked copies are public now; the unchecked ones in quarantine are no longer needed.
    void Promise.allSettled(photos.flatMap((p) => SIZES.map((k) => storage.remove("quarantine", photoKey(i.userId, p.assetId, k)))));
    return { ok: true, postId };
  } catch (e) {
    await undo();
    throw e;
  }
}

/** Set, change or (with null) take back your reaction to a post you can see. The post's counts are rewritten in the same step. */
export async function reactToPost(
  sql: Sql, i: { userId: string; postId: string; reaction: Reaction | null },
): Promise<{ ok: true; counts: Record<string, number>; mine: Reaction | null } | { ok: false; reason: "not_member" | "not_found" | "invalid" }> {
  if (i.reaction !== null && !isReaction(i.reaction)) return { ok: false, reason: "invalid" };
  if (!UUID.test(i.postId)) return { ok: false, reason: "not_found" };
  if (!(await isMember(sql, i.userId))) return { ok: false, reason: "not_member" };
  return sql.begin(async (tx) => {
    const [post] = await tx`select id, club_id from club_post where id = ${i.postId} and status = 'visible' and parent_id is null for update`;
    if (!post) return { ok: false, reason: "not_found" } as const;
    if (!(await roleIn(tx, post.club_id as string, i.userId))) return { ok: false, reason: "not_member" } as const;
    if (i.reaction === null) await tx`delete from reaction where target_kind = 'post' and target_id = ${i.postId} and user_id = ${i.userId}`;
    else await tx`
      insert into reaction (target_kind, target_id, user_id, emoji) values ('post', ${i.postId}, ${i.userId}, ${i.reaction})
      on conflict (target_kind, target_id, user_id) do update set emoji = excluded.emoji, created_at = now()`;
    const rows = await tx`select emoji, count(*)::int as n from reaction where target_kind = 'post' and target_id = ${i.postId} group by emoji`;
    const counts = Object.fromEntries(rows.map((r) => [r.emoji as string, r.n as number]));
    await tx`update club_post set reaction_counts = ${tx.json(counts)} where id = ${i.postId}`;
    return { ok: true, counts, mine: i.reaction } as const;
  });
}

/** An album: the photos of the posts that belong to a ride event, newest first, for the club's members. */
export async function listEventPhotos(
  sql: Sql, publicUrl: (key: string) => string, i: { userId: string; clubId: string; eventId: string },
): Promise<{ photos: (PhotoUrls & { postId: string; authorName: string })[] } | null> {
  const access = await memberOf(sql, i.userId, i.clubId);
  if (!access.ok || !UUID.test(i.eventId)) return null;
  const rows = await sql`
    select a.id, a.stem, a.width, a.height, a.colour, p.id as post_id, u.display_name
    from club_post p
    join ride_event e on e.id = p.event_id and e.public_id = ${i.eventId} and e.club_id = ${access.clubId}
    join post_media m on m.post_id = p.id join asset a on a.id = m.asset_id join app_user u on u.id = p.author_id
    where p.status = 'visible' order by p.created_at desc, m.position limit 200`;
  return { photos: rows.map((r) => ({ ...photoUrls(publicUrl, { id: r.id, stem: r.stem, width: r.width, height: r.height, colour: r.colour }), postId: r.post_id as string, authorName: r.display_name as string })) };
}

/**
 * Takes a post's photos away for good: the files (all three copies) and then the rows. Called when a post is removed, so a removed
 * photo stops being reachable at once. A file that cannot be removed is logged and left for the nightly clean-up to find, never a reason to keep the row.
 */
export async function removePostFiles(sql: Sql, storage: StorageProvider, postId: string): Promise<number> {
  if (!UUID.test(postId)) return 0;
  const assets = await sql`select a.id, a.stem from post_media m join asset a on a.id = m.asset_id where m.post_id = ${postId}`;
  if (assets.length === 0) return 0;
  const outcomes = await Promise.allSettled(assets.flatMap((a) => photoCopyKeys(a.stem as string).map((k) => storage.remove("public", k))));
  const lost = outcomes.filter((o) => o.status === "rejected").length;
  if (lost > 0) console.error(`Post photos: ${lost} stored files could not be removed`);
  await sql`delete from asset where id in ${sql(assets.map((a) => a.id as string))}`;
  return assets.length;
}
