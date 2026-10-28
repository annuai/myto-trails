// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const checkins = vi.hoisted(() => ({ arriveCheckin: vi.fn(), extendCheckin: vi.fn(), getMyCheckin: vi.fn(), createCheckin: vi.fn(), pingCheckin: vi.fn() }));
const groups = vi.hoisted(() => ({ createGroupRide: vi.fn(), endGroupRide: vi.fn(), joinGroupRide: vi.fn(), leaveGroupRide: vi.fn(), setRegroup: vi.fn(), syncGroupRide: vi.fn() }));
const reports = vi.hoisted(() => ({ confirmConditionReport: vi.fn(), createConditionReport: vi.fn(), listConditionReports: vi.fn() }));
const shared = vi.hoisted(() => ({ createSharedRoute: vi.fn(), deleteSharedRoute: vi.fn(), getSharedRoute: vi.fn() }));
// Only the database-touching functions are replaced; parsing and validation run for real.
vi.mock("../rides/checkins", async (orig) => ({ ...(await orig<typeof import("../rides/checkins")>()), ...checkins }));
vi.mock("../rides/group-rides", async (orig) => ({ ...(await orig<typeof import("../rides/group-rides")>()), ...groups }));
vi.mock("../rides/condition-reports", async (orig) => ({ ...(await orig<typeof import("../rides/condition-reports")>()), ...reports }));
vi.mock("../rides/shared-routes", async (orig) => ({ ...(await orig<typeof import("../rides/shared-routes")>()), ...shared }));

import { buildOpenApi } from "./openapi";
import { ApiError, fail, matchRoute, type Ctx } from "./http";
import { rideRoutes } from "./ride-routes";
import { routes } from "./routes";

const sql = {};
const now = new Date("2026-11-01T10:00:00Z");
async function call(method: string, path: string, body?: unknown) {
  const m = matchRoute(rideRoutes, method, path);
  if (m === null || m === "method") throw new Error(`no route for ${method} ${path}`);
  const ctx = { sql, now, siteUrl: "https://x.test", params: m.params, auth: { userId: "u1" }, userId: "u1", body: async () => body } as unknown as Ctx;
  const res = await m.route.handler(ctx).catch((e: unknown) => { if (e instanceof ApiError) return fail(e.status, e.code, e.message); throw e; });
  return { status: res.status, body: res.status === 204 ? null : await res.json() };
}
beforeEach(() => { vi.clearAllMocks(); });

describe("check-in routes", () => {
  const future = new Date(now.getTime() + 2 * 3_600_000).toISOString();

  it("returns the link to send once, built from the token", async () => {
    checkins.createCheckin.mockResolvedValueOnce({ ok: true, id: "c1", token: "tok" });
    expect(await call("POST", "/checkins", { expectedAt: future, contactName: "Meera" })).toEqual({ status: 201, body: { id: "c1", token: "tok", url: "https://x.test/track/tok" } });
    expect(checkins.createCheckin.mock.calls[0]![1]).toMatchObject({ userId: "u1", now });
  });

  it("refuses a past time or a missing contact before reaching the database", async () => {
    expect(await call("POST", "/checkins", { expectedAt: new Date(now.getTime() - 1000).toISOString(), contactName: "Meera" })).toMatchObject({ status: 422, body: { error: { code: "invalid" } } });
    expect(await call("POST", "/checkins", { expectedAt: future })).toMatchObject({ status: 422 });
    expect(checkins.createCheckin).not.toHaveBeenCalled();
  });

  it("maps the limits to one error shape", async () => {
    checkins.createCheckin.mockResolvedValueOnce({ ok: false, reason: "too_many" });
    expect(await call("POST", "/checkins", { expectedAt: future, contactName: "Meera" })).toMatchObject({ status: 409, body: { error: { code: "too_many" } } });
  });

  it("takes a ping only with a position and a whole-number battery", async () => {
    checkins.pingCheckin.mockResolvedValue({ ok: true });
    expect(await call("POST", "/checkins/c1/ping", { lat: 12.9, lng: 77.6, at: now.toISOString(), batteryPct: 40 })).toEqual({ status: 204, body: null });
    expect(checkins.pingCheckin.mock.calls[0]![1]).toMatchObject({ id: "c1", batteryPct: 40 });
    expect(await call("POST", "/checkins/c1/ping", { lat: 12.9 })).toMatchObject({ status: 422 });
    expect(await call("POST", "/checkins/c1/ping", { lat: 12.9, lng: 77.6, at: now.toISOString(), batteryPct: 140 })).toMatchObject({ status: 422 });
    expect(checkins.pingCheckin).toHaveBeenCalledTimes(1);
  });

  it("says so when a check-in has ended or is not yours", async () => {
    checkins.pingCheckin.mockResolvedValueOnce({ ok: false, reason: "ended" });
    expect(await call("POST", "/checkins/c1/ping", { lat: 1, lng: 2, at: now.toISOString() })).toMatchObject({ status: 409 });
    checkins.arriveCheckin.mockResolvedValueOnce({ ok: false, reason: "not_found" });
    expect(await call("POST", "/checkins/c9/arrive")).toMatchObject({ status: 404 });
  });

  it("extends only to a time in the future", async () => {
    expect(await call("POST", "/checkins/c1/extend", { expectedAt: "soon" })).toMatchObject({ status: 422 });
    checkins.extendCheckin.mockResolvedValueOnce({ ok: true });
    expect((await call("POST", "/checkins/c1/extend", { expectedAt: future })).status).toBe(204);
  });
});

