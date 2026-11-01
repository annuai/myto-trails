// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const ws = vi.hoisted(() => ({ markWomenSafe: vi.fn(), unmarkWomenSafe: vi.fn(), getWomenSafe: vi.fn() }));
const trails = vi.hoisted(() => ({ queryTrailBySlug: vi.fn(), queryTrailMedia: vi.fn() }));
vi.mock("../community/women-safe", async (orig) => ({ ...(await orig<typeof import("../community/women-safe")>()), ...ws }));
vi.mock("../queries/trails.sql", async (orig) => ({ ...(await orig<typeof import("../queries/trails.sql")>()), ...trails }));
vi.mock("../db/client", () => ({ withPublicRole: (_sql: unknown, fn: (tx: unknown) => unknown) => fn({}) }));

import { buildOpenApi } from "./openapi";
import { ApiError, fail, matchRoute, type Ctx } from "./http";
import { routes } from "./routes";

const sql = {};
const now = new Date("2026-11-01T10:00:00Z");
async function call(method: string, path: string, auth: { userId: string } | null = { userId: "u1" }) {
  const m = matchRoute(routes, method, path);
  if (m === null || m === "method") throw new Error(`no route for ${method} ${path}`);
  const ctx = { sql, now, siteUrl: "https://x.test", params: m.params, auth, userId: auth?.userId ?? "", body: async () => ({}) } as unknown as Ctx;
  const res = await m.route.handler(ctx).catch((e: unknown) => { if (e instanceof ApiError) return fail(e.status, e.code, e.message); throw e; });
  return { status: res.status, body: res.status === 204 ? null : await res.json() };
}
beforeEach(() => { vi.clearAllMocks(); });

describe("women-safe routes", () => {
  it("marks a trail and answers 204", async () => {
    ws.markWomenSafe.mockResolvedValueOnce({ ok: true });
    expect(await call("PUT", "/trails/ridge-track/women-safe")).toEqual({ status: 204, body: null });
    expect(ws.markWomenSafe.mock.calls[0]![1]).toEqual({ userId: "u1", slug: "ridge-track", now });
  });

  it.each([
    ["not_female", 403, "Only women riders can mark a trail as safe."],
    ["not_member", 403, "Finish the welcome step on moto-trails.com first."],
    ["not_found", 404, "No such trail."],
    ["rate_limited", 429, "You are marking too fast. Try again tomorrow."],
  ])("maps %s to %i", async (reason, status, message) => {
    ws.markWomenSafe.mockResolvedValueOnce({ ok: false, reason });
    expect(await call("PUT", "/trails/ridge-track/women-safe")).toEqual({ status, body: { error: { code: reason, message } } });
  });

  it("answers 404 for a malformed slug without touching the database", async () => {
    expect(await call("PUT", "/trails/BAD%20SLUG/women-safe")).toMatchObject({ status: 404 });
    expect(ws.markWomenSafe).not.toHaveBeenCalled();
  });

  it("removes a mark with 204", async () => {
    ws.unmarkWomenSafe.mockResolvedValueOnce({ ok: true });
    expect(await call("DELETE", "/trails/ridge-track/women-safe")).toEqual({ status: 204, body: null });
    expect(ws.unmarkWomenSafe.mock.calls[0]![1]).toEqual({ userId: "u1", slug: "ridge-track" });
  });

  it("needs write:submission and lists both as 204 in the API description", () => {
    for (const method of ["PUT", "DELETE"]) expect(matchRoute(routes, method, "/trails/x/women-safe")).toMatchObject({ route: { access: "write:submission" } });
    const doc = buildOpenApi(routes) as { paths: Record<string, Record<string, { responses: Record<string, unknown> }>> };
    expect(Object.keys(doc.paths["/trails/{slug}/women-safe"]!.put!.responses)).toContain("204");
    expect(Object.keys(doc.paths["/trails/{slug}/women-safe"]!.delete!.responses)).toContain("204");
  });
});

describe("GET /trails/{slug}", () => {
  it("adds the viewer's women-safe state, and the anonymous one for no token", async () => {
    trails.queryTrailBySlug.mockResolvedValue({ slug: "ridge-track", carry: null });
    trails.queryTrailMedia.mockResolvedValue([]);
    ws.getWomenSafe.mockResolvedValueOnce({ count: 3, confirmed: true, mine: true, canMark: true });
    expect(await call("GET", "/trails/ridge-track")).toMatchObject({ status: 200, body: { slug: "ridge-track", carry: null, womenSafe: { count: 3, mine: true } } });
    expect(ws.getWomenSafe.mock.calls[0]![1]).toEqual({ slug: "ridge-track", viewerId: "u1", now });
    ws.getWomenSafe.mockResolvedValueOnce({ count: 3, confirmed: true, mine: false, canMark: false });
    await call("GET", "/trails/ridge-track", null);
    expect(ws.getWomenSafe.mock.calls[1]![1]).toMatchObject({ viewerId: null });
  });
});
