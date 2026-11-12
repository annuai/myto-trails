// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const shop = vi.hoisted(() => ({ recordShopClick: vi.fn() }));
vi.mock("../shop/clicks", async (orig) => ({ ...(await orig<typeof import("../shop/clicks")>()), ...shop }));

import { ApiError, fail, matchRoute, type Ctx } from "./http";
import { shopRoutes } from "./shop-routes";
import { routes } from "./routes";

const now = new Date("2026-11-12T10:00:00Z");
async function call(body: unknown) {
  const m = matchRoute(shopRoutes, "POST", "/shop-clicks");
  if (m === null || m === "method") throw new Error("no route");
  const ctx = { sql: {}, now, params: {}, auth: null, userId: "", body: async () => body } as unknown as Ctx;
  const res = await m.route.handler(ctx).catch((e: unknown) => { if (e instanceof ApiError) return fail(e.status, e.code, e.message); throw e; });
  return { status: res.status, body: res.status === 204 ? null : await res.json() };
}
beforeEach(() => { vi.clearAllMocks(); });

describe("shop click route", () => {
  it("is public and registered", () => {
    expect(shopRoutes[0]!.access).toBe("public");
    expect(routes).toContain(shopRoutes[0]);
  });

  it("counts a product tap and returns nothing", async () => {
    expect(await call({ product: "trail-beam", surface: "shop" })).toEqual({ status: 204, body: null });
    expect(shop.recordShopClick.mock.calls[0]![1]).toEqual({ slug: "trail-beam", surface: "shop", now });
  });

  it("refuses an unknown place or a bad slug before reaching the database", async () => {
    expect(await call({ product: "trail-beam", surface: "elsewhere" })).toMatchObject({ status: 422 });
    expect(await call({ product: "Not A Slug", surface: "home" })).toMatchObject({ status: 422 });
    expect(await call({ surface: "home" })).toMatchObject({ status: 422 });
    expect(await call([])).toMatchObject({ status: 400 });
    expect(shop.recordShopClick).not.toHaveBeenCalled();
  });

  it("ignores any extra field, so a rider or location sent by mistake is never stored", async () => {
    await call({ product: "navi", surface: "trip", userId: "u1", lat: 1, lng: 2 });
    expect(shop.recordShopClick.mock.calls[0]![1]).toEqual({ slug: "navi", surface: "trip", now });
  });
});