describe("group ride routes", () => {
  it("starts a ride with the club it is for", async () => {
    groups.createGroupRide.mockResolvedValueOnce({ ok: true, id: "g1", code: "ABC234", name: "Sunday", expiresAt: "2026-11-01T22:00:00.000Z" });
    expect(await call("POST", "/group-rides", { name: "Sunday", clubId: "club-1" })).toEqual({ status: 201, body: { id: "g1", code: "ABC234", name: "Sunday", expiresAt: "2026-11-01T22:00:00.000Z" } });
    expect(groups.createGroupRide.mock.calls[0]![1]).toMatchObject({ name: "Sunday", clubId: "club-1" });
  });

  it("joins with a code and reports a full ride or a bad code distinctly", async () => {
    groups.joinGroupRide.mockResolvedValueOnce({ ok: true, id: "g1", name: "Sunday", role: "member" });
    expect(await call("POST", "/group-rides/join", { code: "abc234", displayName: "Asha" })).toEqual({ status: 200, body: { id: "g1", name: "Sunday", role: "member" } });
    groups.joinGroupRide.mockResolvedValueOnce({ ok: false, reason: "full" });
    expect(await call("POST", "/group-rides/join", { code: "ABC234" })).toMatchObject({ status: 409, body: { error: { code: "full" } } });
    groups.joinGroupRide.mockResolvedValueOnce({ ok: false, reason: "not_found" });
    expect(await call("POST", "/group-rides/join", { code: "nope" })).toMatchObject({ status: 404 });
  });

  it("answers a sync with everyone's positions, and an empty body only reads", async () => {
    const result = { me: "h1", riders: [], regroup: null, ended: false };
    groups.syncGroupRide.mockResolvedValue(result);
    expect(await call("POST", "/group-rides/g1/sync", {})).toEqual({ status: 200, body: result });
    await call("POST", "/group-rides/g1/sync", { lat: 12, lng: 77, status: "wait_up" });
    expect(groups.syncGroupRide.mock.calls[1]![1]).toMatchObject({ rideId: "g1", lat: 12, lng: 77, status: "wait_up" });
    groups.syncGroupRide.mockResolvedValueOnce({ ok: false, reason: "invalid" });
    expect(await call("POST", "/group-rides/g1/sync", { status: "nonsense" })).toMatchObject({ status: 422 });
  });

  it("keeps regroup, end and leave to the right people", async () => {
    groups.setRegroup.mockResolvedValueOnce({ ok: false, reason: "not_leader" });
    expect(await call("POST", "/group-rides/g1/regroup", { lat: 1, lng: 2 })).toMatchObject({ status: 403 });
    groups.setRegroup.mockResolvedValueOnce({ ok: true });
    await call("POST", "/group-rides/g1/regroup", { clear: true });
    expect(groups.setRegroup.mock.calls[1]![1].point).toBeNull();
    groups.leaveGroupRide.mockResolvedValueOnce({ ok: false, reason: "leader" });
    expect(await call("POST", "/group-rides/g1/leave")).toMatchObject({ status: 409 });
    groups.endGroupRide.mockResolvedValueOnce({ ok: true });
    expect((await call("POST", "/group-rides/g1/end")).status).toBe(204);
  });
});

