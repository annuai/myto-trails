import { View } from 'react-native';
import { nowMs } from '@/lib/clock';
import { useStory } from '@/store/story';
import { space } from '@/theme/tokens';
import { Card } from '@/ui/Card';
import { Pillion } from '@/ui/Pillion';
import { Text } from '@/ui/Text';
import { TextButton } from '@/ui/TextButton';

const DAY_MS = 86_400_000;

/** The Moment the governor last picked, for a day or until the rider dismisses it. One line, no art yet. Rendered on the ride story and as Dash's first card. */
export function MomentCard() {
  const latest = useStory((s) => s.latest);
  const seen = useStory((s) => s.seen);
  if (!latest || seen.includes(latest.moment.id) || nowMs() - latest.at > DAY_MS) return null;
  return (
    <View style={{ marginBottom: space[3] }}>
      <Card style={{ gap: space[2], alignItems: 'center' }}>
        <Pillion pose={latest.moment.pose} size="sm" />
        <Text variant="bodyMedium">{latest.moment.title}</Text>
        <TextButton label="Got it" onPress={() => useStory.getState().markSeen(latest.moment.id)} />
      </Card>
    </View>
  );
}
