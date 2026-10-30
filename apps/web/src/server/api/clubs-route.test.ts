// @vitest-environment node
import type { Sql } from "postgres";
import { beforeEach, describe, expect, it, vi } from "vitest";

const searchClubs = vi.hoisted(() => vi.fn());
vi.mock("../community/clubs", async () => ({ ...(await vi.importActual<typeof import("../community/clubs")>("../community/clubs")), searchClubs }));
vi.mock("./tokens", async () => ({
  ...(await vi.importActual<typeof import("./tokens")>("./tokens")),
  verifyToken: async () => ({ userId: "user-1", tokenId: "tok-1", scopes: [], kind: "app_ios" }),
}));

import { dispatch, type Deps } from "./http";
import { routes } from "./routes";

const deps = { sql: (async () => [{ ok: true }]) as unknown as Sql, storage: {} } as unknown as Deps;
const get = (query: string, token = true) =>
  dispatch(new Request(`http://x/api/v1/clubs${query}`, { headers: token ? { authorization: `Bearer ${"a".repeat(43)}` } : {} }), routes, deps);

beforeEach(() => searchClubs.mockReset());

describe("GET /api/v1/clubs", () => {
  it("needs a token", async () => {
    expect((await get("", false)).status).toBe(401);
    expect(searchClubs).not.toHaveBeenCalled();
  });

  it("starts with the newest page of every club when nothing is asked", async () => {
    searchClubs.mockResolvedValue({ items: [], nextCursor: null });
    const r = await get("");
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ items: [], nextCursor: null });
    expect(searchClubs).toHaveBeenCalledWith(deps.sql, "user-1", { q: null, cursor: null, limit: 20, scope: "all" });
  });

  it("passes the search, scope, page size and cursor on", async () => {
    searchClubs.mockResolvedValue({ items: [], nextCursor: "next" });
    await get("?q=nandi%20riders&scope=others&limit=5&cursor=abc");
    expect(searchClubs).toHaveBeenCalledWith(deps.sql, "user-1", { q: "nandi riders", cursor: "abc", limit: 5, scope: "others" });
  });

  it("keeps the page size within bounds", async () => {
    searchClubs.mockResolvedValue({ items: [], nextCursor: null });
    await get("?limit=100000");
    expect(searchClubs.mock.calls[0]![2].limit).toBe(100);
  });

  it("answers 400 for a scope it does not know", async () => {
    expect((await get("?scope=everyone")).status).toBe(400);
    expect(searchClubs).not.toHaveBeenCalled();
  });

  it("answers 400 for a cursor it did not write", async () => {
    searchClubs.mockResolvedValue(null);
    const r = await get("?cursor=garbage");
    expect(r.status).toBe(400);
    expect((await r.json()).error.code).toBe("invalid_request");
  });
});
