import { useState } from 'react';
import { Image, View } from 'react-native';
import { Header } from '@/features/onboarding/AccountSteps';
import { MAPS_ART } from '@/features/onboarding/slides';
import { useOsm } from '@/store/osm';
import { radius, size, space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { OsmChoice } from './OsmChoice';

/**
 * Welcome-flow step after the tour: help improve the map. It is laid out like the other welcome pages (the logo on top, a picture that
 * takes the room left over in a rounded card, the words under it, the button at the foot, nothing that scrolls). The box is ticked to
 * begin with and the disclaimer sits under it. A new rider is asked here, once; a rider who already uses the app is shown this same page
 * the first time they open the app after the update. The answer is kept and the question never comes back. Picture: assets/onboarding/maps.webp.
 */
export function MapsStep({ onDone }: { onDone: () => void }) {
  const [share, setShare] = useState(true);
  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, gap: space[4] }}>
        <Header />
        <View style={{ flex: 1, minHeight: size.ride + space[8], overflow: 'hidden', borderRadius: radius.card }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Image source={MAPS_ART} resizeMode="cover" accessibilityIgnoresInvertColors style={{ width: '100%', height: '100%' }} />
        </View>
        <View style={{ gap: space[3] }}>
          <Text variant="title">Help improve the map.</Text>
          <Text variant="body" tone="muted">The map under Myto Moto is OpenStreetMap, made by riders like you. Share your rides and help them find roads and trails that are missing.</Text>
        </View>
        <OsmChoice checked={share} onChange={setShare} />
        <Button big variant="accent" label="Continue" onPress={() => { useOsm.getState().answer(share); onDone(); }} />
      </View>
    </Screen>
  );
}
