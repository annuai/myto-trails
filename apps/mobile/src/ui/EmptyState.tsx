import { View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { space } from '@/theme/tokens';
import { Button } from './Button';
import { Card } from './Card';
import { Icon } from './Icon';
import { Text } from './Text';

/**
 * Where a list has nothing in it yet. Say what the place is for in a friendly line, then what to do about it: the title is warm
 * and short ("Your first ride starts here"), the body is one sentence, and `action` is the one next step when there is a button for it.
 */
export function EmptyState({ icon, title, body, action }: { icon: LucideIcon; title: string; body: string; action?: { label: string; onPress: () => void } }) {
  return (
    <Card style={{ alignItems: 'center', paddingVertical: space[8], gap: space[3] }}>
      <Icon icon={icon} size={32} tone="muted" />
      <View style={{ gap: space[2], alignItems: 'center' }}>
        <Text variant="bodyMedium" style={{ textAlign: 'center' }}>{title}</Text>
        <Text variant="label" tone="muted" style={{ textAlign: 'center' }}>{body}</Text>
      </View>
      {action ? <Button variant="soft" label={action.label} onPress={action.onPress} /> : null}
    </Card>
  );
}
