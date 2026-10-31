import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Plus } from 'lucide-react-native';
import { rhythm, size, space } from '@/theme/tokens';
import { IconButton } from './IconButton';
import { Text } from './Text';

/** Top of a pushed screen: back and optional right action. */
export function BackHeader({ title, right }: { title?: string; right?: React.ReactNode }) {
  const router = useRouter();
  return (
    <View style={{ height: size.header, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space[2], marginLeft: -space[2] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[1] }}>
        <IconButton icon={ChevronLeft} label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} plain />
        {title ? <Text variant="bodyMedium">{title}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function PageTitle({ children, sub }: { children: string; sub?: string }) {
  return (
    <View style={{ marginTop: space[2], marginBottom: rhythm.afterTitle, gap: space[2] }}>
      <Text variant="title">{children}</Text>
      {sub ? <Text variant="label" tone="muted">{sub}</Text> : null}
    </View>
  );
}

export function SectionTitle({ children, first, action, onAction, onAdd, addLabel = 'Add' }: { children: string; /** The first thing under the page title: the title's own gap is enough, so this heading adds none. */ first?: boolean; action?: string; onAction?: () => void; /** Shows a round + button at the end of the heading. */ onAdd?: () => void; addLabel?: string }) {
  return (
    <View style={{ marginTop: first ? 0 : rhythm.betweenSections, marginBottom: rhythm.afterHeading, flexDirection: 'row', alignItems: onAdd ? 'center' : 'baseline', justifyContent: 'space-between' }}>
      <Text variant="section">{children}</Text>
      {onAdd ? <IconButton icon={Plus} label={addLabel} onPress={onAdd} size={size.target} /> : null}
      {action ? (
        <Text variant="labelMedium" tone="accent" onPress={onAction} accessibilityRole="button">{action}</Text>
      ) : null}
    </View>
  );
}
