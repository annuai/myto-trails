import { size } from '@/theme/tokens';
import { Text } from './Text';
import { ScalePressable } from './motion';

/** A quiet action with no box: Skip, Not now. It keeps the full touch target. */
export function TextButton({ label, onPress, tone = 'muted' }: { label: string; onPress: () => void; tone?: 'muted' | 'ink' }) {
  return (
    <ScalePressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{ minHeight: size.target, justifyContent: 'center', alignItems: 'center', paddingHorizontal: size.screenX / 2 }}>
      <Text variant="labelMedium" tone={tone}>{label}</Text>
    </ScalePressable>
  );
}
