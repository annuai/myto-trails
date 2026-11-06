// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import sharp from "sharp";
import { MemoryStorageProvider } from "../storage/memory-provider";
import { createTestDatabase } from "../testing/db";
import { makeUser } from "../testing/submission-fixture";
import { createClub, hidePost, listFeed, postToClub, requestJoin, decideJoinRequest } from "./clubs";
import { completeWelcome } from "./members";
import { deleteAccount } from "../account/delete";
import { createPhotoIntents, listEventPhotos, PHOTO_SIZES, photoKey, postPhotosToClub, reactToPost, removePostFiles, type PhotoSize } from "./photos";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
const now = new Date("2026-11-06T12:00:00Z");
beforeAll(async () => { db = await createTestDatabase(); });
afterAll(async () => { await db.drop(); });

const rider = async (name: string) => {
  const id = await makeUser(db.sql, { name });
  await completeWelcome(db.sql, { userId: id, confirmed: true, displayName: name, profilePublic: false, gender: null });
  return id;
};
let n = 0;
const club = async (owner: string) => {
  const r = await createClub(db.sql, { userId: owner, name: `Photo Club ${++n}`, description: "Weekend riders", womenOnly: false, now });
  if (!r.ok) throw new Error(r.reason);
  return r.clubId;
};
const join = async (clubId: string, owner: string, member: string) => {
  const r = await requestJoin(db.sql, { userId: member, clubId, phone: "+919876543210", now });
  if (!r.ok) throw new Error(r.reason);
  const d = await decideJoinRequest(db.sql, { userId: owner, requestId: r.requestId, accept: true, now });
  if (!d.ok) throw new Error(String(d.reason));
};
const jpeg = (w: number, h: number, exif = false) => {
  const img = sharp({ create: { width: w, height: h, channels: 3, background: { r: 200, g: 80, b: 40 } } }).jpeg({ quality: 80 });
  return (exif ? img.withMetadata({ exif: { IFD0: { ImageDescription: "taken at home 12.9,77.6" } } }) : img).toBuffer();
};

/** What the phone does: three copies in quarantine under the rider's own prefix. */
async function sendPhoto(storage: MemoryStorageProvider, owner: string, assetId: string, o: { exif?: boolean; skip?: PhotoSize; contentType?: string; junk?: PhotoSize } = {}) {
  for (const k of ["thumb", "view", "full"] as const) {
    if (o.skip === k) continue;
    const bytes = o.junk === k ? new Uint8Array([1, 2, 3, 4, 5, 6]) : new Uint8Array(await jpeg(PHOTO_SIZES[k], Math.round(PHOTO_SIZES[k] * 0.75), k === "full" && o.exif));
    storage.put_("quarantine", photoKey(owner, assetId, k), bytes, o.contentType ?? "image/jpeg");
  }
}
const newId = () => crypto.randomUUID();
const sizes = (k = 1) => Array.from({ length: k }, () => ({ thumb: 20_000, view: 100_000, full: 500_000 }));

describe("photo upload addresses", () => {
  it("gives a club member an address for each of the three copies of each photo, under their own name", async () => {
    const owner = await rider("Asha"), storage = new MemoryStorageProvider();
    const id = await club(owner);
    const r = await createPhotoIntents(db.sql, storage, { userId: owner, clubId: id, sizes: sizes(2) });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.photos).toHaveLength(2);
    expect(Object.keys(r.photos[0]!.uploads)).toEqual(["thumb", "view", "full"]);
    expect(r.photos[0]!.uploads.full.url).toContain(`post/${owner}/${r.photos[0]!.assetId}-2048.jpg`);
  });

  it("refuses non-members, empty and oversized requests, and more than ten photos", async () => {
    const owner = await rider("Ben"), outsider = await rider("Out"), storage = new MemoryStorageProvider();
    const id = await club(owner);
    expect(await createPhotoIntents(db.sql, storage, { userId: outsider, clubId: id, sizes: sizes() })).toEqual({ ok: false, reason: "not_member" });
    expect(await createPhotoIntents(db.sql, storage, { userId: owner, clubId: id, sizes: [] })).toEqual({ ok: false, reason: "invalid" });
    expect(await createPhotoIntents(db.sql, storage, { userId: owner, clubId: id, sizes: sizes(11) })).toEqual({ ok: false, reason: "invalid" });
    expect(await createPhotoIntents(db.sql, storage, { userId: owner, clubId: id, sizes: [{ thumb: 1, view: 1, full: 9_000_000 }] })).toEqual({ ok: false, reason: "invalid" });
  });
});

