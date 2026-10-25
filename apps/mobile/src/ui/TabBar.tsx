import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Circle, Motorbike, Route, User, Users, type LucideIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { Icon } from './Icon';
import { Text } from './Text';

const items: Record<string, { label: string; icon: LucideIcon }> = {
  index: { label: 'Dash', icon: Motorbike }, trails: { label: 'Trails', icon: Route }, clubs: { label: 'Clubs', icon: Users }, you: { label: 'You', icon: User },
};

type BottomTabBarProps = { state: { index: number; routes: { key: string; name: string }[] }; navigateToTab: (routeKey: string) => void };

/** Four tabs and a raised Record button (docs/16 §2). */
export function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const { c } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const order = ['index', 'trails', 'REC', 'clubs', 'you'];
  const active = state.routes[state.index]?.name;
  return (
    <View style={{ height: 72 + insets.bottom, paddingBottom: insets.bottom, backgroundColor: c.card, borderTopWidth: 1, borderTopColor: c.line, flexDirection: 'row', alignItems: 'flex-start', paddingTop: 8 }}>
      {order.map((name) => {
        if (name === 'REC') {
          return (
            <View key={name} style={{ flex: 1, alignItems: 'center' }}>
              <Pressable accessibilityRole="button" accessibilityLabel="Record a ride" onPress={() => router.push('/ride')}
                style={({ pressed }) => ({ marginTop: -34, width: 76, height: 76, borderRadius: 38, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 6, borderColor: c.paper, opacity: pressed ? 0.9 : 1, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } })}>
                <Icon icon={Circle} size={30} tone="onInk" strokeWidth={0} />
                <View style={{ position: 'absolute', width: 22, height: 22, borderRadius: 11, backgroundColor: c.accentInk }} />
              </Pressable>
              <Text variant="caption" style={{ marginTop: 2, fontFamily: 'Geist_500Medium' }}>Record</Text>
            </View>
          );
        }
        const it = items[name]; const on = active === name;
        return (
          <Pressable key={name} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={it.label} onPress={() => navigateToTab(state.routes.find((r) => r.name === name)?.key ?? name)} style={{ flex: 1, height: 56, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Icon icon={it.icon} size={24} tone={on ? 'ink' : 'muted'} strokeWidth={on ? 2.25 : 1.75} />
            <Text variant="caption" tone={on ? 'ink' : 'muted'} style={{ fontFamily: 'Geist_500Medium' }}>{it.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
