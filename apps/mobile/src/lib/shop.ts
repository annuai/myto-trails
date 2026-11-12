import { SHOP_BASE, SHOP_CATEGORIES, SHOP_COLLECTIONS, SHOP_HOST, SHOP_PRODUCTS, type ShopCategoryId, type ShopProduct } from '@/data/shop';
import type { ShopSurface } from '@moto-trails/domain';

export type { ShopSurface };

/** Real products only: a sample entry is for checking layouts and is never listed. */
export const listedProducts = (products: readonly ShopProduct[] = SHOP_PRODUCTS): ShopProduct[] => products.filter((p) => !p.sample);

export const productBySlug = (slug: string | undefined, products: readonly ShopProduct[] = SHOP_PRODUCTS) => listedProducts(products).find((p) => p.slug === slug);

/** Categories that have something in them, in the order the shop shows them. */
export function categoriesWithProducts(products: readonly ShopProduct[] = SHOP_PRODUCTS) {
  const real = listedProducts(products);
  return SHOP_CATEGORIES.map((c) => ({ ...c, products: real.filter((p) => p.categories.includes(c.id)) })).filter((c) => c.products.length > 0);
}

export function collectionsWithProducts(products: readonly ShopProduct[] = SHOP_PRODUCTS, collections = SHOP_COLLECTIONS) {
  const real = listedProducts(products);
  return collections.map((c) => ({ ...c, products: c.slugs.flatMap((s) => real.find((p) => p.slug === s) ?? []) })).filter((c) => c.products.length > 0);
}

/** The Myto Originals, which lead the landing page. */
export const featuredProducts = (products: readonly ShopProduct[] = SHOP_PRODUCTS) => listedProducts(products).filter((p) => p.categories.includes('originals'));

/** The website address of a product, with where the rider came from added so the shop can see which part of the app helped. No rider detail is ever added. */
export function productUrl(product: Pick<ShopProduct, 'slug'>, surface: ShopSurface, base: string = SHOP_BASE): string {
  const q = new URLSearchParams({ utm_source: 'myto_app', utm_medium: 'app', utm_campaign: surface, utm_content: product.slug });
  return `${base.replace(/\/$/, '')}/products/${product.slug}?${q.toString()}`;
}

/** The shop's front page, for the "Visit the shop" button. */
export function shopUrl(surface: ShopSurface, base: string = SHOP_BASE): string {
  const q = new URLSearchParams({ utm_source: 'myto_app', utm_medium: 'app', utm_campaign: surface });
  return `${base.replace(/\/$/, '')}/shop?${q.toString()}`;
}

/** The address a rider leaves the app for, shown as plain text beside the button so it is clear where it goes. */
export const shopHostLabel = SHOP_HOST;

export type TripContext = { days: number };
type Suggestion = { heading: string; categories: ShopCategoryId[] };

/**
 * What to show on a trip, from how long it is. Several days: somewhere to put things, a way to mount a navigator and kit for the nights.
 * A weekend (two days): the essentials. A single day gets nothing, since a day ride needs no shopping.
 */
export function tripSuggestion({ days }: TripContext): Suggestion | undefined {
  if (days >= 3) return { heading: 'Gear for a multi-day ride', categories: ['luggage', 'navigation', 'camping'] };
  if (days === 2) return { heading: 'Weekend ride essentials', categories: ['touring', 'luggage'] };
  return undefined;
}

/** Real products that fit a trip, best fit first, at most `limit`. Empty when nothing real matches, so the card simply does not appear. */
export function suggestProducts(ctx: TripContext, limit = 3, products: readonly ShopProduct[] = SHOP_PRODUCTS): { heading: string; products: ShopProduct[] } | undefined {
  const s = tripSuggestion(ctx);
  if (!s) return undefined;
  const score = (p: ShopProduct) => s.categories.reduce((n, c, i) => (p.categories.includes(c) ? n + (s.categories.length - i) : n), 0);
  const found = listedProducts(products).map((p) => ({ p, s: score(p) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, limit).map((x) => x.p);
  return found.length ? { heading: s.heading, products: found } : undefined;
}
