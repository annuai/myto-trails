import { describe, expect, it } from 'vitest';
import type { ShopProduct } from '@/data/shop';
import { SHOP_PRODUCTS } from '@/data/shop';
import { categoriesWithProducts, collectionsWithProducts, featuredProducts, listedProducts, productBySlug, productUrl, shopUrl, suggestProducts, tripSuggestion } from './shop';

const p = (slug: string, categories: ShopProduct['categories'], sample?: true): ShopProduct => ({ slug, name: slug, tagline: '', summary: '', categories, preorder: false, ...(sample ? { sample } : {}) });
const set = [p('bag', ['luggage', 'touring']), p('mount', ['navigation']), p('tent', ['camping']), p('fake', ['luggage', 'camping'], true)];

describe('productUrl', () => {
  it('adds the attribution and nothing about the rider', () => {
    const u = new URL(productUrl({ slug: 'trail-beam' }, 'trip'));
    expect(u.origin + u.pathname).toBe('https://www.myto-moto.com/products/trail-beam');
    expect(Object.fromEntries(u.searchParams)).toEqual({ utm_source: 'myto_app', utm_medium: 'app', utm_campaign: 'trip', utm_content: 'trail-beam' });
  });
  it('copes with a trailing slash on the base', () => {
    expect(productUrl({ slug: 'navi' }, 'home', 'https://shop.example.com/')).toMatch(/^https:\/\/shop\.example\.com\/products\/navi\?/);
  });
});

describe('shopUrl', () => {
  it('goes to the shop front with the surface as the campaign and no product', () => {
    const u = new URL(shopUrl('home'));
    expect(u.pathname).toBe('/shop');
    expect(Object.fromEntries(u.searchParams)).toEqual({ utm_source: 'myto_app', utm_medium: 'app', utm_campaign: 'home' });
  });
});

describe('the catalogue', () => {
  it('lists real products only', () => {
    expect(listedProducts(set).map((x) => x.slug)).toEqual(['bag', 'mount', 'tent']);
    expect(productBySlug('fake', set)).toBeUndefined();
    expect(productBySlug('bag', set)?.slug).toBe('bag');
  });
  it('hides empty categories and keeps the shop order', () => {
    expect(categoriesWithProducts(set).map((c) => c.id)).toEqual(['touring', 'navigation', 'luggage', 'camping']);
  });
  it('shipped products have unique slugs and appear in a category and collection', () => {
    const slugs = SHOP_PRODUCTS.map((x) => x.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(SHOP_PRODUCTS.some((x) => x.sample)).toBe(false);
    expect(featuredProducts().length).toBeGreaterThan(0);
    expect(collectionsWithProducts()[0]!.products.length).toBeGreaterThan(0);
  });
});

describe('trip suggestions', () => {
  it('suggests nothing for a day ride', () => {
    expect(tripSuggestion({ days: 1 })).toBeUndefined();
    expect(suggestProducts({ days: 1 }, 3, set)).toBeUndefined();
  });
  it('multi-day: luggage, mounts and camping, never a sample', () => {
    const r = suggestProducts({ days: 4 }, 3, set)!;
    expect(r.heading).toBe('Gear for a multi-day ride');
    expect(r.products.map((x) => x.slug)).toEqual(['bag', 'mount', 'tent']);
  });
  it('weekend: essentials first', () => {
    expect(suggestProducts({ days: 2 }, 3, set)!.products.map((x) => x.slug)).toEqual(['bag']);
  });
  it('respects the limit and shows nothing when no real product fits', () => {
    expect(suggestProducts({ days: 4 }, 1, set)!.products).toHaveLength(1);
    expect(suggestProducts({ days: 4 }, 3, [p('x', ['accessories'])])).toBeUndefined();
  });
  it('works on the shipped catalogue', () => {
    expect(suggestProducts({ days: 5 })!.products.map((x) => x.slug)).toContain('trail-kit');
  });
});
