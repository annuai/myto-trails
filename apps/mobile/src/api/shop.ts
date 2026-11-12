import type { ShopSurface } from '@moto-trails/domain';
import { api } from './client';

/** Counts one tap through to the shop: which product and which part of the app, nothing else. No sign-in, no rider, no location. */
export const trackShopClick = (product: string, surface: ShopSurface) => api<void>('/shop-clicks', { method: 'POST', body: { product, surface } });
