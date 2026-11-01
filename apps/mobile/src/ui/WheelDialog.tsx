import { type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, scrim, size, space } from '@/theme/tokens';
import { useReducedMotion } from './motion';
import { Text } from './Text';
import { dialog } from './Wheel.tokens';

/**
 * A centred dialog over a dimmed backdrop: a title, whatever wheels are passed, then Cancel and OK side by side under a hairline.
 * Cancel, the backdrop and the Android back button close it without changing anything; OK commits.
 * It is the one place the native Modal is used (see sheet.guard.test.ts): it holds no text field, so the keyboard cannot hide it,
 * and the Modal gives screen readers and the keyboard their trap for free.
 */
export function WheelDialog({ open, title, onCancel, onOk, children }: { open: boolean; title: string; onCancel: () => void; onOk: () => void; children: ReactNode }) {
  const { c } = useTheme();
  const reduced = useReducedMotion();
  return (
    <Modal visible={open} transparent animationType={reduced ? 'none' : 'fade'} onRequestClose={onCancel} statusBarTranslucent>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: space[5] }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close without changing" onPress={onCancel} style={[StyleSheet.absoluteFill, { backgroundColor: scrim.sheet }]} />
        <View accessibilityViewIsModal accessibilityLabel={title} style={{ width: '100%', maxWidth: dialog.maxWidth, backgroundColor: c.card, borderRadius: radius.card, overflow: 'hidden' }}>
          <Text variant="section" accessibilityRole="header" style={{ textAlign: 'center', paddingTop: space[6], paddingHorizontal: space[5], paddingBottom: space[4] }}>{title}</Text>
          <View style={{ paddingHorizontal: space[4], paddingBottom: space[4] }}>{children}</View>
          <View style={{ flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderColor: c.line }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Cancel" onPress={onCancel} style={({ pressed }) => ({ flex: 1, minHeight: size.button, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.raised : 'transparent' })}>
              <Text variant="bodyMedium">Cancel</Text>
            </Pressable>
            <View style={{ width: StyleSheet.hairlineWidth, backgroundColor: c.line }} />
            <Pressable accessibilityRole="button" accessibilityLabel="OK" onPress={onOk} style={({ pressed }) => ({ flex: 1, minHeight: size.button, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.raised : 'transparent' })}>
              <Text variant="bodyMedium" tone="accent">OK</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
