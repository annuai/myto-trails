import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, ChevronLeft } from 'lucide-react-native';
import { IconButton } from './IconButton';
import { Logo } from './Logo';
import { Text } from './Text';

/** Top of a tab root: logo and notifications. */
export function BrandHeader() {
  return (
    <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
      <Logo height={30} />
      <IconButton icon={Bell} label="Notifications" />
    </View>
  );
}

/** Top of a pushed screen: back and optional right action. */
export function BackHeader({ title, right }: { title?: string; right?: React.ReactNode }) {
  const router = useRouter();
  return (
    <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, marginLeft: -8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <IconButton icon={ChevronLeft} label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} plain />
        {title ? <Text variant="bodyMedium">{title}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function PageTitle({ children, sub }: { children: string; sub?: string }) {
  return (
    <View style={{ marginTop: 8, marginBottom: 24, gap: 6 }}>
      <Text variant="title">{children}</Text>
      {sub ? <Text variant="label" tone="muted">{sub}</Text> : null}
    </View>
  );
}

export function SectionTitle({ children, action, onAction }: { children: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ marginTop: 32, marginBottom: 12, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
      <Text variant="section">{children}</Text>
      {action ? (
        <Text variant="labelMedium" tone="accent" onPress={onAction} accessibilityRole="button">{action}</Text>
      ) : null}
    </View>
  );
}
