import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ExternalLink } from 'lucide-react-native';
import { SHOP_BRAND, SHOP_CATEGORIES } from '@/data/shop';
import { isShopSurface } from '@moto-trails/domain';
import { openProduct } from '@/features/shop/openShop';
import { ShopImage } from '@/features/shop/ShopProductCard';
import { productBySlug, shopHostLabel } from '@/lib/shop';
import { space } from '@/theme/tokens';
import { Badge } from '@/ui/Badge';
import { Button } from '@/ui/Button';
import { BackHeader, PageTitle, SectionTitle } from '@/ui/Header';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

/** One product: what it is and a button to the website. The button says it leaves the app, because it does. */
export default function ShopProductPage() {
  const { slug, from } = useLocalSearchParams<{ slug: string; from?: string }>();
  // The part of the app that sent the rider here, so the website sees which one helped. Anything else counts as the shop itself.
  const surface = isShopSurface(from) ? from : 'shop';
  const product = productBySlug(slug);
  if (!product) return <Screen><BackHeader title="Shop" /><Text>That product is not in the shop.</Text></Screen>;
  const names = SHOP_CATEGORIES.filter((c) => product.categories.includes(c.id)).map((c) => c.name);

  return (
    <Screen>
      <BackHeader title="Shop" />
      <PageTitle sub={product.tagline}>{product.name}</PageTitle>
      <ShopImage product={product} />
      <View style={{ marginTop: space[4], gap: space[3] }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
          {product.preorder ? <Badge tone="solid" label="Pre-order on the website" /> : null}
          {names.map((n) => <Badge key={n} label={n} />)}
        </View>
        <Text variant="body">{product.summary}</Text>
      </View>
      <View style={{ marginTop: space[6], gap: space[3] }}>
        <Button big variant="accent" icon={ExternalLink} label={`See it on ${shopHostLabel}`} onPress={() => openProduct(product, surface)} />
        <Text variant="caption" tone="muted">This opens the {SHOP_BRAND.name} website in your browser. Price, delivery and payment are on the website, not in Myto Moto.</Text>
      </View>
      <SectionTitle>{`About ${SHOP_BRAND.name}`}</SectionTitle>
      <Text variant="body" tone="muted">{SHOP_BRAND.blurb}</Text>
    </Screen>
  );
}
