import { Children, Fragment, type ReactNode } from 'react';
import { View } from 'react-native';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Card } from './Card';
import { Icon } from './Icon';
import { Text } from './Text';
import { ScalePressable } from './motion';

import { space, size } from '@/theme/tokens';
/** A card of rows with hairline dividers. */
export function ListCard({ children }: { children: ReactNode }) {
  const { c } = useTheme();
  const items = Children.toArray(children);
  return (
    <Card padded={false}>
      {items.map((child, i) => (
        <Fragment key={i}>
          {i > 0 ? <View style={{ height: 1, backgroundColor: c.line, marginHorizontal: space[5] }} /> : null}
          {child}
        </Fragment>
      ))}
    </Card>
  );
}

type RowProps = {
  label: string; sub?: string; value?: string; right?: ReactNode; icon?: LucideIcon; onPress?: () => void;
  mono?: boolean; chevron?: boolean; tone?: 'ink' | 'stop';
};

export function Row({ label, sub, value, right, icon, onPress, mono, chevron, tone = 'ink' }: RowProps) {
  const { c } = useTheme();
  const content = (pressed: boolean) => (
    <View style={{ minHeight: size.row, paddingHorizontal: space[5], paddingVertical: space[3], flexDirection: 'row', alignItems: 'center', gap: space[4], backgroundColor: pressed ? c.raised : 'transparent' }}>
      {icon ? <Icon icon={icon} size={22} tone={tone === 'stop' ? 'stop' : 'muted'} /> : null}
      <View style={{ flex: 1, gap: space.half }}>
        <Text variant="body" tone={tone}>{label}</Text>
        {sub ? <Text variant="label" tone="muted">{sub}</Text> : null}
      </View>
      {value ? <Text variant={mono ? 'data' : 'label'} tone="muted">{value}</Text> : null}
      {right}
      {chevron ?? !!onPress ? <Icon icon={ChevronRight} size={20} tone="muted" /> : null}
    </View>
  );
  return onPress ? (
    <ScalePressable scaleTo={0.985} accessibilityRole="button" onPress={onPress}>{({ pressed }) => content(pressed)}</ScalePressable>
  ) : content(false);
}
