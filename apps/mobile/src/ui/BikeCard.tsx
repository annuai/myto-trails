import { View } from 'react-native';
import { Bike as BikeIcon } from 'lucide-react-native';
import type { Bike } from '@/api/types';
import { space } from '@/theme/tokens';
import { Badge } from './Badge';
import { BikeImage } from './BikeImage';
import { bikeCard } from './BikeCard.tokens';
import { Card } from './Card';
import { Icon } from './Icon';
import { Text } from './Text';
import { ScalePressable } from './motion';

/**
 * The rider's bike: the picture on the card with its name and model year as badges underneath. With no bike yet it
 * invites the rider to add one. The whole card opens the bike screen.
 */
export function BikeCard({ bike, onPress }: { bike: Bike | null | undefined; onPress: () => void }) {
  if (!bike) {
    return (
      <ScalePressable scaleTo={0.98} accessibilityRole="button" accessibilityLabel="Add your bike" onPress={onPress}>
        <Card style={{ alignItems: 'center', gap: space[3], paddingVertical: space[8] }}>
          <Icon icon={BikeIcon} size={32} tone="muted" />
          <View style={{ alignItems: 'center', gap: space[1] }}>
            <Text variant="bodyMedium">Add your bike</Text>
            <Text variant="label" tone="muted" style={{ textAlign: 'center' }}>Pick it from the list, or use your own photo.</Text>
          </View>
        </Card>
      </ScalePressable>
    );
  }
  return (
    <ScalePressable scaleTo={0.98} accessibilityRole="button" accessibilityLabel={`Your bike, ${bike.name}${bike.modelYear ? `, ${bike.modelYear}` : ''}. Edit`} onPress={onPress}>
      <Card style={{ gap: space[4] }}>
        <BikeImage own={bike.ownPhoto ? bike.photoUrl : null} preset={bike.ownPhoto ? null : bike.photoUrl} want={bikeCard.imageWidth} label={bike.name} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
          <Badge label={bike.name} tone="solid" />
          {bike.modelYear ? <Badge label={String(bike.modelYear)} /> : null}
        </View>
      </Card>
    </ScalePressable>
  );
}
