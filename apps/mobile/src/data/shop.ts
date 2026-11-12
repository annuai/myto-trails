// The curated Shop: a discovery layer only. Products are bought on the myto-moto website, never in the app.
// Everything here was read from the live site (https://www.myto-moto.com, product pages under /products/<slug>) on 2026-11-12.
// Prices are left out on purpose: they change and the website is the one place they are right.
// shop.myto-moto.com did not exist on that date (it returned DEPLOYMENT_NOT_FOUND), so SHOP_BASE is the one line to change when it does.

export const SHOP_BASE = 'https://www.myto-moto.com';
export const SHOP_HOST = 'myto-moto.com';

export const SHOP_CATEGORIES = [
  { id: 'originals', name: 'Myto Originals', blurb: 'Made by myto-moto, designed and tested for long roads.' },
  { id: 'touring', name: 'Touring Essentials', blurb: 'What a long ride is packed with.' },
  { id: 'navigation', name: 'Navigation and Electronics', blurb: 'Find the way, light the road.' },
  { id: 'luggage', name: 'Luggage and Storage', blurb: 'Carry it, find it, keep it dry.' },
  { id: 'accessories', name: 'Riding Accessories', blurb: 'Small things that make a ride better.' },
  { id: 'camping', name: 'Camping and Outdoors', blurb: 'For nights away from a bed.' },
] as const;
export type ShopCategoryId = (typeof SHOP_CATEGORIES)[number]['id'];

export type ShopProduct = {
  /** Also the path on the website: `${SHOP_BASE}/products/${slug}`. */
  slug: string;
  name: string;
  /** The line the website uses under the product's name. */
  tagline: string;
  /** What it is, in a sentence, from the product page. */
  summary: string;
  categories: readonly ShopCategoryId[];
  /** The website sells it as a pre-order, not from stock. */
  preorder: boolean;
  image?: string;
  /** Placeholder shown to check the layout only. Never shown to riders as a real product. */
  sample?: true;
};

export const SHOP_PRODUCTS: readonly ShopProduct[] = [
  {
    slug: 'trail-beam', name: 'Trail Beam', tagline: 'Light that cuts through every condition.',
    summary: 'A headlight with an aerodynamic housing, a thermally regulated constant-current driver and an IP67-rated, gasket-sealed body.',
    categories: ['originals', 'navigation'], preorder: true, image: `${SHOP_BASE}/products/trail-beam.png`,
  },
  {
    slug: 'trail-kit', name: 'Trail Kit', tagline: 'Everything you need. Organised where you need it.',
    summary: 'A magnetic tank bag that expands from 8 to 12 litres, with a waxed canvas tool roll cut to fit specific tools.',
    categories: ['originals', 'luggage', 'touring'], preorder: true, image: `${SHOP_BASE}/products/trail-kit.png`,
  },
  {
    slug: 'navi', name: 'Navi', tagline: 'Navigate. Nothing else.',
    summary: 'A 3.5 inch, 800 nit sunlight-readable navigation display on a vibration-isolated mount, with offline maps.',
    categories: ['originals', 'navigation'], preorder: true, image: `${SHOP_BASE}/products/navi.png`,
  },
];

export const SHOP_COLLECTIONS: readonly { id: string; name: string; blurb: string; slugs: readonly string[] }[] = [
  { id: 'ecosystem', name: 'Lighting, navigation, utility', blurb: 'Three tools designed to work together.', slugs: ['trail-beam', 'navi', 'trail-kit'] },
];

export const SHOP_BRAND = {
  name: 'myto-moto',
  blurb: 'Thoughtfully engineered tools for riders who travel further. Designed through research, prototyping and real-world testing, specified for years of road use, and repairable with common tools.',
} as const;
