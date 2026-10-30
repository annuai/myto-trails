import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Dimensions, Keyboard, PanResponder, Platform, Pressable, ScrollView, View } from 'react-native';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useChrome } from '@/store/chrome';
import { space } from '@/theme/tokens';
import { IconButton } from './IconButton';
import { EASE, useReducedMotion } from './motion';
import { Text } from './Text';
import { useLayout } from './useLayout';

/**
 * Bottom sheet drawn in the screen's own tree (not a native Modal), so on the web it stays inside the phone frame.
 * Render it as the `overlay` of <Screen>.
 *
 * It lifts itself above the on-screen keyboard (and shrinks, so its content scrolls), so a text field inside a sheet is never
 * hidden. Every input that opens over a screen should be in a Sheet for that reason: do not use the native Modal.
 *
 * With the keyboard up the sheet's own background runs down behind it, so the keyboard's rounded corners (iOS 26) show the sheet rather than a gap.
 * The keyboard height is tracked here, from before the sheet opens, rather than with KeyboardAvoidingView: a field that focuses as the
 * sheet opens raises the keyboard before such a view has measured itself, and the sheet would stay hidden behind it.
 * (Android resizes the window for the keyboard by itself.)
 *
 * The handle at the top can be dragged: the sheet follows the finger down, and is closed by dragging it far enough or flicking it. A drag up only
 * stretches it a little. Letting go early springs it back.
 */
/** Past this share of the sheet's height, letting go closes it. */
const CLOSE_AT = 0.3;
/** A flick faster than this (points per millisecond) closes it from anywhere. */
const CLOSE_VELOCITY = 0.8;
/** Pulling up moves the sheet this much of the finger's distance. */
const PULL_UP_RESISTANCE = 0.15;

export function Sheet({ open, title, onClose, children, footer }: { open: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { landscape } = useLayout();
  const reduced = useReducedMotion();
  const t = useRef(new Animated.Value(0)).current;
  const [keyboard, setKeyboard] = useState(0);
  /** How far the rider has dragged the sheet down, in points. */
  const drag = useRef(new Animated.Value(0)).current;
  const height = useRef(0);
  const close = useRef(onClose);
  close.current = onClose;
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_e, g) => drag.setValue(g.dy >= 0 ? g.dy : g.dy * PULL_UP_RESISTANCE),
    onPanResponderRelease: (_e, g) => {
      const shut = g.dy > height.current * CLOSE_AT || g.vy > CLOSE_VELOCITY;
      if (!shut) return Animated.spring(drag, { toValue: 0, useNativeDriver: true, bounciness: 0, speed: 20 }).start();
      Animated.timing(drag, { toValue: height.current, duration: 180, easing: EASE, useNativeDriver: true }).start(() => close.current());
    },
    onPanResponderTerminate: () => Animated.spring(drag, { toValue: 0, useNativeDriver: true, bounciness: 0, speed: 20 }).start(),
  })).current;
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const change = Keyboard.addListener('keyboardWillChangeFrame', (e) => setKeyboard(Math.max(0, Dimensions.get('window').height - e.endCoordinates.screenY)));
    const hide = Keyboard.addListener('keyboardWillHide', () => setKeyboard(0));
    return () => { change.remove(); hide.remove(); };
  }, []);
  useEffect(() => {
    if (!open) return;
    useChrome.getState().open();
    return () => useChrome.getState().close();
  }, [open]);
  useEffect(() => {
    drag.setValue(0);
    if (!open) return t.setValue(0);
    if (reduced) return t.setValue(1);
    Animated.timing(t, { toValue: 1, duration: 280, easing: EASE, useNativeDriver: true }).start();
  }, [open, reduced, t]);
  if (!open) return null;
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end', alignItems: 'center' }}>
      <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: Animated.multiply(t, drag.interpolate({ inputRange: [0, Dimensions.get('window').height], outputRange: [1, 0], extrapolate: 'clamp' })) }}>
        <Pressable accessibilityLabel="Close" onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} />
      </Animated.View>
      <Animated.View onLayout={(e) => { height.current = e.nativeEvent.layout.height; }} style={{ transform: [{ translateY: Animated.add(t.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }), drag) }], opacity: t, backgroundColor: c.paper, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: landscape || keyboard ? '96%' : '88%', width: '100%', maxWidth: 560, paddingBottom: keyboard ? keyboard + 16 : insets.bottom + 16 }}>
        <View {...pan.panHandlers} accessibilityLabel="Drag down to close" style={{ alignItems: 'center', alignSelf: 'stretch', paddingTop: space[3], paddingBottom: space[2] }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: c.line }} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 24, paddingRight: 12, paddingTop: 4, paddingBottom: 8 }}>
          <Text variant="section">{title}</Text>
          <IconButton icon={X} label="Close" onPress={onClose} plain />
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8, gap: 12 }} keyboardShouldPersistTaps="handled">{children}</ScrollView>
        {footer ? <View style={{ paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.line }}>{footer}</View> : null}
      </Animated.View>
    </View>
  );
}
