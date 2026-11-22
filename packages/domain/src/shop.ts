import { isValidSlug } from "./slug";

/** Where in the app a rider tapped through to the shop. Counted per product per day; nothing about the rider is kept. */
export const SHOP_SURFACES = ["home", "shop", "trip"] as const;
export type ShopSurface = (typeof SHOP_SURFACES)[number];
/** True when the value is a place in the app the shop can be opened from. */
export const isShopSurface = (v: unknown): v is ShopSurface => typeof v === "string" && (SHOP_SURFACES as readonly string[]).includes(v);
/** True when the value is a well-formed product slug. */
export const isShopProductSlug = (v: unknown): v is string => typeof v === "string" && isValidSlug(v);
