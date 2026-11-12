import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useHomeOffer } from '@/store/homeOffer';
import { space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Text } from '@/ui/Text';
import { TextButton } from '@/ui/TextButton';
import { goHome } from './goHome';
import { offerCardView } from './offerView';
import { useHomeOfferNow } from './useHomeOffer';

/** The "Ride home" offer: guide home, record the ride home, or not now. Renders nothing when there is no offer. */
export function HomeOfferCard() {
  const router = useRouter();
  const r = useHomeOfferNow();
  const view = offerCardView(r);
  if (!view || !r.home) return null;
  const home = r.home;
  return (
    <Card style={{ gap: space[3], marginBottom: space[3] }}>
      <Text variant="bodyMedium">{view.title}</Text>
      <Text variant="label" tone="muted">{view.body}</Text>
      <Button label="Ride home" arrow onPress={() => goHome(router, home)} />
      <Button variant="soft" onCard label="Record it" onPress={() => goHome(router, home, { record: true })} />
      <View style={{ alignItems: 'flex-start' }}><TextButton label="Not now" onPress={() => useHomeOffer.getState().dismiss()} /></View>
    </Card>
  );
}
