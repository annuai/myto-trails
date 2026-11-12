import { Image, View } from 'react-native';
import { Package } from 'lucide-react-native';
import type { ShopProduct } from '@/data/shop';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { Badge } from '@/ui/Badge';
import { Card } from '@/ui/Card';
import { Icon } from '@/ui/Icon';
import { ScalePressable } from '@/ui/motion';
import { Text } from '@/ui/Text';
import { shopImage } from './ShopProduct.tokens';

/** The product's picture, shown whole in a frame. The placeholder shows when there is no picture. */
export function ShopImage({ product }: { product: ShopProduct }) {
  const { c } = useTheme();
  return (
    <View accessibilityLabel={product.name} style={{ width: '100%', aspectRatio: shopImage.aspect, borderRadius: radius.control, overflow: 'hidden', backgroundColor: c.raised, alignItems: 'center', justifyContent: 'center' }}>
      {product.image ? <Image source={{ uri: product.image }} accessibilityLabel={product.name} style={{ width: '100%', height: '100%' }} resizeMode="contain" /> : <Icon icon={Package} tone="muted" />}
    </View>
  );
}

/** A product in the shop: picture, name, one line and whether it is a pre-order. Opens its page in the app; buying happens on the website. */
export function ShopProductCard({ product, onPress }: { product: ShopProduct; onPress: () => void }) {
  return (
    <ScalePressable scaleTo={0.98} accessibilityRole="button" accessibilityLabel={`${product.name}. ${product.tagline}`} onPress={onPress}>
      <Card style={{ gap: space[3] }}>
        <ShopImage product={product} />
        <View style={{ gap: space[1] }}>
          <Text variant="bodyMedium">{product.name}</Text>
          <Text variant="label" tone="muted">{product.tagline}</Text>
        </View>
        {product.preorder ? <Badge label="Pre-order on the website" /> : null}
      </Card>
    </ScalePressable>
  );
}
