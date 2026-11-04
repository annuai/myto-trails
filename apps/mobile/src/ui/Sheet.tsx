import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { Animated, Dimensions, Keyboard, PanResponder, Platform, Pressable, ScrollView, View } from 'react-native';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useChrome } from '@/store/chrome';
import { useSheetStack } from '@/store/sheetStack';
import { IconButton } from './IconButton';
import { EASE, useReducedMotion } from './motion';
import { Text } from './Text';
import { dragOffset, shouldDismiss } from './sheetDrag';
import { useLayout } from './useLayout';

import { space, layout, radius, scrim } from '@/theme/tokens';
import { sheet } from './Sheet.tokens';
import { useAnimatedValue } from './useAnimatedValue';
import { keyboardLift } from './sheetKeyboard';
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
 * Android draws edge to edge and does not resize the window for the keyboard, so there the height comes from keyboardDidShow and keyboardDidHide.
 *
 * The handle and title are a drag area: the sheet follows the finger down, and letting go past a short distance or with a flick closes it;
 * otherwise it springs back. Pulled up it gives a little, like a rubber band. The close button and a tap on the backdrop still work.
 *
 * However it is closed (the backdrop, the button, a drag, or the screen turning `open` off) it slides down and fades before it is removed.
 * A sheet opened while another is open stacks on it: the one below steps back (smaller, a little higher, dimmed) with its rounded top
 * showing above the new one, and returns when the new one closes. Closing the top sheet never closes the one below.
 */
export function Sheet({ open, title, onClose, children, footer }: { open: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { landscape } = useLayout();
  const reduced = useReducedMotion();
  const t = useAnimatedValue(0);
  const drag = useAnimatedValue(0);
  const id = useId();
  /** Kept drawn while it slides away, after the screen has turned `open` off. */
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);
  /** How many sheets were already open when this one opened: 0 for the first. */
  const [depth, setDepth] = useState(0);
  /** How many sheets are open above this one. */
  const above = useSheetStack((s) => { const i = s.ids.indexOf(id); return i < 0 ? 0 : s.ids.length - 1 - i; });
  const step = useAnimatedValue(0);
  useEffect(() => {
    const to = Math.min(above, sheet.recedeScale.length - 1);
    if (reduced) return step.setValue(to);
    Animated.timing(step, { toValue: to, duration: sheet.recedeMs, easing: EASE, useNativeDriver: true }).start();
  }, [above, reduced, step]);
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
    if (Platform.OS === 'android') {
      const show = Keyboard.addListener('keyboardDidShow', (e) => setKeyboard(e.endCoordinates.height));
      const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboard(0));
      return () => { show.remove(); hide.remove(); };
    }
    if (Platform.OS !== 'ios') return;
    const change = Keyboard.addListener('keyboardWillChangeFrame', (e) => setKeyboard(Math.max(0, Dimensions.get('window').height - e.endCoordinates.screenY)));
    const hide = Keyboard.addListener('keyboardWillHide', () => setKeyboard(0));
    return () => { change.remove(); hide.remove(); };
  }, []);
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- noted once as the sheet opens: how deep in the stack it is
    setDepth(useSheetStack.getState().ids.length);
    useSheetStack.getState().push(id);
    useChrome.getState().open();
    return () => { useSheetStack.getState().remove(id); useChrome.getState().close(); };
  }, [open, id]);
  useEffect(() => {
    if (open) {
      drag.setValue(0);
      if (reduced) return t.setValue(1);
      Animated.timing(t, { toValue: 1, duration: 280, easing: EASE, useNativeDriver: true }).start();
      return;
    }
    // Slide away, then remove. Opening again meanwhile stops this animation, so it does not remove a sheet that is wanted.
    Animated.timing(t, { toValue: 0, duration: reduced ? 0 : sheet.exitMs, easing: EASE, useNativeDriver: true }).start(({ finished }) => { if (finished) setMounted(false); });
  }, [open, reduced, t, drag]);
  if (!mounted) return null;
  const cap = landscape || keyboard ? 96 : 88 - sheet.levelCut * Math.min(depth, 2);
  return (
    <View pointerEvents={open ? 'auto' : 'none'} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end', alignItems: 'center', zIndex: depth }}>
      <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: Animated.multiply(t, drag.interpolate({ inputRange: [0, Dimensions.get('window').height], outputRange: [1, 0], extrapolate: 'clamp' })) }}>
        <Pressable accessibilityLabel="Close" onPress={onClose} style={{ flex: 1, backgroundColor: scrim.sheet }} />
      </Animated.View>
      <Animated.View style={{ transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [sheet.slide, 0] }) }, { translateY: drag }, { translateY: step.interpolate({ inputRange: [0, 1, 2], outputRange: [...sheet.recedeLift].map((n) => -n) }) }, { scale: step.interpolate({ inputRange: [0, 1, 2], outputRange: [...sheet.recedeScale] }) }], transformOrigin: 'bottom', opacity: t, backgroundColor: c.paper, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, maxHeight: `${cap}%`, width: '100%', maxWidth: layout.wideMax, paddingBottom: keyboard ? keyboardLift(Platform.OS, keyboard, insets.bottom) + space[4] : insets.bottom + space[4] }}>
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
        <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, backgroundColor: scrim.sheet, opacity: step.interpolate({ inputRange: [0, 1, 2], outputRange: [...sheet.recedeDim] }) }} />
      </Animated.View>
    </View>
  );
}
