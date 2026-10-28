import { Animated, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotifications } from '@/store/notifications';
import { useTheme } from '@/theme/ThemeProvider';
import { fixed, size } from '@/theme/tokens';
import { IconButton } from './IconButton';
import { Logo } from './Logo';
import { ScalePressable } from './motion';
import { CONTENT_MAX } from './useLayout';

export const HEADER_HEIGHT = 56;

/**
 * The logo and notifications stay fixed at the top. At rest they sit on the page; once the page scrolls the bar becomes a
 * white, rounded, floating pill with a soft shadow, the same shape as the website's top nav and the bottom nav.
 */
export function FloatingHeader({ scrollY }: { scrollY: Animated.Value }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const unread = useNotifications((s) => s.inbox.some((n) => !n.read));
  const p = scrollY.interpolate({ inputRange: [0, 48], outputRange: [0, 1], extrapolate: 'clamp' });
  const pill = c.bar;
  const edge = (rest: number, floating: number) => p.interpolate({ inputRange: [0, 1], outputRange: [rest, floating] });
  return (
    <Animated.View
      pointerEvents="box-none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', paddingTop: insets.top + 8, paddingLeft: edge(Math.max(size.screenX, insets.left + 12), Math.max(16, insets.left)), paddingRight: edge(Math.max(size.screenX, insets.right + 12), Math.max(16, insets.right)) }}
    >
      <Animated.View
        style={{
          width: '100%', maxWidth: CONTENT_MAX, height: HEADER_HEIGHT, borderRadius: HEADER_HEIGHT / 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingLeft: edge(0, 20), paddingRight: edge(0, 4),
          backgroundColor: p.interpolate({ inputRange: [0, 1], outputRange: ['rgba(255,255,255,0)', pill] }),
          shadowColor: fixed.shadow, shadowRadius: 24, shadowOffset: { width: 0, height: 4 }, shadowOpacity: p.interpolate({ inputRange: [0, 1], outputRange: [0, 0.1] }),
        }}
      >
        <ScalePressable accessibilityRole="link" accessibilityLabel="Go to Dash" onPress={() => router.replace('/')} style={{ minHeight: 48, justifyContent: 'center', paddingRight: 16 }}>
          <Logo height={30} />
        </ScalePressable>
        <View>
          <IconButton icon={Bell} label={unread ? 'Notifications, new' : 'Notifications'} onPress={() => router.push('/notifications')} />
          {unread ? <View pointerEvents="none" style={{ position: 'absolute', top: 11, right: 12, width: 10, height: 10, borderRadius: 5, backgroundColor: c.accent, borderWidth: 2, borderColor: c.card }} /> : null}
        </View>
      </Animated.View>
    </Animated.View>
  );
}
