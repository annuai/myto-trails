import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { ExternalLink } from 'lucide-react-native';
import { SHOP_BRAND } from '@/data/shop';
import { openShopSite } from '@/features/shop/openShop';
import { ShopProductCard } from '@/features/shop/ShopProductCard';
import { featuredProducts, shopHostLabel } from '@/lib/shop';
import { space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { BackHeader, PageTitle, SectionTitle } from '@/ui/Header';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

/** A short, curated list of gear. The app only shows it: every purchase happens on the myto-moto website. */
export default function Shop() {
  const router = useRouter();
  const featured = featuredProducts();
  const open = (slug: string) => router.push(`/shop/${slug}`);

  return (
    <Screen>
      <BackHeader title="Home" />
      <PageTitle sub={`Gear we picked for the road. You buy it on ${shopHostLabel}, not in the app.`}>Shop</PageTitle>
      {featured.length === 0 ? (
        <EmptyState icon={ExternalLink} title="Nothing to show yet" body={`The shop is on ${shopHostLabel}.`} action={{ label: 'Open the website', onPress: () => openShopSite('shop') }} />
      ) : (
        <>
          <SectionTitle first>Featured</SectionTitle>
          <View style={{ gap: space[3] }}>{featured.map((p) => <ShopProductCard key={p.slug} product={p} onPress={() => open(p.slug)} />)}</View>


          <SectionTitle>{`About ${SHOP_BRAND.name}`}</SectionTitle>
          <Card style={{ gap: space[3] }}>
            <Text variant="body">{SHOP_BRAND.blurb}</Text>
            <Button variant="soft" onCard icon={ExternalLink} label={`Visit ${shopHostLabel}`} onPress={() => openShopSite('shop')} />
            <Text variant="caption" tone="muted">Opens the website in your browser. You leave Myto Moto to buy.</Text>
          </Card>
        </>
      )}
    </Screen>
  );
}