describe("posting photos", () => {
  it("checks the copies, makes them public, and shows the photos in the feed in the order sent, with or without text", async () => {
    const owner = await rider("Chitra"), storage = new MemoryStorageProvider();
    const id = await club(owner);
    const a = newId(), b = newId();
    await sendPhoto(storage, owner, a); await sendPhoto(storage, owner, b);
    const r = await postPhotosToClub(db.sql, storage, { userId: owner, clubId: id, body: "Sunday at the ghat", assetIds: [b, a], now });
    expect(r.ok).toBe(true);
    for (const k of ["thumb", "view", "full"] as const) expect(await storage.head("public", photoKey(owner, a, k))).not.toBeNull();
    const feed = await listFeed(db.sql, { userId: owner, clubId: id, publicUrl: storage.publicUrl.bind(storage) });
    const post = feed!.posts[0]!;
    expect(post.body).toBe("Sunday at the ghat");
    expect(post.photos.map((p) => p.id)).toEqual([b, a]);
    expect(post.photos[0]).toMatchObject({ width: 2048, height: 1536 });
    expect(post.photos[0]!.thumbUrl).toContain("-400.jpg");
    expect(post.photos[0]!.colour).toMatch(/^#[0-9a-f]{6}$/);
    const c = newId();
    await sendPhoto(storage, owner, c);
    expect((await postPhotosToClub(db.sql, storage, { userId: owner, clubId: id, body: "", assetIds: [c], now })).ok).toBe(true);
  });

  it("removes any location or camera details from the full copy", async () => {
    const owner = await rider("Dev"), storage = new MemoryStorageProvider();
    const id = await club(owner), a = newId();
    await sendPhoto(storage, owner, a, { exif: true });
    expect((await sharp((await storage.get("quarantine", photoKey(owner, a, "full")))!).metadata()).exif).toBeTruthy();
    expect((await postPhotosToClub(db.sql, storage, { userId: owner, clubId: id, body: "", assetIds: [a], now })).ok).toBe(true);
    const meta = await sharp((await storage.get("public", photoKey(owner, a, "full")))!).metadata();
    expect(meta.exif).toBeUndefined();
    expect(meta.format).toBe("jpeg");
  });

  it("refuses a missing copy, a wrong type, bytes that are not a picture, someone else's photo, and web addresses in the text", async () => {
    const owner = await rider("Esha"), other = await rider("Fay"), storage = new MemoryStorageProvider();
    const id = await club(owner);
    const miss = newId(), wrong = newId(), junk = newId(), theirs = newId(), ok = newId();
    await sendPhoto(storage, owner, miss, { skip: "view" });
    await sendPhoto(storage, owner, wrong, { contentType: "image/png" });
    await sendPhoto(storage, owner, junk, { junk: "thumb" });
    await sendPhoto(storage, other, theirs);
    await sendPhoto(storage, owner, ok);
    for (const bad of [miss, wrong, junk, theirs]) expect(await postPhotosToClub(db.sql, storage, { userId: owner, clubId: id, body: "x", assetIds: [bad], now })).toEqual({ ok: false, reason: "bad_photo" });
    expect(await postPhotosToClub(db.sql, storage, { userId: owner, clubId: id, body: "see www.spam.com", assetIds: [ok], now })).toEqual({ ok: false, reason: "invalid" });
    expect(await postPhotosToClub(db.sql, storage, { userId: owner, clubId: id, body: "", assetIds: [], now })).toEqual({ ok: false, reason: "invalid" });
    expect(await postPhotosToClub(db.sql, storage, { userId: owner, clubId: id, body: "", assetIds: [ok, ok], now })).toEqual({ ok: false, reason: "invalid" });
    expect(await storage.head("public", photoKey(owner, miss, "thumb"))).toBeNull(); // nothing from a refused post is left public
  });

  it("is for the club's members only", async () => {
    const owner = await rider("Gita"), outsider = await rider("Hari"), storage = new MemoryStorageProvider();
    const id = await club(owner), a = newId();
    await sendPhoto(storage, outsider, a);
    expect(await postPhotosToClub(db.sql, storage, { userId: outsider, clubId: id, body: "", assetIds: [a], now })).toEqual({ ok: false, reason: "not_member" });
    expect(await listFeed(db.sql, { userId: outsider, clubId: id })).toBeNull();
  });
});

describe("reactions", () => {
  async function setup() {
    const owner = await rider("Ira"), member = await rider("Jay"), storage = new MemoryStorageProvider();
    const id = await club(owner); await join(id, owner, member);
    const a = newId(); await sendPhoto(storage, owner, a);
    const r = await postPhotosToClub(db.sql, storage, { userId: owner, clubId: id, body: "Ride done", assetIds: [a], now });
    if (!r.ok) throw new Error(r.reason);
    return { owner, member, id, postId: r.postId, storage };
  }

  it("counts one reaction per person, lets it be changed or taken back, and shows each rider their own", async () => {
    const { owner, member, id, postId } = await setup();
    expect(await reactToPost(db.sql, { userId: owner, postId, reaction: "like" })).toEqual({ ok: true, counts: { like: 1 }, mine: "like" });
    expect(await reactToPost(db.sql, { userId: member, postId, reaction: "fire" })).toMatchObject({ ok: true, counts: { like: 1, fire: 1 } });
    expect(await reactToPost(db.sql, { userId: member, postId, reaction: "love" })).toMatchObject({ counts: { like: 1, love: 1 } });
    const feed = await listFeed(db.sql, { userId: member, clubId: id });
    expect(feed!.posts[0]).toMatchObject({ reactions: { like: 1, love: 1 }, myReaction: "love" });
    expect(await reactToPost(db.sql, { userId: member, postId, reaction: null })).toMatchObject({ counts: { like: 1 }, mine: null });
    expect((await listFeed(db.sql, { userId: member, clubId: id }))!.posts[0]!.myReaction).toBeNull();
  });

  it("is for club members, on visible posts, with the six reactions only", async () => {
    const { owner, postId } = await setup();
    const outsider = await rider("Kim");
    expect(await reactToPost(db.sql, { userId: outsider, postId, reaction: "like" })).toEqual({ ok: false, reason: "not_member" });
    expect(await reactToPost(db.sql, { userId: owner, postId, reaction: "angry" as never })).toEqual({ ok: false, reason: "invalid" });
    expect(await reactToPost(db.sql, { userId: owner, postId: newId(), reaction: "like" })).toEqual({ ok: false, reason: "not_found" });
    await hidePost(db.sql, { userId: owner, postId });
    expect(await reactToPost(db.sql, { userId: owner, postId, reaction: "like" })).toEqual({ ok: false, reason: "not_found" });
  });
});

describe("event albums and paging", () => {
  it("adds a photo post to an event's album, only for that club's events, and lists the album for members", async () => {
    const owner = await rider("Lal"), storage = new MemoryStorageProvider();
    const id = await club(owner), other = await club(owner);
    const [clubRow] = await db.sql`select id from club where public_id = ${id}`;
    const [ev] = await db.sql`
      insert into ride_event (host_id, club_id, title, starts_at, place_name, lat, lng) values (${owner}, ${clubRow!.id}, 'Nandi sunrise', ${now}, 'Nandi Hills', 13.37, 77.68) returning public_id`;
    const a = newId(), b = newId();
    await sendPhoto(storage, owner, a); await sendPhoto(storage, owner, b);
    expect(await postPhotosToClub(db.sql, storage, { userId: owner, clubId: other, body: "", assetIds: [a], eventId: ev!.public_id as string, now })).toEqual({ ok: false, reason: "not_found" });
    expect((await postPhotosToClub(db.sql, storage, { userId: owner, clubId: id, body: "", assetIds: [a, b], eventId: ev!.public_id as string, now })).ok).toBe(true);
    const album = await listEventPhotos(db.sql, storage.publicUrl.bind(storage), { userId: owner, clubId: id, eventId: ev!.public_id as string });
    expect(album!.photos.map((p) => p.id)).toEqual([a, b]);
    expect((await listFeed(db.sql, { userId: owner, clubId: id }))!.posts[0]!.eventId).toBe(ev!.public_id);
    expect(await listEventPhotos(db.sql, storage.publicUrl.bind(storage), { userId: await rider("Mia"), clubId: id, eventId: ev!.public_id as string })).toBeNull();
  });

  it("pages the feed newest first with a cursor", async () => {
    const owner = await rider("Noor"), id = await club(owner);
    for (let i = 1; i <= 5; i++) await postToClub(db.sql, { userId: owner, clubId: id, body: `post ${i}`, now: new Date(now.getTime() + i * 1000) });
    const first = await listFeed(db.sql, { userId: owner, clubId: id, limit: 2 });
    expect(first!.posts.map((p) => p.body)).toEqual(["post 5", "post 4"]);
    expect(first!.nextCursor).toBeTruthy();
    const second = await listFeed(db.sql, { userId: owner, clubId: id, limit: 2, before: first!.nextCursor });
    expect(second!.posts.map((p) => p.body)).toEqual(["post 3", "post 2"]);
    const third = await listFeed(db.sql, { userId: owner, clubId: id, limit: 2, before: second!.nextCursor });
    expect(third!.posts.map((p) => p.body)).toEqual(["post 1"]);
    expect(third!.nextCursor).toBeNull();
    expect(await listFeed(db.sql, { userId: owner, clubId: id, before: "garbage" })).toBeNull();
  });
});

describe("taking photos away", () => {
  const exists = async (storage: MemoryStorageProvider, owner: string, id: string) => (await storage.head("public", photoKey(owner, id, "full"))) !== null;

  it("removes a post's files and rows at once when the post is removed", async () => {
    const owner = await rider("Omar"), storage = new MemoryStorageProvider(), id = await club(owner), a = newId();
    await sendPhoto(storage, owner, a);
    const r = await postPhotosToClub(db.sql, storage, { userId: owner, clubId: id, body: "x", assetIds: [a], now });
    if (!r.ok) throw new Error(r.reason);
    expect(await exists(storage, owner, a)).toBe(true);
    expect(await removePostFiles(db.sql, storage, r.postId)).toBe(1);
    expect(await exists(storage, owner, a)).toBe(false);
    expect(await db.sql`select 1 from asset where id = ${a}`).toHaveLength(0);
    expect(await removePostFiles(db.sql, storage, r.postId)).toBe(0);
  });

  it("removes a rider's photos from storage when their account is deleted", async () => {
    const owner = await rider("Pia"), storage = new MemoryStorageProvider(), id = await club(owner), a = newId();
    await sendPhoto(storage, owner, a);
    expect((await postPhotosToClub(db.sql, storage, { userId: owner, clubId: id, body: "", assetIds: [a], now })).ok).toBe(true);
    expect(await deleteAccount(db.sql, storage, owner)).toEqual({ ok: true });
    expect(await exists(storage, owner, a)).toBe(false);
    expect(await db.sql`select 1 from asset where id = ${a}`).toHaveLength(0);
  });
});
