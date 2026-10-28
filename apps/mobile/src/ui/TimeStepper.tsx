import { View } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { clockLabel } from '@/lib/community';
import { IconButton } from './IconButton';
import { Text } from './Text';

const STEP = 15;
const DAY = 24 * 60;

/** A time of day in 15-minute steps, big enough to hit with a glove. Value is minutes after midnight. */
export function TimeStepper({ value, onChange, label }: { value: number; onChange: (minutes: number) => void; label: string }) {
  const move = (d: number) => onChange((value + d + DAY) % DAY);
  return (
    <View accessibilityRole="adjustable" accessibilityLabel={`${label}, ${clockLabel(value)}`} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <IconButton icon={Minus} label="15 minutes earlier" onPress={() => move(-STEP)} />
      <Text variant="dataLarge">{clockLabel(value)}</Text>
      <IconButton icon={Plus} label="15 minutes later" onPress={() => move(STEP)} />
    </View>
  );
}
