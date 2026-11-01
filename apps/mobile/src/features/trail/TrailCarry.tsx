import { View } from 'react-native';
import { Check } from 'lucide-react-native';
import { CARRY_ITEM_LABEL, arrivalText } from '@moto-trails/domain';
import type { TrailCarry as Carry } from '@moto-trails/domain';
import { waterText } from '@/lib/trailCarry';
import { Card } from '@/ui/Card';
import { SectionTitle } from '@/ui/Header';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { space } from '@/theme/tokens';

/** What to carry and the best time to reach the trail. Each part is hidden when the trail has nothing to say; older copies have no `carry` at all. */
export function TrailCarry({ carry }: { carry?: Carry | null }) {
  if (!carry) return null;
  const hasList = carry.waterLitres != null || carry.items.length > 0 || !!carry.notes;
  return (
    <>
      {hasList ? (
        <>
          <SectionTitle>What to carry</SectionTitle>
          <Card style={{ gap: space[3] }}>
            {carry.waterLitres != null ? <Text variant="labelMedium">{waterText(carry.waterLitres)}</Text> : null}
            {carry.items.map((i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
                <Icon icon={Check} tone="good" />
                <Text variant="body">{CARRY_ITEM_LABEL[i] ?? i}</Text>
              </View>
            ))}
            {carry.notes ? <Text variant="body">{carry.notes}</Text> : null}
          </Card>
        </>
      ) : null}
      {carry.arrival || carry.arrivalNote ? (
        <>
          <SectionTitle>Best time to reach</SectionTitle>
          <Card style={{ gap: space[2] }}>
            {carry.arrival ? <Text variant="labelMedium">{arrivalText(carry.arrival.from, carry.arrival.to)}</Text> : null}
            {carry.arrivalNote ? <Text variant="body">{carry.arrivalNote}</Text> : null}
          </Card>
        </>
      ) : null}
    </>
  );
}
