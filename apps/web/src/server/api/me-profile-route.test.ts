// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const members = vi.hoisted(() => ({ getMemberState: vi.fn(), getMyPhone: vi.fn(), updateMemberPrivacy: vi.fn(), completeWelcome: vi.fn() }));
const auth = vi.hoisted(() => ({ updateDisplayName: vi.fn() }));
vi.mock("../community/members", async (orig) => ({ ...(await orig<typeof import("../community/members")>()), ...members }));
vi.mock("../auth/auth", async (orig) => ({ ...(await orig<typeof import("../auth/auth")>()), ...auth }));

import { ApiError, fail, matchRoute, type Ctx } from "./http";
import { routes } from "./routes";

async function put(body: unknown, method = "PUT", path = "/me/profile") {
  const m = matchRoute(routes, method, path);
  if (m === null || m === "method") throw new Error("no route");
  const ctx = { sql: {}, params: m.params, auth: { userId: "u1", scopes: [] }, userId: "u1", body: async () => body } as unknown as Ctx;
  const res = await m.route.handler(ctx).catch((e: unknown) => { if (e instanceof ApiError) return fail(e.status, e.code, e.message); throw e; });
  return { status: res.status, body: await res.json() };
}
const valid = { displayName: " Annuai ", public: true, bio: "Weekend rider", gender: "female" };
beforeEach(() => {
  vi.clearAllMocks();
  members.updateMemberPrivacy.mockResolvedValue({ ok: true });
  members.getMemberState.mockResolvedValue({ confirmed: true, displayName: "Annuai", profilePublic: true, bio: "Weekend rider", gender: "female" });
  members.getMyPhone.mockResolvedValue(null);
  members.completeWelcome.mockResolvedValue({ ok: true });
});

describe("PUT /me/profile", () => {
  it("saves the name, visibility, bio and gender, and returns the profile", async () => {
    expect(await put(valid)).toEqual({ status: 200, body: { displayName: "Annuai", public: true, bio: "Weekend rider", gender: "female", phone: null, welcomeDone: true } });
    expect(members.updateMemberPrivacy.mock.calls[0]![1]).toEqual({ userId: "u1", profilePublic: true, gender: "female", bio: "Weekend rider", phone: undefined });
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

describe("PUT /me/profile phone", () => {
  it("leaves the phone unchanged when the key is missing, sets it normalized, clears it on null or empty", async () => {
    await put(valid);
    expect(members.updateMemberPrivacy.mock.calls[0]![1].phone).toBeUndefined();
    await put({ ...valid, phone: "98123 45678" });
    expect(members.updateMemberPrivacy.mock.calls[1]![1].phone).toBe("+919812345678");
    await put({ ...valid, phone: null });
    expect(members.updateMemberPrivacy.mock.calls[2]![1].phone).toBeNull();
    await put({ ...valid, phone: "" });
    expect(members.updateMemberPrivacy.mock.calls[3]![1].phone).toBeNull();
  });

  it("returns the owner's stored phone", async () => {
    members.getMyPhone.mockResolvedValue("+919812345678");
    expect(await put(valid)).toMatchObject({ body: { phone: "+919812345678" } });
  });

  it("answers 422 with the field for an invalid number, and writes nothing", async () => {
    const r = await put({ ...valid, phone: "12345" });
    expect(r).toMatchObject({ status: 422, body: { error: { code: "validation_failed", fields: { phone: expect.any(String) } } } });
    expect(await put({ ...valid, phone: 5 })).toMatchObject({ status: 422 });
    expect(members.updateMemberPrivacy).not.toHaveBeenCalled();
    expect(auth.updateDisplayName).not.toHaveBeenCalled();
  });
});

describe("POST /me/welcome", () => {
  const welcome = { confirmed: true, displayName: " Annuai ", public: false, gender: null };
  const post = (b: unknown) => put(b, "POST", "/me/welcome");

  it("completes the welcome step and returns the profile", async () => {
    members.getMyPhone.mockResolvedValue("+919812345678");
    const r = await post({ ...welcome, phone: "9812345678" });
    expect(r).toMatchObject({ status: 200, body: { welcomeDone: true, phone: "+919812345678" } });
    expect(members.completeWelcome.mock.calls[0]![1]).toEqual({ userId: "u1", confirmed: true, displayName: " Annuai ", profilePublic: false, gender: null, phone: "+919812345678" });
  });

  it("leaves the phone alone when the key is missing", async () => {
    await post(welcome);
    expect(members.completeWelcome.mock.calls[0]![1].phone).toBeUndefined();
  });

  it("passes on the web step's refusals", async () => {
    members.completeWelcome.mockResolvedValueOnce({ ok: false, reason: "declaration_required" });
    expect(await post({ ...welcome, confirmed: false })).toMatchObject({ status: 422, body: { error: { code: "declaration_required" } } });
    members.completeWelcome.mockResolvedValueOnce({ ok: false, reason: "invalid" });
    expect(await post({ ...welcome, displayName: "x" })).toMatchObject({ status: 422, body: { error: { code: "validation_failed" } } });
  });

  it("refuses a bad body or phone before writing", async () => {
    expect(await post({ ...welcome, public: "no" })).toMatchObject({ status: 400 });
    expect(await post({ ...welcome, gender: "woman" })).toMatchObject({ status: 400 });
    expect(await post({ ...welcome, phone: "abc" })).toMatchObject({ status: 422, body: { error: { fields: { phone: expect.any(String) } } } });
    expect(members.completeWelcome).not.toHaveBeenCalled();
  });
});
