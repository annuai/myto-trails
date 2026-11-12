// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const tm = vi.hoisted(() => ({ getMyTrailmarks: vi.fn(), setChallenge: vi.fn(), setLeaderboardOptIn: vi.fn() }));
// Only the database-touching functions that are not under test are replaced; the leaderboard's refusals run for real.
vi.mock("../trailmarks/trailmarks", async (orig) => ({ ...(await orig<typeof import("../trailmarks/trailmarks")>()), ...tm }));

import { ApiError, fail, matchRoute, type Ctx } from "./http";
import { buildOpenApi } from "./openapi";
import { routes } from "./routes";
import { trailmarkRoutes } from "./trailmark-routes";

// A database that fails the test if it is touched: refusals must happen before any SQL.
const sql = new Proxy({}, { get() { throw new Error("database touched"); }, apply() { throw new Error("database touched"); } });
async function call(method: string, path: string, body?: unknown) {
  const u = new URL(path, "https://x.test");
  const m = matchRoute(trailmarkRoutes, method, u.pathname);
  if (m === null || m === "method") throw new Error(`no route for ${method} ${path}`);
  const ctx = { sql, now: new Date("2026-11-12T10:00:00Z"), url: u, params: m.params, auth: { userId: "u1" }, userId: "u1", body: async () => body } as unknown as Ctx;
  const res = await m.route.handler(ctx).catch((e: unknown) => { if (e instanceof ApiError) return fail(e.status, e.code, e.message); throw e; });
  return { status: res.status, body: res.status === 204 ? null : await res.json() };
}
beforeEach(() => vi.clearAllMocks());

describe("GET /leaderboard", () => {
  it.each(["top_speed", "distance", "total_km", "fastest_lap"])("refuses to rank by %s", async (metric) => {
    expect(await call("GET", `/leaderboard?metric=${metric}`)).toMatchObject({ status: 422, body: { error: { code: "refused" } } });
  });
  it("rejects an unknown metric, a missing scope id and a collection scope before any SQL", async () => {
    expect(await call("GET", "/leaderboard?metric=karma")).toMatchObject({ status: 422, body: { error: { code: "unknown_metric" } } });
    expect(await call("GET", "/leaderboard?metric=new_discoveries&scope=district")).toMatchObject({ status: 422, body: { error: { code: "bad_scope" } } });
    expect(await call("GET", "/leaderboard?metric=new_discoveries&scope=collection")).toMatchObject({ status: 422, body: { error: { code: "scope_unavailable" } } });
    expect(await call("GET", "/leaderboard?metric=challenge_participation&scope=state&id=6f1b6c9e-3c0e-4c3a-9a53-0a6f0d4a8b11")).toMatchObject({ status: 422, body: { error: { code: "scope_unavailable" } } });
  });
});

describe("opt-ins", () => {
  it("needs a boolean to opt in to the leaderboard, and says why a private profile cannot", async () => {
    expect(await call("PUT", "/me/leaderboard-opt-in", { optIn: "yes" })).toMatchObject({ status: 400 });
    tm.setLeaderboardOptIn.mockResolvedValueOnce({ ok: false, reason: "profile_not_public" });
    expect(await call("PUT", "/me/leaderboard-opt-in", { optIn: true })).toMatchObject({ status: 409, body: { error: { code: "profile_not_public" } } });
    tm.setLeaderboardOptIn.mockResolvedValueOnce({ ok: true });
    expect(await call("PUT", "/me/leaderboard-opt-in", { optIn: false })).toEqual({ status: 204, body: null });
  });
  it("joins and leaves a challenge, and 404s an unknown one", async () => {
    tm.setChallenge.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    expect(await call("PUT", "/me/challenges/verify-10")).toEqual({ status: 204, body: null });
    expect(await call("DELETE", "/me/challenges/nope")).toMatchObject({ status: 404 });
    expect(tm.setChallenge.mock.calls[0]![1]).toEqual({ userId: "u1", challengeId: "verify-10", joined: true });
  });
});

describe("GET /me/trailmarks", () => {
  it("passes the district through", async () => {
    tm.getMyTrailmarks.mockResolvedValueOnce({ total: 0 });
    await call("GET", "/me/trailmarks?district=abc");
    expect(tm.getMyTrailmarks.mock.calls[0]![1]).toMatchObject({ userId: "u1", districtId: "abc" });
  });
});

describe("the route table", () => {
  it("is part of the API description, with the two no-body routes answering 204", () => {
    const doc = buildOpenApi(routes) as { paths: Record<string, Record<string, { responses: Record<string, unknown> }>> };
    expect(Object.keys(doc.paths["/leaderboard"]!)).toEqual(["get"]);
    expect(doc.paths["/me/challenges/{id}"]!.put!.responses["204"]).toBeDefined();
    expect(doc.paths["/me/leaderboard-opt-in"]!.put!.responses["204"]).toBeDefined();
  });
});