describe("condition report routes", () => {
  it("files a report and passes the raw fields to the checks", async () => {
    reports.createConditionReport.mockResolvedValueOnce({ ok: true, id: "r1" });
    expect(await call("POST", "/trails/nandi/condition-reports", { clientId: "abcd1234", kind: "blocked", at: now.toISOString() })).toEqual({ status: 201, body: { id: "r1" } });
    expect(reports.createConditionReport.mock.calls[0]![1]).toMatchObject({ slug: "nandi", kind: "blocked", clientId: "abcd1234" });
  });

  it("answers an unknown trail and a bad slug the same way", async () => {
    reports.listConditionReports.mockResolvedValueOnce(null);
    expect(await call("GET", "/trails/nandi/condition-reports")).toMatchObject({ status: 404 });
    expect(await call("GET", "/trails/..%2Fetc/condition-reports")).toMatchObject({ status: 404 });
  });

  it("takes a still-true vote only as true or false, and not on your own report", async () => {
    expect(await call("POST", "/condition-reports/r1/confirm", { still: "yes" })).toMatchObject({ status: 400 });
    reports.confirmConditionReport.mockResolvedValueOnce({ ok: false, reason: "own_report" });
    expect(await call("POST", "/condition-reports/r1/confirm", { still: true })).toMatchObject({ status: 409, body: { error: { code: "own_report" } } });
  });
});

describe("shared route routes", () => {
  const route = { name: "Loop", points: [[12, 77], [12.1, 77.1]], distanceKm: 5 };

  it("shares a route and returns its page address", async () => {
    shared.createSharedRoute.mockResolvedValueOnce({ ok: true, id: "abcdefghjk" });
    expect(await call("POST", "/shared-routes", route)).toEqual({ status: 201, body: { id: "abcdefghjk", url: "https://x.test/route/abcdefghjk" } });
  });

  it("refuses a body that is not a route, before the database", async () => {
    expect(await call("POST", "/shared-routes", { ...route, points: [[12, 77]] })).toMatchObject({ status: 422 });
    expect(shared.createSharedRoute).not.toHaveBeenCalled();
  });

  it("returns a route to anyone, and 404s for an unknown one; only the owner can delete", async () => {
    shared.getSharedRoute.mockResolvedValueOnce({ name: "Loop" });
    expect(await call("GET", "/shared-routes/abcdefghjk")).toEqual({ status: 200, body: { name: "Loop" } });
    shared.getSharedRoute.mockResolvedValueOnce(null);
    expect((await call("GET", "/shared-routes/zzzzzzzzzz")).status).toBe(404);
    shared.deleteSharedRoute.mockResolvedValueOnce(false);
    expect((await call("DELETE", "/shared-routes/abcdefghjk")).status).toBe(404);
  });
});

describe("the route table", () => {
  it("is part of the v1 router and the OpenAPI description, with the right access", () => {
    const doc = buildOpenApi(routes) as { paths: Record<string, Record<string, { security?: unknown; responses: Record<string, unknown> }>> };
    expect(Object.keys(doc.paths)).toEqual(expect.arrayContaining(["/checkins", "/checkins/{id}/ping", "/group-rides/join", "/group-rides/{id}/sync", "/trails/{slug}/condition-reports", "/condition-reports/{id}/confirm", "/shared-routes/{id}"]));
    expect(doc.paths["/shared-routes/{id}"]!.get!.security).toBeUndefined();
    expect(doc.paths["/trails/{slug}/condition-reports"]!.get!.security).toBeUndefined();
    expect(doc.paths["/checkins"]!.post!.security).toEqual([{ deviceToken: ["write:submission"] }]);
    expect(doc.paths["/checkins"]!.post!.responses).toHaveProperty("201");
    expect(doc.paths["/group-rides/{id}/end"]!.post!.responses).toHaveProperty("204");
  });

  it("has no two routes that answer the same method and path", () => {
    const keys = routes.map((r) => `${r.method} ${r.path}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
