// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const clubs = vi.hoisted(() => ({
  clubAdminIds: vi.fn(), createClub: vi.fn(), decideJoinRequest: vi.fn(), hidePost: vi.fn(), leaveClub: vi.fn(), listFeed: vi.fn(), listJoinRequests: vi.fn(),
  postToClub: vi.fn(), removeMember: vi.fn(), requestJoin: vi.fn(), respondToRide: vi.fn(), setMemberRole: vi.fn(), withdrawJoinRequest: vi.fn(),
}));
const comments = vi.hoisted(() => ({ deleteComment: vi.fn(), editComment: vi.fn(), listComments: vi.fn(), postComment: vi.fn(), reportContent: vi.fn() }));
const ridden = vi.hoisted(() => ({ listMyRidden: vi.fn(), markRidden: vi.fn(), unmarkRidden: vi.fn() }));
const notify = vi.hoisted(() => ({ sendToUser: vi.fn() }));
vi.mock("../community/clubs", () => clubs);
vi.mock("../community/comments", () => comments);
vi.mock("../community/ridden", () => ridden);
vi.mock("../moderation/notify", () => notify);
vi.mock("../auth/session", () => ({ getEmailSender: () => ({}) }));

import { communityRoutes } from "./community-routes";
import { ApiError, fail, matchRoute, type Ctx } from "./http";

const sql = Object.assign(async () => [{ display_name: "Asha", name: "Dust Devils" }], {});
async function call(method: string, path: string, body?: unknown, auth: Ctx["auth"] = { userId: "u1", tokenId: "t1", scopes: ["write:submission"] } as Ctx["auth"]) {
  const m = matchRoute(communityRoutes, method, path);
  if (m === null || m === "method") throw new Error(`no route for ${method} ${path}`);
  const ctx = { sql, now: new Date("2026-06-01T00:00:00Z"), siteUrl: "https://x.test", params: m.params, auth, userId: auth?.userId ?? "", body: async () => body } as unknown as Ctx;
  // dispatch() turns an ApiError into a response; do the same here.
  const res = await m.route.handler(ctx).catch((e: unknown) => { if (e instanceof ApiError) return fail(e.status, e.code, e.message); throw e; });
  return { status: res.status, body: res.status === 204 ? null : await res.json() };
}

beforeEach(() => { vi.clearAllMocks(); });

describe("ridden routes", () => {
  it("marks a trail as ridden with the optional details, and maps a refusal to the shared error shape", async () => {
    ridden.markRidden.mockResolvedValueOnce({ ok: true });
    expect((await call("PUT", "/trails/some-trail/ridden", { month: "2026-05", bike: "Himalayan", note: "" })).status).toBe(204);
    expect(ridden.markRidden).toHaveBeenCalledWith(sql, expect.objectContaining({ userId: "u1", slug: "some-trail", month: "2026-05", bike: "Himalayan", note: null }));
    ridden.markRidden.mockResolvedValueOnce({ ok: false, reason: "invalid" });
    expect(await call("PUT", "/trails/some-trail/ridden", { month: "2999-01" })).toMatchObject({ status: 422, body: { error: { code: "invalid" } } });
  });
  it("takes it back and lists the caller's own trails", async () => {
    expect((await call("DELETE", "/trails/some-trail/ridden")).status).toBe(204);
    expect(ridden.unmarkRidden).toHaveBeenCalledWith(sql, { userId: "u1", slug: "some-trail" });
    ridden.listMyRidden.mockResolvedValueOnce([{ slug: "a", name: "A", riddenMonth: null, bike: null, markedAt: "2026-06-01T00:00:00.000Z" }]);
    expect(await call("GET", "/me/ridden")).toMatchObject({ status: 200, body: { items: [{ slug: "a" }] } });
    expect(ridden.listMyRidden).toHaveBeenCalledWith(sql, "u1");
  });
  it("refuses a bad trail address", async () => {
    expect(await call("PUT", "/trails/Not A Slug!/ridden", {})).toMatchObject({ status: 404 });
    expect(ridden.markRidden).not.toHaveBeenCalled();
  });
});

