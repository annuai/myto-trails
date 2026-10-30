import { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Motorbike, Route, User, Users, type LucideIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useChrome } from '@/store/chrome';
import { fixed, space, layout, radius, shadow, opacity } from '@/theme/tokens';
import { useLayout } from './useLayout';
import { useTheme } from '@/theme/ThemeProvider';
import { Icon } from './Icon';
import { Text } from './Text';
import { EASE, ScalePressable } from './motion';
import { tabBarFade } from './tabBarFade';
import { tabBar } from './TabBar.tokens';
import { useAnimatedValue } from './useAnimatedValue';

const items: Record<string, { label: string; icon: LucideIcon }> = {
  index: { label: 'Dash', icon: Motorbike }, trails: { label: 'Trails', icon: Route }, clubs: { label: 'Clubs', icon: Users }, you: { label: 'You', icon: User },
};

type BottomTabBarProps = { state: { index: number; routes: { key: string; name: string }[] }; navigateToTab: (routeKey: string) => void };

/** Four tabs and a raised Ride button (docs/16 §2). */
export function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const { c } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { landscape } = useLayout();
  const sheetOpen = useChrome((s) => s.sheets > 0);
  const h = landscape ? tabBar.heightLandscape : tabBar.height;
  const order = ['index', 'trails', 'REC', 'clubs', 'you'];
  const active = state.routes[state.index]?.name;
  // Same shape as the website's top nav: a white, fully rounded bar floating clear of the edges with a soft shadow.
  // Faded out near the end of a page: no longer catches touches once it is almost gone.
  const [touchable, setTouchable] = useState(true);
  useEffect(() => {
    const id = tabBarFade.addListener(({ value }) => setTouchable(value > 0.15));
    return () => tabBarFade.removeListener(id);
  }, []);
  const bar = c.bar;
  if (sheetOpen) return null;
  return (
    <Animated.View pointerEvents={touchable ? 'box-none' : 'none'} style={{ opacity: tabBarFade, position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingLeft: Math.max(16, insets.left), paddingRight: Math.max(16, insets.right), paddingBottom: Math.max(insets.bottom, landscape ? 6 : 12) + (landscape ? 2 : 4) }}>
      <View style={{ height: h, width: '100%', maxWidth: landscape ? layout.wideMax : layout.barMax, borderRadius: h / 2, backgroundColor: bar, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space[2], ...shadow.bar }}>
      {order.map((name) => {
        if (name === 'REC') {
          return (
            <View key={name} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ScalePressable scaleTo={0.92} accessibilityRole="button" accessibilityLabel="Ride" onPress={() => router.push('/ride')}
                style={({ pressed }) => ({ marginTop: landscape ? tabBar.liftLandscape : tabBar.lift, width: landscape ? tabBar.recordLandscape : tabBar.record, height: landscape ? tabBar.recordLandscape : tabBar.record, borderRadius: radius.chip, backgroundColor: c.record, alignItems: 'center', justifyContent: 'center', borderWidth: tabBar.ring, borderColor: bar, opacity: pressed ? opacity.pressed : 1, ...shadow.record })}>
                <View style={{ width: tabBar.mark, height: tabBar.mark, borderRadius: radius.chip, backgroundColor: fixed.white }} />
              </ScalePressable>
              <Text variant="caption" style={{ marginTop: space.half, fontFamily: 'Geist_500Medium' }}>Ride</Text>
            </View>
          );
        }
        const it = items[name]; const on = active === name;
        return (
          <ScalePressable scaleTo={0.92} key={name} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={it.label} onPress={() => navigateToTab(state.routes.find((r) => r.name === name)?.key ?? name)} style={{ flex: 1, height: h - 12, alignItems: 'center', justifyContent: 'center', gap: landscape ? space.half : space[1], borderRadius: (h - 12) / 2 }}>
            <Highlight on={on} color={c.paper} radius={(h - 12) / 2} />
            <View style={{ position: 'relative', zIndex: 1, alignItems: 'center', gap: landscape ? space.half : space[1] }}>
              <Icon icon={it.icon} size={24} tone={on ? 'ink' : 'muted'} strokeWidth={on ? 2.25 : 1.75} />
              <Text variant="caption" tone={on ? 'ink' : 'muted'} style={{ fontFamily: 'Geist_500Medium' }}>{it.label}</Text>
            </View>
          </ScalePressable>
        );
      })}
      </View>
    </Animated.View>
  );
}

/** The soft pill behind the current tab fades in and out as the tab changes. */
function Highlight({ on, color, radius }: { on: boolean; color: string; radius: number }) {
  const v = useAnimatedValue(on ? 1 : 0);
  useEffect(() => { Animated.timing(v, { toValue: on ? 1 : 0, duration: 220, easing: EASE, useNativeDriver: true }).start(); }, [on, v]);
  return <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius, backgroundColor: color, opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }} />;
}
