import { Linking } from 'react-native';
import { trackShopClick } from '@/api/shop';
import type { ShopProduct } from '@/data/shop';
import { productUrl, shopUrl, type ShopSurface } from '@/lib/shop';

/** The count is sent and forgotten: a slow or failed request never delays or stops the shop opening. */
const count = (product: string, surface: ShopSurface) => { void trackShopClick(product, surface).catch(() => undefined); };

/** Leaves the app for a product page on the website, in the phone's browser. Nothing is bought in the app. */
export function openProduct(product: ShopProduct, surface: ShopSurface) {
  count(product.slug, surface);
  void Linking.openURL(productUrl(product, surface)).catch(() => undefined);
}

export function openShopSite(surface: ShopSurface) {
  void Linking.openURL(shopUrl(surface)).catch(() => undefined);
}
