// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const sy = vi.hoisted(() => ({ pushChanges: vi.fn(), pullChanges: vi.fn(), putTrack: vi.fn(), getTrack: vi.fn(), getUsage: vi.fn(), eraseSyncData: vi.fn() }));
vi.mock("../sync/sync", () => sy);

import { ApiError, fail, matchRoute, type Ctx } from "./http";
import { buildOpenApi } from "./openapi";
import { routes } from "./routes";
import { syncRoutes } from "./sync-routes";

// The service is mocked, so any SQL here would be a bug; calling this as a tag throws.
const sql = new Proxy(function () {}, { apply() { throw new Error("database touched"); } });
async function call(method: string, path: string, body?: unknown, bytes?: Uint8Array) {
  const u = new URL(path, "https://x.test");
  const m = matchRoute(syncRoutes, method, u.pathname);
  if (m === null || m === "method") throw new Error(`no route for ${method} ${path}`);
  const req = new Request(u, { method, ...(bytes ? { body: bytes as BodyInit } : {}) });
  const ctx = { sql, storage: {}, req, now: new Date("2026-11-12T10:00:00Z"), url: u, params: m.params, auth: { userId: "u1" }, userId: "u1", body: async () => body } as unknown as Ctx;
  const res = await m.route.handler(ctx).catch((e: unknown) => { if (e instanceof ApiError) return fail(e.status, e.code, e.message); throw e; });
  return { status: res.status, res };
}
const json = async (r: { res: Response }) => r.res.json();
beforeEach(() => vi.clearAllMocks());

const DEVICE = "phone-aaaa-1111";
const change = { kind: "ride", id: "r1", data: { name: "Ghat run" }, updatedAt: "2026-11-12T09:00:00Z", baseUpdatedAt: null };
const EMPTY = { accepted: [], conflicts: [], stale: [], overQuota: [] };

describe("POST /sync/push", () => {
  it("passes valid changes to the service and returns its result", async () => {
    sy.pushChanges.mockResolvedValueOnce({ ...EMPTY, accepted: [{ kind: "ride", id: "r1" }] });
    const r = await call("POST", "/sync/push", { deviceId: DEVICE, changes: [change] });
    expect(r.status).toBe(200);
    expect(await json(r)).toMatchObject({ accepted: [{ kind: "ride", id: "r1" }] });
    expect(sy.pushChanges).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.objectContaining({ userId: "u1", deviceId: DEVICE }));
  });

  it("refuses bad input before any work", async () => {
    const cases: unknown[] = [
      { deviceId: "short", changes: [] },
      { deviceId: DEVICE, changes: "no" },
      { deviceId: DEVICE, changes: Array(201).fill(change) },
      { deviceId: DEVICE, changes: [{ ...change, kind: "photo" }] },
      { deviceId: DEVICE, changes: [{ ...change, id: "../x" }] },
      { deviceId: DEVICE, changes: [{ ...change, lat: 12.9 }] },
      { deviceId: DEVICE, changes: [{ ...change, updatedAt: "yesterday" }] },
      { deviceId: DEVICE, changes: [{ ...change, updatedAt: "2026-12-30T00:00:00Z" }] },
      { deviceId: DEVICE, changes: [{ ...change, data: { points: "x".repeat(17000) } }] },
      { deviceId: DEVICE, changes: [{ ...change, data: [] }] },
    ];
    for (const body of cases) expect((await call("POST", "/sync/push", body)).status).toBe(400);
    expect(sy.pushChanges).not.toHaveBeenCalled();
  });

  it("accepts a delete without data", async () => {
    sy.pushChanges.mockResolvedValueOnce(EMPTY);
    const { status } = await call("POST", "/sync/push", { deviceId: DEVICE, changes: [{ kind: "todo", id: "t1", updatedAt: "2026-11-12T09:00:00Z", deleted: true }] });
    expect(status).toBe(200);
    expect(sy.pushChanges.mock.calls[0]![2].changes[0]).toMatchObject({ deleted: true, data: {} });
  });
});

