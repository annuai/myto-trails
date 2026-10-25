import type { ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { IconButton } from './IconButton';
import { Text } from './Text';

/**
 * Bottom sheet drawn in the screen's own tree (not a native Modal), so on the web it stays inside the phone frame.
 * Render it as the `overlay` of <Screen>.
 */
export function Sheet({ open, title, onClose, children, footer }: { open: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  if (!open) return null;
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' }}>
      <Pressable accessibilityLabel="Close" onPress={onClose} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' }} />
      <View style={{ backgroundColor: c.paper, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '88%', paddingBottom: insets.bottom + 16 }}>
        <View style={{ alignItems: 'center', paddingTop: 10 }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: c.line }} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 24, paddingRight: 12, paddingTop: 4, paddingBottom: 8 }}>
          <Text variant="section">{title}</Text>
          <IconButton icon={X} label="Close" onPress={onClose} plain />
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8, gap: 12 }} keyboardShouldPersistTaps="handled">{children}</ScrollView>
        {footer ? <View style={{ paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.line }}>{footer}</View> : null}
      </View>
    </View>
  );
}
