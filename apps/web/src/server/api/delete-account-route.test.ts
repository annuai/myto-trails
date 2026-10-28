// @vitest-environment node
import type { Sql } from "postgres";
import { beforeEach, describe, expect, it, vi } from "vitest";

const deleteAccount = vi.hoisted(() => vi.fn());
vi.mock("../account/delete", async () => ({ ...(await vi.importActual<typeof import("../account/delete")>("../account/delete")), deleteAccount }));
vi.mock("./tokens", async () => ({
  ...(await vi.importActual<typeof import("./tokens")>("./tokens")),
  verifyToken: async () => ({ userId: "user-1", tokenId: "tok-1", scopes: [], kind: "app_ios" }),
}));

import { dispatch, type Deps } from "./http";
import { routes } from "./routes";

const deps = { sql: (async () => [{ ok: true }]) as unknown as Sql, storage: {} } as unknown as Deps;
const del = (body: unknown, token = true) =>
  dispatch(new Request("http://x/api/v1/me", { method: "DELETE", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${"a".repeat(43)}` } : {}) }, body: JSON.stringify(body) }), routes, deps);

describe("DELETE /api/v1/me", () => {
  beforeEach(() => deleteAccount.mockReset());

  it("needs a token", async () => {
    expect((await del({ confirm: "delete" }, false)).status).toBe(401);
    expect(deleteAccount).not.toHaveBeenCalled();
  });

  it("needs the typed word, and deletes nothing without it", async () => {
    for (const body of [{}, { confirm: "yes" }, { confirm: "" }]) expect((await del(body)).status).toBe(422);
    expect(deleteAccount).not.toHaveBeenCalled();
  });

  it("deletes the token owner's account and answers 204", async () => {
    deleteAccount.mockResolvedValue({ ok: true });
    const r = await del({ confirm: " Delete " });
    expect(r.status).toBe(204);
    expect(deleteAccount).toHaveBeenCalledWith(deps.sql, deps.storage, "user-1");
    expect(r.headers.get("cache-control")).toBe("private, no-store");
  });

  it("answers 409 naming the clubs when the rider is the only admin of one", async () => {
    deleteAccount.mockResolvedValue({ ok: false, reason: "club_admin", clubs: ["Trail Club 1", "Dirt Girls"] });
    const r = await del({ confirm: "delete" });
    expect(r.status).toBe(409);
    const body = (await r.json()) as { error: { code: string; message: string; clubs: string[] } };
    expect(body.error.code).toBe("club_admin");
    expect(body.error.clubs).toEqual(["Trail Club 1", "Dirt Girls"]);
    expect(body.error.message).toContain("Trail Club 1");
  });

  it("is a token-only route, never cached", () => {
    const route = routes.find((r) => r.method === "DELETE" && r.path === "/me")!;
    expect(route.access).toBe("token");
    expect(route.cache).toBeUndefined();
  });
});
