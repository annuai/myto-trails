// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const clubs = vi.hoisted(() => ({
  clubAdminIds: vi.fn(), createClub: vi.fn(), decideJoinRequest: vi.fn(), hidePost: vi.fn(), leaveClub: vi.fn(), listFeed: vi.fn(), listJoinRequests: vi.fn(),
  postToClub: vi.fn(), removeMember: vi.fn(), requestJoin: vi.fn(), respondToRide: vi.fn(), setMemberRole: vi.fn(), withdrawJoinRequest: vi.fn(),
}));
const photos = vi.hoisted(() => ({ createPhotoIntents: vi.fn(), listEventPhotos: vi.fn(), postPhotosToClub: vi.fn(), reactToPost: vi.fn(), removePostFiles: vi.fn(async () => 0), isReaction: (v: unknown) => ["like", "love", "fire", "laugh", "wow", "thanks"].includes(v as string) }));
vi.mock("../community/clubs", () => clubs);
vi.mock("../community/photos", () => photos);
vi.mock("../community/comments", () => ({ deleteComment: vi.fn(), editComment: vi.fn(), listComments: vi.fn(), postComment: vi.fn(), reportContent: vi.fn() }));
vi.mock("../community/ridden", () => ({ listMyRidden: vi.fn(), markRidden: vi.fn(), unmarkRidden: vi.fn() }));
vi.mock("../moderation/notify", () => ({ sendToUser: vi.fn() }));
vi.mock("../auth/session", () => ({ getEmailSender: () => ({}) }));

import { communityRoutes } from "./community-routes";
import { ApiError, fail, matchRoute, type Ctx } from "./http";

const sql = Object.assign(async () => [], {});
const storage = { publicUrl: (k: string) => `https://cdn.test/${k}` };
async function call(method: string, path: string, body?: unknown, query = "") {
  const m = matchRoute(communityRoutes, method, path);
  if (m === null || m === "method") throw new Error(`no route for ${method} ${path}`);
  const auth = { userId: "u1", tokenId: "t1", scopes: ["write:submission"] } as Ctx["auth"];
  const ctx = { sql, storage, url: new URL(`https://x.test/api/v1${path}${query}`), now: new Date("2026-11-06T00:00:00Z"), siteUrl: "https://x.test", params: m.params, auth, userId: "u1", body: async () => body } as unknown as Ctx;
  const res = await m.route.handler(ctx).catch((e: unknown) => { if (e instanceof ApiError) return fail(e.status, e.code, e.message); throw e; });
  return { status: res.status, body: res.status === 204 ? null : await res.json() };
}
beforeEach(() => { vi.clearAllMocks(); });

