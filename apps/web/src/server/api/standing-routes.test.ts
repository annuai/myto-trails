// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const st = vi.hoisted(() => ({ setOptIn: vi.fn(), upsertSummaries: vi.fn(), getCohort: vi.fn() }));
vi.mock("../standing/standing", () => st);

import { ApiError, fail, matchRoute, type Ctx } from "./http";
import { buildOpenApi } from "./openapi";
import { routes } from "./routes";
import { standingRoutes } from "./standing-routes";

// A database that fails the test if it is touched: refusals must happen before any SQL.
const sql = new Proxy({}, { get() { throw new Error("database touched"); }, apply() { throw new Error("database touched"); } });
async function call(method: string, path: string, body?: unknown) {
  const u = new URL(path, "https://x.test");
  const m = matchRoute(standingRoutes, method, u.pathname);
  if (m === null || m === "method") throw new Error(`no route for ${method} ${path}`);
  const ctx = { sql, now: new Date("2026-11-12T10:00:00Z"), url: u, params: m.params, auth: { userId: "u1" }, userId: "u1", body: async () => body } as unknown as Ctx;
  const res = await m.route.handler(ctx).catch((e: unknown) => { if (e instanceof ApiError) return fail(e.status, e.code, e.message); throw e; });
  return { status: res.status, body: res.status === 204 ? null : await res.json() };
}
beforeEach(() => vi.clearAllMocks());

const ride = { ref: "r1", day: "2026-11-10", distanceKm: 42.5, durationSec: 5400, cell: "12:77", bikeClass: "adv" };

describe("GET /cohort", () => {
  it("refuses speed and unknown metrics before any SQL", async () => {
    expect(await call("GET", "/cohort?cell=12:77&period=2026-11&metric=top_speed")).toMatchObject({ status: 422, body: { error: { code: "refused" } } });
    expect(await call("GET", "/cohort?cell=12:77&period=2026-11&metric=karma")).toMatchObject({ status: 422, body: { error: { code: "unknown_metric" } } });
    expect(st.getCohort).not.toHaveBeenCalled();
  });
  it("rejects a bad period or cell with 400", async () => {
    expect(await call("GET", "/cohort?cell=12:77&period=2026-13&metric=rides")).toMatchObject({ status: 400 });
    expect(await call("GET", "/cohort?cell=12:77&period=Nov&metric=rides")).toMatchObject({ status: 400 });
    expect(await call("GET", "/cohort?cell=bogus&period=2026-11&metric=rides")).toMatchObject({ status: 400 });
  });
  it("never publishes a cohort smaller than MIN_COHORT", async () => {
    const d = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    st.getCohort.mockResolvedValueOnce({ n: 19, deciles: d }).mockResolvedValueOnce({ n: 20, deciles: d, userId: "leak" });
    expect(await call("GET", "/cohort?cell=12:77&period=2026-11&metric=rides")).toMatchObject({ status: 404 });
    expect(await call("GET", "/cohort?cell=12:77&period=2026-11&metric=rides")).toEqual({ status: 200, body: { n: 20, deciles: d } });
  });
  it("answers only n and deciles, and 404s a cell with no row", async () => {
    st.getCohort.mockResolvedValueOnce({ n: 31, deciles: [1, 2, 3, 4, 5, 6, 7, 8, 9], userId: "leak" }).mockResolvedValueOnce(null);
    expect(await call("GET", "/cohort?cell=12:77&period=2026-11&metric=rides")).toEqual({ status: 200, body: { n: 31, deciles: [1, 2, 3, 4, 5, 6, 7, 8, 9] } });
    expect(await call("GET", "/cohort?cell=12:77&period=2026-11&metric=rides")).toMatchObject({ status: 404 });
  });
});

describe("PUT /me/standing-opt-in", () => {
  it("needs a boolean", async () => {
    expect(await call("PUT", "/me/standing-opt-in", { optIn: "yes" })).toMatchObject({ status: 400 });
    expect(await call("PUT", "/me/standing-opt-in", null)).toMatchObject({ status: 400 });
    expect(st.setOptIn).not.toHaveBeenCalled();
  });
  it("sets it", async () => {
    st.setOptIn.mockResolvedValueOnce(undefined);
    expect(await call("PUT", "/me/standing-opt-in", { optIn: false })).toEqual({ status: 204, body: null });
    expect(st.setOptIn.mock.calls[0]![1]).toEqual({ userId: "u1", optIn: false });
  });
});

describe("PUT /me/ride-summaries", () => {
  it.each(["lat", "lng", "route", "startedAt", "waypoints"])("rejects an extra %s key with 400 before any SQL", async (k) => {
    expect(await call("PUT", "/me/ride-summaries", { rides: [{ ...ride, [k]: 12.9 }] })).toMatchObject({ status: 400 });
    expect(st.upsertSummaries).not.toHaveBeenCalled();
  });
  it("rejects a malformed body, bad values and more than 200 rides", async () => {
    for (const body of [null, {}, { rides: "x" }, { rides: [{ ...ride, day: "10/11/2026" }] }, { rides: [{ ...ride, distanceKm: -1 }] }, { rides: [{ ...ride, durationSec: 1.5 }] }, { rides: [{ ...ride, cell: "x" }] }, { rides: [{ ...ride, ref: "" }] }, { rides: Array(201).fill(ride) }, { rides: [ride], extra: 1 }]) {
      expect(await call("PUT", "/me/ride-summaries", body)).toMatchObject({ status: 400 });
    }
    expect(st.upsertSummaries).not.toHaveBeenCalled();
  });
  it("rejects impossible, future and too-old days and out-of-range cells", async () => {
    for (const day of ["2026-02-31", "0000-01-01", "2020-01-01", "2026-11-13", "2999-01-01"]) expect(await call("PUT", "/me/ride-summaries", { rides: [{ ...ride, day }] })).toMatchObject({ status: 400 });
    for (const cell of ["90:77", "-91:77", "12:180", "12:-181"]) expect(await call("PUT", "/me/ride-summaries", { rides: [{ ...ride, cell }] })).toMatchObject({ status: 400 });
    expect(st.upsertSummaries).not.toHaveBeenCalled();
  });
  it("409s when the rider has not opted in", async () => {
    st.upsertSummaries.mockResolvedValueOnce({ ok: false, reason: "not_opted_in" });
    expect(await call("PUT", "/me/ride-summaries", { rides: [ride] })).toMatchObject({ status: 409, body: { error: { code: "not_opted_in" } } });
  });
  it("stores valid summaries (bikeClass optional)", async () => {
    st.upsertSummaries.mockResolvedValueOnce({ ok: true });
    const { bikeClass: _b, ...noClass } = ride;
    expect(await call("PUT", "/me/ride-summaries", { rides: [ride, noClass] })).toEqual({ status: 204, body: null });
    expect(st.upsertSummaries.mock.calls[0]![1]).toMatchObject({ userId: "u1", rides: [ride, noClass] });
  });
});

describe("the route table", () => {
  it("is part of the API description", () => {
    const doc = buildOpenApi(routes) as { paths: Record<string, Record<string, unknown>> };
    expect(Object.keys(doc.paths["/cohort"]!)).toEqual(["get"]);
    expect(doc.paths["/me/standing-opt-in"]!.put).toBeDefined();
    expect(doc.paths["/me/ride-summaries"]!.put).toBeDefined();
  });
});
