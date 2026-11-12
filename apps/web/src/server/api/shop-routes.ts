import { recordShopClick, parseShopClick } from "../shop/clicks";
import { ApiError, fail, type RouteDef } from "./http";

export const shopRoutes: RouteDef[] = [
  {
    method: "POST", path: "/shop-clicks", access: "public", summary: "Count one tap from the app through to the shop (body: product, the product's slug; surface home|shop|trip). Only a daily total per product is kept: no rider, device or location. Rate limited per address",
    async handler(c) {
      const b = await c.body();
      if (typeof b !== "object" || b === null || Array.isArray(b)) throw new ApiError(400, "invalid_request", "The body must be a JSON object.");
      const click = parseShopClick(b as Record<string, unknown>);
      if (!click) return fail(422, "invalid", "Send product (a slug) and surface (home, shop or trip).");
      await recordShopClick(c.sql, { ...click, now: c.now });
      return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
    },
  },
];