describe("photo routes", () => {
  it("asks for the sizes of each copy and hands back the upload addresses", async () => {
    photos.createPhotoIntents.mockResolvedValueOnce({ ok: true, photos: [{ assetId: "a1", uploads: {} }] });
    const r = await call("POST", "/clubs/c1/photo-uploads", { photos: [{ thumb: 1000, view: 2000, full: 3000 }] });
    expect(r).toMatchObject({ status: 201, body: { photos: [{ assetId: "a1" }] } });
    expect(photos.createPhotoIntents).toHaveBeenCalledWith(sql, storage, { userId: "u1", clubId: "c1", sizes: [{ thumb: 1000, view: 2000, full: 3000 }] });
  });

  it("reads a missing or odd photo list as no photos, and maps refusals to the shared error shape", async () => {
    photos.createPhotoIntents.mockResolvedValue({ ok: false, reason: "invalid" });
    expect(await call("POST", "/clubs/c1/photo-uploads", {})).toMatchObject({ status: 422, body: { error: { code: "invalid" } } });
    expect(photos.createPhotoIntents).toHaveBeenCalledWith(sql, storage, expect.objectContaining({ sizes: [] }));
    photos.createPhotoIntents.mockResolvedValueOnce({ ok: false, reason: "rate_limited" });
    expect((await call("POST", "/clubs/c1/photo-uploads", { photos: [{}] })).status).toBe(429);
  });

  it("posts the photos with the text and the event they belong to", async () => {
    photos.postPhotosToClub.mockResolvedValueOnce({ ok: true, postId: "p1" });
    const r = await call("POST", "/clubs/c1/photo-posts", { body: "Sunday", photos: ["a1", "a2"], eventId: "e1" });
    expect(r).toMatchObject({ status: 201, body: { postId: "p1" } });
    expect(photos.postPhotosToClub).toHaveBeenCalledWith(sql, storage, expect.objectContaining({ userId: "u1", clubId: "c1", body: "Sunday", assetIds: ["a1", "a2"], eventId: "e1" }));
    photos.postPhotosToClub.mockResolvedValueOnce({ ok: false, reason: "bad_photo" });
    expect(await call("POST", "/clubs/c1/photo-posts", { photos: ["a1"] })).toMatchObject({ status: 422, body: { error: { code: "bad_photo" } } });
  });

  it("sets and takes back a reaction, and turns away anything but the six", async () => {
    photos.reactToPost.mockResolvedValueOnce({ ok: true, counts: { fire: 2 }, mine: "fire" });
    expect(await call("PUT", "/club-posts/p1/reaction", { reaction: "fire" })).toMatchObject({ status: 200, body: { reactions: { fire: 2 }, myReaction: "fire" } });
    expect(photos.reactToPost).toHaveBeenCalledWith(sql, { userId: "u1", postId: "p1", reaction: "fire" });
    photos.reactToPost.mockResolvedValueOnce({ ok: true, counts: {}, mine: null });
    await call("PUT", "/club-posts/p1/reaction", { reaction: null });
    expect(photos.reactToPost).toHaveBeenLastCalledWith(sql, { userId: "u1", postId: "p1", reaction: null });
    expect(await call("PUT", "/club-posts/p1/reaction", { reaction: "angry" })).toMatchObject({ status: 422 });
    expect(await call("PUT", "/club-posts/p1/reaction", {})).toMatchObject({ status: 422 });
    expect(photos.reactToPost).toHaveBeenCalledTimes(2);
  });

  it("pages the feed with the cursor and limit from the query, and gives the feed the public address maker", async () => {
    clubs.listFeed.mockResolvedValueOnce({ posts: [], nextCursor: null });
    await call("GET", "/clubs/c1/posts", undefined, "?limit=20&before=abc");
    const arg = clubs.listFeed.mock.calls[0]![1] as { before: string; limit: number; publicUrl: (k: string) => string };
    expect(arg).toMatchObject({ userId: "u1", clubId: "c1", before: "abc", limit: 20 });
    expect(arg.publicUrl("post/x.jpg")).toBe("https://cdn.test/post/x.jpg");
    clubs.listFeed.mockResolvedValueOnce(null);
    expect((await call("GET", "/clubs/c1/posts")).status).toBe(403);
  });

  it("removes a post's photo files when the post is removed, and not when the removal is refused", async () => {
    clubs.hidePost.mockResolvedValueOnce({ ok: true });
    expect((await call("DELETE", "/club-posts/p1")).status).toBe(204);
    expect(photos.removePostFiles).toHaveBeenCalledWith(sql, storage, "p1");
    clubs.hidePost.mockResolvedValueOnce({ ok: false, reason: "not_allowed" });
    photos.removePostFiles.mockClear();
    expect((await call("DELETE", "/club-posts/p1")).status).toBe(403);
    expect(photos.removePostFiles).not.toHaveBeenCalled();
  });

  it("lists an event's album for members", async () => {
    photos.listEventPhotos.mockResolvedValueOnce({ photos: [{ id: "a1" }] });
    expect(await call("GET", "/clubs/c1/events/e1/photos")).toMatchObject({ status: 200, body: { photos: [{ id: "a1" }] } });
    photos.listEventPhotos.mockResolvedValueOnce(null);
    expect((await call("GET", "/clubs/c1/events/e1/photos")).status).toBe(403);
  });
});