describe("club routes", () => {
  it("creates a club and maps failures to one error shape", async () => {
    clubs.createClub.mockResolvedValueOnce({ ok: true, clubId: "c1" });
    expect(await call("POST", "/clubs", { name: "Dust Devils", description: "", womenOnly: true })).toEqual({ status: 201, body: { clubId: "c1" } });
    expect(clubs.createClub).toHaveBeenCalledWith(sql, expect.objectContaining({ userId: "u1", name: "Dust Devils", womenOnly: true }));
    clubs.createClub.mockResolvedValueOnce({ ok: false, reason: "name_taken" });
    expect(await call("POST", "/clubs", { name: "Dust Devils" })).toMatchObject({ status: 409, body: { error: { code: "name_taken" } } });
  });

  it("emails every admin when a join request is sent, and the applicant when it is decided", async () => {
    clubs.requestJoin.mockResolvedValueOnce({ ok: true, requestId: "r1" });
    clubs.clubAdminIds.mockResolvedValueOnce(["a1", "a2"]);
    expect(await call("POST", "/clubs/c1/join", { phone: "9876543210", message: "hi" })).toEqual({ status: 201, body: { requestId: "r1" } });
    expect(notify.sendToUser.mock.calls.map((x) => x[2])).toEqual(["a1", "a2"]);

    notify.sendToUser.mockClear();
    clubs.decideJoinRequest.mockResolvedValueOnce({ ok: true, applicantId: "u9", clubName: "Dust Devils" });
    expect((await call("POST", "/clubs/c1/requests/r1", { decision: "accept" })).status).toBe(204);
    expect(clubs.decideJoinRequest).toHaveBeenCalledWith(sql, expect.objectContaining({ requestId: "r1", accept: true }));
    expect(notify.sendToUser.mock.calls.map((x) => x[2])).toEqual(["u9"]);
  });

  it("rejects a decision that is not accept or decline, and a bad ride time", async () => {
    expect(await call("POST", "/clubs/c1/requests/r1", { decision: "maybe" })).toMatchObject({ status: 400 });
    expect(await call("POST", "/clubs/c1/posts", { body: "Sunday ride", rideAt: "next sunday", place: "Gate" })).toMatchObject({ status: 422 });
    expect(clubs.postToClub).not.toHaveBeenCalled();
  });

  it("passes a ride plan time through as a date and a plain post as no plan", async () => {
    clubs.postToClub.mockResolvedValue({ ok: true, postId: "p1" });
    await call("POST", "/clubs/c1/posts", { body: "Sunday ride", rideAt: "2026-06-07T06:30:00+05:30", place: "Gate" });
    expect(clubs.postToClub.mock.calls[0]![1].ridePlan).toEqual({ at: new Date("2026-06-07T01:00:00Z"), place: "Gate" });
    await call("POST", "/clubs/c1/posts", { body: "Hello" });
    expect(clubs.postToClub.mock.calls[1]![1].ridePlan).toBeNull();
  });

  it("keeps the last-admin and admin-only rules visible to the app", async () => {
    clubs.leaveClub.mockResolvedValueOnce({ ok: false, reason: "last_admin" });
    expect(await call("POST", "/clubs/c1/leave")).toMatchObject({ status: 409, body: { error: { code: "last_admin" } } });
    clubs.setMemberRole.mockResolvedValueOnce({ ok: false, reason: "not_admin" });
    expect(await call("PUT", "/clubs/c1/members/m1/role", { role: "admin" })).toMatchObject({ status: 403 });
    expect(await call("PUT", "/clubs/c1/members/m1/role", { role: "owner" })).toMatchObject({ status: 400 });
    clubs.listJoinRequests.mockResolvedValueOnce(null);
    expect(await call("GET", "/clubs/c1/requests")).toMatchObject({ status: 403, body: { error: { code: "not_admin" } } });
  });

  it("clears a ride response with null and treats anything else as clear", async () => {
    clubs.respondToRide.mockResolvedValue({ ok: true });
    await call("PUT", "/club-posts/p1/response", { response: "going" });
    await call("PUT", "/club-posts/p1/response", { response: null });
    expect(clubs.respondToRide.mock.calls.map((x) => x[1].response)).toEqual(["going", null]);
  });
});

describe("comment routes", () => {
  it("lists comments without a token and with the viewer's own when signed in", async () => {
    comments.listComments.mockResolvedValue([]);
    await call("GET", "/trails/some-trail/comments", undefined, null);
    await call("GET", "/trails/some-trail/comments");
    expect(comments.listComments.mock.calls.map((x) => x[2])).toEqual([null, "u1"]);
    expect(await call("GET", "/trails/Not A Slug!/comments", undefined, null)).toMatchObject({ status: 404 });
  });

  it("passes the comment status through to the app", async () => {
    comments.postComment.mockResolvedValueOnce({ ok: true, id: "k1", status: "pending" });
    expect(await call("POST", "/trails/some-trail/comments", { body: "Gate is shut", tag: "gate_closed" })).toEqual({ status: 201, body: { id: "k1", status: "pending" } });
    comments.postComment.mockResolvedValueOnce({ ok: false, reason: "no_links" });
    expect(await call("POST", "/trails/some-trail/comments", { body: "see x.com" })).toMatchObject({ status: 422, body: { error: { code: "no_links" } } });
  });

  it("edits, deletes and reports", async () => {
    comments.editComment.mockResolvedValueOnce({ ok: false, reason: "too_late" });
    expect(await call("PATCH", "/comments/k1", { body: "x" })).toMatchObject({ status: 409, body: { error: { code: "too_late" } } });
    comments.deleteComment.mockResolvedValueOnce({ ok: true });
    expect((await call("DELETE", "/comments/k1")).status).toBe(204);
    comments.reportContent.mockResolvedValueOnce({ ok: true });
    expect((await call("POST", "/comments/k1/reports", { reason: "Abusive" })).status).toBe(204);
  });
});
