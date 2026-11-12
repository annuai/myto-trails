import { isShopProductSlug, isShopSurface, type ShopSurface } from "@moto-trails/domain";
import type { Sql } from "postgres";

/** A day never holds more than this many different product slugs, so a caller cannot grow the table by inventing names. */
const MAX_SLUGS_PER_DAY = 100;

export type ShopClick = { slug: string; surface: ShopSurface };

/** Checks what the phone sent: a product slug and where in the app it was tapped. Null when it is neither. */
export function parseShopClick(b: Record<string, unknown>): ShopClick | null {
  return isShopProductSlug(b.product) && isShopSurface(b.surface) ? { slug: b.product, surface: b.surface } : null;
}

/** Adds one to today's count for the product and place. Only the counter is stored: no rider, no location. */
export async function recordShopClick(sql: Sql, { slug, surface, now }: ShopClick & { now: Date }): Promise<void> {
  const day = now.toISOString().slice(0, 10);
  await sql`
    insert into shop_click (product_slug, surface, day)
    select ${slug}, ${surface}, ${day}::date
    where exists (select 1 from shop_click where day = ${day}::date and product_slug = ${slug})
       or (select count(distinct product_slug) from shop_click where day = ${day}::date) < ${MAX_SLUGS_PER_DAY}
    on conflict (product_slug, surface, day) do update set count = shop_click.count + 1`;
}
