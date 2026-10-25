import { View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Card } from './Card';
import { Icon } from './Icon';
import { Text } from './Text';

export function EmptyState({ icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <Card style={{ alignItems: 'center', paddingVertical: 32, gap: 10 }}>
      <Icon icon={icon} size={32} tone="muted" />
      <View style={{ gap: 6, alignItems: 'center' }}>
        <Text variant="bodyMedium">{title}</Text>
        <Text variant="label" tone="muted" style={{ textAlign: 'center' }}>{body}</Text>
      </View>
    </Card>
  );
}
