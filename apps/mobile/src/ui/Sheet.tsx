import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Animated, Dimensions, Keyboard, PanResponder, Platform, Pressable, ScrollView, View } from 'react-native';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useChrome } from '@/store/chrome';
import { IconButton } from './IconButton';
import { EASE, useReducedMotion } from './motion';
import { Text } from './Text';
import { dragOffset, shouldDismiss } from './sheetDrag';
import { useLayout } from './useLayout';

import { space, layout, radius, scrim } from '@/theme/tokens';
import { sheet } from './Sheet.tokens';
import { useAnimatedValue } from './useAnimatedValue';
import { useLatest } from '@/lib/useLatest';
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
 * The handle and title are a drag area: the sheet follows the finger down, and letting go past a short distance or with a flick closes it;
 * otherwise it springs back. Pulled up it gives a little, like a rubber band. The close button and a tap on the backdrop still work.
 */
export function Sheet({ open, title, onClose, children, footer }: { open: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { landscape } = useLayout();
  const reduced = useReducedMotion();
  const t = useAnimatedValue(0);
  const drag = useAnimatedValue(0);
  const close = useLatest(onClose);
  const pan = useMemo(() => {
    const back = () => Animated.spring(drag, { toValue: 0, useNativeDriver: true, bounciness: 0, speed: 20 }).start();
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, g) => drag.setValue(dragOffset(g.dy)),
      onPanResponderRelease: (_, g) => {
        if (!shouldDismiss(g.dy, g.vy)) return back();
        Animated.timing(drag, { toValue: Dimensions.get('window').height, duration: 200, easing: EASE, useNativeDriver: true }).start(() => close());
      },
      onPanResponderTerminate: back,
    });
  }, [drag, close]);
  const [keyboard, setKeyboard] = useState(0);
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
    if (!open) { t.setValue(0); drag.setValue(0); return; }
    if (reduced) return t.setValue(1);
    Animated.timing(t, { toValue: 1, duration: 280, easing: EASE, useNativeDriver: true }).start();
  }, [open, reduced, t, drag]);
  if (!open) return null;
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end', alignItems: 'center' }}>
      <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: Animated.multiply(t, drag.interpolate({ inputRange: [0, Dimensions.get('window').height], outputRange: [1, 0], extrapolate: 'clamp' })) }}>
        <Pressable accessibilityLabel="Close" onPress={onClose} style={{ flex: 1, backgroundColor: scrim.sheet }} />
      </Animated.View>
      <Animated.View style={{ transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [sheet.slide, 0] }) }, { translateY: drag }], opacity: t, backgroundColor: c.paper, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, maxHeight: landscape || keyboard ? '96%' : '88%', width: '100%', maxWidth: layout.wideMax, paddingBottom: keyboard ? keyboard + space[4] : insets.bottom + space[4] }}>
        <View {...pan.panHandlers}>
          <View style={{ alignItems: 'center', paddingTop: space[3], paddingBottom: space[2] }}>
            <View style={{ width: sheet.handleWidth, height: sheet.handleHeight, borderRadius: radius.chip, backgroundColor: c.line }} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: space[6], paddingRight: space[3], paddingTop: 0, paddingBottom: space[2] }}>
            <Text variant="section">{title}</Text>
            <IconButton icon={X} label="Close" onPress={onClose} plain />
          </View>
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: space[5], paddingBottom: space[2], gap: space[3] }} keyboardShouldPersistTaps="handled">{children}</ScrollView>
        {footer ? <View style={{ paddingHorizontal: space[5], paddingTop: space[3], borderTopWidth: 1, borderTopColor: c.line }}>{footer}</View> : null}
      </Animated.View>
    </View>
  );
}
