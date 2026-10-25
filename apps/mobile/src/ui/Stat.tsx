import { View } from 'react-native';
import { Text } from './Text';

export function Stat({ value, label, large }: { value: string; label: string; large?: boolean }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text variant={large ? 'liveSecondary' : 'dataLarge'}>{value}</Text>
      <Text variant="label" tone="muted">{label}</Text>
    </View>
  );
}
