// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const members = vi.hoisted(() => ({ getMemberState: vi.fn(), updateMemberPrivacy: vi.fn() }));
const auth = vi.hoisted(() => ({ updateDisplayName: vi.fn() }));
vi.mock("../community/members", async (orig) => ({ ...(await orig<typeof import("../community/members")>()), ...members }));
vi.mock("../auth/auth", async (orig) => ({ ...(await orig<typeof import("../auth/auth")>()), ...auth }));

import { ApiError, fail, matchRoute, type Ctx } from "./http";
import { routes } from "./routes";

async function put(body: unknown) {
  const m = matchRoute(routes, "PUT", "/me/profile");
  if (m === null || m === "method") throw new Error("no route");
  const ctx = { sql: {}, params: m.params, auth: { userId: "u1", scopes: [] }, userId: "u1", body: async () => body } as unknown as Ctx;
  const res = await m.route.handler(ctx).catch((e: unknown) => { if (e instanceof ApiError) return fail(e.status, e.code, e.message); throw e; });
  return { status: res.status, body: await res.json() };
}
const valid = { displayName: " Annuai ", public: true, bio: "Weekend rider", gender: "female" };
beforeEach(() => {
  vi.clearAllMocks();
  members.updateMemberPrivacy.mockResolvedValue({ ok: true });
  members.getMemberState.mockResolvedValue({ displayName: "Annuai", profilePublic: true, bio: "Weekend rider", gender: "female" });
});

describe("PUT /me/profile", () => {
  it("saves the name, visibility, bio and gender, and returns the profile", async () => {
    expect(await put(valid)).toEqual({ status: 200, body: { displayName: "Annuai", public: true, bio: "Weekend rider", gender: "female" } });
    expect(members.updateMemberPrivacy.mock.calls[0]![1]).toEqual({ userId: "u1", profilePublic: true, gender: "female", bio: "Weekend rider" });
    expect(auth.updateDisplayName).toHaveBeenCalledWith({}, "u1", "Annuai");
  });

  it("treats a null gender as prefer not to say", async () => {
    await put({ ...valid, gender: null });
    expect(members.updateMemberPrivacy.mock.calls[0]![1]).toMatchObject({ gender: null });
  });

  it("refuses a bad name or gender, and writes nothing", async () => {
    expect(await put({ ...valid, displayName: "x" })).toMatchObject({ status: 422 });
    expect(await put({ ...valid, gender: "woman" })).toMatchObject({ status: 400 });
    const { gender: _g, ...noGender } = valid;
    expect(await put(noGender)).toMatchObject({ status: 400 });
    expect(await put({ ...valid, public: "yes" })).toMatchObject({ status: 400 });
    expect(members.updateMemberPrivacy).not.toHaveBeenCalled();
    expect(auth.updateDisplayName).not.toHaveBeenCalled();
  });

  it("keeps the name unchanged when the bio is refused or the rider is not a member yet", async () => {
    members.updateMemberPrivacy.mockResolvedValueOnce({ ok: false, reason: "invalid" });
    expect(await put(valid)).toMatchObject({ status: 422 });
    members.updateMemberPrivacy.mockResolvedValueOnce({ ok: false, reason: "not_member" });
    expect(await put(valid)).toMatchObject({ status: 403, body: { error: { code: "not_member" } } });
    expect(auth.updateDisplayName).not.toHaveBeenCalled();
  });
});