describe("GET /sync/pull", () => {
  it("requires a device id and valid kinds", async () => {
    expect((await call("GET", "/sync/pull")).status).toBe(400);
    expect((await call("GET", `/sync/pull?deviceId=${DEVICE}&kinds=ride,bogus`)).status).toBe(400);
    expect(sy.pullChanges).not.toHaveBeenCalled();
  });
  it("passes the cursor, kinds and a capped limit", async () => {
    sy.pullChanges.mockResolvedValueOnce({ changes: [], cursor: "c", more: false });
    const r = await call("GET", `/sync/pull?deviceId=${DEVICE}&since=2026-11-12T08:00:00Z&kinds=ride,todo&limit=9999`);
    expect(r.status).toBe(200);
    expect(sy.pullChanges).toHaveBeenCalledWith(expect.anything(), { userId: "u1", deviceId: DEVICE, since: new Date("2026-11-12T08:00:00Z"), kinds: ["ride", "todo"], limit: 200 });
  });
});

describe("pull cursor", () => {
  it("accepts the epoch, which an idle phone is given as its cursor", async () => {
    sy.pullChanges.mockResolvedValueOnce({ changes: [], cursor: "1970-01-01T00:00:00.000Z", more: false });
    expect((await call("GET", `/sync/pull?deviceId=${DEVICE}&since=1970-01-01T00:00:00.000Z`)).status).toBe(200);
    expect(sy.pullChanges.mock.calls[0]![1].since).toEqual(new Date(0));
  });
  it("still refuses an edit time in the distant past", async () => {
    expect((await call("POST", "/sync/push", { deviceId: DEVICE, changes: [{ ...change, updatedAt: "1999-01-01T00:00:00Z" }] })).status).toBe(400);
  });
});

describe("tracks", () => {
  it("stores the bytes, and maps each refusal to its status", async () => {
    sy.putTrack.mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({ ok: false, reason: "no_such_ride" }).mockResolvedValueOnce({ ok: false, reason: "over_quota" });
    const bytes = new Uint8Array([1, 2, 3]);
    expect((await call("PUT", "/sync/rides/r1/track", undefined, bytes)).status).toBe(204);
    expect((await call("PUT", "/sync/rides/r1/track", undefined, bytes)).status).toBe(404);
    expect((await call("PUT", "/sync/rides/r1/track", undefined, bytes)).status).toBe(409);
    expect(Array.from(sy.putTrack.mock.calls[0]![2].bytes)).toEqual([1, 2, 3]);
  });
  it("refuses a track over 400 KB before touching storage", async () => {
    expect((await call("PUT", "/sync/rides/r1/track", undefined, new Uint8Array(400 * 1024 + 1))).status).toBe(413);
    expect(sy.putTrack).not.toHaveBeenCalled();
  });
  it("refuses a path-like ride id", async () => {
    expect((await call("GET", "/sync/rides/..%2Fx/track")).status).toBe(404);
  });
  it("returns the stored bytes, or 404", async () => {
    sy.getTrack.mockResolvedValueOnce(new Uint8Array([9, 8])).mockResolvedValueOnce(null);
    const hit = await call("GET", "/sync/rides/r1/track");
    expect(hit.status).toBe(200);
    expect(Array.from(new Uint8Array(await hit.res.arrayBuffer()))).toEqual([9, 8]);
    expect((await call("GET", "/sync/rides/r1/track")).status).toBe(404);
  });
});

describe("usage, erase and documentation", () => {
  it("reports usage and erases the cloud copy", async () => {
    sy.getUsage.mockResolvedValueOnce({ rides: 3, trackBytes: 1, maxRides: 100, maxTrackBytes: 5 });
    expect(await json(await call("GET", "/sync/usage"))).toMatchObject({ rides: 3 });
    expect((await call("DELETE", "/sync")).status).toBe(204);
    expect(sy.eraseSyncData).toHaveBeenCalledWith(expect.anything(), expect.anything(), "u1");
  });
  it("needs the sync scope and appears in the OpenAPI document", () => {
    for (const r of syncRoutes) expect(r.access).toBe("sync");
    const doc = JSON.stringify(buildOpenApi(routes));
    expect(doc).toContain("/sync/push");
  });
});
